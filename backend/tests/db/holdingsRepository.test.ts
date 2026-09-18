import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { HoldingsRepository } from '../../src/db/holdingsRepository.js';
import { Holding } from '../../src/types/index.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('HoldingsRepository', () => {
  let repository: HoldingsRepository;

  beforeEach(() => {
    ddbMock.reset();
    repository = new HoldingsRepository();
  });

  it('should retrieve all holdings for a user', async () => {
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

    ddbMock.on(QueryCommand).resolves({ Items: mockHoldings });

    const result = await repository.getHoldings('default-user');
    expect(result).toEqual(mockHoldings);
    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('should return empty array if no holdings found', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await repository.getHoldings('default-user');
    expect(result).toEqual([]);
  });

  it('should retrieve a single holding by stock symbol', async () => {
    const mockHolding: Holding = {
      userId: 'default-user',
      stockSymbol: 'INFY',
      quantity: 5,
      avgBuyPrice: 1500,
      sector: 'IT',
      addedAt: '2026-09-18T10:00:00.000Z',
      updatedAt: '2026-09-18T10:00:00.000Z'
    };

    ddbMock.on(GetCommand).resolves({ Item: mockHolding });

    const result = await repository.getHolding('default-user', 'INFY');
    expect(result).toEqual(mockHolding);
  });

  it('should return null if single holding is not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await repository.getHolding('default-user', 'UNKNOWN');
    expect(result).toBeNull();
  });

  it('should save a holding', async () => {
    const holdingToSave: Holding = {
      userId: 'default-user',
      stockSymbol: 'HDFCBANK',
      quantity: 20,
      avgBuyPrice: 1600,
      sector: 'Banking',
      addedAt: '2026-09-18T10:00:00.000Z',
      updatedAt: '2026-09-18T10:00:00.000Z'
    };

    ddbMock.on(PutCommand).resolves({});

    const result = await repository.saveHolding(holdingToSave);
    expect(result).toEqual(holdingToSave);
    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('should delete a holding', async () => {
    ddbMock.on(DeleteCommand).resolves({});

    const result = await repository.deleteHolding('default-user', 'TCS');
    expect(result).toBe(true);
    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('should handle DynamoDB errors gracefully', async () => {
    ddbMock.on(QueryCommand).rejects(new Error('DynamoDB connection timeout'));

    await expect(repository.getHoldings('default-user')).rejects.toThrow('DynamoDB connection timeout');
  });
});
