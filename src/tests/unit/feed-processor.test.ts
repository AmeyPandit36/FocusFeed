import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedProcessor } from '../../youtube/feed-processor';
import { YouTubeDomAdapter } from '../../youtube/dom-adapter';
import type { PolicyDecision, VideoMetadata } from '../../core/types';

describe('FeedProcessor Mutation & Batching Tests', () => {
  let processor: FeedProcessor;
  let evaluateFn: (video: VideoMetadata) => Promise<PolicyDecision>;

  beforeEach(() => {
    document.body.innerHTML = '';

    evaluateFn = vi.fn(async (video: VideoMetadata): Promise<PolicyDecision> => {
      if (video.title.includes('Python')) {
        return {
          decision: 'allowed',
          matchedRule: 'Python',
          confidence: 0.95,
          reasonCode: 'MATCH',
          classifierVersion: 'test',
          timestamp: Date.now()
        };
      }
      return {
        decision: 'blocked',
        confidence: 0.9,
        reasonCode: 'RULES_NO_INTEREST_MATCH',
        classifierVersion: 'test',
        timestamp: Date.now()
      };
    });

    processor = new FeedProcessor({
      domAdapter: new YouTubeDomAdapter(),
      evaluateVideo: evaluateFn,
      getSurface: () => 'home'
    });
  });

  afterEach(() => {
    processor.stop();
  });

  it('detects and filters video cards added to the DOM', async () => {
    processor.start();

    // Create and append an out-of-interest card
    const card1 = document.createElement('ytd-rich-item-renderer');
    card1.innerHTML = `
      <a href="/watch?v=click123456">
        <span id="video-title">Cartoon Network & Nickelodeon</span>
      </a>
    `;
    document.body.appendChild(card1);

    // Create and append an in-interest card
    const card2 = document.createElement('ytd-rich-item-renderer');
    card2.innerHTML = `
      <a href="/watch?v=python12345">
        <span id="video-title">Python Full Course 2026</span>
      </a>
    `;
    document.body.appendChild(card2);

    // Wait for debounced queue processing
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Verify evaluateVideo was called
    expect(evaluateFn).toHaveBeenCalledTimes(2);

    // Verify card1 was hidden and card2 was allowed
    expect(card1.style.display).toBe('none');
    expect(card1.getAttribute('data-focusfeed-status')).toBe('hidden');

    expect(card2.style.display).toBe('');
    expect(card2.getAttribute('data-focusfeed-status')).toBe('allowed');
  });

  it('reprocessAll re-evaluates previously processed cards', async () => {
    const card = document.createElement('ytd-rich-item-renderer');
    card.innerHTML = `
      <a href="/watch?v=click123456">
        <span id="video-title">Cartoon Network</span>
      </a>
    `;
    document.body.appendChild(card);

    processor.start();
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(card.getAttribute('data-focusfeed-status')).toBe('hidden');

    // Trigger reprocess
    processor.reprocessAll();
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(card.getAttribute('data-focusfeed-status')).toBe('hidden');
  });
});
