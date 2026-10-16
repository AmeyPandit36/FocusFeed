import type { FocusFeedDatabase } from '../database';
import type { UserCorrection } from '../../core/types';

export interface ICorrectionsRepository {
  addCorrection(correction: UserCorrection): Promise<void>;
  getCorrectionsMap(): Promise<Map<string, UserCorrection>>;
  getAllCorrections(): Promise<UserCorrection[]>;
  removeCorrection(videoId: string): Promise<void>;
}

export class CorrectionsRepository implements ICorrectionsRepository {
  private db: FocusFeedDatabase;

  constructor(db: FocusFeedDatabase) {
    this.db = db;
  }

  async addCorrection(correction: UserCorrection): Promise<void> {
    await this.db.userCorrections.put(correction);
  }

  async getCorrectionsMap(): Promise<Map<string, UserCorrection>> {
    const list = await this.db.userCorrections.toArray();
    const map = new Map<string, UserCorrection>();
    for (const item of list) {
      map.set(item.videoId, item);
    }
    return map;
  }

  async getAllCorrections(): Promise<UserCorrection[]> {
    return await this.db.userCorrections.orderBy('timestamp').reverse().toArray();
  }

  async removeCorrection(videoId: string): Promise<void> {
    const matches = await this.db.userCorrections.where('videoId').equals(videoId).toArray();
    for (const match of matches) {
      await this.db.userCorrections.delete(match.id);
    }
  }
}
