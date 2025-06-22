
'use server';
/**
 * @fileOverview Summarizes a Wikipedia article.
 * - summarizeWikipediaArticle - Searches for and summarizes a Wikipedia article.
 * - SummarizeWikipediaArticleInput - The input type.
 * - SummarizeWikipediaArticleOutput - The output type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { searchWikipedia, getWikipediaPageContent } from '@/services/wikipedia';
import type { SummaryLength } from '@/app/actions';

const SummarizeWikipediaArticleInputSchema = z.object({
  searchTerm: z.string().describe('The term to search for on Wikipedia.'),
  summaryLength: z.enum(['court', 'moyen', 'long', 'detaille']).describe('The desired length of the summary.'),
});
export type SummarizeWikipediaArticleInput = z.infer<typeof SummarizeWikipediaArticleInputSchema>;

const SummarizeWikipediaArticleOutputSchema = z.object({
  summary: z.string().describe('The summary of the Wikipedia article.'),
  articleTitle: z.string().describe('The title of the summarized Wikipedia article.'),
  articleUrl: z.string().describe('The URL of the Wikipedia article.'),
});
export type SummarizeWikipediaArticleOutput = z.infer<typeof SummarizeWikipediaArticleOutputSchema>;


export async function summarizeWikipediaArticle(input: SummarizeWikipediaArticleInput): Promise<SummarizeWikipediaArticleOutput> {
  return summarizeWikipediaArticleFlow(input);
}

const lengthInstructionsMap: Record<SummaryLength, string> = {
    court: "Génère un résumé très concis en 2-3 phrases essentielles.",
    moyen: "Génère un résumé d'un paragraphe complet, bien structuré et facile à lire.",
    long: "Génère un résumé détaillé en 2-3 paragraphes, couvrant les aspects importants du texte.",
    detaille: "Génère une analyse détaillée avec des points clés clairement identifiés. Si pertinent, utilise des titres ou des listes à puces pour structurer les points clés.",
};

const summarizeWikipediaPrompt = ai.definePrompt({
  name: 'summarizeWikipediaPrompt',
  input: {
    schema: z.object({
      articleContent: z.string(),
      lengthInstruction: z.string(),
    }),
  },
  output: {
    schema: z.object({ summary: z.string() }),
  },
  prompt: `Résume le texte suivant, qui provient d'un article Wikipédia, en français.
Instruction pour la longueur et le style du résumé : {{{lengthInstruction}}}

Texte de l'article à résumer :
{{{articleContent}}}
`,
});

const summarizeWikipediaArticleFlow = ai.defineFlow(
  {
    name: 'summarizeWikipediaArticleFlow',
    inputSchema: SummarizeWikipediaArticleInputSchema,
    outputSchema: SummarizeWikipediaArticleOutputSchema,
  },
  async (input) => {
    const searchResult = await searchWikipedia(input.searchTerm);
    if (!searchResult) {
      throw new Error(`Aucun article Wikipédia trouvé pour "${input.searchTerm}".`);
    }

    const articleContent = await getWikipediaPageContent(searchResult.title);
    if (!articleContent) {
      throw new Error(`Impossible de récupérer le contenu pour l'article Wikipédia "${searchResult.title}".`);
    }

    const lengthInstruction = lengthInstructionsMap[input.summaryLength];
    const { output } = await summarizeWikipediaPrompt({
      articleContent,
      lengthInstruction,
    });

    if (!output || !output.summary) {
      throw new Error("La génération du résumé de l'article Wikipédia a échoué.");
    }
    
    return {
      summary: output.summary,
      articleTitle: searchResult.title,
      articleUrl: searchResult.url,
    };
  }
);
