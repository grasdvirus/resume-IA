
// src/app/actions.ts
'use server';

import { summarizeText } from '@/ai/flows/summarize-text';
import { summarizeYouTubeVideo } from '@/ai/flows/summarize-youtube-video';
import { translateText } from '@/ai/flows/translate-text-flow';
import { generateQuiz, type QuizData } from '@/ai/flows/generate-quiz-flow';
import { z } from 'zod';
import { db } from '@/lib/firebase'; // db is now Realtime Database instance
import { ref, push, get, child, serverTimestamp as rtdbServerTimestamp, query, orderByChild, equalTo } from 'firebase/database'; // Realtime Database imports

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
  let summaryForProcessing = ''; // This will hold the text to be processed by AI (translation, QCM)
  let sourceName = '';
  let translatedLabel = "";
  let quizData: QuizData | undefined = undefined;
  let processedSummaryForOutput: string; // This will hold the final text content (possibly translated) for output formats

  const pdfDisclaimerHtml = (pdfFileName: string) => `
  <p style="background-color: #fff9c4; border-left: 4px solid #ffeb3b; padding: 1em; margin-bottom: 1em;">
    <strong>Note Importante : Ceci est une DÉMONSTRATION du traitement des PDF.</strong><br/>
    Le système actuel <em>ne lit pas et n'analyse pas le contenu du fichier PDF "${pdfFileName}"</em>. Le contenu ci-dessous est basé sur un exemple générique pour illustrer le format et le flux.
  </p>`;

  try {
    if (inputType === 'text') {
      sourceName = 'Texte personnalisé';
      if (inputValue.length < 50) throw new Error('Le texte doit contenir au moins 50 caractères.');
      const result = await summarizeText({ text: inputValue });
      summaryForProcessing = result.summary;
    } else if (inputType === 'youtube') {
      sourceName = 'Vidéo YouTube';
      if (!inputValue.includes('youtube.com/') && !inputValue.includes('youtu.be/')) {
        throw new Error('Veuillez entrer une URL YouTube valide.');
      }
      const result = await summarizeYouTubeVideo({ youtubeVideoUrl: inputValue });
      summaryForProcessing = result.summary;
    } else if (inputType === 'pdf') {
      sourceName = inputValue; // filename
      // This is the example text that will be "processed" (translated, used for QCM) for the PDF demo
      summaryForProcessing = `Ce document fictif traite de l'optimisation des processus métier grâce à l'intelligence artificielle. Il aborde les concepts clés, les méthodologies d'implémentation, et présente une étude de cas illustrant les bénéfices potentiels tels que la réduction des coûts et l'amélioration de l'efficacité. Les défis et les considérations éthiques sont également discutés. L'objectif principal est de démontrer comment l'IA peut transformer les opérations d'une entreprise.`;
    }

    processedSummaryForOutput = summaryForProcessing; // Initialize with the base summary

    if (targetLanguage !== 'fr' && processedSummaryForOutput) {
      const translationResult = await translateText({ textToTranslate: processedSummaryForOutput, targetLanguage: targetLanguage });
      processedSummaryForOutput = translationResult.translatedText;

      if (targetLanguage === 'en') translatedLabel = " (Translated to English)";
      if (targetLanguage === 'es') translatedLabel = " (Traducido al Español)";
    }

    if (outputFormat === 'qcm' && processedSummaryForOutput) {
        quizData = await generateQuiz({ summaryText: processedSummaryForOutput });
    }

  } catch (error) {
    console.error("Error during AI processing:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de la génération ou traduction.";
    throw new Error(errorMessage);
  }
  
  // Construct the final output HTML
  const finalContentHtml = processedSummaryForOutput.replace(/\n/g, '<br/>');

  if (outputFormat === 'resume') {
    return {
      title: `Résumé ${inputType === 'pdf' ? '(Démo PDF) ' : ''}- ${sourceName}${translatedLabel}`,
      content: `
        ${inputType === 'pdf' ? pdfDisclaimerHtml(sourceName) : ''}
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">📋 Points clés principaux :</h4>
        <p>${finalContentHtml}</p>
        <h4 style="font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">🎯 Conclusion :</h4>
        <p>Cette synthèse a été générée ${inputType === 'pdf' ? '(sur la base d\'un exemple) ' : ''}et potentiellement traduite par une IA. Elle vise à fournir un aperçu concis.</p>
      `,
    };
  } else if (outputFormat === 'fiche') {
    return {
      title: `Fiche de révision ${inputType === 'pdf' ? '(Démo PDF) ' : ''}- ${sourceName}${translatedLabel}`,
      content: `
        ${inputType === 'pdf' ? pdfDisclaimerHtml(sourceName) : ''}
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">📚 FICHE DE RÉVISION ${inputType === 'pdf' ? '(Exemple)' : ''}</h4>
        <div style="background: #e3f2fd; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <h5 style="font-weight: bold;">🔑 MOTS-CLÉS ${inputType === 'pdf' ? '(Exemple)' : '(Exemple basé sur le résumé)'}</h5>
            <p><strong>${inputType === 'pdf' ? 'Optimisation • IA • Processus • Efficacité' : 'Innovation • Méthodologie • Optimisation • Performance'}</strong> (Ces mots seraient extraits dynamiquement dans une version avancée)</p>
        </div>
        <h5 style="font-weight: bold;">📖 CONTENU PRINCIPAL ${inputType === 'pdf' ? 'DE L\'EXEMPLE' : ''}</h5>
        <p>${finalContentHtml}</p>
        <div style="background: #fff3e0; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <h5 style="font-weight: bold;">💡 À RETENIR ${inputType === 'pdf' ? '(Exemple)' : '(Exemple)'}</h5>
            <p>Le point le plus crucial à retenir de ce${inputType === 'pdf' ? 't exemple' : ' résumé'} est [suggestion basée sur le début : ${finalContentHtml.substring(0, 100)}...].</p>
        </div>
      `
    };
  } else if (outputFormat === 'qcm') {
    return {
      title: `QCM ${inputType === 'pdf' ? '(Démo PDF) ' : ''}- ${sourceName}${translatedLabel}`,
      content: `
        ${inputType === 'pdf' ? pdfDisclaimerHtml(sourceName) : ''}
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">📝 Contexte du QCM (${inputType === 'pdf' ? 'basé sur l\'exemple PDF' : 'basé sur le résumé'}) :</h4>
        <div style="background: #f9f9f9; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; max-height: 200px; overflow-y: auto;">
         <p>${finalContentHtml}</p>
        </div>
        <h4 style="font-weight: bold; margin-bottom: 1em;">🧠 Testez vos connaissances ${inputType === 'pdf' ? '(sur l\'exemple)' : ''}:</h4>
      `, 
      quizData: quizData,
    };
  } else if (outputFormat === 'audio') {
    return {
      title: `Version Audio ${inputType === 'pdf' ? '(Démo PDF) ' : ''}- ${sourceName}${translatedLabel}`,
      content: `
        ${inputType === 'pdf' ? pdfDisclaimerHtml(sourceName) : ''}
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">🎧 Version Audio ${inputType === 'pdf' ? '(de l\'exemple)' : ''}</h4>
        <p>Utilisez le bouton "Lire le résumé" ci-dessous pour écouter la synthèse vocale ${inputType === 'pdf' ? 'de l\'exemple PDF' : 'du résumé'}.</p>
        <p>Contenu textuel ${inputType === 'pdf' ? 'de l\'exemple' : 'du résumé'} :</p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; font-style: italic;">
          ${finalContentHtml}
        </blockquote>
      `
    };
  }

  // Fallback (should not be reached if outputFormat is always one of the above)
  return { title: `Contenu Inconnu - ${sourceName}${translatedLabel}`, content: finalContentHtml };
}

