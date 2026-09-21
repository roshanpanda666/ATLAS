'use server'
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { ChatSettings } from '../types/chat';

const defaultGroq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export type AiCheckResult = {
  score: number;        // 0-100, percentage likelihood of AI content
  verdict: string;      // "Likely AI-Generated" | "Mixed / Partially AI" | "Likely Human-Written"
  details: string[];    // Bullet points of specific findings
};

const AI_DETECTOR_SYSTEM_PROMPT = `You are an expert AI content detector. Analyze the given text and determine how likely it is to be AI-generated.

Evaluate based on these criteria:
1. **Sentence uniformity** — AI tends to write sentences of similar length and structure
2. **Formulaic transitions** — "Furthermore", "Moreover", "Additionally", "In conclusion" are AI hallmarks
3. **Over-hedging** — excessive "It's important to note", "It's worth mentioning"
4. **Repetitive structure** — same paragraph format repeated (claim → evidence → conclusion)
5. **Vocabulary patterns** — overuse of "leverage", "delve", "landscape", "paradigm", "cutting-edge", "synergy", "robust", "comprehensive"
6. **Lack of personality** — no opinions, no humor, no contractions, no informal language
7. **Perfect grammar** — zero typos or stylistic quirks that real human writing has
8. **Balanced both-sides** — AI tends to present every argument neutrally without taking a clear stance
9. **List dependency** — excessive use of numbered/bulleted lists where prose would be natural
10. **Emoji/formatting patterns** — AI often uses emojis in headers consistently

You MUST respond with ONLY valid JSON in this exact format (no markdown, no code fences, no extra text):
{"score": <0-100>, "verdict": "<one of: Likely AI-Generated | Mixed / Partially AI | Likely Human-Written>", "details": ["<finding 1>", "<finding 2>", "<finding 3>", "<finding 4>", "<finding 5>"]}

Rules for scoring:
- 0-25: Clearly human-written with natural voice, imperfections, personality
- 25-50: Mostly human but some AI-like patterns detected
- 50-75: Mixed — significant AI patterns but also human elements
- 75-100: Strongly AI-generated with formulaic structure and vocabulary`;

export async function checkAiContent(content: string, settings?: Partial<ChatSettings>): Promise<AiCheckResult> {
  const customKey = settings?.apiKey?.trim();
  const client = customKey ? createGroq({ apiKey: customKey }) : defaultGroq;
  const modelName = settings?.model || 'openai/gpt-oss-120b';

  try {
    const result = await generateText({
      model: client(modelName),
      messages: [
        { role: 'user', content: `Analyze the following text for AI-generated content patterns and provide your assessment:\n\n---\n\n${content.slice(0, 8000)}` },
      ],
      system: AI_DETECTOR_SYSTEM_PROMPT,
      temperature: 0.3,
    });

    const rawText = result.text.trim();

    // Extract JSON from the response (handle possible markdown fences)
    let jsonStr = rawText;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonStr);

    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
      verdict: String(parsed.verdict || 'Mixed / Partially AI'),
      details: Array.isArray(parsed.details) ? parsed.details.map(String).slice(0, 8) : ['Analysis could not extract detailed findings.'],
    };
  } catch (error) {
    console.error('AI content check failed:', error);
    return {
      score: -1,
      verdict: 'Analysis Failed',
      details: [`Error: ${String(error)}. Please try again.`],
    };
  }
}
