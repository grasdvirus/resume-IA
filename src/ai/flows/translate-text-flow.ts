
'use server';
/**
 * @fileOverview A text translation AI agent.
 *
 * - translateText - A function that handles the text translation process.
 * - TranslateTextInput - The input type for the translateText function.
 * - TranslateTextOutput - The return type for the translateText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {TargetLanguage} from '@/app/actions'; // Utilisation de import type

const TranslateTextInputSchema = z.object({
  textToTranslate: z.string().describe('The text to translate.'),
  targetLanguage: z.custom<TargetLanguage>().describe('The target language code (e.g., "en", "es", "fr", "de", "it", "pt", "ja", "ko").'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const languageMap: Record<TargetLanguage, string> = {
  fr: 'French',
  en: 'English',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
};

const translateTextPrompt = ai.definePrompt({
  name: 'translateTextPrompt',
  input: {schema: TranslateTextInputSchema.extend({ targetLanguageName: z.string() })}, // Add targetLanguageName for prompt
  output: {schema: TranslateTextOutputSchema},
  prompt: `Translate the following text into {{targetLanguageName}}.
The original text is likely in French.
IMPORTANT: If the text contains HTML tags (like <h2>, <p>, <ul>, <li>, <strong>, <dt>, <dd>), you MUST preserve these tags in their correct positions in the translated output. Only translate the text content within the tags.
Provide only the translated text, without any introductory phrases like "Here is the translation:" or markdown formatting.

Text to translate:
{{{textToTranslate}}}
`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async input => {
    const targetLanguageName = languageMap[input.targetLanguage] || input.targetLanguage;
    const {output} = await translateTextPrompt({
        ...input,
        targetLanguageName,
    });
    return output!;
  }
);
