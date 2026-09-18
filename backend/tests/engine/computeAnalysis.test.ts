import { describe, it, expect } from 'vitest';
import { computeAnalysis } from '../../src/engine/computeAnalysis.js';

describe('Centralized Portfolio Analysis Engine (Scaffold)', () => {
  it('should return default scaffold analysis object for default-user', async () => {
    const analysis = await computeAnalysis('default-user');
    expect(analysis).toBeDefined();
    expect(analysis.totalValue).toBe(0);
    expect(analysis.holdings).toEqual([]);
    expect(analysis.concentration.flag).toBe('low');
    expect(analysis.aiSummary).toBeDefined();
  });
});
