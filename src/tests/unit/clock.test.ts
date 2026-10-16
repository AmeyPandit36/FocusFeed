import { describe, it, expect } from 'vitest';
import { MockClock, SystemClock } from '../../core/clock';

describe('Clock and Calendar Day Management', () => {
  it('correctly calculates local date string format YYYY-MM-DD', () => {
    // 2026-03-15 14:30:00 UTC
    const clock = new MockClock(new Date('2026-03-15T14:30:00Z').getTime());
    const dateStr = clock.getLocalDateString();
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('correctly calculates the next local midnight timestamp', () => {
    const clock = new MockClock(new Date('2026-10-16T20:00:00').getTime());
    const midnight = clock.getNextMidnight();
    expect(midnight).toBeGreaterThan(clock.now());

    const midnightDate = new Date(midnight);
    expect(midnightDate.getHours()).toBe(0);
    expect(midnightDate.getMinutes()).toBe(0);
    expect(midnightDate.getSeconds()).toBe(0);
  });

  it('advances time accurately across hours and days', () => {
    const initial = new Date('2026-10-16T10:00:00').getTime();
    const clock = new MockClock(initial);
    expect(clock.now()).toBe(initial);

    clock.advanceHours(10);
    expect(clock.now()).toBe(initial + 10 * 3600 * 1000);

    clock.advanceDays(1);
    expect(clock.now()).toBe(initial + 34 * 3600 * 1000);
  });

  it('SystemClock provides current real time', () => {
    const sysClock = new SystemClock();
    expect(sysClock.now()).toBeGreaterThan(0);
    expect(sysClock.getLocalDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sysClock.getNextMidnight()).toBeGreaterThan(sysClock.now());
  });
});
