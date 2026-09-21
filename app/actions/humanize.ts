'use server'
import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { ChatSettings } from '../types/chat';

const defaultGroq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const HUMANIZER_SYSTEM_PROMPT = `You are an expert human rewriter. Your SOLE job is to take AI-generated text and rewrite it so it reads as if a knowledgeable human wrote it naturally. You must:

1. VARY sentence length dramatically — mix short punchy sentences with longer flowing ones. Real humans don't write uniform-length sentences.
2. Use NATURAL transitions — "Look,", "Here's the thing,", "What's interesting is", "Honestly,", "That said," instead of "Furthermore," "Moreover," "Additionally,".
3. ADD subtle imperfections — occasional contractions ("it's", "don't", "won't"), sentence fragments, rhetorical questions.
4. BREAK formulaic structure — don't use the exact same pattern for every paragraph. Real writing meanders a bit.
5. REMOVE AI fingerprints — eliminate phrases like "It's important to note", "It's worth mentioning", "In conclusion", "As an AI", "delve into", "landscape", "paradigm", "synergy", "leverage", "cutting-edge".
6. Use ACTIVE voice predominantly — "researchers discovered" not "it was discovered by researchers".
7. ADD occasional personality — mild opinions, emphasis words ("actually", "really", "pretty much"), informal asides.
8. PRESERVE all factual accuracy, data, statistics, URLs, and technical content exactly as provided.
9. Keep the same overall structure (headings, lists, tables) but make the prose between them feel conversational.
10. Output ONLY the rewritten text in markdown. No preamble, no "Here's the rewritten version", no meta-commentary.`;

export async function* humanizeContent(content: string, settings?: Partial<ChatSettings>) {
  const customKey = settings?.apiKey?.trim();
  const client = customKey ? createGroq({ apiKey: customKey }) : defaultGroq;
  const modelName = settings?.model || 'openai/gpt-oss-120b';

  const { fullStream } = streamText({
    model: client(modelName),
    messages: [
      { role: 'user', content: `Rewrite the following AI-generated text to sound naturally human-written. Preserve all facts, data, and structure:\n\n---\n\n${content}` },
    ],
    system: HUMANIZER_SYSTEM_PROMPT,
    temperature: 0.85,
  });

  for await (const part of fullStream) {
    if (part.type === 'text-delta') {
      yield part.text;
    } else if (part.type === 'error') {
      console.error('Humanize stream error:', part.error);
      yield '\n\n⚠️ An error occurred during humanization. Please try again.';
    }
  }
}
