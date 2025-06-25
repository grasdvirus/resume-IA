'use server';

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
 * Fetches video details using a direct fetch call to the YouTube Data API v3.
 * @param videoId The 11-character YouTube video ID.
 * @returns An object with the video title and description, or null if it fails.
 */
export async function getVideoDetails(videoId: string): Promise<VideoDetails | null> {
  if (!videoId) {
    return null;
  }
  
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("Configuration du serveur incomplète : la variable d'environnement YOUTUBE_API_KEY est manquante. Veuillez l'ajouter à vos paramètres Vercel.");
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.append('part', 'snippet');
  url.searchParams.append('id', videoId);
  url.searchParams.append('key', apiKey);

  try {
    const response = await fetch(url.toString(), {
        headers: {
            'Accept': 'application/json',
        },
    });
    const data = await response.json();

    if (!response.ok) {
      const error = data.error?.errors?.[0];
      if (error) {
        const reason = error.reason;
        if (reason === 'keyInvalid' || error.message.includes('API key not valid')) {
          throw new Error("La clé API YouTube (YOUTUBE_API_KEY) est invalide. Veuillez vérifier sa valeur dans les variables d'environnement de Vercel.");
        }
        if (reason === 'ipRefererBlocked' || reason === 'httpRefererBlocked') {
          throw new Error("La requête a été bloquée à cause des restrictions de la clé API. Assurez-vous que le domaine de votre application Vercel est autorisé dans les 'Restrictions de clé API' (HTTP referrers) sur la console Google Cloud.");
        }
        if (reason === 'accessNotConfigured' || reason === 'forbidden') {
           throw new Error("L'accès à l'API YouTube n'est pas configuré. Veuillez vous assurer que l'API 'YouTube Data API v3' est bien activée pour votre projet sur la console Google Cloud.");
        }
        if (reason && reason.toLowerCase().includes('quota')) {
          throw new Error("Le quota de l'API YouTube a été dépassé. Veuillez vérifier votre consommation sur la console Google Cloud.");
        }
      }
      // Generic fallback
      throw new Error(`Erreur de l'API YouTube : ${data.error?.message || response.statusText}`);
    }

    const video = data.items?.[0];

    if (!video || !video.snippet) {
      throw new Error("La vidéo n'a pas été trouvée ou ses détails sont inaccessibles via l'API. La vidéo est peut-être privée ou a été supprimée.");
    }

    return {
      title: he.decode(video.snippet.title || 'Titre non disponible'),
      description: he.decode(video.snippet.description || ''),
    };
    
  } catch (error: any) {
    // Re-throw known errors, or wrap unknown errors
    if (error.message && (error.message.startsWith("La clé API YouTube") || error.message.startsWith("La requête a été bloquée") || error.message.startsWith("L'accès à l'API YouTube") || error.message.startsWith("Le quota de l'API YouTube") || error.message.startsWith("La vidéo n'a pas été trouvée") || error.message.startsWith("Erreur de l'API YouTube"))) {
      throw error;
    }
    // Generic error for network issues etc.
    throw new Error(`Impossible de contacter l'API YouTube. Vérifiez votre connexion internet. Détails: ${error.message}`);
  }
}