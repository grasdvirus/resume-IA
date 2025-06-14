// src/services/youtube.ts

interface VideoDetails {
  title: string;
  description: string;
  tags?: string[];
}

// Regex to parse YouTube video ID from various URL formats
const YOUTUBE_ID_REGEX = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function parseYouTubeVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
}

export async function getVideoDetails(videoId: string): Promise<VideoDetails | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn('YouTube API key is missing. Skipping fetching video details.');
    return null;
  }

  if (!videoId) {
    console.warn('Video ID is missing. Skipping fetching video details.');
    return null;
  }

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`YouTube API error (${response.status}):`, errorData.error?.message || 'Unknown error');
      return null;
    }

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const snippet = data.items[0].snippet;
      return {
        title: snippet.title || '',
        description: snippet.description || '',
        tags: snippet.tags || [],
      };
    }
    console.warn('No items found in YouTube API response for video ID:', videoId);
    return null;
  } catch (error) {
    console.error('Failed to fetch video details from YouTube API:', error);
    return null;
  }
}
