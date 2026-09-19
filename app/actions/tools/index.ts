import { webSearchTool } from './webSearchTool';
import { dateTimeTool } from './dateTimeTool';
import { weatherTool } from './weatherTool';
import { wikiTool } from './wikiTool';
import { pdfTool } from './pdfTool';
import { youtubeTool } from './youtubeTool';

export const allTools = {
  webSearch: webSearchTool,
  getCurrentDateTime: dateTimeTool,
  getWeather: weatherTool,
  wikiLookup: wikiTool,
  generatePdf: pdfTool,
  searchYouTube: youtubeTool,
};

export const toolLabels: Record<string, string> = {
  webSearch: '🔍 Searching the web…',
  getCurrentDateTime: '🕐 Getting current date & time…',
  getWeather: '🌤️ Fetching weather data…',
  wikiLookup: '📖 Scraping Wikipedia…',
  generatePdf: '📄 Generating downloadable PDF report…',
  searchYouTube: '📺 Searching YouTube videos & recommendations…',
};
