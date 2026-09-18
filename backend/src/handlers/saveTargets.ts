import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TargetsRepository } from '../db/targetsRepository.js';
import { normalizeCategory } from '../config/sectorLookup.js';
import { TargetAllocation } from '../types/index.js';

const DEFAULT_USER_ID = 'default-user';

export const createSaveTargetsHandler = (repository: TargetsRepository) => {
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

      const isArrayPayload = Array.isArray(payload) || (payload && Array.isArray(payload.targets));
      const targetItemsToValidate = isArrayPayload
        ? (Array.isArray(payload) ? payload : payload.targets)
        : [payload];

      if (!targetItemsToValidate || targetItemsToValidate.length === 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              code: 'INVALID_INPUT',
              message: 'Target items payload cannot be empty.'
            }
          })
        };
      }

      const details: Array<{ field: string; issue: string }> = [];
      const validatedTargets: TargetAllocation[] = [];
      const now = new Date().toISOString();

      for (let i = 0; i < targetItemsToValidate.length; i++) {
        const item = targetItemsToValidate[i];
        const itemPrefix = isArrayPayload ? `targets[${i}].` : '';

        if (!item || typeof item !== 'object') {
          details.push({ field: `${itemPrefix}item`, issue: 'Target item must be an object.' });
          continue;
        }

        const { category, targetPercent } = item;

        if (!category || typeof category !== 'string' || category.trim() === '') {
          details.push({ field: `${itemPrefix}category`, issue: 'category is required and must be a non-empty string.' });
        }

        if (typeof targetPercent !== 'number' || !Number.isFinite(targetPercent)) {
          details.push({ field: `${itemPrefix}targetPercent`, issue: 'targetPercent must be a valid number.' });
        } else if (targetPercent < 0 || targetPercent > 100) {
          details.push({ field: `${itemPrefix}targetPercent`, issue: 'targetPercent must be between 0 and 100 inclusive.' });
        }

        if (details.length === 0 && typeof category === 'string' && typeof targetPercent === 'number') {
          const canonicalCategory = normalizeCategory(category);
          validatedTargets.push({
            userId: DEFAULT_USER_ID,
            category: canonicalCategory,
            targetPercent,
            updatedAt: now
          });
        }
      }

      if (details.length > 0) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              code: 'INVALID_INPUT',
              message: 'Invalid target allocation input.',
              details
            }
          })
        };
      }

      if (!isArrayPayload) {
        const singleTarget = validatedTargets[0];
        const savedTarget = await repository.saveTarget(singleTarget);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'ok',
            message: 'Target allocation updated successfully',
            target: savedTarget
          })
        };
      } else {
        const savedTargets = await repository.saveTargets(validatedTargets);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'ok',
            message: 'Target allocations updated successfully',
            targets: savedTargets
          })
        };
      }
    } catch (error) {
      console.error('Error saving target allocation:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal database error occurred while saving target allocation.'
          }
        })
      };
    }
  };
};

const defaultRepository = new TargetsRepository();
export const handler = createSaveTargetsHandler(defaultRepository);
