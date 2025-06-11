
// src/app/actions.ts
'use server';

import { summarizeText } from '@/ai/flows/summarize-text';
import { summarizeYouTubeVideo } from '@/ai/flows/summarize-youtube-video';
import { translateText } from '@/ai/flows/translate-text-flow';
import { generateQuiz, type QuizData } from '@/ai/flows/generate-quiz-flow'; // Nouvelle importation
import { z } from 'zod';

export interface SummaryResult {
  title: string;
  content: string; // HTML content or base text for QCM
  quizData?: QuizData; // Nouveau champ pour les données du quiz
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

    let summaryForProcessing = baseSummary; // Ce sera le texte utilisé pour la traduction ou la génération de QCM

    // Pour les PDF simulés, nous ne voulons pas traduire ni générer de QCM sur la note de démo entière.
    // Nous utilisons la partie "exemple" du contenu.
    if (inputType === 'pdf') {
        const exampleMarker = "Exemple de ce qu'un résumé d'IA pourrait contenir pour un PDF :";
        const exampleContentIndex = baseSummary.indexOf(exampleMarker);
        if (exampleContentIndex !== -1) {
            summaryForProcessing = baseSummary.substring(exampleContentIndex + exampleMarker.length).replace(/<[^>]+>/g, ''); // Strip HTML tags for AI processing
        } else {
            summaryForProcessing = baseSummary.replace(/<[^>]+>/g, ''); // Strip HTML tags
        }
    }


    // Translate summary if target language is not French (original summary is French)
    let processedSummaryForOutput = summaryForProcessing; // Ce sera le résumé affiché ou utilisé pour le QCM

    if (targetLanguage !== 'fr' && summaryForProcessing) {
      const translationResult = await translateText({ textToTranslate: summaryForProcessing, targetLanguage: targetLanguage });
      processedSummaryForOutput = translationResult.translatedText;

      if (inputType === 'pdf') { // Si c'est un PDF, on garde le disclaimer original non traduit
        const disclaimerPart = baseSummary.substring(0, baseSummary.indexOf(summaryForProcessing));
        baseSummary = disclaimerPart + processedSummaryForOutput; // baseSummary devient la version html avec le résumé traduit
      } else {
        baseSummary = processedSummaryForOutput; // Pour texte/youtube, baseSummary est directement le résumé traduit
      }

      if (targetLanguage === 'en') translatedLabel = " (Translated to English)";
      if (targetLanguage === 'es') translatedLabel = " (Traducido al Español)";
    }


    // Generate QCM if selected
    if (outputFormat === 'qcm') {
        // Le QCM doit être généré sur le résumé dans la langue cible
        quizData = await generateQuiz({ summaryText: processedSummaryForOutput });
    }


  } catch (error) {
    console.error("Error during AI processing:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de la génération ou traduction.";
    throw new Error(errorMessage);
  }

  // Adapt baseSummary (qui peut être en HTML pour PDF, ou texte simple pour autres) to the selected outputFormat
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
      `, // Le QCM lui-même sera rendu par le client à partir de quizData
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

  return { title: `Contenu Inconnu - ${sourceName}${translatedLabel}`, content: processedSummaryForOutput.replace(/\n/g, '<br/>') };
}
