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
  prompt: `You are an expert summarizer of YouTube videos. Given a YouTube video URL, you will summarize the video in French.

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
    return output!;
  }
);

