import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { createDeleteHoldingHandler } from '../../src/handlers/deleteHolding.js';
import { HoldingsRepository } from '../../src/db/holdingsRepository.js';
import { Holding } from '../../src/types/index.js';

describe('deleteHolding Handler', () => {
  let mockRepository: HoldingsRepository;

  beforeEach(() => {
    mockRepository = {
      getHoldings: vi.fn(),
      getHolding: vi.fn(),
      saveHolding: vi.fn(),
      deleteHolding: vi.fn()
    } as unknown as HoldingsRepository;
  });

  const createEvent = (stockSymbol?: string): APIGatewayProxyEvent => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'DELETE',
    isBase64Encoded: false,
    path: stockSymbol ? `/holdings/${stockSymbol}` : '/holdings/',
    pathParameters: stockSymbol !== undefined ? { stockSymbol } : null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: ''
  });

  it('should delete an existing holding successfully', async () => {
    const existingHolding: Holding = {
      userId: 'default-user',
      stockSymbol: 'TCS',
      quantity: 10,
      avgBuyPrice: 3800,
      sector: 'IT',
      addedAt: '2026-09-18T10:00:00.000Z',
      updatedAt: '2026-09-18T10:00:00.000Z'
    };

    vi.mocked(mockRepository.getHolding).mockResolvedValue(existingHolding);
    vi.mocked(mockRepository.deleteHolding).mockResolvedValue(true);

    const handler = createDeleteHoldingHandler(mockRepository);
    const response = await handler(createEvent('tcs'));

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.stockSymbol).toBe('TCS');
    expect(mockRepository.deleteHolding).toHaveBeenCalledWith('default-user', 'TCS');
  });

  it('should return 400 INVALID_INPUT if stockSymbol path parameter is missing or empty', async () => {
    const handler = createDeleteHoldingHandler(mockRepository);
    const response = await handler(createEvent('   '));

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('should return 404 NOT_FOUND if holding does not exist', async () => {
    vi.mocked(mockRepository.getHolding).mockResolvedValue(null);

    const handler = createDeleteHoldingHandler(mockRepository);
    const response = await handler(createEvent('NONEXISTENT'));

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('NONEXISTENT');
  });

  it('should return 500 INTERNAL_SERVER_ERROR when repository throws error', async () => {
    vi.mocked(mockRepository.getHolding).mockRejectedValue(new Error('DB Error'));

    const handler = createDeleteHoldingHandler(mockRepository);
    const response = await handler(createEvent('TCS'));

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
