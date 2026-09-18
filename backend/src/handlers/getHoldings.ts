import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HoldingsRepository } from '../db/holdingsRepository.js';

const DEFAULT_USER_ID = 'default-user';

export const createGetHoldingsHandler = (repository: HoldingsRepository) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const holdings = await repository.getHoldings(DEFAULT_USER_ID);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings
        })
      };
    } catch (error) {
      console.error('Error retrieving holdings:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal error occurred while retrieving holdings.'
          }
        })
      };
    }
  };
};

const defaultRepository = new HoldingsRepository();
export const handler = createGetHoldingsHandler(defaultRepository);
