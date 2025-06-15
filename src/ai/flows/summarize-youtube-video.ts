
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
  prompt: `You are an AI assistant tasked with summarizing YouTube videos *in French*.

You will be given a YouTube video URL, and potentially its title and description if they could be fetched.
Please generate a concise summary in French.

YouTube Video URL: {{{youtubeVideoUrl}}}

{{#if videoTitle}}
Video Title: {{{videoTitle}}}
{{/if}}

{{#if videoDescription}}
Video Description:
{{{videoDescription}}}
---
Based on the provided information (URL, title, and description if available), summarize the video.
If title and description are not provided, do your best based on the URL alone, but state that information was limited.
{{else}}
---
The title and description for this video could not be fetched.
Please summarize based on the YouTube Video URL: {{{youtubeVideoUrl}}} as best as possible.
Acknowledge that the summary is based on limited information if applicable.
{{/if}}

Focus on extracting key information. Your summary should reflect the main topics and purpose of the video.
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


    if (!output || !output.summary) {
      let fallbackMessage = "Impossible de générer un résumé pour cette vidéo. ";
      if (videoTitle && videoDescription) {
        fallbackMessage += "Les détails ont été récupérés mais la génération du résumé par l'IA a échoué.";
      } else if (videoId) {
        fallbackMessage += "Les détails de la vidéo n'ont pas pu être récupérés via l'API YouTube (vérifiez la clé API et l'ID de la vidéo). Le résumé est basé sur des informations limitées.";
      } else {
        fallbackMessage += "L'URL de la vidéo semble invalide ou les informations sont insuffisantes.";
      }
      console.warn('[GenkitFlow:summarizeYouTubeVideo] Fallback summary being returned:', fallbackMessage);
      return { summary: fallbackMessage };
    }
    return output;
  }
);

