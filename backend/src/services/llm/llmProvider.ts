export interface LLMProvider {
  generateText(systemPrompt: string, userPrompt: string): Promise<string>;
}
