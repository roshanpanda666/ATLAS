import { tool } from 'ai';
import { z } from 'zod';
import { searchYouTubeVideos } from '../../lib/youtubeSearch';

export const youtubeTool = tool({
  description: 'Search and recommend YouTube videos, tutorials, explainers, or lectures. Call this whenever the user asks for videos, YouTube recommendations, tutorials to watch, or visual explanations of a concept.',
  inputSchema: z.object({
    query: z.string().describe('The YouTube search query, e.g. "quantum computing explained" or "nextjs full tutorial"'),
  }),
  execute: async ({ query }) => {
    console.log("searching YouTube for:", query);
    try {
      const videos = await searchYouTubeVideos(query, 5);
      if (!videos || videos.length === 0) {
        return { error: `No YouTube videos found matching "${query}".` };
      }
      return {
        query,
        count: videos.length,
        videos: videos.map((v) => ({
          title: v.title,
          channel: v.channel,
          duration: v.duration,
          views: v.views,
          published: v.published,
          url: v.url,
        })),
        recommendationGuidance: 'Format these recommendations cleanly with markdown links: [**Title**](url) by Channel (Duration • Views), and highlight why each video is worth watching.',
      };
    } catch (error) {
      console.error("YouTube search tool error:", error);
      return { error: `Failed to search YouTube: ${String(error)}` };
    }
  },
});
