
// src/app/actions.ts
'use server';

import { summarizeText } from '@/ai/flows/summarize-text';
import { summarizeYouTubeVideo } from '@/ai/flows/summarize-youtube-video';
import { translateText } from '@/ai/flows/translate-text-flow';
import { generateQuiz, type QuizData } from '@/ai/flows/generate-quiz-flow';
import { generateRevisionSheet } from '@/ai/flows/generate-revision-sheet-flow';
import { z } from 'zod';
import { db } from '@/lib/firebase'; 
import { ref, push, get } from 'firebase/database'; 

export interface SummaryResult {
  title: string;
  content: string; 
  quizData?: QuizData;
}

const InputTypeSchema = z.enum(['text', 'youtube', 'pdf']);
export type InputType = z.infer<typeof InputTypeSchema>;

const OutputFormatSchema = z.enum(['resume', 'fiche', 'qcm', 'audio']);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

const TargetLanguageSchema = z.enum(['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'ko']);
export type TargetLanguage = z.infer<typeof TargetLanguageSchema>;

const SummaryLengthSchema = z.enum(['court', 'moyen', 'long', 'detaille']);
export type SummaryLength = z.infer<typeof SummaryLengthSchema>;

const languageMapDisplay: Record<TargetLanguage, string> = {
  fr: 'Français',
  en: 'Anglais',
  es: 'Espagnol',
  de: 'Allemand',
  it: 'Italien',
  pt: 'Portugais',
  ja: 'Japonais',
  ko: 'Coréen',
};


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
  
  try {
    // Étape 1: Générer le résumé de base à partir de la source (PDF, YouTube, Texte)
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

    // Étape 2: Préparer le contenu final basé sur le format de sortie
    let finalContent = summaryForProcessing;
    let quizData: QuizData | undefined = undefined;

    if (outputFormat === 'fiche' && summaryForProcessing.trim()) {
        const revisionSheetData = await generateRevisionSheet({ sourceText: summaryForProcessing });
        const keyPointsHtml = revisionSheetData.keyPoints.map(point => `<li>${point}</li>`).join('');
        const qaPairsHtml = revisionSheetData.qaPairs.map(qa => `<dt><strong>${qa.question}</strong></dt><dd>${qa.answer}</dd>`).join('');
        finalContent = `
            <h3 style="font-size: 1.2em; font-weight: bold; margin-bottom: 0.5em;">Résumé</h3>
            <p>${revisionSheetData.summary.replace(/\n/g, '<br/>')}</p>
            <h3 style="font-size: 1.2em; font-weight: bold; margin-bottom: 0.5em; margin-top: 1.2em;">Points clés à retenir</h3>
            <ul>${keyPointsHtml}</ul>
            <h3 style="font-size: 1.2em; font-weight: bold; margin-bottom: 0.5em; margin-top: 1.2em;">Questions & Réponses</h3>
            <dl style="display: grid; grid-template-columns: auto; gap: 0.75em;">${qaPairsHtml}</dl>
        `;
    }

    // Étape 3: Traduire le contenu si nécessaire
    let translatedLabel = "";
    if (targetLanguage !== 'fr' && finalContent) {
        const translationResult = await translateText({ textToTranslate: finalContent, targetLanguage });
        finalContent = translationResult.translatedText;
        translatedLabel = ` (Traduit en ${languageMapDisplay[targetLanguage] || targetLanguage})`;
    }

    // Étape 4: Générer le quiz si demandé
    if (outputFormat === 'qcm' && summaryForProcessing) {
        let textForQuiz = summaryForProcessing;
        // Si la langue cible n'est pas le français, traduire le résumé de base avant de générer le quiz
        if (targetLanguage !== 'fr') {
            const translatedSummaryResult = await translateText({ textToTranslate: summaryForProcessing, targetLanguage });
            textForQuiz = translatedSummaryResult.translatedText;
        }
        quizData = await generateQuiz({ summaryText: textForQuiz });
    }

    // Étape 5: Construire l'objet de retour final
    const finalTitle = `${OutputFormatLabels[outputFormat]} - ${sourceName}${translatedLabel}`;
    
    // Pour le QCM et l'audio, le contenu affiché est différent du 'finalContent' (qui peut être un HTML de fiche)
    if (outputFormat === 'qcm') {
        let summaryForQcmView = summaryForProcessing;
        if (targetLanguage !== 'fr') {
            const result = await translateText({textToTranslate: summaryForProcessing, targetLanguage});
            summaryForQcmView = result.translatedText;
        }
        return {
            title: finalTitle,
            content: `<div class="bg-muted p-4 rounded-lg mb-6 max-h-[200px] overflow-y-auto prose prose-sm sm:prose max-w-none"><p>${summaryForQcmView.replace(/\n/g, '<br/>')}</p></div>`,
            quizData: quizData,
        };
    }

    if (outputFormat === 'audio') {
        let summaryForAudioView = summaryForProcessing;
        if (targetLanguage !== 'fr') {
            const result = await translateText({textToTranslate: summaryForProcessing, targetLanguage});
            summaryForAudioView = result.translatedText;
        }
        const audioContentHtml = summaryForAudioView.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');
        return {
            title: finalTitle,
            content: `
              <h4 style="font-weight: bold; margin-bottom: 0.5em;">🎧 Version Audio</h4>
              <p>Utilisez le bouton "Lire le résumé" ci-dessous pour écouter la synthèse vocale du résumé.</p>
              <p>Contenu textuel du résumé :</p>
              <blockquote style="border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; font-style: italic;">
                <p>${audioContentHtml}</p>
              </blockquote>
            `
        };
    }

    // Pour 'resume' et 'fiche', le contenu est `finalContent`.
    if (outputFormat === 'resume' && !finalContent.startsWith('<')) {
        finalContent = `<p>${finalContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
    }
    
    return {
        title: finalTitle,
        content: finalContent,
    };

  } catch (error) {
    console.error("Error during AI processing:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de la génération ou traduction.";
    throw new Error(errorMessage);
  }
}

const OutputFormatLabels: Record<OutputFormat, string> = {
    resume: "Résumé",
    fiche: "Fiche de révision",
    qcm: "QCM",
    audio: "Version Audio"
};

export interface UserSummaryToSave {
  userId: string;
  title: string;
  content: string; 
  quizData?: QuizData;
  inputType: InputType;
  inputValue: string; 
  outputFormat: OutputFormat;
  targetLanguage: TargetLanguage;
  summaryLength: SummaryLength; 
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
        summaryLength: data.summaryLength as SummaryLength || 'moyen', 
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
