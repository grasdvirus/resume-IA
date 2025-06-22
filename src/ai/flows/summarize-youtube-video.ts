'use server';
/**
 * @fileOverview Summarizes a YouTube video given its URL by fetching its metadata (title and description).
 *
 * - summarizeYouTubeVideo - A function that handles the summarization process.
 * - SummarizeYouTubeVideoInput - The input type for the summarizeYouTubeVideo function.
 * - SummarizeYouTubeVideoOutput - The return type for the summarizeYouTubeVideo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getVideoDetails, parseYouTubeVideoId } from '@/services/youtube'; 
import type { SummaryLength } from '@/app/actions';

const SummarizeYouTubeVideoInputSchema = z.object({
  youtubeVideoUrl: z
    .string()
    .describe('The URL of the YouTube video to summarize.'),
  summaryLength: z.enum(['court', 'moyen', 'long', 'detaille']).describe('The desired length of the summary.'),
});
export type SummarizeYouTubeVideoInput = z.infer<typeof SummarizeYouTubeVideoInputSchema>;

const SummarizeYouTubeVideoOutputSchema = z.object({
  summary: z.string().describe('A summary of the YouTube video based on its title and description.'),
});
export type SummarizeYouTubeVideoOutput = z.infer<typeof SummarizeYouTubeVideoOutputSchema>;

export async function summarizeYouTubeVideo(input: SummarizeYouTubeVideoInput): Promise<SummarizeYouTubeVideoOutput> {
  return summarizeYouTubeVideoFlow(input);
}

const lengthInstructionsMap: Record<SummaryLength, string> = {
  court: "Génère un résumé très concis en 2-3 phrases essentielles.",
  moyen: "Génère un résumé d'un paragraphe complet, bien structuré et facile à lire.",
  long: "Génère un résumé détaillé en 2-3 paragraphes, couvrant les aspects importants du texte.",
  detaille: "Génère une analyse détaillée avec des points clés clairement identifiés. Si pertinent, utilise des titres ou des listes à puces pour structurer les points clés.",
};

const summarizeYouTubePrompt = ai.definePrompt({
    name: 'summarizeYouTubePrompt',
    input: {schema: z.object({
        videoTitle: z.string(),
        videoDescription: z.string(),
        lengthInstruction: z.string(),
    })},
    output: {schema: SummarizeYouTubeVideoOutputSchema},
    prompt: `Vous êtes un assistant IA expert dans la synthèse de contenu vidéo.
Votre tâche est de générer un résumé en français basé UNIQUEMENT sur le titre et la description de la vidéo fournis.

Instruction pour la longueur et le style du résumé : {{{lengthInstruction}}}

---
Titre: {{{videoTitle}}}
Description: {{{videoDescription}}}
---

Générez le résumé maintenant.
`,
});


const summarizeYouTubeVideoFlow = ai.defineFlow(
  {
    name: 'summarizeYouTubeVideoFlow',
    inputSchema: SummarizeYouTubeVideoInputSchema,
    outputSchema: SummarizeYouTubeVideoOutputSchema,
  },
  async (input) => {
    const videoId = await parseYouTubeVideoId(input.youtubeVideoUrl);
    
    if (!videoId) {
      throw new Error("L'URL de la vidéo YouTube est invalide ou l'ID n'a pas pu être extrait.");
    }
    
    const videoDetails = await getVideoDetails(videoId);

    if (!videoDetails) {
        throw new Error(`Impossible de récupérer les détails (titre/description) pour la vidéo. Vérifiez l'URL ou la validité de la clé API YouTube.`);
    }

    const lengthInstruction = lengthInstructionsMap[input.summaryLength];

    const { output } = await summarizeYouTubePrompt({
        videoTitle: videoDetails.title || 'Titre non disponible',
        videoDescription: videoDetails.description || 'Aucune description fournie.',
        lengthInstruction,
    });
    
     if (!output || !output.summary) {
        throw new Error("La génération du résumé à partir des métadonnées de la vidéo a échoué.");
    }
    return output;
  }
);
