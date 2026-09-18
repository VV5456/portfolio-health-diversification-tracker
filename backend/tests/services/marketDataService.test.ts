import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MarketDataService,
  MarketDataError,
  createProductionPriceFetcher
} from '../../src/services/marketDataService.js';
import { HoldingsRepository } from '../../src/db/holdingsRepository.js';
import { TargetsRepository } from '../../src/db/targetsRepository.js';
import { computeAnalysis } from '../../src/engine/computeAnalysis.js';
import { Holding } from '../../src/types/index.js';

describe('MarketDataService & Price Cache Integration', () => {
  let service: MarketDataService;
  let mockHoldingsRepo: HoldingsRepository;

  beforeEach(() => {
    service = new MarketDataService({ timeoutMs: 1000, baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart' });
    mockHoldingsRepo = {
      getHoldings: vi.fn(),
      getHolding: vi.fn(),
      saveHolding: vi.fn(),
      updatePriceCache: vi.fn().mockResolvedValue(undefined),
      deleteHolding: vi.fn()
    } as unknown as HoldingsRepository;

    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Symbol Normalization', () => {
    it('should append .NS to plain ticker symbols', () => {
      expect(service.normalizeSymbol('tcs')).toBe('TCS.NS');
      expect(service.normalizeSymbol('INFY')).toBe('INFY.NS');
    });

    it('should preserve existing exchange suffixes (.NS, .BO)', () => {
      expect(service.normalizeSymbol('TCS.NS')).toBe('TCS.NS');
      expect(service.normalizeSymbol('RELIANCE.BO')).toBe('RELIANCE.BO');
    });

    it('should throw MarketDataError on empty or invalid symbol input', async () => {
      await expect(service.getCurrentPrice('')).rejects.toThrow(MarketDataError);
      await expect(service.getCurrentPrice('   ')).rejects.toThrow(MarketDataError);
    });
  });

  describe('getCurrentPrice Fetch & Cache Handling', () => {
    it('should successfully fetch live stock price and return isCached: false', async () => {
      const mockResponse = {
        chart: {
          result: [
            {
              meta: {
                symbol: 'TCS.NS',
                regularMarketPrice: 4120.5
              }
            }
          ]
        }
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await service.getCurrentPrice('TCS');

      expect(fetch).toHaveBeenCalledWith(
        'https://query1.finance.yahoo.com/v8/finance/chart/TCS.NS',
        expect.objectContaining({
          headers: expect.objectContaining({ 'User-Agent': expect.any(String) })
        })
      );
      expect(result.symbol).toBe('TCS');
      expect(result.price).toBe(4120.5);
      expect(result.isCached).toBe(false);
      expect(result.fetchedAt).toBeDefined();
    });

    it('should fall back to lastKnownPrice with isCached: true when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500
      } as Response);

      const result = await service.getCurrentPrice('TCS', 3800.0, '2026-09-18T10:00:00.000Z');

      expect(result.symbol).toBe('TCS');
      expect(result.price).toBe(3800.0);
      expect(result.isCached).toBe(true);
      expect(result.fetchedAt).toBe('2026-09-18T10:00:00.000Z');
    });

    it('should fall back to lastKnownPrice when fetch operation times out (AbortError)', async () => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      vi.mocked(fetch).mockRejectedValueOnce(abortErr);

      const result = await service.getCurrentPrice('TCS', 3800.0, '2026-09-18T10:00:00.000Z');

      expect(result.symbol).toBe('TCS');
      expect(result.price).toBe(3800.0);
      expect(result.isCached).toBe(true);
    });

    it('should throw MarketDataError when fetch fails and no lastKnownPrice is available', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getCurrentPrice('UNKNOWN_STOCK')).rejects.toThrow(MarketDataError);
    });

    it('should fall back to lastKnownPrice or throw MarketDataError on malformed provider JSON payloads', async () => {
      const malformedPayloads = [
        {},
        { chart: {} },
        { chart: { result: [] } },
        { chart: { result: [{}] } },
        { chart: { result: [{ meta: {} }] } },
        { chart: { result: [{ meta: { regularMarketPrice: null } }] } },
        { chart: { result: [{ meta: { regularMarketPrice: '4000' } }] } },
        { chart: { result: [{ meta: { regularMarketPrice: -500 } }] } },
        { chart: { result: [{ meta: { regularMarketPrice: NaN } }] } }
      ];

      for (const payload of malformedPayloads) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => payload
        } as Response);

        // Test fallback to lastKnownPrice
        const fallbackResult = await service.getCurrentPrice('TCS', 3500);
        expect(fallbackResult.price).toBe(3500);
        expect(fallbackResult.isCached).toBe(true);

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => payload
        } as Response);

        // Test error when no lastKnownPrice is available
        await expect(service.getCurrentPrice('TCS')).rejects.toThrow(MarketDataError);
      }
    });
  });

  describe('createProductionPriceFetcher Integration with computeAnalysis', () => {
    it('should trigger updatePriceCache on holdingsRepo when price is live', async () => {
      const mockHolding: Holding = {
        userId: 'default-user',
        stockSymbol: 'TCS',
        quantity: 10,
        avgBuyPrice: 3800,
        sector: 'IT',
        addedAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chart: { result: [{ meta: { regularMarketPrice: 4000 } }] }
        })
      } as Response);

      const priceFetcher = createProductionPriceFetcher(service, mockHoldingsRepo, 'default-user');
      const priceResult = await priceFetcher('TCS', mockHolding);

      expect(priceResult.price).toBe(4000);
      expect(priceResult.isCached).toBe(false);

      expect(mockHoldingsRepo.updatePriceCache).toHaveBeenCalledWith(
        'default-user',
        'TCS',
        4000,
        expect.any(String)
      );
    });

    it('should resolve fresh price cleanly even if updatePriceCache fails/rejects', async () => {
      const mockHolding: Holding = {
        userId: 'default-user',
        stockSymbol: 'TCS',
        quantity: 10,
        avgBuyPrice: 3800,
        sector: 'IT',
        addedAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chart: { result: [{ meta: { regularMarketPrice: 4000 } }] }
        })
      } as Response);

      // Mock updatePriceCache to reject (e.g. DynamoDB write error)
      vi.mocked(mockHoldingsRepo.updatePriceCache).mockRejectedValueOnce(
        new Error('DynamoDB write capacity exceeded')
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const priceFetcher = createProductionPriceFetcher(service, mockHoldingsRepo, 'default-user');
      const priceResult = await priceFetcher('TCS', mockHolding);

      expect(priceResult.price).toBe(4000);
      expect(priceResult.isCached).toBe(false);

      // Wait brief tick for async catch block
      await new Promise((r) => setTimeout(r, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update price cache for TCS:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should allow computeAnalysis to use production price fetcher adapter', async () => {
      const mockHoldings: Holding[] = [
        {
          userId: 'default-user',
          stockSymbol: 'TCS',
          quantity: 10,
          avgBuyPrice: 3800,
          sector: 'IT',
          addedAt: '2026-09-18T10:00:00.000Z',
          updatedAt: '2026-09-18T10:00:00.000Z',
          lastKnownPrice: 3900
        }
      ];

      const mockTargetsRepo = {
        getTargets: vi.fn().mockResolvedValue([])
      } as unknown as TargetsRepository;

      vi.mocked(mockHoldingsRepo.getHoldings).mockResolvedValue(mockHoldings);

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection timed out'));

      const productionFetcher = createProductionPriceFetcher(service, mockHoldingsRepo, 'default-user');

      const analysis = await computeAnalysis('default-user', mockHoldingsRepo, mockTargetsRepo, productionFetcher);

      expect(analysis.totalValue).toBe(39000); // 10 * 3900 (cached price)
      expect(analysis.holdings[0].isPriceCached).toBe(true);
      expect(mockHoldingsRepo.updatePriceCache).not.toHaveBeenCalled();
    });
  });
});
