import { describe, it, expect, beforeEach } from 'vitest';
import { YouTubeDomAdapter } from '../../youtube/dom-adapter';

describe('YouTubeDomAdapter Live DOM Compatibility', () => {
  let adapter: YouTubeDomAdapter;

  beforeEach(() => {
    adapter = new YouTubeDomAdapter();
    document.body.innerHTML = '';
  });

  it('1. Correctly identifies desktop and mobile video card elements with isCardElement', () => {
    const desktopCard = document.createElement('ytd-rich-item-renderer');
    const mobileCard = document.createElement('ytm-media-item');
    const searchCard = document.createElement('ytd-video-renderer');
    const shortsCard = document.createElement('ytd-reel-item-renderer');
    const normalDiv = document.createElement('div');

    expect(adapter.isCardElement(desktopCard)).toBe(true);
    expect(adapter.isCardElement(mobileCard)).toBe(true);
    expect(adapter.isCardElement(searchCard)).toBe(true);
    expect(adapter.isCardElement(shortsCard)).toBe(true);
    expect(adapter.isCardElement(normalDiv)).toBe(false);
  });

  it('2. Extracts metadata from desktop YouTube card layout (ytd-rich-item-renderer)', () => {
    const card = document.createElement('ytd-rich-item-renderer');
    card.innerHTML = `
      <div id="dismissible">
        <a id="thumbnail" href="/watch?v=dQw4w9WgXcQ">
          <img src="thumb.jpg" />
        </a>
        <div id="details">
          <h3 class="title-and-badge">
            <a id="video-title" href="/watch?v=dQw4w9WgXcQ" title="Full Stack Python Web Development">
              Full Stack Python Web Development
            </a>
          </h3>
          <div id="channel-name">
            <a href="/@techacademy">Tech Academy</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(card);

    const metadata = adapter.extractMetadata(card, 'home');
    expect(metadata).not.toBeNull();
    expect(metadata?.id).toBe('dQw4w9WgXcQ');
    expect(metadata?.title).toBe('Full Stack Python Web Development');
    expect(metadata?.channelName).toBe('Tech Academy');
    expect(metadata?.surface).toBe('home');
  });

  it('3. Extracts metadata from mobile/responsive YouTube layout (ytm-media-item)', () => {
    const card = document.createElement('ytm-media-item');
    card.innerHTML = `
      <a class="media-item-thumbnail-container" href="/watch?v=9bZkp7q19f0"></a>
      <div class="media-item-metadata">
        <h3 class="media-item-headline">
          <span>Cartoon Network & Nickelodeon Are Now Together !!</span>
        </h3>
        <div class="media-item-byline">
          <span class="ytm-badge-and-byline-item">Ultimate Bikram</span>
        </div>
      </div>
    `;
    document.body.appendChild(card);

    const metadata = adapter.extractMetadata(card, 'home');
    expect(metadata).not.toBeNull();
    expect(metadata?.id).toBe('9bZkp7q19f0');
    expect(metadata?.title).toContain('Cartoon Network & Nickelodeon');
    expect(metadata?.channelName).toContain('Ultimate Bikram');
  });

  it('4. Correctly extracts videoId from shorts URLs', () => {
    const card = document.createElement('ytd-reel-item-renderer');
    card.innerHTML = `
      <a href="/shorts/abc12345678">
        <span id="video-title">Amazing Coding Short</span>
      </a>
    `;

    const metadata = adapter.extractMetadata(card, 'shorts');
    expect(metadata?.id).toBe('abc12345678');
    expect(metadata?.title).toBe('Amazing Coding Short');
  });

  it('5. Hides cards with data attributes and style display none', () => {
    const card = document.createElement('ytd-rich-item-renderer');
    adapter.hideCard(card, 'RULES_NO_INTEREST_MATCH');

    expect(card.style.display).toBe('none');
    expect(card.getAttribute('data-focusfeed-status')).toBe('hidden');
    expect(card.getAttribute('data-focusfeed-reason')).toBe('RULES_NO_INTEREST_MATCH');
    expect(adapter.isCardProcessed(card)).toBe(true);
  });

  it('6. Shows allowed cards and removes display:none', () => {
    const card = document.createElement('ytd-rich-item-renderer');
    card.style.display = 'none';
    adapter.showCard(card, 'topic:Python');

    expect(card.style.display).toBe('');
    expect(card.getAttribute('data-focusfeed-status')).toBe('allowed');
    expect(card.getAttribute('data-focusfeed-rule')).toBe('topic:Python');
    expect(adapter.isCardProcessed(card)).toBe(true);
  });
});
