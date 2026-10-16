import type { FocusFeedDatabase } from '../database';
import { createDefaultProfile, type InterestProfile } from '../../core/interest-profile';

export interface IProfileRepository {
  getProfile(): Promise<InterestProfile>;
  saveProfile(profile: InterestProfile): Promise<void>;
  resetToDefault(): Promise<InterestProfile>;
}

export class ProfileRepository implements IProfileRepository {
  private db: FocusFeedDatabase;

  constructor(db: FocusFeedDatabase) {
    this.db = db;
  }

  async getProfile(): Promise<InterestProfile> {
    const profile = await this.db.profiles.get('default');
    if (!profile) {
      const defaultProfile = createDefaultProfile();
      await this.db.profiles.put(defaultProfile);
      return defaultProfile;
    }
    return profile;
  }

  async saveProfile(profile: InterestProfile): Promise<void> {
    profile.updatedAt = Date.now();
    await this.db.profiles.put(profile);
  }

  async resetToDefault(): Promise<InterestProfile> {
    const defaultProfile = createDefaultProfile();
    await this.db.profiles.put(defaultProfile);
    return defaultProfile;
  }
}
