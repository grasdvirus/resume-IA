
// src/app/actions.ts
'use server';

import { summarizeText } from '@/ai/flows/summarize-text';
import { summarizeYouTubeVideo } from '@/ai/flows/summarize-youtube-video';
import { translateText } from '@/ai/flows/translate-text-flow';
import { generateQuiz, type QuizData } from '@/ai/flows/generate-quiz-flow';
import { z } from 'zod';
import { db } from '@/lib/firebase'; // Import Firestore instance
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';

export interface SummaryResult {
  title: string;
  content: string; // HTML content or base text for QCM
  quizData?: QuizData;
}

const InputTypeSchema = z.enum(['text', 'youtube', 'pdf']);
export type InputType = z.infer<typeof InputTypeSchema>;

const OutputFormatSchema = z.enum(['resume', 'fiche', 'qcm', 'audio']);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

const TargetLanguageSchema = z.enum(['fr', 'en', 'es']);
export type TargetLanguage = z.infer<typeof TargetLanguageSchema>;


// This function will be called from the client component
export async function generateSummaryAction(
  inputType: InputType,
  inputValue: string, // text content, youtube URL, or PDF file name (for mock)
  outputFormat: OutputFormat,
  targetLanguage: TargetLanguage
): Promise<SummaryResult> {
  let baseSummary = '';
  let sourceName = '';
  let translatedLabel = "";
  let quizData: QuizData | undefined = undefined;
  let processedSummaryForOutput: string;

  try {
    if (inputType === 'text') {
      sourceName = 'Texte personnalisé';
      if (inputValue.length < 50) throw new Error('Le texte doit contenir au moins 50 caractères.');
      const result = await summarizeText({ text: inputValue });
      baseSummary = result.summary;
    } else if (inputType === 'youtube') {
      sourceName = 'Vidéo YouTube';
      if (!inputValue.includes('youtube.com/') && !inputValue.includes('youtu.be/')) {
        throw new Error('Veuillez entrer une URL YouTube valide.');
      }
      const result = await summarizeYouTubeVideo({ youtubeVideoUrl: inputValue });
      baseSummary = result.summary;
    } else if (inputType === 'pdf') {
      sourceName = inputValue; // filename
      baseSummary = `
      <p style="background-color: #fff9c4; border-left: 4px solid #ffeb3b; padding: 1em; margin-bottom: 1em;">
        <strong>Note Importante : Ceci est une DÉMONSTRATION du traitement des PDF.</strong><br/>
        Le système actuel <em>ne lit pas et n'analyse pas le contenu du fichier PDF ${inputValue}</em>. Le "résumé" ci-dessous est un exemple générique pour illustrer le format de sortie et le flux de travail. Pour une fonctionnalité complète, il faudrait intégrer une bibliothèque d'extraction de texte PDF (comme pdf.js côté client) ou un traitement backend pour analyser le fichier.
      </p>
      <p><strong>Exemple de ce qu'un résumé d'IA pourrait contenir pour un PDF :</strong></p>
      <p>
        Ce résumé fictif met en évidence les points clés typiques qu'une IA pourrait identifier, tels que l'objectif principal du document, les méthodologies employées, les résultats obtenus et les conclusions principales.
        Des sections spécifiques pourraient inclure:
      </p>
      <ul>
        <li>Introduction et Contexte du document</li>
        <li>Méthodes et Approches utilisées</li>
        <li>Découvertes et Analyses principales</li>
        <li>Conclusion et Recommandations du document</li>
      </ul>
      <p>
        L'IA s'efforcerait de fournir une synthèse concise et pertinente basée sur le contenu réel du PDF.
      </p>`;
    }

    let summaryForProcessing = baseSummary; 

    if (inputType === 'pdf') {
        const exampleMarker = "Exemple de ce qu'un résumé d'IA pourrait contenir pour un PDF :";
        const exampleContentIndex = baseSummary.indexOf(exampleMarker);
        if (exampleContentIndex !== -1) {
            summaryForProcessing = baseSummary.substring(exampleContentIndex + exampleMarker.length).replace(/<[^>]+>/g, ''); 
        } else {
            summaryForProcessing = baseSummary.replace(/<[^>]+>/g, ''); 
        }
    }

    processedSummaryForOutput = summaryForProcessing;

    if (targetLanguage !== 'fr' && summaryForProcessing) {
      const translationResult = await translateText({ textToTranslate: summaryForProcessing, targetLanguage: targetLanguage });
      processedSummaryForOutput = translationResult.translatedText;

      if (inputType === 'pdf') { 
        const disclaimerPart = baseSummary.substring(0, baseSummary.indexOf(summaryForProcessing));
        baseSummary = disclaimerPart + processedSummaryForOutput; 
      } else {
        baseSummary = processedSummaryForOutput; 
      }

      if (targetLanguage === 'en') translatedLabel = " (Translated to English)";
      if (targetLanguage === 'es') translatedLabel = " (Traducido al Español)";
    }


    if (outputFormat === 'qcm') {
        quizData = await generateQuiz({ summaryText: processedSummaryForOutput });
    }


  } catch (error) {
    console.error("Error during AI processing:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de la génération ou traduction.";
    throw new Error(errorMessage);
  }

  if (outputFormat === 'resume') {
    const contentForResume = (inputType === 'pdf' ? baseSummary : processedSummaryForOutput.replace(/\n/g, '<br/>'));
    return {
      title: `Résumé - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">📋 Points clés principaux :</h4>
        <p>${contentForResume}</p>
        <h4 style="font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">🎯 Conclusion :</h4>
        <p>Cette synthèse a été générée et potentiellement traduite par une IA. Elle vise à fournir un aperçu concis du contenu original.</p>
      `,
    };
  } else if (outputFormat === 'fiche') {
    const contentForFiche = (inputType === 'pdf' ? baseSummary : processedSummaryForOutput.replace(/\n/g, '<br/>'));
    return {
      title: `Fiche de révision - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">📚 FICHE DE RÉVISION</h4>
        <div style="background: #e3f2fd; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <h5 style="font-weight: bold;">🔑 MOTS-CLÉS (Exemple basé sur le résumé)</h5>
            <p><strong>Innovation • Méthodologie • Optimisation • Performance</strong> (Ces mots seraient extraits dynamiquement dans une version avancée)</p>
        </div>
        <h5 style="font-weight: bold;">📖 CONTENU PRINCIPAL</h5>
        <p>${contentForFiche}</p>
        <div style="background: #fff3e0; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <h5 style="font-weight: bold;">💡 À RETENIR (Exemple)</h5>
            <p>Le point le plus crucial à retenir de ce résumé est [suggestion basée sur le début du résumé : ${processedSummaryForOutput.substring(0, 100)}...].</p>
        </div>
      `
    };
  } else if (outputFormat === 'qcm') {
     const contentForQCMContext = (inputType === 'pdf' ? baseSummary : processedSummaryForOutput.replace(/\n/g, '<br/>'));
    return {
      title: `QCM - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">📝 Contexte du QCM (basé sur le résumé) :</h4>
        <div style="background: #f9f9f9; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; max-height: 200px; overflow-y: auto;">
         <p>${contentForQCMContext}</p>
        </div>
        <h4 style="font-weight: bold; margin-bottom: 1em;">🧠 Testez vos connaissances :</h4>
      `, 
      quizData: quizData,
    };
  } else if (outputFormat === 'audio') {
    const contentForAudio = (inputType === 'pdf' ? baseSummary : processedSummaryForOutput.replace(/\n/g, '<br/>'));
    return {
      title: `Version Audio - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">🎧 Version Audio</h4>
        <p>Utilisez le bouton "Lire le résumé" ci-dessous pour écouter la synthèse vocale.</p>
        <p>Contenu textuel du résumé :</p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; font-style: italic;">
          ${contentForAudio}
        </blockquote>
      `
    };
  }

  processedSummaryForOutput = processedSummaryForOutput || ''; 
  return { title: `Contenu Inconnu - ${sourceName}${translatedLabel}`, content: processedSummaryForOutput.replace(/\n/g, '<br/>') };
}

export interface UserSummaryToSave {
  userId: string;
  title: string;
  content: string;
  quizData?: QuizData;
  inputType: InputType;
  inputValue: string;
  outputFormat: OutputFormat;
  targetLanguage: TargetLanguage;
  createdAt?: Timestamp; // Champ pour Firestore, optionnel car serverTimestamp() le gère
}

export interface UserSavedSummary extends Omit<UserSummaryToSave, 'createdAt'> {
  id: string;
  createdAt: string; // Firestore Timestamp converti en string ISO
}


export async function saveSummaryAction(summaryData: UserSummaryToSave): Promise<{ id: string }> {
  try {
    const docRef = await addDoc(collection(db, "summaries"), {
      ...summaryData,
      createdAt: serverTimestamp(), // Firestore va générer le timestamp
    });
    return { id: docRef.id };
  } catch (error) {
    console.error("Error saving summary to Firestore:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de la sauvegarde du résumé.";
    throw new Error(`Impossible de sauvegarder le résumé: ${errorMessage}`);
  }
}

export async function getUserSummariesAction(userId: string): Promise<UserSavedSummary[]> {
  if (!userId) {
    console.warn("getUserSummariesAction called without userId. Returning empty array.");
    return [];
  }
  console.log(`getUserSummariesAction: Fetching summaries for userId: ${userId}`);
  try {
    const summariesCol = collection(db, "summaries");
    const q = query(summariesCol, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    console.log(`getUserSummariesAction: Found ${querySnapshot.size} documents for userId: ${userId}`);

    const summaries: UserSavedSummary[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`getUserSummariesAction: Processing doc ${doc.id}, raw data:`, JSON.parse(JSON.stringify(data))); // Log serializable data

      let createdAtISO = new Date().toISOString(); // Default to now if missing/invalid
      if (data.createdAt && typeof (data.createdAt as Timestamp).toDate === 'function') {
        createdAtISO = (data.createdAt as Timestamp).toDate().toISOString();
      } else if (data.createdAt) {
        console.warn(`getUserSummariesAction: Doc ${doc.id} has an invalid or non-Timestamp createdAt field:`, data.createdAt);
        // Attempt to parse if it's a string date, otherwise use default
        if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
            const parsedDate = new Date(data.createdAt);
            if (!isNaN(parsedDate.getTime())) {
                createdAtISO = parsedDate.toISOString();
            }
        }
      } else {
        console.warn(`getUserSummariesAction: Doc ${doc.id} is missing createdAt field. Defaulting to now.`);
      }

      summaries.push({
        id: doc.id,
        userId: data.userId as string,
        title: data.title as string,
        content: data.content as string,
        quizData: data.quizData as QuizData | undefined,
        inputType: data.inputType as InputType,
        inputValue: data.inputValue as string,
        outputFormat: data.outputFormat as OutputFormat,
        targetLanguage: data.targetLanguage as TargetLanguage,
        createdAt: createdAtISO,
      });
    });
    console.log(`getUserSummariesAction: Parsed ${summaries.length} summaries.`);
    return summaries;
  } catch (error) {
    console.error("Error fetching user summaries from Firestore:", error);
    // Ne pas lancer d'erreur au client, retourner un tableau vide et logger l'erreur.
    return []; 
  }
}

