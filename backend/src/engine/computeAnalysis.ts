import { HoldingsRepository } from '../db/holdingsRepository.js';
import { TargetsRepository } from '../db/targetsRepository.js';
import { normalizeCategory } from '../config/sectorLookup.js';
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
  priceFetcher?: PriceFetcher
): Promise<PortfolioAnalysis> {
  const rawHoldings = await holdingsRepo.getHoldings(userId);
  const rawTargets = await targetsRepo.getTargets(userId);

  if (!rawHoldings || rawHoldings.length === 0) {
    return {
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
      })),
      aiSummary: 'Your portfolio is currently empty. Add holdings to calculate valuation, sector weights, concentration risk, and target drift.'
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
  const totalGainLoss = round(unroundedTotalValue - unroundedTotalInvested, 2);
  const gainLossPercent = unroundedTotalInvested > 0
    ? round(((unroundedTotalValue - unroundedTotalInvested) / unroundedTotalInvested) * 100, 2)
    : 0;

  // 2. Calculate weightPercent per holding & build CalculatedHolding array
  const calculatedHoldings: CalculatedHolding[] = intermediateHoldings.map((item) => {
    const unroundedWeight = unroundedTotalValue > 0 ? (item.currentValue / unroundedTotalValue) * 100 : 0;
    return {
      ...item.holding,
      currentPrice: round(item.currentPrice, 2),
      investedValue: round(item.investedValue, 2),
      currentValue: round(item.currentValue, 2),
      gainLoss: round(item.gainLoss, 2),
      gainLossPercent: round(item.gainLossPercent, 2),
      weightPercent: round(unroundedWeight, 2),
      isPriceCached: item.isPriceCached
    };
  });

  // 3. Sector Breakdown
  const sectorValueMap: Record<string, number> = {};

  for (const item of intermediateHoldings) {
    const sector = normalizeCategory(item.holding.sector || 'Other');
    sectorValueMap[sector] = (sectorValueMap[sector] || 0) + item.currentValue;
  }

  const sectorBreakdown: Record<string, number> = {};
  for (const [sector, value] of Object.entries(sectorValueMap)) {
    sectorBreakdown[sector] = unroundedTotalValue > 0 ? round((value / unroundedTotalValue) * 100, 2) : 0;
  }

  // 4. Concentration Risk (Strict spec compliance: top3Percent > 60 -> high, top3Percent > 40 -> moderate, else low)
  const sortedByValue = [...calculatedHoldings].sort((a, b) => b.currentValue - a.currentValue);
  const top1Holding = sortedByValue[0] || null;
  const top1Percent = top1Holding ? top1Holding.weightPercent : 0;
  const top1Symbol = top1Holding ? top1Holding.stockSymbol : null;

  const top3ValueSum = sortedByValue.slice(0, 3).reduce((acc, h) => acc + h.currentValue, 0);
  const top3Percent = unroundedTotalValue > 0 ? round((top3ValueSum / unroundedTotalValue) * 100, 2) : 0;

  let flag: 'high' | 'moderate' | 'low' = 'low';
  let flagReason = 'Portfolio concentration is balanced across holdings.';

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

  // 5. Target Drift (Strict spec compliance: calculated strictly for each configured target)
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

  return {
    totalValue,
    totalInvested,
    totalGainLoss,
    gainLossPercent,
    holdings: calculatedHoldings,
    sectorBreakdown,
    concentration,
    targetDrift,
    aiSummary: 'Portfolio analysis engine executed successfully.'
  };
}
