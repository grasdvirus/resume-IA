
'use server';
/**
 * @fileOverview Summarizes a YouTube video given its URL by fetching its transcript.
 *
 * - summarizeYouTubeVideo - A function that handles the summarization process.
 * - SummarizeYouTubeVideoInput - The input type for the summarizeYouTubeVideo function.
 * - SummarizeYouTubeVideoOutput - The return type for the summarizeYouTubeVideo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getVideoDetails, getYouTubeTranscript, parseYouTubeVideoId } from '@/services/youtube'; 
import type { SummaryLength } from '@/app/actions';

const SummarizeYouTubeVideoInputSchema = z.object({
  youtubeVideoUrl: z
    .string()
    .describe('The URL of the YouTube video to summarize.'),
  summaryLength: z.enum(['court', 'moyen', 'long', 'detaille']).describe('The desired length of the summary.'),
});
export type SummarizeYouTubeVideoInput = z.infer<typeof SummarizeYouTubeVideoInputSchema>;

const SummarizeYouTubeVideoOutputSchema = z.object({
  summary: z.string().describe('A summary of the YouTube video.'),
});
export type SummarizeYouTubeVideoOutput = z.infer<typeof SummarizeYouTubeVideoOutputSchema>;

export async function summarizeYouTubeVideo(input: SummarizeYouTubeVideoInput): Promise<SummarizeYouTubeVideoOutput> {
  return summarizeYouTubeVideoFlow(input);
}

const lengthInstructionsMap: Record<SummaryLength, string> = {
  court: "Génère un résumé très concis en 2-3 phrases essentielles.",
  moyen: "Génère un résumé d'un paragraphe complet, bien structuré et facile à lire.",
  long: "Génère un résumé détaillé en 2-3 paragraphes, couvrant les aspects importants du texte.",
  detaille: "Génère une analyse détaillée avec des points clés clairement identifiés. Si pertinent, utilise des titres ou des listes à puces pour structurer les points clés.",
};

const promptWithTranscript = ai.definePrompt({
  name: 'summarizeYouTubeTranscriptPrompt',
  input: {schema: z.object({
      transcript: z.string(),
      videoTitle: z.string(),
      lengthInstruction: z.string(),
  })},
  output: {schema: SummarizeYouTubeVideoOutputSchema},
  prompt: `Vous êtes un assistant IA expert dans la synthèse de contenu vidéo.
Le titre de la vidéo est "{{{videoTitle}}}".
Votre tâche est de générer un résumé en français de la transcription de la vidéo YouTube fournie ci-dessous.

Instruction pour la longueur et le style du résumé : {{{lengthInstruction}}}

---
Transcription de la vidéo :
{{{transcript}}}
---

Générez le résumé maintenant.
`,
});

const promptWithMetadata = ai.definePrompt({
    name: 'summarizeYouTubeMetadataPrompt',
    input: {schema: z.object({
        videoTitle: z.string(),
        videoDescription: z.string(),
        lengthInstruction: z.string(),
    })},
    output: {schema: SummarizeYouTubeVideoOutputSchema},
    prompt: `Vous êtes un assistant IA expert dans la synthèse de contenu vidéo.
La transcription de cette vidéo n'est pas disponible. Votre tâche est de générer un résumé en français basé UNIQUEMENT sur le titre et la description de la vidéo.

Instruction pour la longueur et le style du résumé : {{{lengthInstruction}}}

---
Titre: {{{videoTitle}}}
Description: {{{videoDescription}}}
---

Générez le résumé maintenant, et mentionnez que la transcription n'était pas disponible.
`,
});


const summarizeYouTubeVideoFlow = ai.defineFlow(
  {
    name: 'summarizeYouTubeVideoFlow',
    inputSchema: SummarizeYouTubeVideoInputSchema,
    outputSchema: SummarizeYouTubeVideoOutputSchema,
  },
  async (input) => {
    console.log('[Flow:summarizeYouTubeVideo] Received input:', input);
    const videoId = parseYouTubeVideoId(input.youtubeVideoUrl);
    
    if (!videoId) {
      throw new Error("L'URL de la vidéo YouTube est invalide ou l'ID n'a pas pu être extrait.");
    }
    
    console.log(`[Flow:summarizeYouTubeVideo] Parsed video ID: ${videoId}`);
    const lengthInstruction = lengthInstructionsMap[input.summaryLength];
    
    // First, try to get the transcript
    const transcript = await getYouTubeTranscript(videoId);
    const videoDetails = await getVideoDetails(videoId);
    const videoTitle = videoDetails?.title || 'Titre inconnu';

    if (transcript) {
        console.log(`[Flow:summarizeYouTubeVideo] Got transcript with length: ${transcript.length}. Summarizing content.`);
        const { output } = await promptWithTranscript({
            transcript,
            videoTitle,
            lengthInstruction,
        });
        if (!output || !output.summary) {
            throw new Error("La génération du résumé à partir de la transcription a échoué.");
        }
        return output;
    }

    // Fallback: If no transcript, try to summarize from metadata
    console.warn(`[Flow:summarizeYouTubeVideo] No transcript found for ${videoId}. Falling back to metadata summary.`);
    if (videoDetails && videoDetails.description) {
        const { output } = await promptWithMetadata({
            videoTitle,
            videoDescription: videoDetails.description,
            lengthInstruction,
        });
         if (!output || !output.summary) {
            throw new Error("La génération du résumé à partir des métadonnées a échoué.");
        }
        return output;
    }
    
    // If we reach here, we have neither transcript nor metadata.
    throw new Error(`Impossible de récupérer la transcription ou les détails pour la vidéo. Le résumé ne peut pas être généré.`);
  }
);
