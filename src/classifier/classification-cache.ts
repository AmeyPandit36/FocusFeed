import type { PolicyDecision } from '../core/types';

export interface CacheEntry {
  decision: PolicyDecision;
  policyVersion: number;
  cachedAt: number;
}

export class ClassificationCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Generates a composite cache key including videoId and surface.
   */
  private makeKey(videoId: string, surface = 'general'): string {
    return `${videoId}:${surface}`;
  }

  get(videoId: string, currentPolicyVersion: number, surface = 'general'): PolicyDecision | null {
    const key = this.makeKey(videoId, surface);
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Invalidate if policy profile version changed
    if (entry.policyVersion !== currentPolicyVersion) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.decision;
  }

  set(videoId: string, decision: PolicyDecision, policyVersion: number, surface = 'general'): void {
    const key = this.makeKey(videoId, surface);

    // Evict oldest if reaching capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      decision,
      policyVersion,
      cachedAt: Date.now()
    });
  }

  invalidateForVersion(newVersion: number): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.policyVersion !== newVersion) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
