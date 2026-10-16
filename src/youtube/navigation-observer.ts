import type { SurfaceType } from '../core/types';
import { YouTubeDomAdapter } from './dom-adapter';

export type NavigationCallback = (url: string, surface: SurfaceType) => void;

export class NavigationObserver {
  private domAdapter: YouTubeDomAdapter;
  private currentUrl: string = '';
  private currentSurface: SurfaceType = 'home';
  private listeners: Set<NavigationCallback> = new Set();
  private isObserving = false;

  constructor(domAdapter = new YouTubeDomAdapter()) {
    this.domAdapter = domAdapter;
  }

  start(initialCallback?: NavigationCallback): void {
    if (this.isObserving) return;
    this.isObserving = true;

    if (initialCallback) {
      this.listeners.add(initialCallback);
    }

    if (typeof window !== 'undefined') {
      this.currentUrl = window.location.href;
      this.currentSurface = this.domAdapter.detectSurface(this.currentUrl);

      // 1. YouTube specific custom SPA events
      window.addEventListener('yt-navigate-finish', this.handleNavigateFinish);
      window.addEventListener('yt-page-data-updated', this.handlePageDataUpdated);

      // 2. Standard browser history popstate
      window.addEventListener('popstate', this.handlePopstate);

      // 3. Monkey patch pushState and replaceState to detect instant client router changes
      this.patchHistoryState();

      // Trigger initial callback
      this.notify(this.currentUrl, this.currentSurface);
    }
  }

  stop(): void {
    if (!this.isObserving) return;
    this.isObserving = false;

    if (typeof window !== 'undefined') {
      window.removeEventListener('yt-navigate-finish', this.handleNavigateFinish);
      window.removeEventListener('yt-page-data-updated', this.handlePageDataUpdated);
      window.removeEventListener('popstate', this.handlePopstate);
    }
    this.listeners.clear();
  }

  subscribe(callback: NavigationCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  getCurrentSurface(): SurfaceType {
    return this.currentSurface;
  }

  getCurrentUrl(): string {
    return this.currentUrl;
  }

  private handleNavigateFinish = (): void => {
    this.checkUrlChange();
  };

  private handlePageDataUpdated = (): void => {
    this.checkUrlChange();
  };

  private handlePopstate = (): void => {
    this.checkUrlChange();
  };

  private checkUrlChange(): void {
    if (typeof window === 'undefined') return;
    const newUrl = window.location.href;
    if (newUrl !== this.currentUrl) {
      this.currentUrl = newUrl;
      this.currentSurface = this.domAdapter.detectSurface(newUrl);
      this.notify(this.currentUrl, this.currentSurface);
    }
  }

  private notify(url: string, surface: SurfaceType): void {
    for (const listener of this.listeners) {
      try {
        listener(url, surface);
      } catch (err) {
        console.error('[FocusFeed] Navigation listener error:', err);
      }
    }
  }

  private patchHistoryState(): void {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      setTimeout(() => this.checkUrlChange(), 0);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      setTimeout(() => this.checkUrlChange(), 0);
    };
  }
}
