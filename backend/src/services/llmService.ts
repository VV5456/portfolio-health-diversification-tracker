import { PortfolioAnalysis } from '../types/index.js';

export class LLMService {
  async generateExplanation(analysis: Partial<PortfolioAnalysis>): Promise<string> {
    return 'Placeholder AI summary explanation.';
  }
}
