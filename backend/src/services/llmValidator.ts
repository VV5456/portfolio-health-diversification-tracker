export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);
  return sentences.length;
}

export function validateLLMOutput(text: string): ValidationResult {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { isValid: false, reason: 'Empty or non-string response' };
  }

  const lowerText = text.toLowerCase();

  const bannedTerms = [
    'buy',
    'sell',
    'hold',
    'accumulate',
    'rebalance',
    'should invest',
    'recommend',
    'price target',
    'target price',
    'strong buy',
    'strong sell',
    'consider buying',
    'consider selling',
    'i recommend',
    'you should buy',
    'you should sell'
  ];

  for (const term of bannedTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'i');
    if (regex.test(lowerText)) {
      return { isValid: false, reason: `Contains banned term: "${term}"` };
    }
  }

  const sentenceCount = countSentences(text);
  if (sentenceCount < 2 || sentenceCount > 4) {
    return {
      isValid: false,
      reason: `Sentence count out of bounds: expected 2-4 sentences, got ${sentenceCount}`
    };
  }

  return { isValid: true };
}
