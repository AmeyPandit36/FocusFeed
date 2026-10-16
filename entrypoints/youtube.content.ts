import { defineContentScript } from 'wxt/sandbox';
import { YouTubeDomAdapter } from '../src/youtube/dom-adapter';
import { NavigationObserver } from '../src/youtube/navigation-observer';
import { FeedProcessor } from '../src/youtube/feed-processor';
import { PlaybackGuard } from '../src/youtube/playback-guard';
import { client } from '../src/messaging/client';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_idle',
  async main() {
    console.log('[FocusFeed:Init] Content script initializing on YouTube...');

    // 1. Verify extension background messaging and retrieve state
    try {
      const state = await client.getCurrentState();
      console.log(
        `[FocusFeed:Init] Extension connection verified. Protection: [${
          state.config.enabled ? 'ENABLED' : 'PAUSED'
        }], Active Categories: ${state.profile.categories.length}, Credits: ${
          state.creditState.remaining
        }/${state.creditState.allowance}`
      );
    } catch (err) {
      console.error('[FocusFeed:Init] Failed to communicate with background service worker:', err);
    }

    const domAdapter = new YouTubeDomAdapter();
    const navObserver = new NavigationObserver(domAdapter);

    const feedProcessor = new FeedProcessor({
      domAdapter,
      evaluateVideo: (video) => client.evaluateVideo(video),
      getSurface: () => navObserver.getCurrentSurface()
    });

    const playbackGuard = new PlaybackGuard({
      recordViewAttempt: (params) => client.recordViewAttempt(params),
      evaluateVideo: (video) => client.evaluateVideo(video),
      getSurface: () => navObserver.getCurrentSurface()
    });

    // Handle SPA navigation events
    navObserver.start((url, surface) => {
      console.log(`[FocusFeed:DOM] Navigated to surface: [${surface}] (${url})`);
      feedProcessor.resetCounts();
      playbackGuard.guardCurrentPagePlayback();
    });

    // Start feed observer and playback guard
    feedProcessor.start();
    playbackGuard.start();

    // Listen for external extension updates
    chrome.runtime?.onMessage?.addListener((msg) => {
      if (msg?.type === 'PROFILE_UPDATED' || msg?.type === 'REPROCESS_FEED') {
        console.log('[FocusFeed:DOM] Received update event, reprocessing feed...');
        feedProcessor.reprocessAll();
        playbackGuard.guardCurrentPagePlayback();
      }
    });

    console.log('[FocusFeed:Init] Content script initialization complete. Feed protection active.');
  }
});
