import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { LLMProvider } from './llmProvider.js';

export class BedrockAdapter implements LLMProvider {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(client?: BedrockRuntimeClient, modelId?: string) {
    this.client = client || new BedrockRuntimeClient({});
    this.modelId = modelId || process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    const command = new ConverseCommand({
      modelId: this.modelId,
      system: [{ text: systemPrompt }],
      messages: [
        {
          role: 'user',
          content: [{ text: userPrompt }]
        }
      ],
      inferenceConfig: {
        maxTokens: 300,
        temperature: 0.2
      }
    });

    const response = await this.client.send(command);
    const contentText = response.output?.message?.content?.[0]?.text;

    if (typeof contentText !== 'string' || contentText.trim().length === 0) {
      throw new Error('Malformed or empty Bedrock Converse response');
    }

    return contentText;
  }
}
