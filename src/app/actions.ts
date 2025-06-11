
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
      baseSummary = `Ceci est un résumé simulé pour le fichier PDF : ${inputValue}. 
      Dans une application réelle, le contenu textuel du PDF serait extrait et analysé par l'IA. 
      Ce résumé fictif met en évidence les points clés typiques qu'une IA pourrait identifier, tels que l'objectif principal du document, les méthodologies employées, les résultats obtenus et les conclusions principales.
      Des sections spécifiques pourraient inclure:
      - Introduction et Contexte
      - Méthodes et Approches
      - Découvertes et Analyses
      - Conclusion et Recommandations
      L'IA s'efforcerait de fournir une synthèse concise et pertinente.`;
    }

    // Translate summary if target language is not French (assuming original summary is French)
    if (targetLanguage !== 'fr' && baseSummary) {
      const translationResult = await translateText({ textToTranslate: baseSummary, targetLanguage: targetLanguage });
      baseSummary = translationResult.translatedText;
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
    return {
      title: `Résumé - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">📋 Points clés principaux :</h4>
        <p>${baseSummary.replace(/\n/g, '<br/>')}</p>
        <h4 style="font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">🎯 Conclusion :</h4>
        <p>Cette synthèse a été générée et potentiellement traduite par une IA. Elle vise à fournir un aperçu concis du contenu original.</p>
      `
    };
  } else if (outputFormat === 'fiche') {
    return {
      title: `Fiche de révision - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">📚 FICHE DE RÉVISION</h4>
        <div style="background: #e3f2fd; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <h5 style="font-weight: bold;">🔑 MOTS-CLÉS (Exemple basé sur le résumé)</h5>
            <p><strong>Innovation • Méthodologie • Optimisation • Performance</strong> (Ces mots seraient extraits dynamiquement dans une version avancée)</p>
        </div>
        <h5 style="font-weight: bold;">📖 CONTENU PRINCIPAL</h5>
        <p>${baseSummary.replace(/\n/g, '<br/>')}</p>
        <div style="background: #fff3e0; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <h5 style="font-weight: bold;">💡 À RETENIR (Exemple)</h5>
            <p>Le point le plus crucial à retenir de ce résumé est [suggestion basée sur le début du résumé : ${baseSummary.substring(0, 100)}...].</p>
        </div>
      `
    };
  } else if (outputFormat === 'qcm') {
    return {
      title: `QCM - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">❓ QUESTIONNAIRE D'ÉVALUATION (Exemple)</h4>
        <p><strong>Résumé de base pour contexte:</strong><br/>${baseSummary.replace(/\n/g, '<br/>')}</p>
        
        <div id="qcm-form" style="margin: 1.5rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 8px;">
            <h5 style="font-weight: bold;">Question 1 : Quel est le thème principal abordé dans le résumé ?</h5>
            <div style="margin: 0.5rem 0;">
                <label><input type="radio" name="q1" value="a"/> A) Un sujet non pertinent</label><br/>
                <label><input type="radio" name="q1" value="b"/> B) Le thème central du résumé fourni</label><br/>
                <label><input type="radio" name="q1" value="c"/> C) Un détail mineur</label>
            </div>
        </div>
         <div style="margin: 1.5rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 8px;">
            <h5 style="font-weight: bold;">Question 2 : L'IA a-t-elle généré ce résumé ?</h5>
            <div style="margin: 0.5rem 0;">
                <label><input type="radio" name="q2" value="a"/> A) Oui</label><br/>
                <label><input type="radio" name="q2" value="b"/> B) Non</label>
            </div>
        </div>
        <button class="action-btn btn-primary">Vérifier mes réponses</button>
        <p id="qcm-result" style="margin-top: 1rem; font-weight: bold;"></p>
      `
    };
  } else if (outputFormat === 'audio') {
    return {
      title: `Version Audio - ${sourceName}${translatedLabel}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">🎧 Version Audio (Simulation)</h4>
        <p>La génération d'une version audio de ce résumé est une fonctionnalité qui sera bientôt disponible.</p>
        <p>En attendant, voici le contenu textuel du résumé :</p>
        <blockquote style="border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; font-style: italic;">
          ${baseSummary.replace(/\n/g, '<br/>')}
        </blockquote>
        <p style="margin-top: 1em;"><em>Imaginez ici un lecteur audio intégré pour écouter ce texte.</em></p>
      `
    };
  }

  return { title: `Contenu Inconnu - ${sourceName}${translatedLabel}`, content: baseSummary.replace(/\n/g, '<br/>') };
}

