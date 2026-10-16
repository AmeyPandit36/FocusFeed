/**
 * Centralized YouTube DOM selectors.
 * Designed to be easily maintained as YouTube updates its DOM structure.
 */

export const YOUTUBE_SELECTORS = {
  // Video Card Containers across all surfaces
  cardContainers: [
    'ytd-rich-item-renderer', // Home feed grid items
    'ytd-video-renderer',     // Search results and channel videos
    'ytd-compact-video-renderer', // Watch page sidebar / related videos
    'ytd-grid-video-renderer', // Channel videos grid
    'ytd-reel-item-renderer',  // Shorts carousel/shelf items
    'ytd-playlist-video-renderer' // Playlist items
  ].join(','),

  // Video Title Selectors (in order of priority)
  titleSelectors: [
    '#video-title',
    '#video-title-link',
    'a#video-title',
    'yt-formatted-string#video-title',
    '.title-and-badge h3 a',
    'h3 a#video-title'
  ].join(','),

  // Channel Name / Owner Selectors
  channelSelectors: [
    'ytd-channel-name a',
    '#channel-name a',
    '#channel-info #text a',
    '#owner #channel-name a',
    'ytd-video-meta-block #channel-name yt-formatted-string',
    '#byline a',
    '#text.ytd-channel-name'
  ].join(','),

  // Video Link Selectors to extract video ID / URL
  videoLinkSelectors: [
    'a#thumbnail',
    'a#video-title-link',
    'a#video-title',
    'a.ytd-thumbnail'
  ].join(','),

  // Feeds and Containers to mount Empty States or badges
  homeFeedContainer: 'ytd-rich-grid-renderer #contents',
  searchResultsContainer: 'ytd-search #contents',
  relatedFeedContainer: '#related #items, ytd-watch-next-secondary-results-renderer #items',

  // Video player elements for direct watch / playback guard
  videoPlayer: 'video.html5-main-video',
  playerContainer: '#movie_player, #player-container',

  // Shorts container
  shortsPlayer: 'ytd-shorts, #shorts-player'
};
