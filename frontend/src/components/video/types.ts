// Video media item type (matching backend structure)
export interface VideoMediaItem {
  public_id: string;
  secure_url: string;
  url?: string;
  resource_type: 'video';
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  duration?: number;
  created_at?: string;
}

// Video post type (matching backend structure)
export interface VideoPost {
  _id: string;
  id: string;
  author: {
    _id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    isVerified?: boolean;
  };
  content: string;
  type: 'video';
  media: VideoMediaItem[];
  hashtags?: string[];
  location?: string;
  privacy: 'public' | 'followers' | 'private';
  likes: Array<{ user: string; createdAt: string }>;
  shares: Array<{ user: string; createdAt: string }>;
  bookmarks: Array<{ user: string; createdAt: string }>;
  views: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount: number;
  isLiked?: boolean;
  isShared?: boolean;
  isBookmarked?: boolean;
}

// Video container props
export interface VideoContainerProps {
  videoItem: VideoMediaItem;
  videoId: string;
  autoPlay?: boolean;
  autoMute?: boolean;
  loop?: boolean;
  controls?: boolean;
  maxHeight?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  className?: string;
  style?: React.CSSProperties;
  isMultimedia?: boolean;
  showMetadata?: boolean;
  enableKeyboardShortcuts?: boolean;
  pauseOthersOnPlay?: boolean;
}

// Video post hook options
export interface UseVideoPostOptions {
  autoPlay?: boolean;
  pauseOthersOnPlay?: boolean;
  trackViews?: boolean;
  preloadMetadata?: boolean;
}

// Video post state
export interface VideoPostState {
  isLoading: boolean;
  error: string | null;
  currentVideoIndex: number;
  playingVideoId: string | null;
  viewTracked: boolean;
  userInteracted: boolean;
  manuallyPaused: boolean;
  manuallyPlaying: boolean;
  canAutoplay: boolean;
}

// Video post actions
export interface VideoPostActions {
  playVideo: (videoIndex?: number, isManual?: boolean) => Promise<void>;
  pauseVideo: (isManual?: boolean) => void;
  nextVideo: () => void;
  previousVideo: () => void;
  toggleLike: () => Promise<void>;
  toggleBookmark: () => Promise<void>;
  sharePost: () => Promise<void>;
  trackView: () => Promise<void>;
  refreshPost: () => Promise<void>;
  resetManualStates: () => void;
}

// Video state for the container
export interface VideoState {
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isFullscreen: boolean;
  buffered: number;
  playbackRate: number;
  userInteracted: boolean;
  manuallyPaused: boolean;
  manuallyPlaying: boolean;
  canAutoplay: boolean;
}