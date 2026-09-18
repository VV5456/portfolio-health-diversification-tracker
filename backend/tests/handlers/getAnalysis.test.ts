import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { createGetAnalysisHandler } from '../../src/handlers/getAnalysis.js';
import { HoldingsRepository } from '../../src/db/holdingsRepository.js';
import { TargetsRepository } from '../../src/db/targetsRepository.js';
import { MarketDataError } from '../../src/services/marketDataService.js';
import { PriceFetcher } from '../../src/engine/computeAnalysis.js';
import { Holding, TargetAllocation } from '../../src/types/index.js';

describe('GET /analysis Handler (getAnalysis)', () => {
  let mockHoldingsRepo: HoldingsRepository;
  let mockTargetsRepo: TargetsRepository;
  let mockPriceFetcher: PriceFetcher;

  const fakeEvent = {} as APIGatewayProxyEvent;

  beforeEach(() => {
    mockHoldingsRepo = {
      getHoldings: vi.fn(),
      getHolding: vi.fn(),
      saveHolding: vi.fn(),
      updatePriceCache: vi.fn(),
      deleteHolding: vi.fn()
    } as unknown as HoldingsRepository;

    mockTargetsRepo = {
      getTargets: vi.fn(),
      getTarget: vi.fn(),
      saveTarget: vi.fn(),
      saveTargets: vi.fn(),
      deleteTarget: vi.fn()
    } as unknown as TargetsRepository;

    mockPriceFetcher = vi.fn();
  });

  it('should return 200 OK with empty portfolio analysis when user has no holdings', async () => {
    vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue([]);
    vi.mocked(mockTargetsRepo.getTargets).mockResolvedValue([]);

    const getAnalysisHandler = createGetAnalysisHandler({
      holdingsRepo: mockHoldingsRepo,
      targetsRepo: mockTargetsRepo,
      priceFetcher: mockPriceFetcher
    });

    const response = await getAnalysisHandler(fakeEvent);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.totalValue).toBe(0);
    expect(body.totalInvested).toBe(0);
    expect(body.holdings).toEqual([]);
    expect(body.sectorBreakdown).toEqual({});
    expect(body.concentration.flag).toBe('low');
    expect(body.aiSummary).toBeDefined();
  });

  it('should compute and return complete portfolio analysis for multiple holdings across sectors', async () => {
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
      }
    ];

    const mockTargets: TargetAllocation[] = [
      { userId: 'default-user', category: 'IT', targetPercent: 40, updatedAt: '2026-09-18T10:00:00.000Z' },
      { userId: 'default-user', category: 'Banking', targetPercent: 60, updatedAt: '2026-09-18T10:00:00.000Z' }
    ];

    vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue(mockHoldings);
    vi.mocked(mockTargetsRepo.getTargets).mockResolvedValue(mockTargets);

    vi.mocked(mockPriceFetcher).mockImplementation(async (symbol) => {
      if (symbol === 'TCS') return { price: 4000, isCached: false };
      if (symbol === 'HDFCBANK') return { price: 1500, isCached: false };
      return { price: 0, isCached: false };
    });

    const getAnalysisHandler = createGetAnalysisHandler({
      holdingsRepo: mockHoldingsRepo,
      targetsRepo: mockTargetsRepo,
      priceFetcher: mockPriceFetcher
    });

    const response = await getAnalysisHandler(fakeEvent);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    // Documented response fields verification
    expect(body).toHaveProperty('totalValue', 70000); // 40000 + 30000
    expect(body).toHaveProperty('totalInvested', 70000); // 38000 + 32000
    expect(body).toHaveProperty('totalGainLoss', 0);
    expect(body).toHaveProperty('gainLossPercent', 0);

    expect(body.holdings).toHaveLength(2);
    expect(body.holdings[0]).toHaveProperty('stockSymbol', 'TCS');
    expect(body.holdings[0]).toHaveProperty('currentPrice', 4000);
    expect(body.holdings[0]).toHaveProperty('isPriceCached', false);

    expect(body.sectorBreakdown).toEqual({
      IT: 57.14,
      Banking: 42.86
    });

    expect(body.targetDrift).toHaveLength(2);
  });

  it('should handle mixed fresh and cached prices correctly', async () => {
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

    vi.mocked(mockPriceFetcher).mockImplementation(async (symbol) => {
      if (symbol === 'TCS') return { price: 4000, isCached: false };
      // INFY returns cached price
      return { price: 1600, isCached: true };
    });

    const getAnalysisHandler = createGetAnalysisHandler({
      holdingsRepo: mockHoldingsRepo,
      targetsRepo: mockTargetsRepo,
      priceFetcher: mockPriceFetcher
    });

    const response = await getAnalysisHandler(fakeEvent);

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    const tcs = body.holdings.find((h: any) => h.stockSymbol === 'TCS');
    const infy = body.holdings.find((h: any) => h.stockSymbol === 'INFY');

    expect(tcs.isPriceCached).toBe(false);
    expect(infy.isPriceCached).toBe(true);
  });

  it('should return 502 Bad Gateway when market data fails with no cached price available', async () => {
    const mockHoldings: Holding[] = [
      {
        userId: 'default-user',
        stockSymbol: 'NEWSTOCK',
        quantity: 10,
        avgBuyPrice: 100,
        sector: 'Other',
        addedAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z'
      }
    ];

    vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue(mockHoldings);
    vi.mocked(mockTargetsRepo.getTargets).mockResolvedValue([]);

    vi.mocked(mockPriceFetcher).mockRejectedValue(
      new MarketDataError('Unable to fetch market price for NEWSTOCK and no cached price is available.', 'NEWSTOCK', 'PRICE_UNAVAILABLE')
    );

    const getAnalysisHandler = createGetAnalysisHandler({
      holdingsRepo: mockHoldingsRepo,
      targetsRepo: mockTargetsRepo,
      priceFetcher: mockPriceFetcher
    });

    const response = await getAnalysisHandler(fakeEvent);

    expect(response.statusCode).toBe(502);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('PRICE_UNAVAILABLE');
    expect(body.error.message).toContain('NEWSTOCK');
  });

  it('should return 500 Internal Server Error when repository operation fails', async () => {
    vi.mocked(mockHoldingsRepo.getHoldings).mockRejectedValue(new Error('DynamoDB Connection Timeout'));

    const getAnalysisHandler = createGetAnalysisHandler({
      holdingsRepo: mockHoldingsRepo,
      targetsRepo: mockTargetsRepo,
      priceFetcher: mockPriceFetcher
    });

    const response = await getAnalysisHandler(fakeEvent);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.message).toBe('An internal error occurred while computing portfolio analysis.');
  });
});
