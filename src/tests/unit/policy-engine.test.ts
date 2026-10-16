import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from '../../core/policy-engine';
import { RulesClassifier } from '../../classifier/rules-classifier';
import { MockClock } from '../../core/clock';
import { createDefaultProfile } from '../../core/interest-profile';
import type { InterestProfile, VideoMetadata, UserCorrection } from '../../core/types';

describe('PolicyEngine and RulesClassifier', () => {
  let profile: InterestProfile;
  let classifier: RulesClassifier;
  let clock: MockClock;
  let engine: PolicyEngine;

  beforeEach(() => {
    profile = createDefaultProfile();
    profile.blockedChannels = ['@toxic-channel', 'Clickbait Central'];
    profile.allowedChannels = ['@veritasium', '3Blue1Brown'];
    profile.blockedTopics = ['Celebrity Drama', 'Horoscopes'];
    profile.allowedTopics = ['TypeScript', 'Quantum Physics'];

    classifier = new RulesClassifier();
    clock = new MockClock('2026-10-16T12:00:00Z');
    engine = new PolicyEngine({ profile, classifier, clock });
  });

  it('1. Blocks explicitly blocked channels regardless of title', async () => {
    const video: VideoMetadata = {
      id: 'v1',
      title: 'Amazing Python and TypeScript Tutorial', // allowed terms in title
      channelName: 'Clickbait Central', // blocked channel!
      surface: 'home',
      url: 'https://youtube.com/watch?v=v1'
    };

    const decision = await engine.evaluate(video);
    expect(decision.decision).toBe('blocked');
    expect(decision.reasonCode).toBe('EXPLICIT_BLOCKED_CHANNEL');
    expect(decision.confidence).toBe(1.0);
  });

  it('2. Blocks explicitly blocked topics with priority over category matches', async () => {
    const video: VideoMetadata = {
      id: 'v2',
      title: 'Celebrity Drama in the Tech Industry',
      channelName: 'Random Creator',
      surface: 'home',
      url: 'https://youtube.com/watch?v=v2'
    };

    const decision = await engine.evaluate(video);
    expect(decision.decision).toBe('blocked');
    expect(decision.reasonCode).toBe('EXPLICIT_BLOCKED_TOPIC');
  });

  it('3. Allows explicitly allowed channels', async () => {
    const video: VideoMetadata = {
      id: 'v3',
      title: 'Some Interesting Topic You Never Knew',
      channelName: '3Blue1Brown',
      surface: 'home',
      url: 'https://youtube.com/watch?v=v3'
    };

    const decision = await engine.evaluate(video);
    expect(decision.decision).toBe('allowed');
    expect(decision.reasonCode).toBe('EXPLICIT_ALLOWED_CHANNEL');
    expect(decision.confidence).toBe(1.0);
  });

  it('4. Allows matching category and subcategory keywords', async () => {
    const video: VideoMetadata = {
      id: 'v4',
      title: 'Building Modern Web Apps with Next.js and Tailwind CSS',
      channelName: 'Code With Me',
      surface: 'home',
      url: 'https://youtube.com/watch?v=v4'
    };

    const decision = await engine.evaluate(video);
    expect(decision.decision).toBe('allowed');
    expect(decision.reasonCode).toBe('CATEGORY_KEYWORD_MATCH');
    expect(decision.confidence).toBeGreaterThanOrEqual(0.65);
  });

  it('5. Blocks content with no matching interests', async () => {
    const video: VideoMetadata = {
      id: 'v5',
      title: '10 Funniest Pet Fails of the Week',
      channelName: 'Funny Pets Compilation',
      surface: 'home',
      url: 'https://youtube.com/watch?v=v5'
    };

    const decision = await engine.evaluate(video);
    expect(decision.decision).toBe('blocked');
    expect(decision.reasonCode).toBe('RULES_NO_INTEREST_MATCH');
  });

  it('6. Handles user manual corrections with highest override precedence', async () => {
    const corrections = new Map<string, UserCorrection>();
    corrections.set('v5', {
      id: 'corr-1',
      videoId: 'v5',
      videoTitle: '10 Funniest Pet Fails of the Week',
      originalDecision: 'blocked',
      correctedDecision: 'allowed',
      timestamp: Date.now()
    });

    engine.setCorrections(corrections);

    const video: VideoMetadata = {
      id: 'v5',
      title: '10 Funniest Pet Fails of the Week',
      channelName: 'Funny Pets Compilation',
      surface: 'home',
      url: 'https://youtube.com/watch?v=v5'
    };

    const decision = await engine.evaluate(video);
    expect(decision.decision).toBe('allowed');
    expect(decision.reasonCode).toBe('USER_CORRECTION_OVERRIDE');
    expect(decision.confidence).toBe(1.0);
  });

  it('7. Handles missing or empty title and channel gracefully without throwing', async () => {
    const video: VideoMetadata = {
      id: 'v-empty',
      title: '',
      channelName: '',
      surface: 'home',
      url: 'https://youtube.com/watch?v=v-empty'
    };

    const decision = await engine.evaluate(video);
    expect(decision.decision).toBe('blocked');
    expect(decision.reasonCode).toBe('RULES_NO_INTEREST_MATCH');
  });

  it('8. Respects uncertainPolicy configuration', async () => {
    // When profile threshold is high, subcategory match becomes uncertain
    profile.minConfidenceThreshold = 0.99;
    profile.uncertainPolicy = 'review';
    engine.setProfile(profile);

    const video: VideoMetadata = {
      id: 'v8',
      title: 'Quick Python Script',
      channelName: 'Dev',
      surface: 'home',
      url: 'https://youtube.com/watch?v=v8'
    };

    const decision = await engine.evaluate(video);
    expect(decision.decision).toBe('uncertain');
    expect(decision.reasonCode).toBe('UNCERTAIN_REVIEW');
  });
});
