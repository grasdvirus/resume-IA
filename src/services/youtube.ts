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
 * Uses the official YouTube Data API v3 to get video details.
 * This is the recommended and most reliable method for production environments.
 * @param videoId The 11-character YouTube video ID.
 * @returns An object with the video title and description, or null if it fails.
 */
export async function getVideoDetails(videoId: string): Promise<VideoDetails | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    // This error will be caught in the flow and a more user-friendly message will be shown.
    throw new Error('YOUTUBE_API_KEY environment variable is not set.');
  }
  
  if (!videoId) {
    return null;
  }

  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });

    const response = await youtube.videos.list({
      part: ['snippet'],
      id: [videoId],
    });

    const video = response.data.items?.[0];

    if (!video || !video.snippet) {
      return null;
    }

    // Decode HTML entities from title and description
    return {
      title: he.decode(video.snippet.title || ''),
      description: he.decode(video.snippet.description || ''),
    };

  } catch (error: any) {
    // Return null to indicate failure, the flow will handle the user-facing error message.
    return null;
  }
}
