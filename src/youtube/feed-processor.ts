import { YouTubeDomAdapter } from './dom-adapter';
import type { SurfaceType, PolicyDecision, VideoMetadata } from '../core/types';

export interface FeedProcessorOptions {
  domAdapter?: YouTubeDomAdapter;
  evaluateVideo: (video: VideoMetadata) => Promise<PolicyDecision>;
  getSurface: () => SurfaceType;
}

export class FeedProcessor {
  private domAdapter: YouTubeDomAdapter;
  private evaluateVideo: (video: VideoMetadata) => Promise<PolicyDecision>;
  private getSurface: () => SurfaceType;

  private observer: MutationObserver | null = null;
  private pollInterval: number | null = null;
  private debounceTimer: number | null = null;
  private processingQueue: Set<HTMLElement> = new Set();
  private isProcessing = false;

  private hiddenCount = 0;
  private allowedCount = 0;

  constructor(options: FeedProcessorOptions) {
    this.domAdapter = options.domAdapter ?? new YouTubeDomAdapter();
    this.evaluateVideo = options.evaluateVideo;
    this.getSurface = options.getSurface;
  }

  start(): void {
    if (this.observer || typeof document === 'undefined') return;

    this.injectGlobalStyles();
    this.injectStatusIndicator();

    // 1. Initial scan of existing video cards
    this.scanDocumentCards();

    // 2. Observe subtree for dynamically inserted video cards
    this.observer = new MutationObserver((mutations) => {
      const candidates: HTMLElement[] = [];

      for (const mutation of mutations) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node instanceof HTMLElement) {
            // Check if node itself is a video card
            if (this.domAdapter.isCardElement(node)) {
              if (!this.domAdapter.isCardProcessed(node)) {
                candidates.push(node);
              }
            }

            // Check if node contains child video cards
            const childCards = this.domAdapter.findVideoCards(node);
            for (const card of childCards) {
              if (!this.domAdapter.isCardProcessed(card)) {
                candidates.push(card);
              }
            }
          }
        }
      }

