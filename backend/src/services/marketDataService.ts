export class MarketDataService {
  async fetchPrice(symbol: string): Promise<{ price: number; isCached: boolean }> {
    return { price: 0, isCached: false };
  }
}
