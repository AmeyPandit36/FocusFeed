import { db } from '../storage/database';
import { ProfileRepository } from '../storage/repositories/profile-repository';
import { LedgerRepository } from '../storage/repositories/ledger-repository';
import { EnforcementRepository } from '../storage/repositories/enforcement-repository';
import { CorrectionsRepository } from '../storage/repositories/corrections-repository';
import { PolicyEngine } from '../core/policy-engine';
import { RulesClassifier } from '../classifier/rules-classifier';
import { ClassificationCache } from '../classifier/classification-cache';
import { CreditLedger } from '../core/credit-ledger';
import { SystemClock } from '../core/clock';
import { ExtensionMessageSchema } from './schemas';

export class BackgroundService {
  private clock = new SystemClock();
  private profileRepo = new ProfileRepository(db);
  private ledgerRepo = new LedgerRepository(db);
  private enforcementRepo = new EnforcementRepository(db);
  private correctionsRepo = new CorrectionsRepository(db);

  private classifier = new RulesClassifier();
  private cache = new ClassificationCache(1500);
  private engine!: PolicyEngine;
  private ledger!: CreditLedger;

  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    const profile = await this.profileRepo.getProfile();
    const correctionsMap = await this.correctionsRepo.getCorrectionsMap();
    const currentDate = this.clock.getLocalDateString();
    const enforcementState = await this.enforcementRepo.getEnforcementState(currentDate);
    const todayRecords = await this.ledgerRepo.getRecordsForDate(currentDate);

    this.engine = new PolicyEngine({
      profile,
      classifier: this.classifier,
      clock: this.clock,
      corrections: correctionsMap
    });

    this.ledger = new CreditLedger({
      clock: this.clock,
      config: enforcementState.config,
      records: todayRecords,
      blockedUntil: enforcementState.blockedUntil
    });

    this.isInitialized = true;
  }

  async handleMessage(rawMessage: unknown): Promise<unknown> {
    await this.init();

    // Validate incoming message schema
    const parsed = ExtensionMessageSchema.safeParse(rawMessage);
    if (!parsed.success) {
      console.error('[FocusFeed] Invalid message schema:', parsed.error);
      return { error: 'INVALID_MESSAGE_PAYLOAD', details: parsed.error.issues };
    }

    const message = parsed.data;

    switch (message.type) {
      case 'EVALUATE_VIDEO': {
        const video = message.payload;
        const profile = await this.profileRepo.getProfile();

        // 1. Check cache first
        const cached = this.cache.get(video.id, profile.version, video.surface);
        if (cached) {
          return cached;
        }

        // 2. Evaluate through PolicyEngine
        const decision = await this.engine.evaluate(video);

        // 3. Cache result
        this.cache.set(video.id, decision, profile.version, video.surface);
        return decision;
      }

      case 'RECORD_VIEW_ATTEMPT': {
        const { videoId, videoTitle, channelName, surface, decision } = message.payload;
        const result = this.ledger.recordAttempt({
          videoId,
          videoTitle,
          channelName,
          surface,
          decision
        });

        // If a credit was consumed or restriction was triggered, persist to storage
        if (result.creditConsumed || result.restrictedNow) {
          const records = this.ledger.getRecords();
          const latestRecord = records[records.length - 1];
          if (latestRecord) {
            await this.ledgerRepo.addRecord(latestRecord);
          }

          if (result.restrictedNow && result.blockedUntil) {
            await this.enforcementRepo.updateBlockedUntil(result.blockedUntil);
          }
        }

        return result;
      }

      case 'GET_CURRENT_STATE': {
        const state = this.ledger.getState();
        const profile = await this.profileRepo.getProfile();
        const config = this.ledger.getConfig();
        return {
          creditState: state,
          config,
          profile
        };
      }

      case 'GET_PROFILE': {
        return await this.profileRepo.getProfile();
      }

      case 'SAVE_PROFILE': {
        const newProfile = message.payload;
        await this.profileRepo.saveProfile(newProfile);

        // Update in-memory engine and invalidate cache
        this.engine.setProfile(newProfile);
        this.cache.invalidateForVersion(newProfile.version);
        return { success: true };
      }

      case 'UPDATE_CONFIG': {
        const configUpdates = message.payload;
        this.ledger.updateConfig(configUpdates);
        await this.enforcementRepo.updateConfig(configUpdates);
        return {
          success: true,
          config: this.ledger.getConfig()
        };
      }

      case 'RECORD_CORRECTION': {
        const correction = message.payload;
        await this.correctionsRepo.addCorrection(correction);

        const correctionsMap = await this.correctionsRepo.getCorrectionsMap();
        this.engine.setCorrections(correctionsMap);

        // Invalidate specific cache entry so re-evaluation reflects user correction
        this.cache.clear();
        return { success: true };
      }

      case 'GET_STATS': {
        const currentDate = this.clock.getLocalDateString();
        const todayRecords = await this.ledgerRepo.getRecordsForDate(currentDate);
        const allRecords = await this.ledgerRepo.getAllRecords();

        let allowedCount = 0;
        let blockedCount = 0;
        let uncertainCount = 0;

        for (const r of allRecords) {
          if (r.decision === 'allowed') allowedCount++;
          else if (r.decision === 'blocked') blockedCount++;
          else if (r.decision === 'uncertain') uncertainCount++;
        }

        const creditsUsedToday = todayRecords.filter((r) => r.creditConsumed).length;

        return {
          todayRecords,
          allRecords: allRecords.slice(0, 50), // Return recent 50
          stats: {
            allowedCount,
            blockedCount,
            uncertainCount,
            creditsUsedToday
          }
        };
      }

      case 'CLEAR_ALL_DATA': {
        await this.ledgerRepo.clearRecords();
        await this.enforcementRepo.updateBlockedUntil(null);
        this.ledger.setBlockedUntil(null);
        this.cache.clear();
        return { success: true };
      }

      default:
        return { error: 'UNKNOWN_MESSAGE_TYPE' };
    }
  }
}
