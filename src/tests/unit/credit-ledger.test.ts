import { describe, it, expect, beforeEach } from 'vitest';
import { CreditLedger } from '../../core/credit-ledger';
import { MockClock } from '../../core/clock';

describe('CreditLedger and Restriction Lifecycle', () => {
  let clock: MockClock;
  let ledger: CreditLedger;

  beforeEach(() => {
    // 2026-10-16 10:00:00 local time
    clock = new MockClock('2026-10-16T10:00:00');
    ledger = new CreditLedger({
      clock,
      config: {
        dailyAllowance: 5,
        restrictionDurationMs: 10 * 60 * 60 * 1000, // 10 hours
        enabled: true
      }
    });
  });

  it('1. Initializes with full 5 credits allowance and no restriction', () => {
    const state = ledger.getState();
    expect(state.allowance).toBe(5);
    expect(state.consumed).toBe(0);
    expect(state.remaining).toBe(5);
    expect(state.isRestricted).toBe(false);
    expect(state.blockedUntil).toBeNull();
  });

  it('2. In-interest content does not consume credits', () => {
    const res = ledger.recordAttempt({
      videoId: 'vid-in-interest',
      videoTitle: 'Learn TypeScript in 60 Minutes',
      surface: 'home',
      decision: 'allowed'
    });

    expect(res.allowed).toBe(true);
    expect(res.creditConsumed).toBe(false);
    expect(res.remainingCredits).toBe(5);
    expect(res.restrictedNow).toBe(false);

    const state = ledger.getState();
    expect(state.consumed).toBe(0);
    expect(state.remaining).toBe(5);
  });

  it('3. Out-of-interest content consumes credits for the first 5 qualifying attempts', () => {
    for (let i = 1; i <= 5; i++) {
      const res = ledger.recordAttempt({
        videoId: `vid-out-${i}`,
        videoTitle: `Sensational Clickbait Video ${i}`,
        surface: 'home',
        decision: 'blocked'
      });

      expect(res.allowed).toBe(true);
      expect(res.creditConsumed).toBe(true);
      expect(res.remainingCredits).toBe(5 - i);
      expect(res.restrictedNow).toBe(false);
      expect(res.blockedUntil).toBeNull();

      const state = ledger.getState();
      expect(state.consumed).toBe(i);
      expect(state.remaining).toBe(5 - i);
    }
  });

  it('4. The 6th qualifying attempt activates the 10-hour restriction and blocks playback', () => {
    // Consume 5 credits
    for (let i = 1; i <= 5; i++) {
      ledger.recordAttempt({
        videoId: `vid-${i}`,
        videoTitle: `Video ${i}`,
        surface: 'home',
        decision: 'blocked'
      });
    }

    const stateBefore6th = ledger.getState();
    expect(stateBefore6th.remaining).toBe(0);
    expect(stateBefore6th.isRestricted).toBe(false);

    // 6th attempt
    const attemptTime = clock.now();
    const res = ledger.recordAttempt({
      videoId: 'vid-6th',
      videoTitle: 'Video 6',
      surface: 'home',
      decision: 'blocked'
    });

    expect(res.allowed).toBe(false);
    expect(res.creditConsumed).toBe(false);
    expect(res.restrictedNow).toBe(true);
    expect(res.remainingCredits).toBe(0);
    expect(res.blockedUntil).toBe(attemptTime + 10 * 3600 * 1000);

    const stateAfter6th = ledger.getState();
    expect(stateAfter6th.isRestricted).toBe(true);
    expect(stateAfter6th.blockedUntil).toBe(attemptTime + 10 * 3600 * 1000);
  });

  it('5. While restricted, all subsequent navigation and playback attempts are blocked', () => {
    // Trigger restriction
    for (let i = 1; i <= 6; i++) {
      ledger.recordAttempt({
        videoId: `vid-${i}`,
        videoTitle: `Video ${i}`,
        surface: 'home',
        decision: 'blocked'
      });
    }

    // Try a 7th attempt 1 hour later
    clock.advanceHours(1);

    const res = ledger.recordAttempt({
      videoId: 'vid-7th',
      videoTitle: 'Video 7',
      surface: 'home',
      decision: 'blocked'
    });

    expect(res.allowed).toBe(false);
    expect(res.creditConsumed).toBe(false);
    expect(res.restrictedNow).toBe(true);
    expect(res.reason).toBe('ACTIVE_RESTRICTION');
  });

  it('6. Idempotency prevents charging multiple credits for repeated events on the same video', () => {
    // First attempt consumes 1 credit
    const res1 = ledger.recordAttempt({
      videoId: 'vid-same',
      videoTitle: 'Viral Video',
      surface: 'home',
      decision: 'blocked'
    });
    expect(res1.creditConsumed).toBe(true);
    expect(res1.remainingCredits).toBe(4);

    // Repeated attempt 30 seconds later (e.g. DOM event re-trigger or double click)
    clock.advance(30 * 1000);
    const res2 = ledger.recordAttempt({
      videoId: 'vid-same',
      videoTitle: 'Viral Video',
      surface: 'home',
      decision: 'blocked'
    });

    expect(res2.allowed).toBe(true);
    expect(res2.creditConsumed).toBe(false); // NO extra credit charged!
    expect(res2.reason).toBe('IDEMPOTENT_DUPLICATE_ATTEMPT');

    const state = ledger.getState();
    expect(state.consumed).toBe(1);
    expect(state.remaining).toBe(4);
  });

  it('7. Daily allowance resets at midnight when not restricted', () => {
    // Consume 3 credits on day 1
    ledger.recordAttempt({ videoId: 'v1', videoTitle: 'V1', surface: 'home', decision: 'blocked' });
    ledger.recordAttempt({ videoId: 'v2', videoTitle: 'V2', surface: 'home', decision: 'blocked' });
    ledger.recordAttempt({ videoId: 'v3', videoTitle: 'V3', surface: 'home', decision: 'blocked' });

    expect(ledger.getState().consumed).toBe(3);
    expect(ledger.getState().remaining).toBe(2);

    // Advance clock past local midnight to 01:00 AM next day
    clock.setTime('2026-10-17T01:00:00');

    const stateNextDay = ledger.getState();
    expect(stateNextDay.localDate).toBe('2026-10-17');
    expect(stateNextDay.consumed).toBe(0);
    expect(stateNextDay.remaining).toBe(5);
    expect(stateNextDay.isRestricted).toBe(false);
  });

  it('8. Critical Rule: Active 10-hour restriction is NOT cleared simply because calendar day changes', () => {
    // Set time to 23:30 (11:30 PM) on 2026-10-16
    clock.setTime('2026-10-16T23:30:00');

    // Trigger restriction on 6th attempt at 23:30
    for (let i = 1; i <= 6; i++) {
      ledger.recordAttempt({
        videoId: `v-${i}`,
        videoTitle: `Title ${i}`,
        surface: 'home',
        decision: 'blocked'
      });
    }

    expect(ledger.getState().isRestricted).toBe(true);
    // Blocked until 23:30 + 10 hours = 09:30 AM on 2026-10-17
    const expectedExpiry = clock.now() + 10 * 3600 * 1000;
    expect(ledger.getState().blockedUntil).toBe(expectedExpiry);

    // Advance 45 minutes to 00:15 AM (Next calendar day!)
    clock.advance(45 * 60 * 1000);
    expect(clock.getLocalDateString()).toBe('2026-10-17');

    // Restriction MUST still be active!
    const stateAtMidnight = ledger.getState();
    expect(stateAtMidnight.isRestricted).toBe(true);
    expect(stateAtMidnight.blockedUntil).toBe(expectedExpiry);

    // Navigation attempt at 00:15 AM must be rejected
    const midnightAttempt = ledger.recordAttempt({
      videoId: 'v-nextday',
      videoTitle: 'Next Day Video',
      surface: 'home',
      decision: 'blocked'
    });
    expect(midnightAttempt.allowed).toBe(false);
    expect(midnightAttempt.reason).toBe('ACTIVE_RESTRICTION');

    // Advance clock past 09:30 AM (e.g. 09:35 AM) - 10 hours full duration passed
    clock.setTime('2026-10-17T09:35:00');

    const stateUnlocked = ledger.getState();
    expect(stateUnlocked.isRestricted).toBe(false);
    expect(stateUnlocked.remaining).toBe(5); // fresh allowance for the day
  });
});