      if (candidates.length > 0) {
        console.debug(`[FocusFeed:DOM] MutationObserver discovered ${candidates.length} candidate card(s)`);
        this.scheduleBatchProcess(candidates);
      }
    });

    const target = document.body || document.documentElement;
    this.observer.observe(target, {
      childList: true,
      subtree: true
    });

    // 3. Fallback polling for virtualized rows and SPA content
    this.pollInterval = window.setInterval(() => {
      this.scanDocumentCards();
    }, 1200);

    console.log('[FocusFeed:DOM] Feed observer & background poller initialized');
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.processingQueue.clear();
  }

  resetCounts(): void {
    this.hiddenCount = 0;
    this.allowedCount = 0;
    this.updateStatusIndicator();
    this.removeEmptyState();
  }

  reprocessAll(): void {
    if (typeof document === 'undefined') return;
    console.log('[FocusFeed:DOM] Reprocessing all video cards on page...');
    const cards = this.domAdapter.findVideoCards(document);
    for (const card of cards) {
      card.removeAttribute('data-focusfeed-status');
      card.removeAttribute('data-focusfeed-reason');
      card.removeAttribute('data-focusfeed-rule');
    }
    this.resetCounts();
    this.scheduleBatchProcess(cards);
  }

  private scanDocumentCards(): void {
    if (typeof document === 'undefined') return;
    const cards = this.domAdapter.findVideoCards(document);
    const unhandled = cards.filter((c) => !this.domAdapter.isCardProcessed(c));
    if (unhandled.length > 0) {
      console.debug(`[FocusFeed:DOM] Poller discovered ${unhandled.length} unhandled video card(s)`);
      this.scheduleBatchProcess(unhandled);
    }
  }

  private scheduleBatchProcess(cards: HTMLElement[]): void {
    for (const card of cards) {
      if (!this.domAdapter.isCardProcessed(card)) {
        this.processingQueue.add(card);
      }
    }

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce processing to batch DOM reads and avoid stuttering
    this.debounceTimer = window.setTimeout(() => {
      this.processQueue();
    }, 80);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.size === 0) return;
    this.isProcessing = true;

    const cardsToProcess = Array.from(this.processingQueue);
    this.processingQueue.clear();
    const surface = this.getSurface();

    console.debug(`[FocusFeed:DOM] Processing batch of ${cardsToProcess.length} cards for surface [${surface}]`);

    for (const card of cardsToProcess) {
      if (this.domAdapter.isCardProcessed(card)) continue;

      const metadata = this.domAdapter.extractMetadata(card, surface);
      if (!metadata) {
        // Retry if still attached to DOM (title might be rendering)
        if (card.isConnected) {
          this.processingQueue.add(card);
        }
        continue;
      }

      console.debug(`[FocusFeed:Metadata] Extracted: "${metadata.title}" [${metadata.channelName}] (${metadata.id})`);

      try {
        const decision = await this.evaluateVideo(metadata);
        console.log(`[FocusFeed:Policy] Decision for "${metadata.title.slice(0, 40)}...": [${decision.decision.toUpperCase()}] (${decision.reasonCode})`);

        if (decision.decision === 'allowed') {
          this.domAdapter.showCard(card, decision.matchedRule);
          this.allowedCount++;
        } else {
          // 'blocked' or 'uncertain'
          this.domAdapter.hideCard(card, decision.reasonCode);
          this.hiddenCount++;
        }
      } catch (err) {
        console.error('[FocusFeed:Policy] Error evaluating video:', err);
      }
    }

    this.isProcessing = false;
    this.updateStatusIndicator();
    this.checkAndRenderEmptyState();
  }

  private injectGlobalStyles(): void {
    if (typeof document === 'undefined' || document.getElementById('focusfeed-global-styles')) return;

    const style = document.createElement('style');
    style.id = 'focusfeed-global-styles';
    style.textContent = `
      [data-focusfeed-status="hidden"] {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  private injectStatusIndicator(): void {
    if (typeof document === 'undefined' || document.getElementById('focusfeed-indicator')) return;

    const indicator = document.createElement('div');
    indicator.id = 'focusfeed-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 18px;
      right: 18px;
      z-index: 99999;
      background: rgba(15, 23, 42, 0.92);
      color: #f8fafc;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: none;
      transition: opacity 0.2s ease;
    `;
    indicator.innerHTML = `
      <span style="display:inline-block;width:8px;height:8px;background:#10b981;border-radius:50%;"></span>
      <span id="focusfeed-indicator-text">FocusFeed Active</span>
    `;

    document.body?.appendChild(indicator);
  }

  private updateStatusIndicator(): void {
    const textEl = document.getElementById('focusfeed-indicator-text');
    if (textEl) {
      textEl.textContent = `FocusFeed: ${this.hiddenCount} filtered · ${this.allowedCount} allowed`;
    }
  }

  private checkAndRenderEmptyState(): void {
    if (typeof document === 'undefined') return;
    const surface = this.getSurface();
    if (surface !== 'home' && surface !== 'search') return;

    if (this.allowedCount === 0 && this.hiddenCount > 0) {
      this.renderEmptyState();
    } else {
      this.removeEmptyState();
    }
  }

  private renderEmptyState(): void {
    if (document.getElementById('focusfeed-empty-state')) return;

    const emptyContainer = document.createElement('div');
    emptyContainer.id = 'focusfeed-empty-state';
    emptyContainer.style.cssText = `
      margin: 40px auto;
      max-width: 500px;
      padding: 32px 24px;
      text-align: center;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      color: #334155;
    `;
    emptyContainer.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 12px;">🎯</div>
      <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #0f172a;">All videos filtered for your focus</h3>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
        ${this.hiddenCount} out-of-interest videos were filtered on this page to protect your time and attention.
      </p>
      <div style="font-size: 12px; color: #94a3b8;">
        Adjust your interests anytime in the FocusFeed extension menu.
      </div>
    `;

    const feedRoot = document.querySelector('ytd-rich-grid-renderer, ytd-search, ytm-rich-grid-renderer, ytm-search');
    if (feedRoot) {
      feedRoot.prepend(emptyContainer);
    }
  }

  private removeEmptyState(): void {
    const el = document.getElementById('focusfeed-empty-state');
    if (el) el.remove();
  }
}
