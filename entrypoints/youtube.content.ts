import { defineContentScript } from 'wxt/sandbox';
import { YouTubeDomAdapter } from '../src/youtube/dom-adapter';
import { NavigationObserver } from '../src/youtube/navigation-observer';
import { FeedProcessor } from '../src/youtube/feed-processor';
import { PlaybackGuard } from '../src/youtube/playback-guard';
import { client } from '../src/messaging/client';

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_idle',
  main() {
    console.log('[FocusFeed] Content script initializing on YouTube...');

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
    navObserver.start((_url, surface) => {
      console.log(`[FocusFeed] Navigated to surface: ${surface}`);
      feedProcessor.resetCounts();
      playbackGuard.guardCurrentPagePlayback();
    });

    // Start feed observer and playback guard
    feedProcessor.start();
    playbackGuard.start();

    // Listen for external extension updates (e.g. profile update from popup or settings)
    chrome.runtime?.onMessage?.addListener((msg) => {
      if (msg?.type === 'PROFILE_UPDATED' || msg?.type === 'REPROCESS_FEED') {
        feedProcessor.reprocessAll();
        playbackGuard.guardCurrentPagePlayback();
      }
    });

    console.log('[FocusFeed] Feed protection active');
  }
});
