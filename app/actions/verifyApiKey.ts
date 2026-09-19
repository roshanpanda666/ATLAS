'use server'
import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';

export async function verifyApiKey(apiKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const key = apiKey?.trim() || process.env.GROQ_API_KEY;
    if (!key) {
      return { success: false, message: 'No API key provided and no GROQ_API_KEY in environment.' };
    }
    const client = createGroq({ apiKey: key });
    await generateText({
      model: client('llama-3.1-8b-instant'),
      prompt: 'ping',
    });
    return { success: true, message: 'Connected to Groq API successfully!' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }
}
