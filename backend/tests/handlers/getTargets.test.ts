import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { createGetTargetsHandler } from '../../src/handlers/getTargets.js';
import { TargetsRepository } from '../../src/db/targetsRepository.js';
import { TargetAllocation } from '../../src/types/index.js';

describe('getTargets Handler', () => {
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

  const createEvent = (): APIGatewayProxyEvent => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/targets',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: ''
  });

  it('should return populated target allocations for default-user', async () => {
    const mockTargets: TargetAllocation[] = [
      {
        userId: 'default-user',
        category: 'IT',
        targetPercent: 30,
        updatedAt: '2026-09-18T10:00:00.000Z'
      },
      {
        userId: 'default-user',
        category: 'BANKING',
        targetPercent: 70,
        updatedAt: '2026-09-18T10:00:00.000Z'
      }
    ];

    vi.mocked(mockRepository.getTargets).mockResolvedValue(mockTargets);

    const handler = createGetTargetsHandler(mockRepository);
    const response = await handler(createEvent());

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.targets).toEqual(mockTargets);
  });

  it('should return empty targets array when user has no targets configured', async () => {
    vi.mocked(mockRepository.getTargets).mockResolvedValue([]);

    const handler = createGetTargetsHandler(mockRepository);
    const response = await handler(createEvent());

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.targets).toEqual([]);
  });

  it('should return 500 INTERNAL_SERVER_ERROR when repository throws error', async () => {
    vi.mocked(mockRepository.getTargets).mockRejectedValue(new Error('DB Read Error'));

    const handler = createGetTargetsHandler(mockRepository);
    const response = await handler(createEvent());

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
