'use server'
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { Message, Suggestion, DEFAULT_SUGGESTIONS, ChatSettings } from '../types/chat';

const defaultGroq = createGroq({
  apiKey: process.env.GROQ_API_KEY, 
});

export async function getDynamicSuggestions(messages: Message[], settings?: Partial<ChatSettings>): Promise<Suggestion[]> {
  if (!messages || messages.length === 0) {
    return DEFAULT_SUGGESTIONS;
  }

  const customKey = settings?.apiKey?.trim();
  const client = customKey ? createGroq({ apiKey: customKey }) : defaultGroq;
  const modelName = settings?.model || 'openai/gpt-oss-120b';

  try {
    const recent = messages.slice(-6).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const { text } = await generateText({
      model: client(modelName),
      system: `You generate 3 to 4 concise, relevant, and engaging follow-up questions that the user might want to ask next based on the conversation history.
Return ONLY valid JSON as an array of objects. Each object MUST have:
- "icon": a relevant single emoji
- "label": a short 2 to 4 word display title
- "query": the complete question/prompt string
Do not include markdown fences or any other explanation. Output raw JSON only.`,
      prompt: `Conversation history:\n${recent}\n\nGenerate 3-4 natural follow-up questions as JSON array:`,
    });

    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 4).map((item) => ({
        icon: String(item.icon || '💡'),
        label: String(item.label || 'Learn more'),
        query: String(item.query || item.label || ''),
      }));
    }
  } catch (error) {
    console.error("Error generating dynamic suggestions:", error);
  }

  return DEFAULT_SUGGESTIONS;
}
