import type { FocusFeedDatabase, StoredEnforcementState } from '../database';
import type { EnforcementConfig } from '../../core/types';

export const DEFAULT_ENFORCEMENT_CONFIG: EnforcementConfig = {
  dailyAllowance: 5,
  restrictionDurationMs: 10 * 60 * 60 * 1000, // 10 hours
  uncertainPolicy: 'review',
  enabled: true
};

export interface IEnforcementRepository {
  getEnforcementState(currentDate: string): Promise<StoredEnforcementState>;
  saveEnforcementState(state: StoredEnforcementState): Promise<void>;
  updateBlockedUntil(blockedUntil: number | null): Promise<void>;
  updateConfig(config: Partial<EnforcementConfig>): Promise<void>;
}

export class EnforcementRepository implements IEnforcementRepository {
  private db: FocusFeedDatabase;

  constructor(db: FocusFeedDatabase) {
    this.db = db;
  }

  async getEnforcementState(currentDate: string): Promise<StoredEnforcementState> {
    const stored = await this.db.enforcementState.get('singleton');
    if (!stored) {
      const initial: StoredEnforcementState = {
        key: 'singleton',
        blockedUntil: null,
        config: { ...DEFAULT_ENFORCEMENT_CONFIG },
        lastResetDate: currentDate
      };
      await this.db.enforcementState.put(initial);
      await this.syncToChromeStorage(initial);
      return initial;
    }

    return stored;
  }

  async saveEnforcementState(state: StoredEnforcementState): Promise<void> {
    await this.db.enforcementState.put(state);
    await this.syncToChromeStorage(state);
  }

  async updateBlockedUntil(blockedUntil: number | null): Promise<void> {
    const state = await this.getEnforcementState(new Date().toISOString().slice(0, 10));
    state.blockedUntil = blockedUntil;
    await this.saveEnforcementState(state);
  }

  async updateConfig(configUpdate: Partial<EnforcementConfig>): Promise<void> {
    const state = await this.getEnforcementState(new Date().toISOString().slice(0, 10));
    state.config = { ...state.config, ...configUpdate };
    await this.saveEnforcementState(state);
  }

  private async syncToChromeStorage(state: StoredEnforcementState): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({
          focusfeed_blockedUntil: state.blockedUntil,
          focusfeed_config: state.config,
          focusfeed_enabled: state.config.enabled
        });
      }
    } catch {
      // Safe fallback when running in unit tests or non-extension environment
    }
  }
}
