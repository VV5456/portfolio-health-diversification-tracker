import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { TargetsRepository } from '../../src/db/targetsRepository.js';
import { TargetAllocation } from '../../src/types/index.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('TargetsRepository', () => {
  let repository: TargetsRepository;

  beforeEach(() => {
    ddbMock.reset();
    repository = new TargetsRepository();
  });

  it('should retrieve all targets for a user', async () => {
    const mockTargets: TargetAllocation[] = [
      {
        userId: 'default-user',
        category: 'IT',
        targetPercent: 30,
        updatedAt: '2026-09-18T10:00:00.000Z'
      },
      {
        userId: 'default-user',
        category: 'Banking',
        targetPercent: 40,
        updatedAt: '2026-09-18T10:00:00.000Z'
      }
    ];

    ddbMock.on(QueryCommand).resolves({ Items: mockTargets });

    const result = await repository.getTargets('default-user');
    expect(result).toEqual(mockTargets);
    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('should return empty array if no targets found', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await repository.getTargets('default-user');
    expect(result).toEqual([]);
  });

  it('should retrieve a single target by category', async () => {
    const mockTarget: TargetAllocation = {
      userId: 'default-user',
      category: 'IT',
      targetPercent: 30,
      updatedAt: '2026-09-18T10:00:00.000Z'
    };

    ddbMock.on(GetCommand).resolves({ Item: mockTarget });

    const result = await repository.getTarget('default-user', 'IT');
    expect(result).toEqual(mockTarget);
  });

  it('should return null if single target is not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await repository.getTarget('default-user', 'UNKNOWN');
    expect(result).toBeNull();
  });

  it('should save a target allocation', async () => {
    const targetToSave: TargetAllocation = {
      userId: 'default-user',
      category: 'Energy',
      targetPercent: 30,
      updatedAt: '2026-09-18T10:00:00.000Z'
    };

    ddbMock.on(PutCommand).resolves({});

    const result = await repository.saveTarget(targetToSave);
    expect(result).toEqual(targetToSave);
  });

  it('should save multiple targets in batch', async () => {
    const targetsToSave: TargetAllocation[] = [
      { userId: 'default-user', category: 'IT', targetPercent: 30, updatedAt: '2026-09-18T10:00:00.000Z' },
      { userId: 'default-user', category: 'Banking', targetPercent: 70, updatedAt: '2026-09-18T10:00:00.000Z' }
    ];

    ddbMock.on(PutCommand).resolves({});

    const result = await repository.saveTargets(targetsToSave);
    expect(result).toEqual(targetsToSave);
    expect(ddbMock.calls()).toHaveLength(2);
  });

  it('should delete a target allocation', async () => {
    ddbMock.on(DeleteCommand).resolves({});

    const result = await repository.deleteTarget('default-user', 'IT');
    expect(result).toBe(true);
  });

  it('should handle DynamoDB errors gracefully', async () => {
    ddbMock.on(QueryCommand).rejects(new Error('DynamoDB timeout'));

    await expect(repository.getTargets('default-user')).rejects.toThrow('DynamoDB timeout');
  });
});
