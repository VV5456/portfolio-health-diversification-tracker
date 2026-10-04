import { Holding, TargetAllocation, PortfolioAnalysis, ApiErrorResponse } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL !== 'http://localhost:3000/api')
  ? import.meta.env.VITE_API_BASE_URL
  : 'https://5gv00gm0g4.execute-api.ap-south-1.amazonaws.com/Prod';

class ApiClientError extends Error {
  code: string;
  details?: Array<{ field?: string; issue?: string }>;

  constructor(message: string, code: string = 'API_ERROR', details?: Array<{ field?: string; issue?: string }>) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, '')}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      const errorData = data as ApiErrorResponse;
      const message = errorData?.error?.message || `HTTP Request failed with status ${response.status}`;
      const code = errorData?.error?.code || 'UNKNOWN_ERROR';
      const details = errorData?.error?.details;
      throw new ApiClientError(message, code, details);
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(
      err instanceof Error ? err.message : 'Network failure or API unavailable',
      'NETWORK_ERROR'
    );
  }
}

export const api = {
  /**
   * Fetch all raw holdings stored for the portfolio
   */
  getHoldings: async (): Promise<Holding[]> => {
    const res = await request<{ holdings: Holding[] }>('/holdings', { method: 'GET' });
    return res.holdings || [];
  },

  /**
   * Add or update a stock holding
   */
  saveHolding: async (payload: { stockSymbol: string; quantity: number; avgBuyPrice: number }): Promise<Holding> => {
    const res = await request<{ status: string; message: string; holding: Holding }>('/holdings', {
      method: 'POST',
      body: JSON.stringify({
        stockSymbol: payload.stockSymbol.trim().toUpperCase(),
        quantity: Number(payload.quantity),
        avgBuyPrice: Number(payload.avgBuyPrice),
      }),
    });
    return res.holding;
  },

  /**
   * Delete a stock holding by symbol
   */
  deleteHolding: async (stockSymbol: string): Promise<void> => {
    const symbol = encodeURIComponent(stockSymbol.trim().toUpperCase());
    await request<{ status: string; message: string; stockSymbol: string }>(`/holdings/${symbol}`, {
      method: 'DELETE',
    });
  },

  /**
   * Fetch all configured target allocations
   */
  getTargets: async (): Promise<TargetAllocation[]> => {
    const res = await request<{ targets: TargetAllocation[] }>('/targets', { method: 'GET' });
    return res.targets || [];
  },

  /**
   * Save array of target allocations
   */
  saveTargets: async (targets: Array<{ category: string; targetPercent: number }>): Promise<TargetAllocation[]> => {
    const res = await request<{ status: string; message: string; targets: TargetAllocation[] }>('/targets', {
      method: 'POST',
      body: JSON.stringify({
        targets: targets.map((t) => ({
          category: t.category.trim(),
          targetPercent: Number(t.targetPercent),
        })),
      }),
    });
    return res.targets || [];
  },

  /**
   * Execute full portfolio analysis and return valuation, risk & AI summary
   */
  getAnalysis: async (): Promise<PortfolioAnalysis> => {
    return await request<PortfolioAnalysis>('/analysis', { method: 'GET' });
  },
};
