import { TargetAllocation } from '../types/index.js';

export class TargetsRepository {
  async getTargets(userId: string): Promise<TargetAllocation[]> {
    return [];
  }

  async saveTargets(targets: TargetAllocation[]): Promise<TargetAllocation[]> {
    return targets;
  }
}
