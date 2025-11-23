// Common types for the application
export * from './api';

export interface User {
  id: string;
  _id?: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;

  isVerified?: boolean;
  bio?: string;
  location?: string;
  website?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  createdAt?: string;
  updatedAt?: string;
  walletAddress?: string;
  isActive?: boolean;
  role?: 'user' | 'moderator' | 'admin' | 'vendor';
  lastSeenAt?: string;
  lastLoginAt?: string;
  emailVerifiedAt?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    instagram?: string;
    linkedin?: string;
  };
  settings?: {
    privacy?: {
      profileVisibility?: 'public' | 'followers' | 'private';
      activityVisibility?: 'public' | 'followers' | 'private';
      allowDirectMessages?: boolean;
      allowGroupInvites?: boolean;
      allowMentions?: boolean;
      showWallet?: boolean;
      showActivity?: boolean;
      showOnlineStatus?: boolean;
      showLastSeen?: boolean;
    };
    notifications?: {
      email?: boolean;
      push?: boolean;
      inApp?: boolean;
      mentions?: boolean;
      follows?: boolean;
      likes?: boolean;
      comments?: boolean;
      directMessages?: boolean;
    };
    theme?: {
      theme?: 'light' | 'dark' | 'system';
      language?: string;
    };
  };
}

// Extended profile user interface for profile pages
export interface ProfileUser extends User {
  followers?: string[];
  following?: string[];
  isFollowing?: boolean;
  isFollower?: boolean;
  canMessage?: boolean;
  canInviteToGroup?: boolean;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface RelationshipStatus {
  isFollowing: boolean;
  isFollower: boolean;
  mutual: boolean;
}

export interface UserListItem {
  id: string;
  username: string;
  displayName: string;
  avatar?: string | null;
  isVerified?: boolean;
  followerCount?: number;
  followingCount?: number;
  followedAt?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

export interface Post {
  id: string;
  _id?: string;
  content: string;
  author: User;
  createdAt: string;
  updatedAt?: string;
  media?: PostMedia[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount?: number;
  isLiked: boolean;
  isBookmarked?: boolean;
  isShared?: boolean;
  privacy?: 'public' | 'followers' | 'private';
  hashtags?: string[];
  mentions?: string[];
  type?: 'text' | 'image' | 'video';
  views?: number;
}

export interface PostMedia {
  id: string;
  resource_type: 'image' | 'video' | 'audio';
  secure_url: string;
  url?: string;
  format: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes?: number;
}

export interface Comment {
  id: string;
  _id?: string;
  content: string;
  author: User;
  post: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  likeCount?: number;
  isLiked?: boolean;
  replies?: Comment[];
  parent?: string | null;
  isActive: boolean;
  editHistory?: Array<{
    content: string;
    editedAt: string;
  }>;
  mentions?: Array<{
    id: string;
    username: string;
    displayName?: string;
  }>;
}

// Streaming types
export interface StreamThumbnail {
  public_id?: string;
  secure_url?: string;
  url?: string;
}

export interface StreamQuality {
  resolution: string;
  bitrate: number;
  fps: number;
}

export interface StreamSettings {
  allowChat: boolean;
  allowDonations: boolean;
  allowRecording?: boolean;
  isSubscriberOnly: boolean;
  isMatureContent?: boolean;
  maxViewers: number;
  chatSlowMode?: number;
  requireFollowToChat?: boolean;
  autoModeration?: boolean;
  quality?: StreamQuality;
}

export interface StreamMonetization {
  subscriptionPrice: number;
  donationGoal: number;
  totalDonations?: number;
  minimumDonation?: number;
  donationCurrency?: string;
}

export interface StreamerSummary {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  isVerified?: boolean;
  followerCount: number;
}

export interface Stream {
  id: string;
  _id?: string;
  streamerId?: string;
  streamer: StreamerSummary;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  language?: string;
  thumbnail?: StreamThumbnail | null;
  isLive: boolean;
  isActive?: boolean;
  isScheduled?: boolean;
  scheduledAt?: string;
  isRecording?: boolean;
  streamUrl?: string;
  playbackUrl?: string;
  streamKey?: string;
  settings: StreamSettings;
  monetization: StreamMonetization;
  viewerCount?: number;
  peakViewerCount?: number;
  totalViews?: number;
  duration?: number; // in seconds
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  moderators?: Array<{
    userId: string;
    permissions: string[];
    addedAt?: string;
  }>;
}

// Product Types (Cart types have been removed)
export interface ProductImage {
  public_id?: string;
  secure_url: string;
  url?: string;
}

export interface Product {
  _id: string;
  id?: string;
  vendorId: string | User;
  name: string;
  description: string;
  price: number;
  currency: 'ETH' | 'BTC' | 'USD' | 'USDC' | 'USDT';
  images: ProductImage[];
  category: string;
  tags: string[];
  stock: number;
  isActive: boolean;
  featured: boolean;
  isNFT: boolean;
  contractAddress?: string;
  tokenId?: string;
  rating: number;
  reviewCount: number;
  sales: number;
  views: number;
  availability: 'available' | 'sold' | 'unavailable' | 'limited';
  createdAt: string;
  updatedAt: string;
}

// Re-export from other type files
export * from './social';
export * from './message';
export * from './orders';