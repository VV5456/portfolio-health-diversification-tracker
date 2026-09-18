import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HoldingsRepository } from '../db/holdingsRepository.js';

const DEFAULT_USER_ID = 'default-user';

export const createDeleteHoldingHandler = (repository: HoldingsRepository) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const stockSymbol = event.pathParameters?.stockSymbol;

      if (!stockSymbol || stockSymbol.trim() === '') {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              code: 'INVALID_INPUT',
              message: 'Path parameter stockSymbol is required.'
            }
          })
        };
      }

      const normalizedSymbol = stockSymbol.trim().toUpperCase();

      const existingHolding = await repository.getHolding(DEFAULT_USER_ID, normalizedSymbol);

      if (!existingHolding) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              code: 'NOT_FOUND',
              message: `Holding for stockSymbol ${normalizedSymbol} was not found.`
            }
          })
        };
      }

      await repository.deleteHolding(DEFAULT_USER_ID, normalizedSymbol);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ok',
          message: `Holding for ${normalizedSymbol} deleted successfully`,
          stockSymbol: normalizedSymbol
        })
      };
    } catch (error) {
      console.error('Error deleting holding:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal error occurred while deleting the holding.'
          }
        })
      };
    }
  };
};

const defaultRepository = new HoldingsRepository();
export const handler = createDeleteHoldingHandler(defaultRepository);
