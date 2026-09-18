import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HoldingsRepository } from '../db/holdingsRepository.js';
import { getSectorForSymbol } from '../config/sectorLookup.js';
import { Holding } from '../types/index.js';

const DEFAULT_USER_ID = 'default-user';

export const createSaveHoldingsHandler = (repository: HoldingsRepository) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              code: 'INVALID_INPUT',
              message: 'Request body is required.'
            }
          })
        };
      }

      let payload: any;
      try {
        payload = JSON.parse(event.body);
      } catch (err) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              code: 'INVALID_INPUT',
              message: 'Malformed JSON request body.'
            }
          })
        };
      }

      const { stockSymbol, quantity, avgBuyPrice } = payload;
      const details: Array<{ field: string; issue: string }> = [];

      if (!stockSymbol || typeof stockSymbol !== 'string' || stockSymbol.trim() === '') {
        details.push({ field: 'stockSymbol', issue: 'stockSymbol is required and must be a non-empty string.' });
      }

      if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
        details.push({ field: 'quantity', issue: 'quantity must be a positive number greater than 0.' });
      }

      if (typeof avgBuyPrice !== 'number' || !Number.isFinite(avgBuyPrice) || avgBuyPrice <= 0) {
        details.push({ field: 'avgBuyPrice', issue: 'avgBuyPrice must be a positive number greater than 0.' });
      }

      if (details.length > 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              code: 'INVALID_INPUT',
              message: 'Invalid input fields provided.',
              details
            }
          })
        };
      }

      const normalizedSymbol = stockSymbol.trim().toUpperCase();
      const sector = getSectorForSymbol(normalizedSymbol);
      const now = new Date().toISOString();

      // Check for existing holding to preserve addedAt and price cache
      const existingHolding = await repository.getHolding(DEFAULT_USER_ID, normalizedSymbol);

      const holdingToSave: Holding = {
        userId: DEFAULT_USER_ID,
        stockSymbol: normalizedSymbol,
        quantity,
        avgBuyPrice,
        sector,
        addedAt: existingHolding?.addedAt || now,
        updatedAt: now
      };

      if (existingHolding?.lastKnownPrice !== undefined) {
        holdingToSave.lastKnownPrice = existingHolding.lastKnownPrice;
      }
      if (existingHolding?.lastFetchedAt !== undefined) {
        holdingToSave.lastFetchedAt = existingHolding.lastFetchedAt;
      }

      const savedHolding = await repository.saveHolding(holdingToSave);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ok',
          message: 'Holding updated successfully',
          holding: savedHolding
        })
      };
    } catch (error) {
      console.error('Error saving holding:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal database error occurred while saving the holding.'
          }
        })
      };
    }
  };
};

const defaultRepository = new HoldingsRepository();
export const handler = createSaveHoldingsHandler(defaultRepository);
