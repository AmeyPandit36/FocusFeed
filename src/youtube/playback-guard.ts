import { YOUTUBE_SELECTORS } from './selectors';
import type { PolicyDecision, PolicyDecisionType, SurfaceType } from '../core/types';
import type { AttemptResult } from '../core/credit-ledger';

export interface PlaybackGuardOptions {
  recordViewAttempt: (params: {
    videoId: string;
    videoTitle: string;
    channelName?: string;
    surface: SurfaceType;
    decision: PolicyDecisionType;
  }) => Promise<AttemptResult>;
  evaluateVideo: (video: import('../core/types').VideoMetadata) => Promise<PolicyDecision>;
  getSurface: () => SurfaceType;
}

export class PlaybackGuard {
  private recordViewAttempt: PlaybackGuardOptions['recordViewAttempt'];
  private evaluateVideo: PlaybackGuardOptions['evaluateVideo'];
  private getSurface: PlaybackGuardOptions['getSurface'];
  private currentGuardedVideoId: string | null = null;
  private isAttached = false;

  constructor(options: PlaybackGuardOptions) {
    this.recordViewAttempt = options.recordViewAttempt;
    this.evaluateVideo = options.evaluateVideo;
    this.getSurface = options.getSurface;
  }

  start(): void {
    if (this.isAttached || typeof document === 'undefined') return;
    this.isAttached = true;

    // 1. Intercept deliberate clicks on video cards
    document.addEventListener('click', this.handleCardClick, true);

    // 2. Watch for direct video navigation (/watch or /shorts)
    this.guardCurrentPagePlayback();
  }

  stop(): void {
    if (!this.isAttached) return;
    this.isAttached = false;
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', this.handleCardClick, true);
    }
    this.removeRestrictionOverlay();
  }

  async guardCurrentPagePlayback(): Promise<void> {
    if (typeof window === 'undefined') return;

    const surface = this.getSurface();
    if (surface !== 'direct_watch' && surface !== 'shorts') {
      this.removeRestrictionOverlay();
      this.currentGuardedVideoId = null;
      return;
    }

    const videoId = this.extractCurrentPageVideoId();
    if (!videoId || videoId === this.currentGuardedVideoId) return;
    this.currentGuardedVideoId = videoId;

    // Wait slightly for DOM title and channel to be populated
    setTimeout(async () => {
      const title = document.querySelector('h1.ytd-watch-metadata, #title h1')?.textContent?.trim() || 'YouTube Video';
      const channel = document.querySelector('ytd-channel-name a, #owner #channel-name a')?.textContent?.trim() || 'Creator';

      const decision = await this.evaluateVideo({
        id: videoId,
        title,
        channelName: channel,
        surface,
        url: window.location.href
      });

      // Record viewing attempt
      const result = await this.recordViewAttempt({
        videoId,
        videoTitle: title,
        channelName: channel,
        surface,
        decision: decision.decision
      });

      if (!result.allowed) {
        // Pause and block playback
        this.pauseAllVideos();
        this.renderRestrictionOverlay(result.blockedUntil, result.reason);
      } else {
        this.removeRestrictionOverlay();
        if (result.creditConsumed) {
          this.showCreditToast(result.remainingCredits);
        }
      }
    }, 400);
  }

  private handleCardClick = async (event: MouseEvent): Promise<void> => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Check if clicked inside a video card link
    const link = target.closest<HTMLAnchorElement>('a[href*="/watch?v="], a[href*="/shorts/"]');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const match = href.match(/(?:\/watch\?v=|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return;

    const videoId = match[1];
    const card = target.closest<HTMLElement>('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer');
    const status = card?.getAttribute('data-focusfeed-status');

    // If card was allowed, allow normal navigation
    if (status === 'allowed') return;

    // Card was hidden/out-of-interest or uncertain: deliberate open attempt
    const surface = this.getSurface();
    const title = card?.querySelector('#video-title')?.textContent?.trim() || 'YouTube Video';

    // Call record view attempt
    const result = await this.recordViewAttempt({
      videoId,
      videoTitle: title,
      surface,
      decision: status === 'allowed' ? 'allowed' : 'blocked'
    });

    if (!result.allowed) {
      // Block navigation completely!
      event.preventDefault();
      event.stopPropagation();
      this.pauseAllVideos();
      this.renderRestrictionOverlay(result.blockedUntil, result.reason);
    } else if (result.creditConsumed) {
      this.showCreditToast(result.remainingCredits);
    }
  };

  private pauseAllVideos(): void {
    if (typeof document === 'undefined') return;
    const videos = document.querySelectorAll<HTMLVideoElement>(YOUTUBE_SELECTORS.videoPlayer);
    videos.forEach((v) => {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {
        // Ignore playback pause errors
      }
    });
  }

  private renderRestrictionOverlay(blockedUntil: number | null, reason: string): void {
    if (typeof document === 'undefined' || document.getElementById('focusfeed-restriction-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'focusfeed-restriction-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.95);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
      box-sizing: border-box;
      backdrop-filter: blur(12px);
    `;

    const remainingMs = blockedUntil ? Math.max(0, blockedUntil - Date.now()) : 0;
    const hours = Math.floor(remainingMs / (3600 * 1000));
    const minutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
    const formattedDuration = `${hours}h ${minutes}m`;

    overlay.innerHTML = `
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 20px; max-width: 520px; width: 100%; padding: 40px 32px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
        <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
        <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #f1f5f9;">Viewing Allowance Exhausted</h2>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0;">
          You've used all 5 daily out-of-interest viewing credits. As configured, YouTube access is temporarily restricted for 10 hours to protect your focus and deep work.
        </p>

        <div style="background: #0f172a; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #334155;">
          <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 4px;">Remaining Restriction Time</div>
          <div style="font-size: 28px; font-weight: 800; color: #38bdf8;">${formattedDuration}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Unlocks at: ${blockedUntil ? new Date(blockedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'} · Code: ${reason}</div>
        </div>

        <button id="focusfeed-return-home-btn" style="background: #3b82f6; hover:bg-blue-600; color: white; border: none; padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 10px; cursor: pointer; transition: background 0.2s;">
          Return to Focus
        </button>
      </div>
    `;

    document.body?.appendChild(overlay);

    document.getElementById('focusfeed-return-home-btn')?.addEventListener('click', () => {
      window.location.href = 'https://www.youtube.com/';
    });
  }

  private removeRestrictionOverlay(): void {
    const el = document.getElementById('focusfeed-restriction-modal');
    if (el) el.remove();
  }

  private showCreditToast(remainingCredits: number): void {
    if (typeof document === 'undefined') return;

    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 999999;
      background: #1e293b;
      color: #f8fafc;
      padding: 12px 18px;
      border-radius: 10px;
      border: 1px solid #334155;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    toast.innerHTML = `
      <span style="font-size: 18px;">⚡</span>
      <div>
        <div style="font-weight: 600;">1 Credit Consumed</div>
        <div style="font-size: 12px; color: #94a3b8;">${remainingCredits} out-of-interest credits remaining today</div>
      </div>
    `;

    document.body?.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  private extractCurrentPageVideoId(): string | null {
    if (typeof window === 'undefined') return null;
    const url = new URL(window.location.href);
    if (url.pathname === '/watch') {
      return url.searchParams.get('v');
    }
    const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      return shortsMatch[1];
    }
    return null;
  }
}
