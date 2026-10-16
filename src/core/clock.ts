/**
 * Clock abstraction for deterministic time handling, daylight saving transitions,
 * and testing calendar-day resets.
 */

export interface Clock {
  /** Returns current timestamp in milliseconds */
  now(): number;
  /** Returns current local date formatted as YYYY-MM-DD */
  getLocalDateString(timestamp?: number): string;
  /** Returns the timestamp in ms of the next local midnight */
  getNextMidnight(timestamp?: number): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  getLocalDateString(timestamp?: number): string {
    const d = new Date(timestamp ?? this.now());
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getNextMidnight(timestamp?: number): number {
    const d = new Date(timestamp ?? this.now());
    // Move to next calendar day at 00:00:00.000 in local timezone
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
    return next.getTime();
  }
}

export class MockClock implements Clock {
  private currentMs: number;

  constructor(initialTime: number | string | Date = Date.now()) {
    if (typeof initialTime === 'number') {
      this.currentMs = initialTime;
    } else if (typeof initialTime === 'string') {
      this.currentMs = new Date(initialTime).getTime();
    } else {
      this.currentMs = initialTime.getTime();
    }
  }

  now(): number {
    return this.currentMs;
  }

  setTime(time: number | string | Date): void {
    if (typeof time === 'number') {
      this.currentMs = time;
    } else if (typeof time === 'string') {
      this.currentMs = new Date(time).getTime();
    } else {
      this.currentMs = time.getTime();
    }
  }

  advance(ms: number): void {
    this.currentMs += ms;
  }

  advanceHours(hours: number): void {
    this.advance(hours * 60 * 60 * 1000);
  }

  advanceDays(days: number): void {
    this.advance(days * 24 * 60 * 60 * 1000);
  }

  getLocalDateString(timestamp?: number): string {
    const d = new Date(timestamp ?? this.currentMs);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getNextMidnight(timestamp?: number): number {
    const d = new Date(timestamp ?? this.currentMs);
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
    return next.getTime();
  }
}
