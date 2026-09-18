import { PortfolioAnalysis } from '../types/index.js';

export function generateFallbackSummary(analysis: Partial<PortfolioAnalysis>): string {
  if (!analysis.holdings || analysis.holdings.length === 0) {
    return 'Your portfolio is currently empty. Add holdings to calculate valuation, sector weights, concentration risk, and target drift.';
  }

  const totalVal = Math.round(analysis.totalValue || 0).toLocaleString('en-IN');
  const gainLoss = (analysis.gainLossPercent || 0).toFixed(2);
  const flag = analysis.concentration?.flag || 'low';
  const top3 = (analysis.concentration?.top3Percent || 0).toFixed(1);

  const sentence1 = `Your portfolio has a total valuation of ₹${totalVal} with an overall gain/loss of ${gainLoss}%.`;
  const sentence2 = `Concentration risk is evaluated as ${flag} with the top 3 holdings representing ${top3}% of total portfolio value.`;
  let sentence3 = '';

  if (analysis.targetDrift && analysis.targetDrift.length > 0) {
    const highestDrift = [...analysis.targetDrift].sort(
      (a, b) => Math.abs(b.driftPercent) - Math.abs(a.driftPercent)
    )[0];
    if (highestDrift) {
      const sign = highestDrift.driftPercent > 0 ? '+' : '';
      sentence3 = ` Sector target allocation shows the highest drift in ${highestDrift.category} at ${sign}${highestDrift.driftPercent.toFixed(1)}%.`;
    }
  } else {
    sentence3 = ' No target sector allocations are currently set.';
  }

  return `${sentence1} ${sentence2}${sentence3}`;
}
