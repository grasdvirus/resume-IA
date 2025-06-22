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
 * Scrapes the YouTube video page to get its title and description.
 * This approach avoids needing a YouTube API key, but it is less reliable
 * and may break if YouTube changes its page structure.
 * @param videoId The 11-character YouTube video ID.
 * @returns An object with the video title and description, or null if scraping fails.
 */
export async function getVideoDetails(videoId: string): Promise<VideoDetails | null> {
  if (!videoId) {
    return null;
  }

  // Using a standard watch URL. Adding hl=en can help get consistent page layouts.
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en`;

  try {
    const response = await fetch(videoUrl, {
      headers: {
        // Using a realistic user-agent can help avoid getting blocked.
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    let title = '';
    let description = '';

    // 1. Try to get title from the <title> tag
    const titleMatch = html.match(/<title>(.+)<\/title>/);
    if (titleMatch && titleMatch[1]) {
      // Remove the " - YouTube" suffix
      title = titleMatch[1].replace(/ - YouTube$/, '').trim();
    }

    // 2. Try to get description from the player response JSON embedded in the HTML.
    // This is often more reliable and complete than the meta tag.
    const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.*?});/);
    if (playerResponseMatch && playerResponseMatch[1]) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        description = playerResponse?.videoDetails?.shortDescription || '';
        // If title was not found from the <title> tag, get it from here as a fallback
        if (!title) {
            title = playerResponse?.videoDetails?.title || '';
        }
      } catch (e) {
        // Fallback to meta tag if JSON parsing fails
      }
    }

    // 3. Fallback to meta description tag if the JSON failed or didn't contain a description
    if (!description) {
      const metaDescriptionMatch = html.match(/<meta name="description" content="([^"]*)"/);
      if (metaDescriptionMatch && metaDescriptionMatch[1]) {
        description = metaDescriptionMatch[1];
      }
    }

    // If we couldn't find a title or description, scraping likely failed.
    if (!title && !description) {
      return null;
    }

    // Decode HTML entities (e.g., &quot;, &#39;) to plain text
    return {
      title: he.decode(title),
      description: he.decode(description),
    };

  } catch (error) {
    return null;
  }
}
