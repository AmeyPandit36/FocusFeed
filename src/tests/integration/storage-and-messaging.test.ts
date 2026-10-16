import { describe, it, expect, beforeEach } from 'vitest';
import { BackgroundService } from '../../messaging/handlers';
import { db } from '../../storage/database';
import type { VideoMetadata } from '../../core/types';

describe('Storage & Background Messaging Integration', () => {
  let service: BackgroundService;

  beforeEach(async () => {
    // Clear in-memory Dexie tables before each integration run
    await db.creditLedger.clear();
    await db.enforcementState.clear();
    await db.profiles.clear();
    await db.userCorrections.clear();

    service = new BackgroundService();
    await service.init();
  });

  it('1. Initializes default profile and credit state via GET_CURRENT_STATE', async () => {
    const res = await service.handleMessage({ type: 'GET_CURRENT_STATE' }) as any;
    expect(res).toBeDefined();
    expect(res.creditState.allowance).toBe(5);
    expect(res.creditState.remaining).toBe(5);
    expect(res.creditState.isRestricted).toBe(false);
    expect(res.profile.id).toBe('default');
  });

  it('2. Evaluates videos against active profile and caches the decision', async () => {
    const video: VideoMetadata = {
      id: 'int-vid-1',
      title: 'Advanced Machine Learning Neural Networks Deep Dive',
      channelName: 'TechAcademy',
      surface: 'home',
      url: 'https://youtube.com/watch?v=int-vid-1'
    };

    const decision = await service.handleMessage({
      type: 'EVALUATE_VIDEO',
      payload: video
    }) as any;

    expect(decision.decision).toBe('allowed');
    expect(decision.confidence).toBeGreaterThan(0.6);

    // Repeated evaluation must return cached decision
    const cachedDecision = await service.handleMessage({
      type: 'EVALUATE_VIDEO',
      payload: video
    }) as any;

    expect(cachedDecision.decision).toBe('allowed');
    expect(cachedDecision.reasonCode).toBe(decision.reasonCode);
  });

  it('3. Enforces daily allowance, consumes credits, and triggers restriction on 6th attempt', async () => {
    for (let i = 1; i <= 5; i++) {
      const attemptRes = await service.handleMessage({
        type: 'RECORD_VIEW_ATTEMPT',
        payload: {
          videoId: `blocked-vid-${i}`,
          videoTitle: `Clickbait Title ${i}`,
          channelName: 'Random',
          surface: 'home',
          decision: 'blocked'
        }
      }) as any;

      expect(attemptRes.allowed).toBe(true);
      expect(attemptRes.creditConsumed).toBe(true);
      expect(attemptRes.remainingCredits).toBe(5 - i);
      expect(attemptRes.restrictedNow).toBe(false);
    }

    // 6th out-of-interest attempt
    const sixthRes = await service.handleMessage({
      type: 'RECORD_VIEW_ATTEMPT',
      payload: {
        videoId: 'blocked-vid-6',
        videoTitle: 'Clickbait Title 6',
        channelName: 'Random',
        surface: 'home',
        decision: 'blocked'
      }
    }) as any;

    expect(sixthRes.allowed).toBe(false);
    expect(sixthRes.restrictedNow).toBe(true);
    expect(sixthRes.blockedUntil).toBeGreaterThan(Date.now());
    expect(sixthRes.reason).toBe('ALLOWANCE_EXHAUSTED_RESTRICTION_TRIGGERED');

    // Verify persisted state reflects restriction
    const currentState = await service.handleMessage({ type: 'GET_CURRENT_STATE' }) as any;
    expect(currentState.creditState.isRestricted).toBe(true);
    expect(currentState.creditState.remaining).toBe(0);
  });

  it('4. Applies manual user corrections and overrides classification', async () => {
    const videoId = 'corr-vid-99';

    // Video initially blocked
    const initialDecision = await service.handleMessage({
      type: 'EVALUATE_VIDEO',
      payload: {
        id: videoId,
        title: 'Funniest Cat Moments',
        channelName: 'Cats',
        surface: 'home',
        url: `https://youtube.com/watch?v=${videoId}`
      }
    }) as any;
    expect(initialDecision.decision).toBe('blocked');

    // User submits a correction
    await service.handleMessage({
      type: 'RECORD_CORRECTION',
      payload: {
        id: 'c1',
        videoId,
        videoTitle: 'Funniest Cat Moments',
        channelName: 'Cats',
        originalDecision: 'blocked',
        correctedDecision: 'allowed',
        timestamp: Date.now()
      }
    });

    // Subsequent evaluation must be allowed via manual override
    const correctedDecision = await service.handleMessage({
      type: 'EVALUATE_VIDEO',
      payload: {
        id: videoId,
        title: 'Funniest Cat Moments',
        channelName: 'Cats',
        surface: 'home',
        url: `https://youtube.com/watch?v=${videoId}`
      }
    }) as any;

    expect(correctedDecision.decision).toBe('allowed');
    expect(correctedDecision.reasonCode).toBe('USER_CORRECTION_OVERRIDE');
  });

  it('5. Allows updating config and clearing all data', async () => {
    const updateRes = await service.handleMessage({
      type: 'UPDATE_CONFIG',
      payload: { dailyAllowance: 10 }
    }) as any;
    expect(updateRes.success).toBe(true);
    expect(updateRes.config.dailyAllowance).toBe(10);

    const clearRes = await service.handleMessage({ type: 'CLEAR_ALL_DATA' }) as any;
    expect(clearRes.success).toBe(true);

    const statsRes = await service.handleMessage({ type: 'GET_STATS' }) as any;
    expect(statsRes.stats.creditsUsedToday).toBe(0);
  });
});
