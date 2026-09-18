import { HoldingsRepository } from '../db/holdingsRepository.js';
import { TargetsRepository } from '../db/targetsRepository.js';
import { normalizeCategory } from '../config/sectorLookup.js';
import { LLMService } from '../services/llmService.js';
import { generateFallbackSummary } from '../services/llmFallback.js';
import {
  Holding,
  TargetAllocation,
  CalculatedHolding,
  ConcentrationInfo,
  TargetDriftItem,
  PortfolioAnalysis
} from '../types/index.js';

export type PriceFetcher = (
  symbol: string,
  holding: Holding
) => Promise<{ price: number; isCached: boolean }>;

function round(num: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

export async function computeAnalysis(
  userId: string,
  holdingsRepo: HoldingsRepository = new HoldingsRepository(),
  targetsRepo: TargetsRepository = new TargetsRepository(),
  priceFetcher?: PriceFetcher,
  llmService?: LLMService
): Promise<PortfolioAnalysis> {
  const rawHoldings = await holdingsRepo.getHoldings(userId);
  const rawTargets = await targetsRepo.getTargets(userId);

  if (!rawHoldings || rawHoldings.length === 0) {
    const emptyAnalysis: Partial<PortfolioAnalysis> = {
      totalValue: 0,
      totalInvested: 0,
      totalGainLoss: 0,
      gainLossPercent: 0,
      holdings: [],
      sectorBreakdown: {},
      concentration: {
        top1Percent: 0,
        top3Percent: 0,
        top1Symbol: null,
        flag: 'low',
        flagReason: 'Portfolio is empty.'
      },
      targetDrift: (rawTargets || []).map((t) => ({
        category: normalizeCategory(t.category),
        targetPercent: t.targetPercent,
        actualPercent: 0,
        driftPercent: round(0 - t.targetPercent, 2)
      }))
    };

    const aiSummary = llmService
      ? await llmService.generateExplanation(emptyAnalysis)
      : generateFallbackSummary(emptyAnalysis);

    return {
      ...(emptyAnalysis as PortfolioAnalysis),
      aiSummary
    };
  }

  // 1. Fetch prices and calculate per-holding metrics
  const intermediateHoldings: Array<{
    holding: Holding;
    currentPrice: number;
    isPriceCached: boolean;
    investedValue: number;
    currentValue: number;
    gainLoss: number;
    gainLossPercent: number;
  }> = [];

  let unroundedTotalValue = 0;
  let unroundedTotalInvested = 0;

  for (const h of rawHoldings) {
    let currentPrice = h.lastKnownPrice || 0;
    let isPriceCached = true;

    if (priceFetcher) {
      try {
        const fetched = await priceFetcher(h.stockSymbol, h);
        currentPrice = fetched.price;
        isPriceCached = fetched.isCached;
      } catch (err) {
        if (typeof h.lastKnownPrice === 'number' && h.lastKnownPrice > 0) {
          currentPrice = h.lastKnownPrice;
          isPriceCached = true;
        } else {
          throw err;
        }
      }
    }

    const investedValue = h.avgBuyPrice * h.quantity;
    const currentValue = currentPrice * h.quantity;
    const gainLoss = currentValue - investedValue;
    const gainLossPercent = investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : 0;

    unroundedTotalValue += currentValue;
    unroundedTotalInvested += investedValue;

    intermediateHoldings.push({
      holding: h,
      currentPrice,
      isPriceCached,
      investedValue,
      currentValue,
      gainLoss,
      gainLossPercent
    });
  }

  const totalValue = round(unroundedTotalValue, 2);
  const totalInvested = round(unroundedTotalInvested, 2);
  const totalGainLoss = round(totalValue - totalInvested, 2);
  const gainLossPercent = totalInvested > 0 ? round((totalGainLoss / totalInvested) * 100, 2) : 0;

  // 2. Calculate holding weight percentages and build calculated holdings list
  const calculatedHoldings: CalculatedHolding[] = intermediateHoldings.map((item) => {
    const weightPercent = totalValue > 0 ? round((item.currentValue / totalValue) * 100, 2) : 0;

    return {
      userId: item.holding.userId,
      stockSymbol: item.holding.stockSymbol,
      quantity: item.holding.quantity,
      avgBuyPrice: item.holding.avgBuyPrice,
      sector: normalizeCategory(item.holding.sector),
      currentPrice: round(item.currentPrice, 2),
      investedValue: round(item.investedValue, 2),
      currentValue: round(item.currentValue, 2),
      gainLoss: round(item.gainLoss, 2),
      gainLossPercent: round(item.gainLossPercent, 2),
      weightPercent,
      isPriceCached: item.isPriceCached,
      addedAt: item.holding.addedAt,
      updatedAt: item.holding.updatedAt
    };
  });

  // 3. Sector Breakdown calculation
  const sectorValueMap: Record<string, number> = {};
  for (const item of intermediateHoldings) {
    const sector = normalizeCategory(item.holding.sector);
    sectorValueMap[sector] = (sectorValueMap[sector] || 0) + item.currentValue;
  }

  const sectorBreakdown: Record<string, number> = {};
  for (const [sec, val] of Object.entries(sectorValueMap)) {
    sectorBreakdown[sec] = totalValue > 0 ? round((val / totalValue) * 100, 2) : 0;
  }

  // 4. Concentration analysis
  const sortedWeights = [...calculatedHoldings].sort((a, b) => b.weightPercent - a.weightPercent);
  const top1Percent = sortedWeights.length > 0 ? sortedWeights[0].weightPercent : 0;
  const top1Symbol = sortedWeights.length > 0 ? sortedWeights[0].stockSymbol : null;
  const top3Percent = round(
    sortedWeights.slice(0, 3).reduce((sum, h) => sum + h.weightPercent, 0),
    2
  );

  let flag: 'low' | 'moderate' | 'high' = 'low';
  let flagReason = 'Portfolio concentration is well balanced.';

  if (top3Percent > 60) {
    flag = 'high';
    flagReason = 'Top 3 holdings make up over 60% of the portfolio.';
  } else if (top3Percent > 40) {
    flag = 'moderate';
    flagReason = 'Top 3 holdings make up over 40% of the portfolio.';
  }

  const concentration: ConcentrationInfo = {
    top1Percent,
    top3Percent,
    top1Symbol,
    flag,
    flagReason
  };

  // 5. Target Drift
  const targetDrift: TargetDriftItem[] = (rawTargets || []).map((t) => {
    const category = normalizeCategory(t.category);
    const targetPercent = t.targetPercent;
    const actualPercent = sectorBreakdown[category] || 0;
    const driftPercent = round(actualPercent - targetPercent, 2);

    return {
      category,
      targetPercent,
      actualPercent,
      driftPercent
    };
  });

  const partialAnalysis: Partial<PortfolioAnalysis> = {
    totalValue,
    totalInvested,
    totalGainLoss,
    gainLossPercent,
    holdings: calculatedHoldings,
    sectorBreakdown,
    concentration,
    targetDrift
  };

  const aiSummary = llmService
    ? await llmService.generateExplanation(partialAnalysis)
    : generateFallbackSummary(partialAnalysis);

  return {
    totalValue,
    totalInvested,
    totalGainLoss,
    gainLossPercent,
    holdings: calculatedHoldings,
    sectorBreakdown,
    concentration,
    targetDrift,
    aiSummary
  };
}
