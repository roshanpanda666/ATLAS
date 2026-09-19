export type YouTubeVideo = {
  id: string;
  title: string;
  channel: string;
  views: string;
  published: string;
  duration: string;
  url: string;
  thumbnail: string;
};

export async function searchYouTubeVideos(query: string, maxResults: number = 5): Promise<YouTubeVideo[]> {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) {
      return [];
    }

    const data = JSON.parse(match[1]);
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!contents) {
      return [];
    }

    const results: YouTubeVideo[] = [];

    for (const section of contents) {
      const itemSection = section.itemSectionRenderer?.contents;
      if (!itemSection) continue;

      for (const item of itemSection) {
        const v = item.videoRenderer;
        if (!v || !v.videoId) continue;

        const title = v.title?.runs?.[0]?.text || 'Untitled Video';
        const channel = v.ownerText?.runs?.[0]?.text || 'YouTube Channel';
        const views = v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || '';
        const published = v.publishedTimeText?.simpleText || '';
        const duration = v.lengthText?.simpleText || '';
        const videoId = v.videoId;

        results.push({
          id: videoId,
          title,
          channel,
          views,
          published,
          duration,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        });

        if (results.length >= maxResults) break;
      }
      if (results.length >= maxResults) break;
    }

    return results;
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}
