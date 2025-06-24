'use server';

import { google } from 'googleapis';
import he from 'he';

interface VideoDetails {
  title: string;
  description: string;
}

const YOUTUBE_ID_REGEX = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export async function parseYouTubeVideoId(url: string): Promise<string | null> {
  const match = url.match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
}

/**
 * Fetches video details using the official YouTube Data API v3.
 * This is the robust method for production environments.
 * @param videoId The 11-character YouTube video ID.
 * @returns An object with the video title and description, or null if it fails.
 */
export async function getVideoDetails(videoId: string): Promise<VideoDetails | null> {
  if (!videoId) {
    return null;
  }
  
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error("Configuration du serveur incomplète : la variable d'environnement YOUTUBE_API_KEY est manquante. Veuillez l'ajouter à vos paramètres Vercel.");
  }

  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    });

    const response = await youtube.videos.list({
      part: ['snippet'],
      id: [videoId],
    });

    const video = response.data.items?.[0];

    if (!video || !video.snippet) {
      throw new Error("La vidéo n'a pas été trouvée ou ses détails sont inaccessibles via l'API. La vidéo est peut-être privée ou a été supprimée.");
    }

    return {
      title: he.decode(video.snippet.title || 'Titre non disponible'),
      description: he.decode(video.snippet.description || ''), // Return empty string instead of fallback text
    };
    
  } catch (error: any) {
    // Intercept common API errors to give more specific feedback.
    if (error.message.includes('API key not valid') || error.message.includes('invalid')) {
        throw new Error("La clé API YouTube (YOUTUBE_API_KEY) est invalide. Veuillez vérifier sa valeur dans votre environnement de déploiement (Vercel).");
    }
    if (error.message.includes('quota')) {
       throw new Error("Le quota de l'API YouTube a été dépassé. Veuillez vérifier votre consommation sur la console Google Cloud.");
    }
    // Generic error for other issues (network, permissions, etc.)
    throw new Error("Impossible de contacter l'API YouTube. Vérifiez la clé API, les quotas, et les restrictions (par ex: HTTP referrers) sur la console Google Cloud.");
  }
}
