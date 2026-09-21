import { tool } from 'ai';
import { z } from 'zod';
import { performWebSearchDetailed } from '../../lib/webSearch';

export const webSearchTool = tool({
  description:
    'Search the web for real-time information, news, current events, research papers, and technical updates across multiple web sources. Always formulate concise, keyword-rich search queries.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async ({ query }) => {
    console.log("web search tool running for query:", query);
    try {
      const searchData = await performWebSearchDetailed(query);
      return {
        query,
        results: searchData.results,
        sources: searchData.sources,
        sourcesCount: searchData.sources.length,
        itemsCount: searchData.items.length,
        instruction:
          'Synthesize a direct, authoritative, and comprehensive answer for the user based on these findings across multiple authoritative web sources.',
      };
    } catch (error) {
      console.error("Web search execution error:", error);
      return {
        results: `Live search temporarily unreachable for "${query}". Synthesize an authoritative answer based on your knowledge base.`,
        sources: [],
        sourcesCount: 0,
      };
    }
  },
});
