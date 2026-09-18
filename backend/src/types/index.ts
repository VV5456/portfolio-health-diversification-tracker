export interface Holding {
  userId: string;
  stockSymbol: string;
  quantity: number;
  avgBuyPrice: number;
  sector: string;
  addedAt: string;
  updatedAt: string;
  lastKnownPrice?: number;
  lastFetchedAt?: string;
}

export interface TargetAllocation {
  userId: string;
  category: string;
  targetPercent: number;
  updatedAt: string;
}

export interface CalculatedHolding extends Holding {
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  weightPercent: number;
  isPriceCached: boolean;
}

export interface ConcentrationInfo {
  top1Percent: number;
  top3Percent: number;
  top1Symbol: string | null;
  flag: 'high' | 'moderate' | 'low';
  flagReason: string;
}

export interface TargetDriftItem {
  category: string;
  targetPercent: number;
  actualPercent: number;
  driftPercent: number;
}

export interface PortfolioAnalysis {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  gainLossPercent: number;
  holdings: CalculatedHolding[];
  sectorBreakdown: Record<string, number>;
  concentration: ConcentrationInfo;
  targetDrift: TargetDriftItem[];
  aiSummary: string;
}
