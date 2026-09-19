import { tool } from 'ai';
import { z } from 'zod';

export const dateTimeTool = tool({
  description: 'Get the current date and time. Use this when the user asks what time or date it is.',
  inputSchema: z.object({
    timezone: z.string().optional().describe('IANA timezone like "Asia/Kolkata" or "America/New_York". Defaults to UTC.'),
  }),
  execute: async ({ timezone }) => {
    console.log("getting current data and time")
    const tz = timezone || 'UTC';
    try {
      const now = new Date();
      const formatted = now.toLocaleString('en-US', {
        timeZone: tz,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      return { datetime: formatted, timezone: tz, iso: now.toISOString() };
    } catch {
      const now = new Date();
      return { datetime: now.toUTCString(), timezone: 'UTC', iso: now.toISOString() };
    }
  },
});
