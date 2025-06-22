
// src/services/youtube.ts
'use server';

import { YoutubeTranscript } from 'youtube-transcript';

interface VideoDetails {
  title: string;
  description: string;
  tags?: string[];
}

// Regex to parse YouTube video ID from various URL formats
const YOUTUBE_ID_REGEX = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function parseYouTubeVideoId(url: string): string | null {
  console.log('[YouTubeService] Parsing URL:', url);
  const match = url.match(YOUTUBE_ID_REGEX);
  const videoId = match ? match[1] : null;
  console.log('[YouTubeService] Extracted Video ID:', videoId);
  return videoId;
}

export async function getVideoDetails(videoId: string): Promise<VideoDetails | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  console.log('[YouTubeService] getVideoDetails called for videoId:', videoId);

  if (!apiKey) {
    console.warn('[YouTubeService] YouTube API key (YOUTUBE_API_KEY) is missing from environment variables. Skipping fetching video details.');
    return null;
  }
  console.log('[YouTubeService] Using YouTube API Key (first 5 chars):', apiKey.substring(0, 5) + '...');


  if (!videoId) {
    console.warn('[YouTubeService] Video ID is missing. Skipping fetching video details.');
    return null;
  }

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;
  console.log('[YouTubeService] Constructed API URL:', apiUrl);

  try {
    console.log('[YouTubeService] Fetching video details from YouTube API...');
    const response = await fetch(apiUrl);
    console.log('[YouTubeService] YouTube API response status:', response.status);

    const responseText = await response.text(); // Get text first to log it
    console.log('[YouTubeService] YouTube API raw response text:', responseText);


    if (!response.ok) {
      try {
        const errorData = JSON.parse(responseText); // Try to parse error
        console.error(`[YouTubeService] YouTube API error (${response.status}):`, errorData.error?.message || 'Unknown error from API');
      } catch (parseError) {
        console.error(`[YouTubeService] YouTube API error (${response.status}), and failed to parse error response:`, responseText);
      }
      return null;
    }
    
    const data = JSON.parse(responseText); // Parse successful response

    if (data.items && data.items.length > 0) {
      const snippet = data.items[0].snippet;
      const videoDetails: VideoDetails = {
        title: snippet.title || '',
        description: snippet.description || '',
        tags: snippet.tags || [],
      };
      console.log('[YouTubeService] Successfully fetched video details:', videoDetails);
      return videoDetails;
    }
    console.warn('[YouTubeService] No items found in YouTube API response for video ID:', videoId, 'Response data:', data);
    return null;
  } catch (error) {
    console.error('[YouTubeService] Failed to fetch video details from YouTube API (network or other error):', error);
    return null;
  }
}

export async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0) {
      console.warn(`[YouTubeService] Transcript is empty or unavailable for video ID: ${videoId}`);
      return null;
    }
    // Combine all transcript parts into a single string
    return transcript.map(item => item.text).join(' ');
  } catch (error) {
    console.error(`[YouTubeService] Could not fetch transcript for video ID: ${videoId}. It may be disabled for this video.`, error);
    return null;
  }
}
