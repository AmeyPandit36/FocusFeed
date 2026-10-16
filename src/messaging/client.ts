import type {
  DailyCreditState,
  EnforcementConfig,
  InterestProfile,
  PolicyDecision,
  VideoMetadata,
  UserCorrection,
  CreditLedgerRecord
} from '../core/types';
import type { AttemptResult } from '../core/credit-ledger';

export class ExtensionClient {
  async evaluateVideo(video: VideoMetadata): Promise<PolicyDecision> {
    return this.send({
      type: 'EVALUATE_VIDEO',
      payload: video
    });
  }

  async recordViewAttempt(params: {
    videoId: string;
    videoTitle: string;
    channelName?: string;
    surface: import('../core/types').SurfaceType;
    decision: import('../core/types').PolicyDecisionType;
  }): Promise<AttemptResult> {
    return this.send({
      type: 'RECORD_VIEW_ATTEMPT',
      payload: params
    });
  }

  async getCurrentState(): Promise<{
    creditState: DailyCreditState;
    config: EnforcementConfig;
    profile: InterestProfile;
  }> {
    return this.send({
      type: 'GET_CURRENT_STATE'
    });
  }

  async getProfile(): Promise<InterestProfile> {
    return this.send({
      type: 'GET_PROFILE'
    });
  }

  async saveProfile(profile: InterestProfile): Promise<{ success: boolean }> {
    return this.send({
      type: 'SAVE_PROFILE',
      payload: profile
    });
  }

  async updateConfig(config: Partial<EnforcementConfig>): Promise<{
    success: boolean;
    config: EnforcementConfig;
  }> {
    return this.send({
      type: 'UPDATE_CONFIG',
      payload: config
    });
  }

  async recordCorrection(correction: UserCorrection): Promise<{ success: boolean }> {
    return this.send({
      type: 'RECORD_CORRECTION',
      payload: correction
    });
  }

  async getStats(): Promise<{
    todayRecords: CreditLedgerRecord[];
    allRecords: CreditLedgerRecord[];
    stats: {
      allowedCount: number;
      blockedCount: number;
      uncertainCount: number;
      creditsUsedToday: number;
    };
  }> {
    return this.send({
      type: 'GET_STATS'
    });
  }

  async clearAllData(): Promise<{ success: boolean }> {
    return this.send({
      type: 'CLEAR_ALL_DATA'
    });
  }

  private send<T>(message: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        return reject(new Error('Chrome extension runtime not available'));
      }

      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (response && response.error) {
          return reject(new Error(response.message || response.error));
        }
        resolve(response as T);
      });
    });
  }
}

export const client = new ExtensionClient();
