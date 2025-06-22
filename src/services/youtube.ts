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
 * Scrapes the YouTube page to get video details without an API key.
 * This can be less reliable than the API but avoids the need for an API key.
 * @param videoId The 11-character YouTube video ID.
 * @returns An object with the video title and description, or null if it fails.
 */
export async function getVideoDetails(videoId: string): Promise<VideoDetails | null> {
  if (!videoId) {
    return null;
  }

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // The video metadata is often in a JSON object inside a script tag.
    // This is the most reliable scraping method.
    const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.*?});/);
    if (playerResponseMatch && playerResponseMatch[1]) {
      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const videoDetailsData = playerResponse?.videoDetails;

      if (videoDetailsData && videoDetailsData.title && videoDetailsData.shortDescription) {
        return {
          title: he.decode(videoDetailsData.title),
          description: he.decode(videoDetailsData.shortDescription),
        };
      }
    }
    
    // Fallback if the primary scraping method fails
    const titleMatch = html.match(/<title>(.+) - YouTube<\/title>/);
    const title = titleMatch ? he.decode(titleMatch[1]) : 'Titre non disponible';

    return {
      title: title,
      description: 'Description non disponible (méthode de secours).',
    };

  } catch (error) {
    return null;
  }
}
