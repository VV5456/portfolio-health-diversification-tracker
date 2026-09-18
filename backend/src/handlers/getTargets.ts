import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TargetsRepository } from '../db/targetsRepository.js';

const DEFAULT_USER_ID = 'default-user';

export const createGetTargetsHandler = (repository: TargetsRepository) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const targets = await repository.getTargets(DEFAULT_USER_ID);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targets
        })
      };
    } catch (error) {
      console.error('Error retrieving targets:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An internal error occurred while retrieving target allocations.'
          }
        })
      };
    }
  };
};

const defaultRepository = new TargetsRepository();
export const handler = createGetTargetsHandler(defaultRepository);
