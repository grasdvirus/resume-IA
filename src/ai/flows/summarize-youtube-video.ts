
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
import { getVideoDetails, parseYouTubeVideoId } from '@/services/youtube'; // Import new service

const SummarizeYouTubeVideoInputSchema = z.object({
  youtubeVideoUrl: z
    .string()
    .describe('The URL of the YouTube video to summarize.'),
  // Fields to optionally pass video details if already fetched or for direct use
  // These will be populated by the flow itself after calling the YouTube service.
  videoTitle: z.string().optional().describe('The fetched title of the YouTube video.'),
  videoDescription: z.string().optional().describe('The fetched description of the YouTube video.')
});
export type SummarizeYouTubeVideoInput = z.infer<typeof SummarizeYouTubeVideoInputSchema>;

const SummarizeYouTubeVideoOutputSchema = z.object({
  summary: z.string().describe('A summary of the YouTube video.'),
});
export type SummarizeYouTubeVideoOutput = z.infer<typeof SummarizeYouTubeVideoOutputSchema>;

export async function summarizeYouTubeVideo(input: { youtubeVideoUrl: string }): Promise<SummarizeYouTubeVideoOutput> {
  // The flow input type (SummarizeYouTubeVideoInput) includes optional title/description,
  // but the exported function signature should only require youtubeVideoUrl for simplicity for the caller.
  // The flow will populate title/description internally.
  return summarizeYouTubeVideoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeYouTubeVideoPrompt',
  input: {schema: SummarizeYouTubeVideoInputSchema},
  output: {schema: SummarizeYouTubeVideoOutputSchema},
  prompt: `You are an AI assistant. Your task is to generate a concise summary *in French* of a YouTube video, based *solely* on the provided URL, title, and description.
Do not attempt to access the video content directly. Your summary must be derived from the text information given to you.

YouTube Video URL: {{{youtubeVideoUrl}}}

{{#if videoTitle}}
Video Title: {{{videoTitle}}}
{{/if}}

{{#if videoDescription}}
Video Description (use this as the primary source for your summary):
{{{videoDescription}}}
---
Based *only* on the title and description above (if available), please:
1. Identify the main subject of the video.
2. Describe the likely target audience.
3. List the key topics or questions the video probably addresses, according to its title and description.
Present this as a coherent paragraph.

If the description is very short or uninformative, state that the summary is primarily based on the title.
If title and description are not provided, clearly state that the summary is speculative and based only on the URL.
{{else}}
---
The title and description for this video could not be fetched or were not provided.
Based *only* on the YouTube Video URL: {{{youtubeVideoUrl}}}, provide a speculative summary. Clearly state that this summary is speculative due to limited information.
{{/if}}

The summary should be in French.
`,
});

const summarizeYouTubeVideoFlow = ai.defineFlow(
  {
    name: 'summarizeYouTubeVideoFlow',
    // The flow's internal input type can be the extended one,
    // but its public-facing input (from the wrapper function) is just { youtubeVideoUrl: string }
    inputSchema: z.object({ youtubeVideoUrl: z.string() }),
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

    const promptInput: SummarizeYouTubeVideoInput = {
      youtubeVideoUrl: input.youtubeVideoUrl,
      videoTitle,
      videoDescription,
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

