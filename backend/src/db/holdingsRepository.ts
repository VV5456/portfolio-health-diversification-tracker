import { Holding } from '../types/index.js';

export class HoldingsRepository {
  async getHoldings(userId: string): Promise<Holding[]> {
    return [];
  }

  async saveHolding(holding: Holding): Promise<Holding> {
    return holding;
  }

  async deleteHolding(userId: string, stockSymbol: string): Promise<boolean> {
    return true;
  }
}
