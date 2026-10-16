import { defineBackground } from 'wxt/sandbox';
import { BackgroundService } from '../src/messaging/handlers';

export default defineBackground(() => {
  const service = new BackgroundService();

  // Initialize service eagerly
  service.init().catch((err) => {
    console.error('[FocusFeed] Failed to initialize background service:', err);
  });

  // Handle messages from content scripts and popup/options pages
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    service
      .handleMessage(message)
      .then((res) => sendResponse(res))
      .catch((err) => {
        console.error('[FocusFeed] Error handling message:', err);
        sendResponse({ error: 'INTERNAL_ERROR', message: String(err) });
      });

    // Return true to indicate asynchronous response in Chrome Manifest V3
    return true;
  });

  // Setup periodic alarm for state reconciliation if supported
  if (chrome.alarms) {
    chrome.alarms.create('focusfeed_reconcile', { periodInMinutes: 5 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'focusfeed_reconcile') {
        service.init().catch(console.error);
      }
    });
  }

  console.log('[FocusFeed] Background service worker registered successfully');
});
