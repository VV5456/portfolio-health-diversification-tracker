import { Holding } from '../types/index.js';
import { HoldingsRepository } from '../db/holdingsRepository.js';
import { PriceFetcher } from '../engine/computeAnalysis.js';

export interface MarketPriceResult {
  symbol: string;
  price: number;
  isCached: boolean;
  fetchedAt: string;
}

export class MarketDataError extends Error {
  public code: string;
  public symbol: string;

  constructor(message: string, symbol: string, code: string = 'MARKET_DATA_ERROR') {
    super(message);
    this.name = 'MarketDataError';
    this.symbol = symbol;
    this.code = code;
  }
}

export class MarketDataService {
  private timeoutMs: number;
  private baseUrl: string;

  constructor(options?: { timeoutMs?: number; baseUrl?: string }) {
    this.timeoutMs = options?.timeoutMs || 5000;
    this.baseUrl = options?.baseUrl || 'https://query1.finance.yahoo.com/v8/finance/chart';
  }

  public normalizeSymbol(symbol: string): string {
    const clean = symbol.trim().toUpperCase();
    if (clean.includes('.')) {
      return clean;
    }
    return `${clean}.NS`;
  }

  async getCurrentPrice(
    stockSymbol: string,
    lastKnownPrice?: number,
    lastFetchedAt?: string
  ): Promise<MarketPriceResult> {
    if (!stockSymbol || typeof stockSymbol !== 'string' || stockSymbol.trim() === '') {
      throw new MarketDataError('Stock symbol is required', stockSymbol, 'INVALID_SYMBOL');
    }

    const rawSymbol = stockSymbol.trim().toUpperCase();
    const querySymbol = this.normalizeSymbol(rawSymbol);
    const now = new Date().toISOString();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/${querySymbol}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as any;
      const meta = data?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;

      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
        throw new Error('Invalid price value received from provider');
      }

      return {
        symbol: rawSymbol,
        price,
        isCached: false,
        fetchedAt: now
      };
    } catch (error) {
      clearTimeout(timer);

      if (typeof lastKnownPrice === 'number' && Number.isFinite(lastKnownPrice) && lastKnownPrice > 0) {
        return {
          symbol: rawSymbol,
          price: lastKnownPrice,
          isCached: true,
          fetchedAt: lastFetchedAt || now
        };
      }

      throw new MarketDataError(
        `Unable to fetch market price for ${rawSymbol} and no cached price is available.`,
        rawSymbol,
        'PRICE_UNAVAILABLE'
      );
    }
  }
}

/**
 * Creates a production PriceFetcher adapter connecting MarketDataService and HoldingsRepository
 * to the computeAnalysis engine.
 */
export function createProductionPriceFetcher(
  marketDataService: MarketDataService,
  holdingsRepo: HoldingsRepository,
  userId: string
): PriceFetcher {
  return async (symbol: string, holding: Holding) => {
    const result = await marketDataService.getCurrentPrice(
      symbol,
      holding.lastKnownPrice,
      holding.lastFetchedAt
    );

    if (!result.isCached) {
      // Asynchronously update price cache in DynamoDB
      holdingsRepo
        .updatePriceCache(userId, holding.stockSymbol, result.price, result.fetchedAt)
        .catch((err) => {
          console.error(`Failed to update price cache for ${holding.stockSymbol}:`, err);
        });
    }

    return {
      price: result.price,
      isCached: result.isCached
    };
  };
}
