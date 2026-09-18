import { GoogleGenAI } from '@google/genai';
import { LLMProvider } from './llmProvider.js';

export class GeminiAdapter implements LLMProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.modelName = modelName || process.env.GEMINI_MODEL_ID || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }

    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt
      }
    });

    const responseText = response.text;
    if (typeof responseText !== 'string' || responseText.trim().length === 0) {
      throw new Error('Malformed or empty Gemini response');
    }
    return responseText;
  }
}
