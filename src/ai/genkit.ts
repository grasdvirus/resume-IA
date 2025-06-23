import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Check for the GOOGLE_API_KEY at initialization
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Google AI configuration is missing. Please ensure GOOGLE_API_KEY is set in your .env file.");
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
