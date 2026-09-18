import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { createSaveHoldingsHandler } from '../../src/handlers/saveHoldings.js';
import { HoldingsRepository } from '../../src/db/holdingsRepository.js';
import { Holding } from '../../src/types/index.js';

describe('saveHoldings Handler', () => {
  let mockRepository: HoldingsRepository;

  beforeEach(() => {
    mockRepository = {
      getHoldings: vi.fn(),
      getHolding: vi.fn(),
      saveHolding: vi.fn(),
      deleteHolding: vi.fn()
    } as unknown as HoldingsRepository;
  });

  const createEvent = (body?: any): APIGatewayProxyEvent => {
    return {
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/holdings',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: ''
    };
  };

  it('should save a valid holding with mapped sector', async () => {
    vi.mocked(mockRepository.getHolding).mockResolvedValue(null);
    vi.mocked(mockRepository.saveHolding).mockImplementation(async (h) => h);

    const handler = createSaveHoldingsHandler(mockRepository);
    const event = createEvent({
      stockSymbol: 'tcs',
      quantity: 10,
      avgBuyPrice: 3800
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.holding.stockSymbol).toBe('TCS');
    expect(body.holding.sector).toBe('IT');
    expect(body.holding.quantity).toBe(10);
    expect(body.holding.avgBuyPrice).toBe(3800);
    expect(body.holding.addedAt).toBeDefined();
    expect(body.holding.updatedAt).toBeDefined();
  });

  it('should assign sector "Other" for unmapped stock symbols', async () => {
    vi.mocked(mockRepository.getHolding).mockResolvedValue(null);
    vi.mocked(mockRepository.saveHolding).mockImplementation(async (h) => h);

    const handler = createSaveHoldingsHandler(mockRepository);
    const event = createEvent({
      stockSymbol: 'UNKNOWN_TICKER',
      quantity: 10,
      avgBuyPrice: 100
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.holding.sector).toBe('Other');
  });

  it('should preserve addedAt and price cache when updating existing holding', async () => {
    const existingHolding: Holding = {
      userId: 'default-user',
      stockSymbol: 'TCS',
      quantity: 5,
      avgBuyPrice: 3500,
      sector: 'IT',
      addedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      lastKnownPrice: 4000,
      lastFetchedAt: '2026-01-02T00:00:00.000Z'
    };

    vi.mocked(mockRepository.getHolding).mockResolvedValue(existingHolding);
    vi.mocked(mockRepository.saveHolding).mockImplementation(async (h) => h);

    const handler = createSaveHoldingsHandler(mockRepository);
    const event = createEvent({
      stockSymbol: 'TCS',
      quantity: 15,
      avgBuyPrice: 3700
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.holding.addedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(body.holding.lastKnownPrice).toBe(4000);
    expect(body.holding.lastFetchedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(body.holding.quantity).toBe(15);
  });

  it('should reject missing body with 400 INVALID_INPUT', async () => {
    const handler = createSaveHoldingsHandler(mockRepository);
    const event = createEvent(undefined);

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('should reject malformed JSON body with 400 INVALID_INPUT', async () => {
    const handler = createSaveHoldingsHandler(mockRepository);
    const event = createEvent('{ invalid json ');

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
    expect(body.error.message).toContain('Malformed JSON');
  });

  it('should reject missing or empty stockSymbol with 400 INVALID_INPUT', async () => {
    const handler = createSaveHoldingsHandler(mockRepository);
    const event = createEvent({
      stockSymbol: '  ',
      quantity: 10,
      avgBuyPrice: 100
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
    expect(body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'stockSymbol' })])
    );
  });

  it('should reject non-positive quantity with 400 INVALID_INPUT', async () => {
    const handler = createSaveHoldingsHandler(mockRepository);
    const event = createEvent({
      stockSymbol: 'TCS',
      quantity: 0,
      avgBuyPrice: 100
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('should reject non-positive avgBuyPrice with 400 INVALID_INPUT', async () => {
    const handler = createSaveHoldingsHandler(mockRepository);
    const event = createEvent({
      stockSymbol: 'TCS',
      quantity: 10,
      avgBuyPrice: -50
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('should return 500 INTERNAL_SERVER_ERROR when repository throws error', async () => {
    vi.mocked(mockRepository.getHolding).mockRejectedValue(new Error('DB Failure'));

    const handler = createSaveHoldingsHandler(mockRepository);
    const event = createEvent({
      stockSymbol: 'TCS',
      quantity: 10,
      avgBuyPrice: 3800
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(500);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
