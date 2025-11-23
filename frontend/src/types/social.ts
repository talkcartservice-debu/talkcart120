export interface User {
  id: string;
  _id?: string; // MongoDB ObjectId
  email?: string;
  username: string;
  displayName?: string;
  name?: string; // Computed field
  avatar?: string;
  cover?: string;
  bio?: string;
  location?: string;
  website?: string;
  isVerified: boolean;
  isActive?: boolean;
  isSuspended?: boolean;
  kycStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  isAnonymous?: boolean;
  role?: 'user' | 'moderator' | 'admin';
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  lastLoginAt?: string;
  lastSeenAt?: string;
  emailVerifiedAt?: string;
  walletAddress?: string;
  googleId?: string;
  appleId?: string;
  createdAt?: string;
  updatedAt?: string;
  settings?: {
    privacy?: {
      profileVisibility?: 'public' | 'followers' | 'private';
      activityVisibility?: 'public' | 'followers' | 'private';
      profilePublic?: boolean;
      showWallet?: boolean;
      showActivity?: boolean;
      showOnlineStatus?: boolean;
      showLastSeen?: boolean;
      allowTagging?: boolean;
      allowDirectMessages?: boolean;
      allowGroupInvites?: boolean;
      allowMentions?: boolean;
      messageRequestsFromFollowers?: boolean;
      dataSharing?: 'minimal' | 'standard' | 'enhanced';
      analyticsOptOut?: boolean;
      personalizedAds?: boolean;
      locationTracking?: boolean;
      activityTracking?: boolean;
      searchableByEmail?: boolean;
      searchableByPhone?: boolean;
      suggestToContacts?: boolean;
      showInDirectory?: boolean;
      downloadableContent?: boolean;
      contentIndexing?: boolean;
      shareAnalytics?: boolean;
    };
    notifications?: {
      email?: boolean;
      push?: boolean;
      inApp?: boolean;
      sms?: boolean;
      [key: string]: any; // For additional notification settings
    };
    [key: string]: any; // For additional settings
  };
}

export interface Post {
  id: string;
  _id?: string; // MongoDB ObjectId (for compatibility)
  type: 'text' | 'image' | 'video'; // Backend only supports these 3 types
  content: string;
  author: {
    id: string;
    _id?: string;
    username: string;
    displayName?: string;
    name?: string; // Backend adds this field
    avatar?: string;
    isVerified?: boolean;
    bio?: string;
    role?: string;
    followerCount?: number;
    location?: string;
  };
  authorId?: string; // Backend adds this field
  media?: Array<{
    id?: string;
    _id?: string;
    resource_type: string;
    secure_url: string;
    url?: string;
    thumbnail_url?: string;
    public_id?: string;
    format?: string;
    duration?: number;
    bytes?: number;
    width?: number;
    height?: number;
    created_at?: string;
  }>;
  createdAt: string;
  updatedAt?: string;
  // Count fields (what backend returns)
  likes: number;
  comments: number;
  shares: number;
  views: number;
  // Additional count fields from backend
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  bookmarkCount?: number;
  // User interaction flags
  isLiked?: boolean;
  isBookmarked?: boolean;
  isShared?: boolean;
  // Content fields
  hashtags?: string[];
  mentions?: Array<{
    id: string;
    username: string;
    displayName?: string;
  }>;
  // Location can be string or object
  location?: string | {
    name?: string;
    coordinates?: [number, number]; // [longitude, latitude]
  };
  // Additional backend fields
  privacy?: 'public' | 'followers' | 'private';
  isPinned?: boolean;
  isActive?: boolean;
  poll?: {
    question: string;
    options: Array<{
      text: string;
      votes: Array<{
        user: string;
        createdAt: string;
      }>;
    }>;
    expiresAt?: string;
    allowMultipleChoices?: boolean;
  };
  editHistory?: Array<{
    content: string;
    editedAt: string;
  }>;
  // Virtual fields
  engagementScore?: number;
  postUrl?: string;
  // Hide settings
  hideLikes?: boolean;
  hideComments?: boolean;
  // Achievement post fields
  isAchievement?: boolean;
  achievementType?: 'milestone' | 'award' | 'challenge' | 'custom';
  achievementData?: {
    title?: string;
    description?: string;
    icon?: string;
    [key: string]: any;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PostsResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  feedType?: string;
}

export interface PostsApiResponse extends ApiResponse<PostsResponse> {}
