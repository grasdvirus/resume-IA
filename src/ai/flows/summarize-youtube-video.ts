
'use server';
/**
 * @fileOverview Summarizes a YouTube video given its URL.
 * It now attempts to fetch video details (title, description) using the YouTube Data API
 * to provide better context to the summarization model.
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
  videoTitle: z.string().optional().describe('The fetched title of the YouTube video.'),
  videoDescription: z.string().optional().describe('The fetched description of the YouTube video.')
});
export type SummarizeYouTubeVideoInput = z.infer<typeof SummarizeYouTubeVideoInputSchema>;

// Define the extended schema that includes the length instruction.
const SummarizeYouTubeVideoWithInstructionSchema = SummarizeYouTubeVideoInputSchema.extend({ 
  lengthInstruction: z.string().describe("Instruction for the summary length and style.") 
});

const SummarizeYouTubeVideoOutputSchema = z.object({
  summary: z.string().describe('A summary of the YouTube video.'),
});
export type SummarizeYouTubeVideoOutput = z.infer<typeof SummarizeYouTubeVideoOutputSchema>;


export async function summarizeYouTubeVideo(input: { youtubeVideoUrl: string; summaryLength: SummaryLength }): Promise<SummarizeYouTubeVideoOutput> {
  return summarizeYouTubeVideoFlow(input);
}

const lengthInstructionsMap: Record<SummaryLength, string> = {
  court: "Génère un résumé très concis en 2-3 phrases essentielles.",
  moyen: "Génère un résumé d'un paragraphe complet, bien structuré et facile à lire.",
  long: "Génère un résumé détaillé en 2-3 paragraphes, couvrant les aspects importants de la vidéo d'après son titre et sa description.",
  detaille: "Génère une analyse détaillée avec des points clés clairement identifiés, basés sur le titre et la description. Si pertinent, utilise des titres ou des listes à puces pour structurer les points clés.",
};

const prompt = ai.definePrompt({
  name: 'summarizeYouTubeVideoPrompt',
  input: {schema: SummarizeYouTubeVideoWithInstructionSchema}, // Use the new extended schema
  output: {schema: SummarizeYouTubeVideoOutputSchema},
  prompt: `You are an AI assistant. Your task is to generate a summary *in French* of a YouTube video, based *solely* on the provided URL, title, and description. Do not attempt to access the video content directly.

Your summary must be derived from the text information given to you.

---
INSTRUCTIONS:
1.  **Summary Style**: {{{lengthInstruction}}}
2.  **Source Information**:
    -   YouTube Video URL: {{{youtubeVideoUrl}}}
    {{#if videoTitle}}
    -   Video Title: {{{videoTitle}}}
    {{/if}}
    {{#if videoDescription}}
    -   Video Description: {{{videoDescription}}}
    {{/if}}
3.  **Task**:
    -   Based *only* on the information above, generate a coherent summary in French.
    -   If you have a title and description, use them as the primary source.
    -   If you only have a title, base your summary on that and you can mention that the description was unavailable.
    -   If you have neither title nor description, clearly state that your summary is speculative and based only on the video's URL.
4.  **Final Output**: Provide only the final summary text. Do not add any introductory phrases.
---

Generate the summary now.
`,
});

const summarizeYouTubeVideoFlow = ai.defineFlow(
  {
    name: 'summarizeYouTubeVideoFlow',
    inputSchema: z.object({ youtubeVideoUrl: z.string(), summaryLength: SummarizeYouTubeVideoInputSchema.shape.summaryLength }),
    outputSchema: SummarizeYouTubeVideoOutputSchema,
  },
  async (input) => {
    console.log('[GenkitFlow:summarizeYouTubeVideo] Received input:', input);
    let videoTitle: string | undefined = undefined;
    let videoDescription: string | undefined = undefined;

    const videoId = parseYouTubeVideoId(input.youtubeVideoUrl);
    console.log('[GenkitFlow:summarizeYouTubeVideo] Parsed video ID:', videoId);

    if (videoId) {
      console.log('[GenkitFlow:summarizeYouTubeVideo] Attempting to get video details for ID:', videoId);
      const details = await getVideoDetails(videoId);
      console.log('[GenkitFlow:summarizeYouTubeVideo] Details received from YouTube service:', details);
      if (details) {
        videoTitle = details.title;
        videoDescription = details.description;
      }
    } else {
      console.log('[GenkitFlow:summarizeYouTubeVideo] No video ID could be parsed from URL.');
    }
    
    const lengthInstruction = lengthInstructionsMap[input.summaryLength] || lengthInstructionsMap['moyen'];

    const promptInput: z.infer<typeof SummarizeYouTubeVideoWithInstructionSchema> = {
      youtubeVideoUrl: input.youtubeVideoUrl,
      summaryLength: input.summaryLength,
      videoTitle,
      videoDescription,
      lengthInstruction,
    };
    console.log('[GenkitFlow:summarizeYouTubeVideo] Input for Genkit prompt:', promptInput);

    const {output} = await prompt(promptInput);
    console.log('[GenkitFlow:summarizeYouTubeVideo] Output from Genkit prompt:', output);


    if (!output || !output.summary || output.summary.trim() === "") {
      let fallbackMessage = "Impossible de générer un résumé pour cette vidéo. ";
      if (videoTitle && videoDescription) {
        fallbackMessage += "Les détails ont été récupérés mais la génération du résumé par l'IA a échoué ou produit un résultat vide.";
      } else if (videoId) {
        fallbackMessage += "Les détails de la vidéo (titre, description) n'ont pas pu être récupérés via l'API YouTube (vérifiez la clé API, l'ID de la vidéo, ou la description est peut-être vide). Le résumé est basé sur des informations limitées.";
      } else {
        fallbackMessage += "L'URL de la vidéo semble invalide ou les informations sont insuffisantes.";
      }
      console.warn('[GenkitFlow:summarizeYouTubeVideo] Fallback summary being returned:', fallbackMessage);
      return { summary: fallbackMessage };
    }
    return output;
  }
);
