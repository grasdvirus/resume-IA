
// src/app/actions.ts
'use server';

import { summarizeText } from '@/ai/flows/summarize-text';
import { summarizeYouTubeVideo } from '@/ai/flows/summarize-youtube-video';
import { translateText } from '@/ai/flows/translate-text-flow';
import { generateQuiz, type QuizData } from '@/ai/flows/generate-quiz-flow';
import { z } from 'zod';
import { db } from '@/lib/firebase'; 
import { ref, push, get, child, serverTimestamp as rtdbServerTimestamp, query, orderByChild, equalTo } from 'firebase/database'; 

export interface SummaryResult {
  title: string;
  content: string; 
  quizData?: QuizData;
}

const InputTypeSchema = z.enum(['text', 'youtube', 'pdf']);
export type InputType = z.infer<typeof InputTypeSchema>;

const OutputFormatSchema = z.enum(['resume', 'fiche', 'qcm', 'audio']);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

const TargetLanguageSchema = z.enum(['fr', 'en', 'es']);
export type TargetLanguage = z.infer<typeof TargetLanguageSchema>;

const SummaryLengthSchema = z.enum(['court', 'moyen', 'long', 'detaille']);
export type SummaryLength = z.infer<typeof SummaryLengthSchema>;


// This function will be called from the client component
export async function generateSummaryAction(
  inputType: InputType,
  inputValueOrFileName: string, 
  outputFormat: OutputFormat,
  targetLanguage: TargetLanguage,
  summaryLength: SummaryLength,
  pdfExtractedText?: string 
): Promise<SummaryResult> {
  let summaryForProcessing = ''; 
  let sourceName = '';
  let translatedLabel = "";
  let quizData: QuizData | undefined = undefined;
  let processedSummaryForOutput: string; 

  try {
    if (inputType === 'text') {
      sourceName = 'Texte personnalisé';
      if (inputValueOrFileName.length < 50) throw new Error('Le texte doit contenir au moins 50 caractères.');
      const result = await summarizeText({ text: inputValueOrFileName, summaryLength });
      summaryForProcessing = result.summary;
    } else if (inputType === 'youtube') {
      sourceName = 'Vidéo YouTube';
      if (!inputValueOrFileName.includes('youtube.com/') && !inputValueOrFileName.includes('youtu.be/')) {
        throw new Error('Veuillez entrer une URL YouTube valide.');
      }
      const result = await summarizeYouTubeVideo({ youtubeVideoUrl: inputValueOrFileName, summaryLength });
      summaryForProcessing = result.summary;
    } else if (inputType === 'pdf') {
      sourceName = inputValueOrFileName; // filename
      if (pdfExtractedText && pdfExtractedText.trim() !== "") {
        const result = await summarizeText({ text: pdfExtractedText, summaryLength });
        summaryForProcessing = result.summary;
      } else {
        console.warn("generateSummaryAction: PDF input type but no extracted text provided. Using fallback text.");
        summaryForProcessing = `Le traitement du fichier PDF "${inputValueOrFileName}" n'a pas pu extraire de contenu textuel. Veuillez réessayer ou vérifier le fichier. Si le problème persiste, le fichier est peut-être protégé ou corrompu.`;
        sourceName += " (Erreur d'extraction)";
      }
    }

    processedSummaryForOutput = summaryForProcessing; 

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
  
  const finalContentHtml = processedSummaryForOutput.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');


  if (outputFormat === 'resume' || outputFormat === 'fiche') {
    return {
      title: `${outputFormat === 'fiche' ? 'Fiche de révision' : 'Résumé'} - ${sourceName}${translatedLabel}`,
      content: `<p>${finalContentHtml}</p>`, // Directement le contenu HTML
    };
  } else if (outputFormat === 'qcm') {
    return {
      title: `QCM - ${sourceName}${translatedLabel}`,
      content: `<p>${finalContentHtml}</p>`, // Le résumé de base sert de contexte
      quizData: quizData,
    };
  } else if (outputFormat === 'audio') {
    return {
      title: `Version Audio - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">🎧 Version Audio</h4>
        <p>Utilisez le bouton "Lire le résumé" ci-dessous pour écouter la synthèse vocale du résumé.</p>
        <p>Contenu textuel du résumé :</p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; font-style: italic;">
          <p>${finalContentHtml}</p>
        </blockquote>
      `
    };
  }

  return { title: `Contenu Inconnu - ${sourceName}${translatedLabel}`, content: `<p>${finalContentHtml}</p>` };
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
  summaryLength: SummaryLength; // Ajout de la longueur
  createdAt?: number; 
}

export interface UserSavedSummary extends Omit<UserSummaryToSave, 'createdAt'> {
  id: string;
  createdAt: string; 
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
      let createdAtISO = new Date().toISOString(); 
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
        summaryLength: data.summaryLength as SummaryLength || 'moyen', // Ajout avec fallback
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

