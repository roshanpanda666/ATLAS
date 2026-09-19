import { tool } from 'ai';
import { z } from 'zod';
import { performWebSearch } from '../../lib/webSearch';

export const webSearchTool = tool({
  description: 'Search the web for real-time information, news, current events, and live updates. Always formulate concise, keyword-rich search queries.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async ({ query }) => {
    console.log("web search tool running for query:", query);
    try {
      const results = await performWebSearch(query);
      return {
        query,
        results,
        instruction: 'Synthesize a direct, authoritative, and comprehensive answer for the user based on these findings.',
      };
    } catch (error) {
      console.error("Web search execution error:", error);
      return { results: `Live search temporarily unreachable for "${query}". Synthesize an authoritative answer based on your knowledge base.` };
    }
  },
});
