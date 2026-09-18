import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { Holding } from '../types/index.js';

export class HoldingsRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(docClient?: DynamoDBDocumentClient, tableName?: string) {
    if (docClient) {
      this.docClient = docClient;
    } else {
      const client = new DynamoDBClient({});
      this.docClient = DynamoDBDocumentClient.from(client);
    }
    this.tableName = tableName || process.env.HOLDINGS_TABLE || 'PortfolioHoldings';
  }

  async getHoldings(userId: string): Promise<Holding[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    });

    const response = await this.docClient.send(command);
    return (response.Items as Holding[]) || [];
  }

  async getHolding(userId: string, stockSymbol: string): Promise<Holding | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        userId,
        stockSymbol
      }
    });

    const response = await this.docClient.send(command);
    return (response.Item as Holding) || null;
  }

  async saveHolding(holding: Holding): Promise<Holding> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: holding
    });

    await this.docClient.send(command);
    return holding;
  }

  async deleteHolding(userId: string, stockSymbol: string): Promise<boolean> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        userId,
        stockSymbol
      }
    });

    await this.docClient.send(command);
    return true;
  }
}
