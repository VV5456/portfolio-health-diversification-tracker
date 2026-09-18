import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HoldingsRepository } from '../db/holdingsRepository.js';
import { TargetsRepository } from '../db/targetsRepository.js';
import {
  MarketDataService,
  MarketDataError,
  createProductionPriceFetcher
} from '../services/marketDataService.js';
import { LLMService } from '../services/llmService.js';
import { computeAnalysis, PriceFetcher } from '../engine/computeAnalysis.js';

const DEFAULT_USER_ID = 'default-user';

export interface GetAnalysisDependencies {
  holdingsRepo?: HoldingsRepository;
  targetsRepo?: TargetsRepository;
  marketDataService?: MarketDataService;
  priceFetcher?: PriceFetcher;
  llmService?: LLMService;
}

export const createGetAnalysisHandler = (deps?: GetAnalysisDependencies) => {
  const holdingsRepo = deps?.holdingsRepo || new HoldingsRepository();
  const targetsRepo = deps?.targetsRepo || new TargetsRepository();
  const marketDataService = deps?.marketDataService || new MarketDataService();
  const llmService = deps?.llmService || new LLMService();

  const priceFetcher =
    deps?.priceFetcher || createProductionPriceFetcher(marketDataService, holdingsRepo, DEFAULT_USER_ID);

  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const analysis = await computeAnalysis(
        DEFAULT_USER_ID,
        holdingsRepo,
        targetsRepo,
        priceFetcher,
        llmService
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysis)
      };
    } catch (error) {
      console.error('Error computing portfolio analysis:', error);

      if (error instanceof MarketDataError) {
        return {
          statusCode: 502,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              code: error.code || 'PRICE_UNAVAILABLE',
              message: error.message
            }
          })
        };
      }

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal error occurred while computing portfolio analysis.'
          }
        })
      };
    }
  };
};

export const handler = createGetAnalysisHandler();
