
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-text.ts';
import '@/ai/flows/summarize-youtube-video.ts';
import '@/ai/flows/translate-text-flow.ts';
import '@/ai/flows/generate-quiz-flow.ts';
import '@/ai/flows/generate-revision-sheet-flow.ts';
import '@/ai/flows/summarize-wikipedia-page-flow.ts'; // Ajout du nouveau flux
