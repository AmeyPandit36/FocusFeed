import type { Clock } from './clock';

export interface RestrictionStatus {
  isRestricted: boolean;
  blockedUntil: number | null;
  remainingMs: number;
  remainingFormatted: string;
}

export class RestrictionManager {
  private clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  checkRestriction(blockedUntil: number | null): RestrictionStatus {
    if (!blockedUntil) {
      return {
        isRestricted: false,
        blockedUntil: null,
        remainingMs: 0,
        remainingFormatted: '0m'
      };
    }

    const now = this.clock.now();
    const remainingMs = Math.max(0, blockedUntil - now);
    const isRestricted = remainingMs > 0;

    return {
      isRestricted,
      blockedUntil: isRestricted ? blockedUntil : null,
      remainingMs,
      remainingFormatted: this.formatRemainingTime(remainingMs)
    };
  }

  formatRemainingTime(ms: number): string {
    if (ms <= 0) return '0m';

    const totalMinutes = Math.ceil(ms / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }
}
