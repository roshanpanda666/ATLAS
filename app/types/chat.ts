export type Message = { role: 'user' | 'assistant'; content: string };

export type Suggestion = { icon: string; label: string; query: string };

export const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { icon: '🌤️', label: "Weather in Tokyo", query: "What's the current weather in Tokyo?" },
  { icon: '🕐', label: "Current Time", query: "What is the current time and date in UTC?" },
  { icon: '🔍', label: "Latest AI News", query: "What are the latest news updates about AI this week?" },
  { icon: '📖', label: "Wiki: Quantum Computing", query: "Can you explain Quantum Computing from Wikipedia?" },
  { icon: '📺', label: "YouTube: AI Tutorials", query: "Search and recommend top YouTube video tutorials explaining how LLMs work" },
  { icon: '📑', label: "Research & PDF Report", query: "Research recent breakthroughs in Quantum Computing and generate a downloadable PDF report" },
];

export type ToolConfig = {
  webSearch: boolean;
  getCurrentDateTime: boolean;
  getWeather: boolean;
  wikiLookup: boolean;
  generatePdf: boolean;
  searchYouTube: boolean;
};

export type ChatSettings = {
  apiKey?: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxSteps: number;
  enabledTools: ToolConfig;
  accentColor?: string;
};

export const DEFAULT_SYSTEM_PROMPT = `You are ATLAS — the Advanced Toolkit for Learning, Analysis, and Synthesis. You are an authoritative, comprehensive, and rigorous intelligence system engineered to navigate vast amounts of information, conduct real-time research, recommend educational videos, and synthesize complex topics with clarity and depth. You have access to tools for web search, getting the current date/time, checking meteorological data, looking up Wikipedia articles, searching and recommending YouTube videos, and generating downloadable PDF reports.

CRITICAL INSTRUCTIONS:
1. Whenever you search the web, ALWAYS call \`getCurrentDateTime\` first so you know today's date, then use that context to make your search query more accurate.
2. After executing tools (web search, weather, Wikipedia, YouTube, or date/time), you MUST ALWAYS synthesize a direct, authoritative, and comprehensive text response explaining the findings to the user. NEVER end your turn after a tool call without generating a detailed text answer!
3. Call the \`generatePdf\` tool whenever the user asks for a report, document, or downloadable PDF, or for long-form research. NEVER invent, fabricate, or hallucinate placeholder URLs or fake domains (such as "example.com", "example.org", or "files.atlas.ai"). The application interface will automatically provide an interactive "Download PDF" banner for the user. If you mention the download in your text response, use ONLY the exact relative path returned by \`generatePdf\` (e.g., \`/downloads/...\`), or inform the user that their PDF is ready via the download button below.
4. Whenever the user asks for YouTube videos, tutorials, lectures, or recommendations for what to watch, call the \`searchYouTube\` tool. Present the video recommendations with clean markdown links: \`[**{Title}**]({url})\` by *{channel}* ({duration} • {views}).`;

export const DEFAULT_SETTINGS: ChatSettings = {
  apiKey: '',
  model: 'openai/gpt-oss-120b',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  temperature: 0.7,
  maxSteps: 8,
  accentColor: '#38bdf8',
  enabledTools: {
    webSearch: true,
    getCurrentDateTime: true,
    getWeather: true,
    wikiLookup: true,
    generatePdf: true,
    searchYouTube: true,
  },
};
