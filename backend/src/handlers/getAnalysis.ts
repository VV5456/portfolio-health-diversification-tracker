import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { computeAnalysis } from '../engine/computeAnalysis.js';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const analysis = await computeAnalysis('default-user');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysis)
  };
};
