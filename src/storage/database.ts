import Dexie, { type Table } from 'dexie';
import type {
  CreditLedgerRecord,
  EnforcementConfig,
  InterestProfile,
  PolicyDecision,
  UserCorrection
} from '../core/types';

export interface StoredEnforcementState {
  key: string; // 'singleton'
  blockedUntil: number | null;
  config: EnforcementConfig;
  lastResetDate: string;
}

export interface StoredCacheRecord {
  key: string; // `${videoId}:${surface}`
  videoId: string;
  surface: string;
  decision: PolicyDecision;
  policyVersion: number;
  cachedAt: number;
}

export class FocusFeedDatabase extends Dexie {
  profiles!: Table<InterestProfile, string>;
  creditLedger!: Table<CreditLedgerRecord, string>;
  enforcementState!: Table<StoredEnforcementState, string>;
  userCorrections!: Table<UserCorrection, string>;
  classificationCache!: Table<StoredCacheRecord, string>;

  constructor(dbName = 'FocusFeedDB') {
    super(dbName);

    // Schema version 1
    this.version(1).stores({
      profiles: 'id, version, updatedAt',
      creditLedger: 'id, videoId, timestamp, localDate, decision, creditConsumed',
      enforcementState: 'key',
      userCorrections: 'id, videoId, timestamp',
      classificationCache: 'key, videoId, policyVersion, cachedAt'
    });
  }
}

export const db = new FocusFeedDatabase();
