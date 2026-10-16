import type { Clock } from './clock';
import type {
  CreditLedgerRecord,
  DailyCreditState,
  EnforcementConfig,
  PolicyDecisionType,
  SurfaceType
} from './types';

export interface RecordAttemptParams {
  videoId: string;
  videoTitle: string;
  channelName?: string;
  surface: SurfaceType;
  decision: PolicyDecisionType;
  /** Explicit timestamp override if provided, otherwise uses clock.now() */
  timestamp?: number;
}

export interface AttemptResult {
  allowed: boolean;
  creditConsumed: boolean;
  restrictedNow: boolean;
  remainingCredits: number;
  blockedUntil: number | null;
  reason: string;
}

export interface CreditLedgerInitOptions {
  clock: Clock;
  config?: Partial<EnforcementConfig>;
  records?: CreditLedgerRecord[];
  blockedUntil?: number | null;
  /** Session deduplication window in ms. Defaults to 5 minutes */
  dedupWindowMs?: number;
}

export class CreditLedger {
  private clock: Clock;
  private config: EnforcementConfig;
  private records: CreditLedgerRecord[] = [];
  private blockedUntil: number | null = null;
  private dedupWindowMs: number;

  constructor(options: CreditLedgerInitOptions) {
    this.clock = options.clock;
    this.config = {
      dailyAllowance: options.config?.dailyAllowance ?? 5,
      restrictionDurationMs: options.config?.restrictionDurationMs ?? 10 * 60 * 60 * 1000, // 10 hours
      uncertainPolicy: options.config?.uncertainPolicy ?? 'review',
      enabled: options.config?.enabled ?? true
    };
    this.records = options.records ? [...options.records] : [];
    this.blockedUntil = options.blockedUntil ?? null;
    this.dedupWindowMs = options.dedupWindowMs ?? 5 * 60 * 1000;
  }

  getConfig(): EnforcementConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<EnforcementConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getBlockedUntil(): number | null {
    return this.blockedUntil;
  }

  setBlockedUntil(timestamp: number | null): void {
    this.blockedUntil = timestamp;
  }

  getRecords(): CreditLedgerRecord[] {
    return [...this.records];
  }

  /**
   * Recalculates current restriction and credit state based on clock time and records.
   */
  getState(): DailyCreditState {
    const now = this.clock.now();
    const currentDate = this.clock.getLocalDateString(now);

    // Active restriction check
    const isRestricted = this.blockedUntil !== null && now < this.blockedUntil;

    // Filter qualifying credit-consuming records for today
    const todayConsumedRecords = this.records.filter(
      (r) => r.localDate === currentDate && r.creditConsumed
    );

    const todayAllAttempts = this.records.filter(
      (r) => r.localDate === currentDate
    );

    const consumed = todayConsumedRecords.length;
    const remaining = Math.max(0, this.config.dailyAllowance - consumed);

    return {
      localDate: currentDate,
      allowance: this.config.dailyAllowance,
      consumed,
      remaining,
      attemptsToday: todayAllAttempts.length,
      blockedUntil: isRestricted ? this.blockedUntil : null,
      isRestricted
    };
  }

  /**
   * Idempotently records an attempt to watch a video.
   */
  recordAttempt(params: RecordAttemptParams): AttemptResult {
    const now = params.timestamp ?? this.clock.now();
    const currentDate = this.clock.getLocalDateString(now);
    const stateBefore = this.getState();

    // 1. If master toggle is disabled, allow without consuming credits
    if (!this.config.enabled) {
      return {
        allowed: true,
        creditConsumed: false,
        restrictedNow: false,
        remainingCredits: stateBefore.remaining,
        blockedUntil: null,
        reason: 'EXTENSION_DISABLED'
      };
    }

    // 2. Check for active 10-hour restriction
    if (stateBefore.isRestricted) {
      return {
        allowed: false,
        creditConsumed: false,
        restrictedNow: true,
        remainingCredits: 0,
        blockedUntil: this.blockedUntil,
        reason: 'ACTIVE_RESTRICTION'
      };
    }

    // 3. Idempotency Check:
    // If the same video was attempted recently within the dedupWindow on the same day,
    // do not charge another credit. Return the existing decision.
    const recentDuplicate = this.records.find((r) => {
      const isSameVideo = r.videoId === params.videoId;
      const isSameDay = r.localDate === currentDate;
      const isWithinWindow = Math.abs(now - r.timestamp) <= this.dedupWindowMs;
      return isSameVideo && isSameDay && isWithinWindow;
    });

    if (recentDuplicate) {
      return {
        allowed: recentDuplicate.decision === 'allowed' || recentDuplicate.creditConsumed,
        creditConsumed: false,
        restrictedNow: false,
        remainingCredits: stateBefore.remaining,
        blockedUntil: null,
        reason: 'IDEMPOTENT_DUPLICATE_ATTEMPT'
      };
    }

    // 4. In-interest videos: allowed and do NOT consume a credit
    if (params.decision === 'allowed') {
      const record: CreditLedgerRecord = {
        id: this.generateRecordId(now),
        videoId: params.videoId,
        videoTitle: params.videoTitle,
        channelName: params.channelName,
        surface: params.surface,
        timestamp: now,
        localDate: currentDate,
        decision: 'allowed',
        creditConsumed: false,
        reason: 'IN_INTEREST_CONTENT'
      };
      this.records.push(record);

      return {
        allowed: true,
        creditConsumed: false,
        restrictedNow: false,
        remainingCredits: stateBefore.remaining,
        blockedUntil: null,
        reason: 'IN_INTEREST_CONTENT'
      };
    }

    // 5. Out-of-interest videos ('blocked' or 'uncertain')
    if (stateBefore.consumed < this.config.dailyAllowance) {
      // Qualifying attempt 1 through 5: consume 1 credit and allow viewing
      const record: CreditLedgerRecord = {
        id: this.generateRecordId(now),
        videoId: params.videoId,
        videoTitle: params.videoTitle,
        channelName: params.channelName,
        surface: params.surface,
        timestamp: now,
        localDate: currentDate,
        decision: params.decision,
        creditConsumed: true,
        reason: 'OUT_OF_INTEREST_CREDIT_CONSUMED'
      };
      this.records.push(record);

      const remaining = Math.max(0, this.config.dailyAllowance - (stateBefore.consumed + 1));

      return {
        allowed: true,
        creditConsumed: true,
        restrictedNow: false,
        remainingCredits: remaining,
        blockedUntil: null,
        reason: 'CREDIT_CONSUMED_ACCESS_GRANTED'
      };
    } else {
      // 6th qualifying attempt: allowance is exhausted!
      // Activates the 10-hour restriction absolute timestamp
      const blockExpiry = now + this.config.restrictionDurationMs;
      this.blockedUntil = blockExpiry;

      const record: CreditLedgerRecord = {
        id: this.generateRecordId(now),
        videoId: params.videoId,
        videoTitle: params.videoTitle,
        channelName: params.channelName,
        surface: params.surface,
        timestamp: now,
        localDate: currentDate,
        decision: params.decision,
        creditConsumed: false,
        reason: 'ALLOWANCE_EXHAUSTED_RESTRICTION_TRIGGERED'
      };
      this.records.push(record);

      return {
        allowed: false,
        creditConsumed: false,
        restrictedNow: true,
        remainingCredits: 0,
        blockedUntil: blockExpiry,
        reason: 'ALLOWANCE_EXHAUSTED_RESTRICTION_TRIGGERED'
      };
    }
  }

  private generateRecordId(timestamp: number): string {
    return `rec_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
