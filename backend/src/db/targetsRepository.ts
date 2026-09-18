import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { TargetAllocation } from '../types/index.js';

export class TargetsRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(docClient?: DynamoDBDocumentClient, tableName?: string) {
    if (docClient) {
      this.docClient = docClient;
    } else {
      const client = new DynamoDBClient({});
      this.docClient = DynamoDBDocumentClient.from(client);
    }
    this.tableName = tableName || process.env.TARGETS_TABLE || 'PortfolioTargetAllocation';
  }

  async getTargets(userId: string): Promise<TargetAllocation[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    });

    const response = await this.docClient.send(command);
    return (response.Items as TargetAllocation[]) || [];
  }

  async getTarget(userId: string, category: string): Promise<TargetAllocation | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        userId,
        category
      }
    });

    const response = await this.docClient.send(command);
    return (response.Item as TargetAllocation) || null;
  }

  async saveTarget(target: TargetAllocation): Promise<TargetAllocation> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: target
    });

    await this.docClient.send(command);
    return target;
  }

  async saveTargets(targets: TargetAllocation[]): Promise<TargetAllocation[]> {
    for (const target of targets) {
      await this.saveTarget(target);
    }
    return targets;
  }

  async deleteTarget(userId: string, category: string): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        userId,
        category
      }
    });

    await this.docClient.send(command);
    return true;
  }
}
