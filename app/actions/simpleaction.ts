'use server'
import { createGroq } from '@ai-sdk/groq';
import { streamText, stepCountIs, generateText } from 'ai';
import { Message, ChatSettings, DEFAULT_SYSTEM_PROMPT } from '../types/chat';
import { allTools, toolLabels } from './tools';

const defaultGroq = createGroq({
  apiKey: process.env.GROQ_API_KEY, 
});

export default async function* test(messages: Message[], settings?: Partial<ChatSettings>) {
  const customKey = settings?.apiKey?.trim();
  const client = customKey ? createGroq({ apiKey: customKey }) : defaultGroq;
  const modelName = settings?.model || 'openai/gpt-oss-120b';
  const systemPrompt = settings?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const maxSteps = settings?.maxSteps ?? 8;
  const temperature = settings?.temperature ?? 0.7;

  // Filter tools according to user settings
  const activeTools: Record<string, any> = {};
  for (const [key, t] of Object.entries(allTools)) {
    if (!settings?.enabledTools || settings.enabledTools[key as keyof typeof settings.enabledTools] !== false) {
      activeTools[key] = t;
    }
  }

  const { fullStream } = streamText({
    model: client(modelName),
    messages,
    system: systemPrompt,
    temperature,
    tools: activeTools,
    stopWhen: stepCountIs(maxSteps),
  });

  let hasEmittedText = false;

  for await (const part of fullStream) {
    if (part.type === 'tool-call') {
      const label = toolLabels[part.toolName] || `⚙️ Running ${part.toolName}…`;
      console.log(label);
      yield `__TOOL__:${label}`;
    } else if (part.type === 'tool-result' && part.toolName === 'generatePdf') {
      const output = part.output as { downloadUrl?: string; title?: string; filename?: string };
      if (output?.downloadUrl) {
        yield `__PDF__:${output.downloadUrl}|${output.title || 'Research Report'}|${output.filename || ''}`;
      }
    } else if (part.type === 'text-delta') {
      hasEmittedText = true;
      process.stdout.write(part.text);
      yield part.text;
    } else if (part.type === 'error') {
      console.error('Stream error:', part.error);
      yield 'An error occurred while processing. Please try again.';
    }
  }

  // Safety net: if tools executed but the model stopped before emitting text, run synthesis
  if (!hasEmittedText) {
    console.log("No text was emitted by fullStream after tool calls. Running automatic synthesis fallback...");
    try {
      const fallback = await generateText({
        model: client(modelName),
        messages,
        system: `${systemPrompt}\n\nCRITICAL: Review all preceding tool calls and search results in this conversation and provide a complete, direct, and well-written answer to the user now. Do not call any further tools.`,
      });
      if (fallback.text) {
        yield fallback.text;
      } else {
        yield "Search complete. Please review the findings or ask a follow-up question.";
      }
    } catch (err) {
      console.error("Fallback synthesis error:", err);
      yield "Search completed. Please try asking your question again or requesting specific details.";
    }
  }
}
