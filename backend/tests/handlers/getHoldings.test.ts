import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { createGetHoldingsHandler } from '../../src/handlers/getHoldings.js';
import { HoldingsRepository } from '../../src/db/holdingsRepository.js';
import { Holding } from '../../src/types/index.js';

describe('getHoldings Handler', () => {
  let mockRepository: HoldingsRepository;

  beforeEach(() => {
    mockRepository = {
      getHoldings: vi.fn(),
      getHolding: vi.fn(),
      saveHolding: vi.fn(),
      deleteHolding: vi.fn()
    } as unknown as HoldingsRepository;
  });

  const createEvent = (): APIGatewayProxyEvent => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/holdings',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: ''
  });

  it('should return populated holdings for default-user', async () => {
    const mockHoldings: Holding[] = [
      {
        userId: 'default-user',
        stockSymbol: 'TCS',
        quantity: 10,
        avgBuyPrice: 3800,
        sector: 'IT',
        addedAt: '2026-09-18T10:00:00.000Z',
        updatedAt: '2026-09-18T10:00:00.000Z'
      }
    ];

    vi.mocked(mockRepository.getHoldings).mockResolvedValue(mockHoldings);

    const handler = createGetHoldingsHandler(mockRepository);
    const response = await handler(createEvent());

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.holdings).toEqual(mockHoldings);
  });

  it('should return empty holdings array when user has no holdings', async () => {
    vi.mocked(mockRepository.getHoldings).mockResolvedValue([]);

    const handler = createGetHoldingsHandler(mockRepository);
    const response = await handler(createEvent());

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.holdings).toEqual([]);
  });

  it('should return 500 INTERNAL_SERVER_ERROR when repository fails', async () => {
    vi.mocked(mockRepository.getHoldings).mockRejectedValue(new Error('DB Read Error'));

    const handler = createGetHoldingsHandler(mockRepository);
    const response = await handler(createEvent());

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
