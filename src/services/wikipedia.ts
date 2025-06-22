
'use server';

interface WikipediaSearchResult {
  title: string;
  url: string;
}

// Searches Wikipedia and returns the title and URL of the best matching page.
export async function searchWikipedia(term: string): Promise<WikipediaSearchResult | null> {
  const searchParams = new URLSearchParams({
    action: 'opensearch',
    search: term,
    limit: '1',
    namespace: '0',
    format: 'json',
  });

  // Use French Wikipedia by default
  const url = `https://fr.wikipedia.org/w/api.php?${searchParams.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Wikipedia API (search) error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    // opensearch format is [searchTerm, [titles], [descriptions], [urls]]
    if (data[1] && data[1].length > 0 && data[3] && data[3].length > 0) {
      return {
        title: data[1][0],
        url: data[3][0],
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch from Wikipedia API (search):', error);
    return null;
  }
}

async function getFullWikipediaPageContent(pageTitle: string): Promise<string | null> {
    const searchParams = new URLSearchParams({
        action: 'query',
        prop: 'extracts',
        explaintext: 'true',
        titles: pageTitle,
        format: 'json',
        redirects: '1',
    });
    const url = `https://fr.wikipedia.org/w/api.php?${searchParams.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`Wikipedia API (full content) error: ${response.status}`);
        return null;
    }
    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pageId && pages[pageId] && pages[pageId].extract) {
        return pages[pageId].extract;
    }
    return null;
}


// Fetches the plain text content of a Wikipedia page.
export async function getWikipediaPageContent(pageTitle: string): Promise<string | null> {
  const searchParams = new URLSearchParams({
    action: 'query',
    prop: 'extracts',
    exintro: 'true', // Try to get only the intro first
    explaintext: 'true',
    titles: pageTitle,
    format: 'json',
    redirects: '1',
  });

  const url = `https://fr.wikipedia.org/w/api.php?${searchParams.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Wikipedia API (intro content) error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];

    if (pageId && pages[pageId] && pages[pageId].extract) {
      // If the intro is very short (often just '...'), fetch the full content instead.
      if (pages[pageId].extract.length < 100) {
         console.log("Intro is too short, fetching full article content.");
         return getFullWikipediaPageContent(pageTitle);
      }
      return pages[pageId].extract;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch from Wikipedia API (content):', error);
    return null;
  }
}
