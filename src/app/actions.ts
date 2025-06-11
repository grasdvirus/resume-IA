
// src/app/actions.ts
'use server';

import { summarizeText } from '@/ai/flows/summarize-text';
import { summarizeYouTubeVideo } from '@/ai/flows/summarize-youtube-video';
import { translateText } from '@/ai/flows/translate-text-flow';
import { z } from 'zod';

export interface SummaryResult {
  title: string;
  content: string; // HTML content
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
        Le système actuel <em>ne lit pas et n'analyse pas le contenu du fichier PDF ${inputValue}</em>. Le "résumé" ci-dessous est un exemple générique pour illustrer le format de sortie et le flux de travail.
        Pour une fonctionnalité complète, il faudrait intégrer une bibliothèque d'extraction de texte PDF (comme pdf.js côté client) ou un traitement backend pour analyser le fichier.
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

    // Translate summary if target language is not French (assuming original summary is French)
    if (targetLanguage !== 'fr' && baseSummary) {
      // For PDF simulation, we also "translate" the generic content.
      // For real summaries, this would translate the actual AI-generated summary.
      let textToTranslateForSummary = baseSummary;
      if (inputType === 'pdf') {
        // Extract only the "example" part for translation to avoid re-translating the disclaimer.
        const exampleMarker = "Exemple de ce qu'un résumé d'IA pourrait contenir pour un PDF :";
        const exampleContentIndex = baseSummary.indexOf(exampleMarker);
        if (exampleContentIndex !== -1) {
            textToTranslateForSummary = baseSummary.substring(exampleContentIndex + exampleMarker.length);
        }
      }
      
      const translationResult = await translateText({ textToTranslate: textToTranslateForSummary, targetLanguage: targetLanguage });
      
      if (inputType === 'pdf') {
        const disclaimerPart = baseSummary.substring(0, baseSummary.indexOf(exampleMarker) + exampleMarker.length);
        baseSummary = disclaimerPart + translationResult.translatedText;
      } else {
        baseSummary = translationResult.translatedText;
      }

      if (targetLanguage === 'en') translatedLabel = " (Translated to English)";
      if (targetLanguage === 'es') translatedLabel = " (Traducido al Español)";
    }

  } catch (error) {
    console.error("Error during AI processing:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de la génération ou traduction.";
    throw new Error(errorMessage);
  }

  // Adapt baseSummary to the selected outputFormat
  if (outputFormat === 'resume') {
    // For PDF, if it's a simulation, we ensure the baseSummary (which includes the disclaimer) is used.
    // Otherwise, for text/youtube, it's the direct (potentially translated) summary.
    const contentForResume = baseSummary; 
    return {
      title: `Résumé - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">📋 Points clés principaux :</h4>
        <p>${contentForResume.replace(/\n/g, '<br/>')}</p>
        <h4 style="font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">🎯 Conclusion :</h4>
        <p>Cette synthèse a été générée et potentiellement traduite par une IA. Elle vise à fournir un aperçu concis du contenu original.</p>
      `
    };
  } else if (outputFormat === 'fiche') {
    const contentForFiche = baseSummary;
    return {
      title: `Fiche de révision - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">📚 FICHE DE RÉVISION</h4>
        <div style="background: #e3f2fd; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <h5 style="font-weight: bold;">🔑 MOTS-CLÉS (Exemple basé sur le résumé)</h5>
            <p><strong>Innovation • Méthodologie • Optimisation • Performance</strong> (Ces mots seraient extraits dynamiquement dans une version avancée)</p>
        </div>
        <h5 style="font-weight: bold;">📖 CONTENU PRINCIPAL</h5>
        <p>${contentForFiche.replace(/\n/g, '<br/>')}</p>
        <div style="background: #fff3e0; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <h5 style="font-weight: bold;">💡 À RETENIR (Exemple)</h5>
            <p>Le point le plus crucial à retenir de ce résumé est [suggestion basée sur le début du résumé : ${contentForFiche.substring(0, 100)}...].</p>
        </div>
      `
    };
  } else if (outputFormat === 'qcm') {
    const contentForQCM = baseSummary;
    return {
      title: `QCM - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">❓ QUESTIONNAIRE D'ÉVALUATION (Exemple)</h4>
        <p><strong>Résumé de base pour contexte:</strong><br/>${contentForQCM.replace(/\n/g, '<br/>')}</p>
        
        <div id="qcm-container">
          <div class="qcm-question-block" style="margin: 1.5rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 8px;">
              <h5 style="font-weight: bold;">Question 1 : Quel est le thème principal abordé dans le résumé ?</h5>
              <div style="margin: 0.5rem 0;">
                  <label><input type="radio" name="q1" value="q1a"/> A) Un sujet non pertinent</label><br/>
                  <label><input type="radio" name="q1" value="q1b"/> B) Le thème central du résumé fourni</label><br/>
                  <label><input type="radio" name="q1" value="q1c"/> C) Un détail mineur</label>
              </div>
          </div>
           <div class="qcm-question-block" style="margin: 1.5rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 8px;">
              <h5 style="font-weight: bold;">Question 2 : L'IA a-t-elle généré ce résumé ?</h5>
              <div style="margin: 0.5rem 0;">
                  <label><input type="radio" name="q2" value="q2a"/> A) Oui</label><br/>
                  <label><input type="radio" name="q2" value="q2b"/> B) Non</label>
              </div>
          </div>
        </div>
        <button id="check-qcm-answers-button" class="action-btn btn-primary">Vérifier mes réponses</button>
        <p id="qcm-result-text" style="margin-top: 1rem; font-weight: bold;"></p>
      `
    };
  } else if (outputFormat === 'audio') {
    const contentForAudio = baseSummary;
    return {
      title: `Version Audio - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">🎧 Version Audio</h4>
        <p>Utilisez le bouton "Lire le résumé" ci-dessous pour écouter la synthèse vocale.</p>
        <p>Contenu textuel du résumé :</p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; font-style: italic;">
          ${contentForAudio.replace(/\n/g, '<br/>')}
        </blockquote>
      `
    };
  }

  return { title: `Contenu Inconnu - ${sourceName}${translatedLabel}`, content: baseSummary.replace(/\n/g, '<br/>') };
}

