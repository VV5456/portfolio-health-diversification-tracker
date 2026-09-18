import { PortfolioAnalysis } from '../types/index.js';
import { LLMProvider } from './llm/llmProvider.js';
import { GeminiAdapter } from './llm/geminiAdapter.js';
import { BedrockAdapter } from './llm/bedrockAdapter.js';
import { buildLLMPrompt } from './llmPrompt.js';
import { validateLLMOutput } from './llmValidator.js';
import { generateFallbackSummary } from './llmFallback.js';

export class LLMService {
  private provider: LLMProvider;

  constructor(provider?: LLMProvider) {
    if (provider) {
      this.provider = provider;
    } else {
      const providerType = (process.env.LLM_PROVIDER || 'gemini').toLowerCase().trim();
      if (providerType === 'gemini') {
        this.provider = new GeminiAdapter();
      } else if (providerType === 'bedrock') {
        this.provider = new BedrockAdapter();
      } else {
        throw new Error(
          `Invalid LLM_PROVIDER: "${process.env.LLM_PROVIDER}". Supported values are "gemini" or "bedrock".`
        );
      }
    }
  }

  async generateExplanation(analysis: Partial<PortfolioAnalysis>): Promise<string> {
    if (!analysis.holdings || analysis.holdings.length === 0) {
      return generateFallbackSummary(analysis);
    }

    try {
      const { systemPrompt, userPrompt } = buildLLMPrompt(analysis);
      const rawExplanation = await this.provider.generateText(systemPrompt, userPrompt);
      const validation = validateLLMOutput(rawExplanation);

      if (validation.isValid) {
        return rawExplanation.trim();
      }

      console.warn(`LLM validation failed (${validation.reason}). Falling back to safe summary.`);
      return generateFallbackSummary(analysis);
    } catch (error) {
      console.error('Error invoking LLM provider:', error);
      return generateFallbackSummary(analysis);
    }
  }
}
