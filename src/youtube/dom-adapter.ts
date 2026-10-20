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
   * Tests whether an element is itself a YouTube video card container.
   */
  isCardElement(element: HTMLElement): boolean {
    if (!element || typeof element.matches !== 'function') return false;
    return element.matches(YOUTUBE_SELECTORS.cardContainers);
  }

  /**
   * Extracts clean, structured metadata from a video card DOM element.
   */
  extractMetadata(card: HTMLElement, surface: SurfaceType): VideoMetadata | null {
    // 1. Extract link and Video ID
    let href = '';
    const linkEl = card.querySelector<HTMLAnchorElement>(YOUTUBE_SELECTORS.videoLinkSelectors);
    if (linkEl) {
      href = linkEl.getAttribute('href') || linkEl.href || '';
    }

    // Fallback: search all links in the card
    if (!href) {
      const allLinks = card.querySelectorAll<HTMLAnchorElement>('a[href]');
      for (const a of allLinks) {
        const h = a.getAttribute('href') || '';
        if (h.includes('/watch?v=') || h.includes('/shorts/')) {
          href = h;
          break;
        }
      }
    }

    let videoId = '';
    const match = href.match(/(?:[?&]v=|\/shorts\/|\/embed\/|\/watch\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      videoId = match[1];
    } else {
      // Try attributes on the card itself
      const idAttr = card.getAttribute('data-video-id') || card.getAttribute('id');
      if (idAttr && idAttr.length === 11) {
        videoId = idAttr;
      }
    }

    if (!videoId) {
      return null;
    }

    // 2. Extract Video Title in priority order
    let title = '';
    for (const selector of YOUTUBE_SELECTORS.titleSelectors) {
      const el = card.querySelector<HTMLElement>(selector);
      if (el) {
        const text = (
          el.textContent?.trim() ||
          el.getAttribute('title') ||
          el.getAttribute('aria-label') ||
          ''
        ).replace(/\s+/g, ' ');

        // Discard duration timestamps like "4:30" or "1:15:20"
        if (text && text.length > 1 && !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text)) {
          title = text;
          break;
        }
      }
    }

    // Fallback: search link attributes or card attributes
    if (!title || title.length < 2) {
      const fallback = (
        card.getAttribute('aria-label') ||
        linkEl?.getAttribute('aria-label') ||
        linkEl?.getAttribute('title') ||
        ''
      ).replace(/\s+/g, ' ');

      if (fallback && !/^\d{1,2}:\d{2}(?::\d{2})?$/.test(fallback)) {
        title = fallback;
      }
    }

    // 3. Extract Channel Name
    const channelEl = card.querySelector<HTMLElement>(YOUTUBE_SELECTORS.channelSelectors);
    let channelName = (channelEl?.textContent?.trim() || '').replace(/\s+/g, ' ');

    if (!channelName) {
      // Try aria-label or byline
      const byline = card.querySelector<HTMLElement>('#byline, .byline, #owner-name');
      channelName = (byline?.textContent?.trim() || 'YouTube Creator').replace(/\s+/g, ' ');
    }

    const metadata: VideoMetadata = {
      id: videoId,
      title: title || 'Untitled Video',
      channelName: channelName || 'YouTube Creator',
      surface,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };

    return metadata;
  }

  /**
   * Hides an out-of-interest video card cleanly without disturbing the grid container.
   */
  hideCard(card: HTMLElement, reasonCode: string): void {
    card.style.setProperty('display', 'none', 'important');
    card.style.setProperty('visibility', 'hidden', 'important');
    card.style.setProperty('height', '0px', 'important');
    card.style.setProperty('margin', '0px', 'important');
    card.style.setProperty('padding', '0px', 'important');
    card.setAttribute('data-focusfeed-status', 'hidden');
    card.setAttribute('data-focusfeed-reason', reasonCode);
    console.debug(`[FocusFeed:DOM] Card hidden: [${reasonCode}]`);
  }

  /**
   * Marks and displays an allowed in-interest video card.
   */
  showCard(card: HTMLElement, matchedRule?: string): void {
    card.style.removeProperty('display');
    card.style.removeProperty('visibility');
    card.style.removeProperty('height');
    card.style.removeProperty('margin');
    card.style.removeProperty('padding');
    card.setAttribute('data-focusfeed-status', 'allowed');
    if (matchedRule) {
      card.setAttribute('data-focusfeed-rule', matchedRule);
    }
    console.debug(`[FocusFeed:DOM] Card allowed: [${matchedRule || 'in-interest'}]`);
  }

  /**
   * Checks whether a card has already been processed and marked by FocusFeed.
   */
  isCardProcessed(card: HTMLElement): boolean {
    return card.hasAttribute('data-focusfeed-status');
  }

  /**
   * Finds all candidate video card elements within a container or root.
   * Discards nested child cards so only outermost containers are controlled.
   */
  findVideoCards(root: ParentNode = document): HTMLElement[] {
    const list = Array.from(root.querySelectorAll<HTMLElement>(YOUTUBE_SELECTORS.cardContainers));
    return list.filter((el) => {
      const parentCard = el.parentElement?.closest<HTMLElement>(YOUTUBE_SELECTORS.cardContainers);
      return !parentCard;
    });
  }
}
