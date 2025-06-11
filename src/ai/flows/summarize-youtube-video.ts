
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

You will be given a YouTube video URL. Your ability to summarize depends on the publicly available information associated with this URL, such as the video's title and description. You **cannot directly watch the video or access its full transcript** through this interface.

Therefore, please provide a summary based on the information you can gather from the video's metadata (title, description, etc.). If the metadata is insufficient for a meaningful summary, state that you can only provide a very general overview based on limited information.

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

