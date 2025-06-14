
'use server';
/**
 * @fileOverview Summarizes a YouTube video given its URL.
 *
 * - summarizeYouTubeVideo - A function that handles the summarization process.
 * - SummarizeYouTubeVideoInput - The input type for the summarizeYouTubeVideo function.
 * - SummarizeYouTubeVideoOutput - The return type for the summarizeYouTubeVideo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeYouTubeVideoInputSchema = z.object({
  youtubeVideoUrl: z
    .string()
    .describe('The URL of the YouTube video to summarize.'),
});
export type SummarizeYouTubeVideoInput = z.infer<typeof SummarizeYouTubeVideoInputSchema>;

const SummarizeYouTubeVideoOutputSchema = z.object({
  summary: z.string().describe('A summary of the YouTube video.'),
});
export type SummarizeYouTubeVideoOutput = z.infer<typeof SummarizeYouTubeVideoOutputSchema>;

export async function summarizeYouTubeVideo(input: SummarizeYouTubeVideoInput): Promise<SummarizeYouTubeVideoOutput> {
  return summarizeYouTubeVideoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeYouTubeVideoPrompt',
  input: {schema: SummarizeYouTubeVideoInputSchema},
  output: {schema: SummarizeYouTubeVideoOutputSchema},
  prompt: `You are an AI assistant tasked with summarizing YouTube videos *in French*.

You will be given a YouTube video URL. Please do your best to summarize the video.
Focus on extracting key information from the video's title, description, and any other publicly accessible metadata or content you can infer from this URL.
You do not have the ability to watch the video directly or access a full, time-coded transcript.
Your summary should reflect the main topics and purpose of the video based on this available information.

If the information available from the URL is very limited, please state that and provide a brief overview based on what you could find.

YouTube Video URL: {{{youtubeVideoUrl}}}`,
});

const summarizeYouTubeVideoFlow = ai.defineFlow(
  {
    name: 'summarizeYouTubeVideoFlow',
    inputSchema: SummarizeYouTubeVideoInputSchema,
    outputSchema: SummarizeYouTubeVideoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.summary) {
      // Fallback if the summary is empty or undefined
      return { summary: "Impossible de générer un résumé pour cette vidéo. Les informations accessibles depuis l'URL sont peut-être insuffisantes ou la vidéo n'est pas accessible publiquement." };
    }
    return output;
  }
);