export interface UserSummaryToSave {
  userId: string;
  title: string;
  content: string; // HTML content
  quizData?: QuizData;
  inputType: InputType;
  inputValue: string; // Original input (text, URL, or PDF filename)
  outputFormat: OutputFormat;
  targetLanguage: TargetLanguage;
  createdAt?: number; 
}

export interface UserSavedSummary extends Omit<UserSummaryToSave, 'createdAt'> {
  id: string;
  createdAt: string; // ISO string for client consumption
}


export async function saveSummaryAction(summaryData: UserSummaryToSave): Promise<{ id: string }> {
  try {
    const userSummariesRef = ref(db, `summaries/${summaryData.userId}`);
    const newSummaryRef = push(userSummariesRef, {
      ...summaryData,
      createdAt: Date.now(), 
    });
    
    if (!newSummaryRef.key) {
      throw new Error("Impossible d'obtenir la clé pour le nouveau résumé sauvegardé.");
    }
    return { id: newSummaryRef.key };
  } catch (error) {
    console.error("Error saving summary to Realtime Database:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de la sauvegarde du résumé.";
    throw new Error(`Impossible de sauvegarder le résumé: ${errorMessage}`);
  }
}

export async function getUserSummariesAction(userId: string): Promise<UserSavedSummary[]> {
  if (!userId) {
    console.warn("getUserSummariesAction called without userId. Returning empty array.");
    return [];
  }
  console.log(`getUserSummariesAction: Fetching summaries for userId: ${userId} from Realtime Database`);
  try {
    const userSummariesRef = ref(db, `summaries/${userId}`);
    const snapshot = await get(userSummariesRef);
    
    if (!snapshot.exists()) {
      console.log(`getUserSummariesAction: No data found for userId: ${userId} in Realtime Database.`);
      return [];
    }

    const summariesData = snapshot.val();
    const summaries: UserSavedSummary[] = [];

    for (const key in summariesData) {
      const data = summariesData[key];
      let createdAtISO = new Date().toISOString(); // Default
      if (data.createdAt && typeof data.createdAt === 'number') {
        createdAtISO = new Date(data.createdAt).toISOString();
      } else if (data.createdAt) {
        console.warn(`getUserSummariesAction: Summary ${key} has a createdAt field that is not a number. Attempting to parse. Value:`, data.createdAt);
        const parsedDate = new Date(data.createdAt);
        if (!isNaN(parsedDate.getTime())) {
          createdAtISO = parsedDate.toISOString();
        } else {
          console.error(`getUserSummariesAction: Summary ${key} createdAt field could not be parsed into a valid date. Defaulting to now.`);
        }
      } else {
         console.warn(`getUserSummariesAction: Summary ${key} is missing createdAt field. Defaulting to now.`);
      }

      summaries.push({
        id: key,
        userId: data.userId as string,
        title: data.title as string || "Titre non disponible",
        content: data.content as string || "Contenu non disponible",
        quizData: data.quizData as QuizData | undefined,
        inputType: data.inputType as InputType || 'text',
        inputValue: data.inputValue as string || "",
        outputFormat: data.outputFormat as OutputFormat || 'resume',
        targetLanguage: data.targetLanguage as TargetLanguage || 'fr',
        createdAt: createdAtISO,
      });
    }
    
    summaries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`getUserSummariesAction: Successfully parsed ${summaries.length} summaries from Realtime Database.`);
    return summaries;
  } catch (error) {
    console.error("Error fetching user summaries from Realtime Database in getUserSummariesAction:", error);
    return []; 
  }
}

