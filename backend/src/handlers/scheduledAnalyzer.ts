import { ScheduledEvent } from 'aws-lambda';
import { computeAnalysis } from '../engine/computeAnalysis.js';

export const handler = async (event: ScheduledEvent): Promise<void> => {
  const analysis = await computeAnalysis('default-user');
  console.log('Scheduled weekly digest analysis executed:', analysis.totalValue);
};
