
// src/ai/flows/summarize-text.ts
'use server';
/**
 * @fileOverview A text summarization AI agent.
 *
 * - summarizeText - A function that handles the text summarization process.
 * - SummarizeTextInput - The input type for the summarizeText function.
 * - SummarizeTextOutput - The return type for the summarizeText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { SummaryLength } from '@/app/actions'; // Importer le type

const SummarizeTextInputSchema = z.object({
  text: z.string().describe('The text to summarize.'),
  summaryLength: z.enum(['court', 'moyen', 'long', 'detaille']).describe('The desired length of the summary.'),
});
export type SummarizeTextInput = z.infer<typeof SummarizeTextInputSchema>;

const SummarizeTextOutputSchema = z.object({
  summary: z.string().describe('The summary of the text.'),
});
export type SummarizeTextOutput = z.infer<typeof SummarizeTextOutputSchema>;

export async function summarizeText(input: SummarizeTextInput): Promise<SummarizeTextOutput> {
  return summarizeTextFlow(input);
}

const lengthInstructionsMap: Record<SummaryLength, string> = {
  court: "Génère un résumé très concis en 2-3 phrases essentielles.",
  moyen: "Génère un résumé d'un paragraphe complet, bien structuré et facile à lire.",
  long: "Génère un résumé détaillé en 2-3 paragraphes, couvrant les aspects importants du texte.",
  detaille: "Génère une analyse détaillée avec des points clés clairement identifiés. Si pertinent, utilise des titres ou des listes à puces pour structurer les points clés.",
};


const summarizeTextPrompt = ai.definePrompt({
  name: 'summarizeTextPrompt',
  input: {schema: SummarizeTextInputSchema.extend({ lengthInstruction: z.string() })},
  output: {schema: SummarizeTextOutputSchema},
  prompt: `Summarize the following text in French.
Instruction for summary length and style: {{{lengthInstruction}}}

Text to summarize:
{{{text}}}
`,
});

const summarizeTextFlow = ai.defineFlow(
  {
    name: 'summarizeTextFlow',
    inputSchema: SummarizeTextInputSchema,
    outputSchema: SummarizeTextOutputSchema,
  },
  async (input) => {
    const lengthInstruction = lengthInstructionsMap[input.summaryLength] || lengthInstructionsMap['moyen'];
    const {output} = await summarizeTextPrompt({
      ...input,
      lengthInstruction,
    });
    if (!output || !output.summary) {
      // Fallback si la sortie est vide
      return { summary: "Impossible de générer un résumé pour le texte fourni avec les options sélectionnées." };
    }
    return output;
  }
);

