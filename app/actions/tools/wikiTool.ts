import { tool } from 'ai';
import { z } from 'zod';

export const wikiTool = tool({
  description: 'Look up a topic on Wikipedia and return a summary and key sections. Use this when the user asks about a person, place, concept, historical event, or anything that would have a Wikipedia article.',
  inputSchema: z.object({
    topic: z.string().describe('The topic to search on Wikipedia, e.g. "Albert Einstein", "Quantum Computing", "Tokyo"'),
  }),
  execute: async ({ topic }) => {
    console.log("scraping wikipedia")
    try {
      // Step 1: Search for the best matching article
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(topic)}&limit=1&format=json`
      );
      const searchData = await searchRes.json();

      if (!searchData[1]?.length) {
        return { error: `No Wikipedia article found for "${topic}"` };
      }

      const articleTitle = searchData[1][0];
      const articleUrl = searchData[3][0];

      // Step 2: Get the summary from the REST API
      const summaryRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(articleTitle)}`
      );
      const summaryData = await summaryRes.json();

      // Step 3: Get the first few sections of content
      const contentRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=extracts&exintro=false&explaintext=true&exsectionformat=plain&exchars=3000&format=json`
      );
      const contentData = await contentRes.json();
      const pages = contentData.query?.pages;
      const pageContent = pages ? Object.values(pages)[0] as { extract?: string } : null;

      return {
        title: summaryData.title || articleTitle,
        summary: summaryData.extract || 'No summary available.',
        content: pageContent?.extract || 'No extended content available.',
        url: articleUrl,
        thumbnail: summaryData.thumbnail?.source || null,
      };
    } catch (error) {
      return { error: `Wikipedia fetch failed: ${String(error)}` };
    }
  },
});
