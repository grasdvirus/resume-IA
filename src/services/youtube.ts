'use server';

interface VideoDetails {
  title: string;
  description: string;
  tags?: string[];
}

const YOUTUBE_ID_REGEX = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export async function parseYouTubeVideoId(url: string): Promise<string | null> {
  const match = url.match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
}

export async function getVideoDetails(videoId: string): Promise<VideoDetails | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    // This is a server-side configuration error, so we log it and throw.
    console.error('[YouTubeService] YouTube API key (YOUTUBE_API_KEY) is missing from environment variables.');
    throw new Error("La clé API YouTube n'est pas configurée côté serveur. Impossible de récupérer les détails de la vidéo.");
  }

  if (!videoId) {
    // This should be caught earlier, but as a safeguard.
    console.warn('[YouTubeService] getVideoDetails called with no videoId.');
    return null;
  }

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      // Log the detailed error from the YouTube API for server-side debugging.
      console.error(`[YouTubeService] YouTube API Error (${response.status}):`, JSON.stringify(data.error, null, 2));
      return null;
    }
    
    if (data.items && data.items.length > 0) {
      const snippet = data.items[0].snippet;
      return {
        title: snippet.title || '',
        description: snippet.description || '',
        tags: snippet.tags || [],
      };
    }
    
    // This case means the API call was successful, but no video was found for the ID.
    console.warn(`[YouTubeService] No items found in YouTube API response for video ID: ${videoId}`);
    return null;

  } catch (error) {
    // This catches network errors or cases where the response isn't valid JSON.
    console.error('[YouTubeService] Failed to fetch or parse video details from YouTube API:', error);
    return null;
  }
}
