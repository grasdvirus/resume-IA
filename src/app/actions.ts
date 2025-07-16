
// src/app/actions.ts
'use server';

import { summarizeText } from '@/ai/flows/summarize-text';
import { summarizeYouTubeVideo } from '@/ai/flows/summarize-youtube-video';
import { translateText } from '@/ai/flows/translate-text-flow';
import { generateQuiz, type QuizData } from '@/ai/flows/generate-quiz-flow';
import { generateRevisionSheet, type RevisionSheetData } from '@/ai/flows/generate-revision-sheet-flow';
import { summarizeWikipediaArticle } from '@/ai/flows/summarize-wikipedia-page-flow';
import { z } from 'zod';
import { db } from '@/lib/firebase'; 
import { ref, push, get, remove, set } from 'firebase/database';

export interface SummaryResult {
  title: string;
  content: string; 
  quizData?: QuizData;
  audioText?: string;
  sourceUrl?: string;
}

const InputTypeSchema = z.enum(['text', 'youtube', 'pdf', 'wikipedia']);
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
  let sourceUrl: string | undefined = undefined;
  
  try {
    // Étape 1: Générer le résumé de base à partir de la source (PDF, YouTube, Texte, Wikipedia)
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
      sourceUrl = inputValueOrFileName;
    } else if (inputType === 'pdf') {
      sourceName = inputValueOrFileName; // filename
      if (pdfExtractedText && pdfExtractedText.trim() !== "") {
        const result = await summarizeText({ text: pdfExtractedText, summaryLength });
        summaryForProcessing = result.summary;
      } else {
        summaryForProcessing = `Le traitement du fichier PDF "${inputValueOrFileName}" n'a pas pu extraire de contenu textuel. Veuillez réessayer ou vérifier le fichier. Si le problème persiste, le fichier est peut-être protégé ou corrompu.`;
        sourceName += " (Erreur d'extraction)";
      }
    } else if (inputType === 'wikipedia') {
        const result = await summarizeWikipediaArticle({ searchTerm: inputValueOrFileName, summaryLength });
        summaryForProcessing = result.summary;
        sourceName = `Article Wikipédia : ${result.articleTitle}`;
        sourceUrl = result.articleUrl;
    }

    // Étape 2: Préparer le contenu final basé sur le format de sortie
    let finalContent = summaryForProcessing;
    let quizData: QuizData | undefined = undefined;

    if (outputFormat === 'fiche' && summaryForProcessing.trim()) {
        const revisionSheetData: RevisionSheetData = await generateRevisionSheet({ sourceText: summaryForProcessing });
        finalContent = `
            <div style="border: 1px solid hsl(var(--border)); border-radius: 0.5rem; padding: 1.5rem; background-color: hsl(var(--card));">
                <div style="margin-bottom: 2rem;">
                    <h3 style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.25em; font-weight: 600; color: hsl(var(--primary)); margin-bottom: 0.75em;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.25em; height: 1.25em;"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                        Résumé
                    </h3>
                    <p style="color: hsl(var(--foreground)); line-height: 1.6;">${revisionSheetData.summary.replace(/\n/g, '<br/>')}</p>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h3 style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.25em; font-weight: 600; color: hsl(var(--primary)); margin-bottom: 0.75em;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.25em; height: 1.25em;"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>
                        Points clés à retenir
                    </h3>
                    <ul style="list-style: none; padding-left: 0;">
                        ${revisionSheetData.keyPoints.map(point => `<li style="display: flex; align-items: start; gap: 0.75rem; margin-bottom: 0.5rem; color: hsl(var(--foreground)); line-height: 1.6;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1em; height: 1.1em; flex-shrink: 0; margin-top: 0.2em; color: hsl(var(--accent));"><polyline points="20 6 9 17 4 12"/></svg>
                            <span>${point}</span>
                        </li>`).join('')}
                    </ul>
                </div>

                <div>
                    <h3 style="display: flex; align-items: center; gap: 0.5rem; font-size: 1.25em; font-weight: 600; color: hsl(var(--primary)); margin-bottom: 1em;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.25em; height: 1.25em;"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                        Questions & Réponses
                    </h3>
                    <dl style="display: grid; grid-template-columns: auto; gap: 1.25rem;">
                        ${revisionSheetData.qaPairs.map(qa => `
                            <div>
                                <dt style="font-weight: 600; color: hsl(var(--foreground)); margin-bottom: 0.25rem;">${qa.question}</dt>
                                <dd style="padding-left: 1.5rem; border-left: 3px solid hsl(var(--accent)); color: hsl(var(--muted-foreground)); font-style: italic;">${qa.answer}</dd>
                            </div>
                        `).join('')}
                    </dl>
                </div>
            </div>
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
            sourceUrl: sourceUrl,
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
            `,
            audioText: summaryForAudioView,
            sourceUrl: sourceUrl,
        };
    }

    // Pour 'resume' et 'fiche', le contenu est `finalContent`.
    if (outputFormat === 'resume' && !finalContent.startsWith('<')) {
        finalContent = `<p>${finalContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
    }
    
    return {
        title: finalTitle,
        content: finalContent,
        sourceUrl: sourceUrl,
    };

  } catch (error) {
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
  audioText?: string;
  sourceUrl?: string;
  inputType: InputType;
  inputValue: string; 
  outputFormat: OutputFormat;
  targetLanguage: TargetLanguage;
  summaryLength: SummaryLength; 
  createdAt: number; 
}

export interface UserSavedSummary extends SummaryResult {
  id: string;
  createdAt: string; 
}

// Enregistrer un résumé dans Firebase
export async function saveSummaryAction(userId: string, summary: SummaryResult): Promise<void> {
  const summaryRef = ref(db, `summaries/${userId}`);
  await push(summaryRef, {
      ...summary,
      createdAt: Date.now() // Add timestamp on save
  });
}
