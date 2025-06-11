// src/app/actions.ts
'use server';

import { summarizeText } from '@/ai/flows/summarize-text';
import { summarizeYouTubeVideo } from '@/ai/flows/summarize-youtube-video';
import { z } from 'zod';

export interface SummaryResult {
  title: string;
  content: string; // HTML content
}

const InputTypeSchema = z.enum(['text', 'youtube', 'pdf']);
const OutputFormatSchema = z.enum(['resume', 'fiche', 'qcm', 'audio']);

// This function will be called from the client component
export async function generateSummaryAction(
  inputType: z.infer<typeof InputTypeSchema>,
  inputValue: string, // text content, youtube URL, or PDF file name (for mock)
  outputFormat: z.infer<typeof OutputFormatSchema>
): Promise<SummaryResult> {
  let baseSummary = '';
  let sourceName = '';

  try {
    if (inputType === 'text') {
      sourceName = 'Texte personnalisé';
      if (inputValue.length < 50) throw new Error('Le texte doit contenir au moins 50 caractères.');
      const result = await summarizeText({ text: inputValue });
      baseSummary = result.summary;
    } else if (inputType === 'youtube') {
      sourceName = 'Vidéo YouTube';
      // Basic validation, more robust validation can be added
      if (!inputValue.includes('youtube.com/') && !inputValue.includes('youtu.be/')) {
        throw new Error('Veuillez entrer une URL YouTube valide.');
      }
      const result = await summarizeYouTubeVideo({ youtubeVideoUrl: inputValue });
      baseSummary = result.summary;
    } else if (inputType === 'pdf') {
      sourceName = inputValue; // filename
      // For PDF, we are mocking the summarization process as text extraction is not implemented.
      // In a real application, you would extract text from the PDF here and then call summarizeText.
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
  } catch (error) {
    console.error("Error during AI summarization:", error);
    // Ensure the error message passed to the client is a string
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de la génération du résumé.";
    throw new Error(errorMessage);
  }

  // Adapt baseSummary to the selected outputFormat
  // These are simplified versions based on the user's mock data structure.
  // The AI's `baseSummary` is used as the core content.

  if (outputFormat === 'resume') {
    return {
      title: `Résumé - ${sourceName}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">📋 Points clés principaux :</h4>
        <p>${baseSummary.replace(/\n/g, '<br/>')}</p>
        <h4 style="font-weight: bold; margin-top: 1em; margin-bottom: 0.5em;">🎯 Conclusion :</h4>
        <p>Cette synthèse a été générée par une IA. Elle vise à fournir un aperçu concis du contenu original.</p>
      `
    };
  } else if (outputFormat === 'fiche') {
    return {
      title: `Fiche de révision - ${sourceName}`,
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
    // QCM is largely hardcoded as the AI flow doesn't generate interactive QCMs.
    // The baseSummary is included for context.
    return {
      title: `QCM - ${sourceName}`,
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
      title: `Version Audio - ${sourceName}`,
      content: `
        <h4 style="font-weight: bold; margin-bottom: 0.5em;">🎧 Version Audio (Simulation)</h4>
        <p>La génération audio pour le résumé est une fonctionnalité en cours de développement.</p>
        <p><strong>Contenu du résumé qui serait lu :</strong><br/>${baseSummary.replace(/\n/g, '<br/>')}</p>
        <p><em>Imaginez ici un lecteur audio intégré.</em></p>
      `
    };
  }

  // Default fallback (should ideally not be reached if outputFormat is validated)
  return { title: `Résumé Inconnu - ${sourceName}`, content: baseSummary.replace(/\n/g, '<br/>') };
}
