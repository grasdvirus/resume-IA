
'use server';
/**
 * @fileOverview Generates a structured revision sheet from a source text.
 *
 * - generateRevisionSheet - A function that handles the revision sheet generation.
 * - GenerateRevisionSheetInput - The input type for the function.
 * - RevisionSheetData - The structured output data for the revision sheet.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRevisionSheetInputSchema = z.object({
  sourceText: z.string().describe('The source text to create a revision sheet from.'),
});
export type GenerateRevisionSheetInput = z.infer<typeof GenerateRevisionSheetInputSchema>;

const RevisionSheetDataSchema = z.object({
  summary: z.string().describe('A concise summary of the source text.'),
  keyPoints: z.array(z.string()).min(3).max(7).describe('A list of 3 to 7 essential key points to remember.'),
  qaPairs: z.array(z.object({
    question: z.string().describe('A relevant question about the text.'),
    answer: z.string().describe('The corresponding answer to the question.'),
  })).min(3).max(5).describe('A list of 3 to 5 question-and-answer pairs.'),
});
export type RevisionSheetData = z.infer<typeof RevisionSheetDataSchema>;

export async function generateRevisionSheet(input: GenerateRevisionSheetInput): Promise<RevisionSheetData> {
  return generateRevisionSheetFlow(input);
}

const systemPrompt = `
You are an expert in creating educational content. Your task is to generate a structured revision sheet in French based on the provided text.
The revision sheet must contain three distinct sections:
1.  **Résumé concis**: A brief summary of the main ideas.
2.  **Points clés à retenir**: A bulleted list of the most important facts, concepts, or takeaways. There should be between 3 and 7 key points.
3.  **Questions/Réponses**: A set of 3 to 5 relevant questions with their corresponding answers to test comprehension.

You must return a valid JSON object that adheres to the provided Zod schema. Do not add any text or markdown formatting outside of the JSON object.
`;

const generateRevisionSheetPrompt = ai.definePrompt({
  name: 'generateRevisionSheetPrompt',
  system: systemPrompt,
  input: {schema: GenerateRevisionSheetInputSchema},
  output: {schema: RevisionSheetDataSchema},
  prompt: `Générez la fiche de révision en français à partir du texte suivant :

{{{sourceText}}}
`,
});

const generateRevisionSheetFlow = ai.defineFlow(
  {
    name: 'generateRevisionSheetFlow',
    inputSchema: GenerateRevisionSheetInputSchema,
    outputSchema: RevisionSheetDataSchema,
  },
  async (input) => {
    const {output} = await generateRevisionSheetPrompt(input);
    if (!output) {
      throw new Error("Revision sheet generation failed to produce an output.");
    }
    return output;
  }
);
