import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { createSaveTargetsHandler } from '../../src/handlers/saveTargets.js';
import { TargetsRepository } from '../../src/db/targetsRepository.js';
import { TargetAllocation } from '../../src/types/index.js';

describe('saveTargets Handler', () => {
  let mockRepository: TargetsRepository;

  beforeEach(() => {
    mockRepository = {
      getTargets: vi.fn(),
      getTarget: vi.fn(),
      saveTarget: vi.fn(),
      saveTargets: vi.fn(),
      deleteTarget: vi.fn()
    } as unknown as TargetsRepository;
  });

  const createEvent = (body?: any): APIGatewayProxyEvent => ({
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/targets',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: ''
  });

  it('should normalize sector categories to canonical sector casing (e.g. banking -> Banking, it -> IT)', async () => {
    vi.mocked(mockRepository.saveTarget).mockImplementation(async (t) => t);

    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent({
      category: 'banking',
      targetPercent: 30
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.target.category).toBe('Banking');
  });

  it('should normalize all-caps sector categories like IT correctly', async () => {
    vi.mocked(mockRepository.saveTarget).mockImplementation(async (t) => t);

    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent({
      category: 'it',
      targetPercent: 30
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.target.category).toBe('IT');
  });

  it('should save a valid array payload of target allocations', async () => {
    vi.mocked(mockRepository.saveTargets).mockImplementation(async (ts) => ts);

    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent({
      targets: [
        { category: 'IT', targetPercent: 30 },
        { category: 'Banking', targetPercent: 70 }
      ]
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.targets).toHaveLength(2);
    expect(body.targets[0].category).toBe('IT');
    expect(body.targets[1].category).toBe('Banking');
  });

  it('should accept valid 0% target percentage', async () => {
    vi.mocked(mockRepository.saveTarget).mockImplementation(async (t) => t);

    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent({
      category: 'CASH',
      targetPercent: 0
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.target.targetPercent).toBe(0);
  });

  it('should accept valid 100% target percentage', async () => {
    vi.mocked(mockRepository.saveTarget).mockImplementation(async (t) => t);

    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent({
      category: 'TOTAL_EQUITY',
      targetPercent: 100
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body);
    expect(body.target.targetPercent).toBe(100);
  });

  it('should reject missing body with 400 INVALID_INPUT', async () => {
    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent(undefined);

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('should reject malformed JSON body with 400 INVALID_INPUT', async () => {
    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent('{ malformed json ');

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('should reject missing or empty category with 400 INVALID_INPUT', async () => {
    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent({
      category: '  ',
      targetPercent: 30
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('should reject negative targetPercent with 400 INVALID_INPUT', async () => {
    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent({
      category: 'IT',
      targetPercent: -5
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('should reject targetPercent greater than 100 with 400 INVALID_INPUT', async () => {
    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent({
      category: 'IT',
      targetPercent: 105
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('should reject non-numeric targetPercent with 400 INVALID_INPUT', async () => {
    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent({
      category: 'IT',
      targetPercent: 'thirty'
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('should return 500 INTERNAL_SERVER_ERROR when repository throws error', async () => {
    vi.mocked(mockRepository.saveTarget).mockRejectedValue(new Error('DB Write Failure'));

    const handler = createSaveTargetsHandler(mockRepository);
    const event = createEvent({
      category: 'IT',
      targetPercent: 30
    });

    const response = await handler(event);
    expect(response.statusCode).toBe(500);

    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
