/**
 * Centralized YouTube DOM selectors.
 * Supports both standard desktop YouTube (ytd-*) and mobile/responsive view (ytm-*).
 */

export const YOUTUBE_SELECTORS = {
  // Video Card Containers across all surfaces (desktop & mobile)
  cardContainers: [
    'ytd-rich-item-renderer', // Home feed grid items
    'ytd-rich-grid-media',    // Alternate grid media wrapper
    'ytd-video-renderer',     // Search results and channel videos
    'ytd-compact-video-renderer', // Watch page sidebar / related videos
    'ytd-grid-video-renderer', // Channel videos grid
    'ytd-reel-item-renderer',  // Shorts carousel/shelf items
    'ytd-playlist-video-renderer', // Playlist items
    'ytm-rich-item-renderer', // Mobile home feed items
    'ytm-video-with-context-renderer', // Mobile search/context videos
    'ytm-compact-video-renderer', // Mobile related videos
    'ytm-media-item',         // Mobile media item card
    'ytm-reel-item-renderer'  // Mobile shorts item
  ].join(','),

  // Video Title Selectors (in order of priority)
  titleSelectors: [
    '#video-title',
    '#video-title-link',
    'a#video-title',
    'yt-formatted-string#video-title',
    '.title-and-badge h3 a',
    'h3 a#video-title',
    'h3 a',
    'h3.media-item-headline',
    '.media-item-headline',
    'h3',
    '.yt-core-attributed-string'
  ].join(','),

  // Channel Name / Owner Selectors
  channelSelectors: [
    'ytd-channel-name a',
    '#channel-name a',
    '#channel-info #text a',
    '#owner #channel-name a',
    'ytd-video-meta-block #channel-name yt-formatted-string',
    '#byline a',
    '#text.ytd-channel-name',
    '.media-item-byline',
    '.ytm-badge-and-byline-item',
    '.ytm-channel-name'
  ].join(','),

  // Video Link Selectors to extract video ID / URL
  videoLinkSelectors: [
    'a[href*="/watch?v="]',
    'a[href*="/shorts/"]',
    'a#thumbnail',
    'a#video-title-link',
    'a#video-title',
    'a.ytd-thumbnail',
    'a.media-item-thumbnail-container'
  ].join(','),

  // Feeds and Containers to mount Empty States or badges
  homeFeedContainer: 'ytd-rich-grid-renderer #contents, ytm-rich-grid-renderer',
  searchResultsContainer: 'ytd-search #contents, ytm-search',
  relatedFeedContainer: '#related #items, ytd-watch-next-secondary-results-renderer #items, ytm-single-column-watch-next-results-renderer',

  // Video player elements for direct watch / playback guard
  videoPlayer: 'video.html5-main-video, video',
  playerContainer: '#movie_player, #player-container, ytm-player',

  // Shorts container
  shortsPlayer: 'ytd-shorts, #shorts-player, ytm-shorts'
};
