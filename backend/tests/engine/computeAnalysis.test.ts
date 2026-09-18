import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computeAnalysis, PriceFetcher } from '../../src/engine/computeAnalysis.js';
import { HoldingsRepository } from '../../src/db/holdingsRepository.js';
import { TargetsRepository } from '../../src/db/targetsRepository.js';
import { Holding, TargetAllocation } from '../../src/types/index.js';

describe('Portfolio Analysis Engine (computeAnalysis)', () => {
  let mockHoldingsRepo: HoldingsRepository;
  let mockTargetsRepo: TargetsRepository;

  beforeEach(() => {
    mockHoldingsRepo = {
      getHoldings: vi.fn(),
      getHolding: vi.fn(),
      saveHolding: vi.fn(),
      deleteHolding: vi.fn()
    } as unknown as HoldingsRepository;

    mockTargetsRepo = {
      getTargets: vi.fn(),
      getTarget: vi.fn(),
      saveTarget: vi.fn(),
      saveTargets: vi.fn(),
      deleteTarget: vi.fn()
    } as unknown as TargetsRepository;
  });

  it('should compute analysis accurately for a multi-holding portfolio', async () => {
    const mockHoldings: Holding[] = [
      {
        userId: 'default-user',
        stockSymbol: 'TCS',
        quantity: 10,
        avgBuyPrice: 3800,
        sector: 'IT',
        addedAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z'
      },
      {
        userId: 'default-user',
        stockSymbol: 'HDFCBANK',
        quantity: 20,
        avgBuyPrice: 1600,
        sector: 'Banking',
        addedAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z'
      },
      {
        userId: 'default-user',
        stockSymbol: 'RELIANCE',
        quantity: 10,
        avgBuyPrice: 2400,
        sector: 'Energy',
        addedAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z'
      }
    ];

    const mockTargets: TargetAllocation[] = [
      { userId: 'default-user', category: 'IT', targetPercent: 30, updatedAt: '2026-09-18T10:00:00.000Z' },
      { userId: 'default-user', category: 'Banking', targetPercent: 40, updatedAt: '2026-09-18T10:00:00.000Z' },
      { userId: 'default-user', category: 'Energy', targetPercent: 30, updatedAt: '2026-09-18T10:00:00.000Z' }
    ];

    const mockPriceFetcher: PriceFetcher = async (symbol) => {
      const prices: Record<string, number> = {
        TCS: 4000,
        HDFCBANK: 1500,
        RELIANCE: 2500
      };
      return { price: prices[symbol] || 0, isCached: false };
    };

    vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue(mockHoldings);
    vi.mocked(mockTargetsRepo.getTargets).mockResolvedValue(mockTargets);

    const result = await computeAnalysis('default-user', mockHoldingsRepo, mockTargetsRepo, mockPriceFetcher);

    // Totals
    expect(result.totalValue).toBe(95000); // 40000 + 30000 + 25000
    expect(result.totalInvested).toBe(94000); // 38000 + 32000 + 24000
    expect(result.totalGainLoss).toBe(1000);
    expect(result.gainLossPercent).toBe(1.06); // (1000 / 94000) * 100

    // Holdings per-item math
    const tcs = result.holdings.find((h) => h.stockSymbol === 'TCS')!;
    expect(tcs.currentValue).toBe(40000);
    expect(tcs.investedValue).toBe(38000);
    expect(tcs.gainLoss).toBe(2000);
    expect(tcs.gainLossPercent).toBe(5.26); // (2000/38000)*100
    expect(tcs.weightPercent).toBe(42.11); // (40000/95000)*100

    const hdfc = result.holdings.find((h) => h.stockSymbol === 'HDFCBANK')!;
    expect(hdfc.currentValue).toBe(30000);
    expect(hdfc.investedValue).toBe(32000);
    expect(hdfc.gainLoss).toBe(-2000);
    expect(hdfc.gainLossPercent).toBe(-6.25);
    expect(hdfc.weightPercent).toBe(31.58);

    // Sector breakdown
    expect(result.sectorBreakdown).toEqual({
      IT: 42.11,
      Banking: 31.58,
      Energy: 26.32
    });

    // Concentration (top3Percent = 100% > 60 -> high)
    expect(result.concentration.top1Symbol).toBe('TCS');
    expect(result.concentration.top1Percent).toBe(42.11);
    expect(result.concentration.top3Percent).toBe(100);
    expect(result.concentration.flag).toBe('high');

    // Target Drift
    const itDrift = result.targetDrift.find((td) => td.category === 'IT')!;
    expect(itDrift.actualPercent).toBe(42.11);
    expect(itDrift.targetPercent).toBe(30);
    expect(itDrift.driftPercent).toBe(12.11);

    const bankingDrift = result.targetDrift.find((td) => td.category === 'Banking')!;
    expect(bankingDrift.actualPercent).toBe(31.58);
    expect(bankingDrift.targetPercent).toBe(40);
    expect(bankingDrift.driftPercent).toBe(-8.42);
  });

  describe('Concentration risk thresholds', () => {
    const makeHoldingsWithValues = (values: number[]): Holding[] => {
      return values.map((val, idx) => ({
        userId: 'default-user',
        stockSymbol: `STOCK_${idx + 1}`,
        quantity: 1,
        avgBuyPrice: val,
        sector: 'IT',
        addedAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z',
        lastKnownPrice: val
      }));
    };

    it('should set flag = low when top3Percent <= 40 (exact boundary at 40)', async () => {
      // 4 holdings with values 40, 20, 20, 20 (total = 100). Top 3 sum = 80? Wait: values 10, 10, 10, 70 (total 100 -> top 3 = 90).
      // For top 3 sum = 40 (total 100): 15, 13, 12, 60 (total 100 -> top 3 = 60 + 15 + 13 = 88).
      // 5 holdings: 10, 10, 10, 35, 35 (total = 100 -> top 3 = 10 + 10 + 10 = 30? Wait: sort desc: 35, 35, 10, 10, 10 -> top 3 sum = 80).
      // To get top 3 sum = 40 with 4 holdings: 40, 20, 20, 20 -> sort desc: 40, 20, 20, 20 -> top 3 sum = 80.
      // To get top 3 sum = 40 with 5 equal holdings: 8, 8, 8, 8, 68 -> sort desc: 68, 8, 8, 8, 8 -> top 3 sum = 84.
      // 4 holdings: 14, 13, 13, 60 -> sort desc: 60, 14, 13, 13 -> top 3 sum = 87.
      // What if 3 holdings equal to 13.33 each out of total 100? No, top 3 IS all 3 holdings!
      // If portfolio has 4 holdings: 14, 13, 13, 60 -> top 3 = 60, 14, 13 = 87.
      // To make top 3 sum <= 40, portfolio needs at least 4 holdings where top 3 sum is 40.
      // E.g., 14, 13, 13, 60 (total 100) -> top 3 is 60+14+13 = 87.
      // E.g. values: 14, 13, 13, 60? Top 3 largest are 60, 14, 13!
      // If values are 14, 13, 13, 10, 50 -> 50 + 14 + 13 = 77.
      // If values are 10, 10, 10, 10, 60 -> 60 + 10 + 10 = 80.
      // Notice: Top 3 sum out of total N:
      // If total = 100, values = [14, 13, 13, 60] -> top 3 are 60, 14, 13 (sum = 87).
      // If total = 100, values = [10, 10, 10, 70] -> top 3 are 70, 10, 10 (sum = 90).
      // If total = 100, values = [14, 13, 13, 13, 13, 13, 13, 8] -> top 3 are 14, 13, 13 (sum = 40)!
      // 14 + 13 + 13 = 40 out of 100 (remaining 60 split into 13, 13, 13, 13, 8).
      const holdings = makeHoldingsWithValues([14, 13, 13, 13, 13, 13, 13, 8]); // total = 100, top 3 = 14 + 13 + 13 = 40.00%
      vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue(holdings);
      vi.mocked(mockTargetsRepo.getTargets).mockResolvedValue([]);

      const result = await computeAnalysis('default-user', mockHoldingsRepo, mockTargetsRepo);
      expect(result.concentration.top3Percent).toBe(40);
      expect(result.concentration.flag).toBe('low');
    });

    it('should set flag = moderate when top3Percent > 40 and <= 60 (exact boundary at 60)', async () => {
      // values: [20, 20, 20, 20, 20] -> total = 100, top 3 = 20 + 20 + 20 = 60.00%
      const holdings = makeHoldingsWithValues([20, 20, 20, 20, 20]);
      vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue(holdings);
      vi.mocked(mockTargetsRepo.getTargets).mockResolvedValue([]);

      const result = await computeAnalysis('default-user', mockHoldingsRepo, mockTargetsRepo);
      expect(result.concentration.top3Percent).toBe(60);
      expect(result.concentration.flag).toBe('moderate');
    });

    it('should set flag = high when top3Percent > 60', async () => {
      // values: [25, 20, 20, 35] -> total = 100, top 3 = 35 + 25 + 20 = 80.00% (> 60)
      const holdings = makeHoldingsWithValues([25, 20, 20, 35]);
      vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue(holdings);
      vi.mocked(mockTargetsRepo.getTargets).mockResolvedValue([]);

      const result = await computeAnalysis('default-user', mockHoldingsRepo, mockTargetsRepo);
      expect(result.concentration.top3Percent).toBe(80);
      expect(result.concentration.flag).toBe('high');
    });
  });

  describe('Target drift scope', () => {
    it('should calculate targetDrift ONLY for categories explicitly configured in targets', async () => {
      const mockHoldings: Holding[] = [
        {
          userId: 'default-user',
          stockSymbol: 'TCS',
          quantity: 10,
          avgBuyPrice: 100,
          sector: 'IT',
          addedAt: '2026-09-18T10:00:00.000Z',
          updatedAt: '2026-09-18T10:00:00.000Z',
          lastKnownPrice: 100
        },
        {
          userId: 'default-user',
          stockSymbol: 'RELIANCE',
          quantity: 10,
          avgBuyPrice: 100,
          sector: 'Energy',
          addedAt: '2026-09-18T10:00:00.000Z',
          updatedAt: '2026-09-18T10:00:00.000Z',
          lastKnownPrice: 100
        }
      ];

      // User configured targets for IT and FMCG only (Energy holding exists but has NO target configured)
      const mockTargets: TargetAllocation[] = [
        { userId: 'default-user', category: 'IT', targetPercent: 40, updatedAt: '2026-09-18T10:00:00.000Z' },
        { userId: 'default-user', category: 'FMCG', targetPercent: 20, updatedAt: '2026-09-18T10:00:00.000Z' }
      ];

      vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue(mockHoldings);
      vi.mocked(mockTargetsRepo.getTargets).mockResolvedValue(mockTargets);

      const result = await computeAnalysis('default-user', mockHoldingsRepo, mockTargetsRepo);

      // Target drift array length MUST match rawTargets length (2)
      expect(result.targetDrift).toHaveLength(2);

      // IT: actual = 50%, target = 40%, drift = +10%
      const itDrift = result.targetDrift.find((td) => td.category === 'IT')!;
      expect(itDrift).toBeDefined();
      expect(itDrift.actualPercent).toBe(50);
      expect(itDrift.targetPercent).toBe(40);
      expect(itDrift.driftPercent).toBe(10);

      // FMCG: actual = 0% (no holdings), target = 20%, drift = -20%
      const fmcgDrift = result.targetDrift.find((td) => td.category === 'FMCG')!;
      expect(fmcgDrift).toBeDefined();
      expect(fmcgDrift.actualPercent).toBe(0);
      expect(fmcgDrift.targetPercent).toBe(20);
      expect(fmcgDrift.driftPercent).toBe(-20);

      // Energy (held stock with no configured target) MUST NOT be present in targetDrift
      const energyDrift = result.targetDrift.find((td) => td.category === 'Energy');
      expect(energyDrift).toBeUndefined();
    });
  });

  it('should return empty portfolio analysis when holdings list is empty', async () => {
    vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue([]);
    vi.mocked(mockTargetsRepo.getTargets).mockResolvedValue([]);

    const result = await computeAnalysis('default-user', mockHoldingsRepo, mockTargetsRepo);

    expect(result.totalValue).toBe(0);
    expect(result.totalInvested).toBe(0);
    expect(result.totalGainLoss).toBe(0);
    expect(result.gainLossPercent).toBe(0);
    expect(result.holdings).toEqual([]);
    expect(result.sectorBreakdown).toEqual({});
    expect(result.concentration.top1Symbol).toBeNull();
    expect(result.concentration.flag).toBe('low');
    expect(result.aiSummary).toContain('empty');
  });

  it('should fall back to lastKnownPrice when priceFetcher fails or is unsupplied', async () => {
    const mockHoldings: Holding[] = [
      {
        userId: 'default-user',
        stockSymbol: 'INFY',
        quantity: 10,
        avgBuyPrice: 1500,
        sector: 'IT',
        addedAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z',
        lastKnownPrice: 1600
      }
    ];

    vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue(mockHoldings);
    vi.mocked(mockTargetsRepo.getTargets).mockResolvedValue([]);

    const failingPriceFetcher: PriceFetcher = async () => {
      throw new Error('API Rate Limit');
    };

    const result = await computeAnalysis('default-user', mockHoldingsRepo, mockTargetsRepo, failingPriceFetcher);

    expect(result.totalValue).toBe(16000);
    expect(result.holdings[0].isPriceCached).toBe(true);
    expect(result.holdings[0].currentPrice).toBe(1600);
  });

  it('should handle zero avgBuyPrice safely without NaN errors', async () => {
    const mockHoldings: Holding[] = [
      {
        userId: 'default-user',
        stockSymbol: 'BONUS_STOCK',
        quantity: 10,
        avgBuyPrice: 0,
        sector: 'Other',
        addedAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z',
        lastKnownPrice: 100
      }
    ];

    vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue(mockHoldings);
    vi.mocked(mockTargetsRepo.getTargets).mockResolvedValue([]);

    const result = await computeAnalysis('default-user', mockHoldingsRepo, mockTargetsRepo);

    expect(result.totalValue).toBe(1000);
    expect(result.totalInvested).toBe(0);
    expect(result.holdings[0].gainLossPercent).toBe(0);
    expect(Number.isNaN(result.gainLossPercent)).toBe(false);
  });
});
