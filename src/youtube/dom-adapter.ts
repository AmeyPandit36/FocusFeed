import { YOUTUBE_SELECTORS } from './selectors';
import type { SurfaceType, VideoMetadata } from '../core/types';

export class YouTubeDomAdapter {
  /**
   * Detects current surface type based on URL path and search params.
   */
  detectSurface(urlString: string): SurfaceType {
    try {
      const url = new URL(urlString);
      const path = url.pathname;

      if (path === '/' || path === '' || path === '/home') return 'home';
      if (path === '/results') return 'search';
      if (path.startsWith('/shorts')) return 'shorts';
      if (path === '/watch') return 'direct_watch';
      if (path.startsWith('/@') || path.startsWith('/channel') || path.startsWith('/c/')) return 'channel';

      return 'home';
    } catch {
      return 'home';
    }
  }

  /**
   * Extracts clean, structured metadata from a video card DOM element.
   */
  extractMetadata(card: HTMLElement, surface: SurfaceType): VideoMetadata | null {
    // 1. Extract link and Video ID
    const linkEl = card.querySelector<HTMLAnchorElement>(YOUTUBE_SELECTORS.videoLinkSelectors);
    const href = linkEl?.getAttribute('href') || '';

    let videoId = '';
    const watchMatch = href.match(/(?:\/watch\?v=|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (watchMatch) {
      videoId = watchMatch[1];
    } else {
      // Try attribute
      const idAttr = card.getAttribute('data-video-id') || card.getAttribute('id');
      if (idAttr && idAttr.length === 11) {
        videoId = idAttr;
      }
    }

    if (!videoId) {
      return null;
    }

    // 2. Extract Video Title
    const titleEl = card.querySelector<HTMLElement>(YOUTUBE_SELECTORS.titleSelectors);
    let title = (
      titleEl?.textContent?.trim() ||
      titleEl?.getAttribute('title') ||
      titleEl?.getAttribute('aria-label') ||
      ''
    ).replace(/\s+/g, ' ');

    // 3. Extract Channel Name
    const channelEl = card.querySelector<HTMLElement>(YOUTUBE_SELECTORS.channelSelectors);
    const channelName = (channelEl?.textContent?.trim() || '').replace(/\s+/g, ' ');

    return {
      id: videoId,
      title: title || 'Untitled Video',
      channelName: channelName || 'YouTube Creator',
      surface,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  /**
   * Hides an out-of-interest video card cleanly without disturbing the grid container.
   */
  hideCard(card: HTMLElement, reasonCode: string): void {
    card.style.setProperty('display', 'none', 'important');
    card.setAttribute('data-focusfeed-status', 'hidden');
    card.setAttribute('data-focusfeed-reason', reasonCode);
  }

  /**
   * Marks and displays an allowed in-interest video card.
   */
  showCard(card: HTMLElement, matchedRule?: string): void {
    if (card.style.display === 'none') {
      card.style.removeProperty('display');
    }
    card.setAttribute('data-focusfeed-status', 'allowed');
    if (matchedRule) {
      card.setAttribute('data-focusfeed-rule', matchedRule);
    }
  }

  /**
   * Checks whether a card has already been processed and marked by FocusFeed.
   */
  isCardProcessed(card: HTMLElement): boolean {
    return card.hasAttribute('data-focusfeed-status');
  }

  /**
   * Finds all candidate video card elements within a container or root.
   */
  findVideoCards(root: ParentNode = document): HTMLElement[] {
    const list = root.querySelectorAll<HTMLElement>(YOUTUBE_SELECTORS.cardContainers);
    return Array.from(list);
  }
}
