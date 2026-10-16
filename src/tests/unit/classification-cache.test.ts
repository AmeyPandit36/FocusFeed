import { describe, it, expect } from 'vitest';
import { ClassificationCache } from '../../classifier/classification-cache';
import type { PolicyDecision } from '../../core/types';

describe('ClassificationCache', () => {
  it('stores and retrieves cached decisions with policy version matching', () => {
    const cache = new ClassificationCache(10);
    const decision: PolicyDecision = {
      decision: 'allowed',
      confidence: 0.9,
      reasonCode: 'CATEGORY_MATCH',
      classifierVersion: '1.0.0',
      timestamp: Date.now()
    };

    cache.set('vid1', decision, 1, 'home');
    const cached = cache.get('vid1', 1, 'home');

    expect(cached).toEqual(decision);
  });

  it('invalidates cache entry if policy version changed', () => {
    const cache = new ClassificationCache(10);
    const decision: PolicyDecision = {
      decision: 'allowed',
      confidence: 0.9,
      reasonCode: 'CATEGORY_MATCH',
      classifierVersion: '1.0.0',
      timestamp: Date.now()
    };

    cache.set('vid1', decision, 1, 'home');

    // Query with new policy version 2
    const cached = cache.get('vid1', 2, 'home');
    expect(cached).toBeNull();
  });

  it('respects bounded max size using LRU eviction', () => {
    const cache = new ClassificationCache(3);

    for (let i = 1; i <= 4; i++) {
      cache.set(`vid${i}`, {
        decision: 'allowed',
        confidence: 0.9,
        reasonCode: 'TEST',
        classifierVersion: '1.0.0',
        timestamp: Date.now()
      }, 1, 'home');
    }

    // Size must not exceed 3
    expect(cache.size()).toBe(3);
    // vid1 was oldest, should have been evicted
    expect(cache.get('vid1', 1, 'home')).toBeNull();
    // vid2, vid3, vid4 should be present
    expect(cache.get('vid4', 1, 'home')).not.toBeNull();
  });
});
