// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://api.vetora.app' 
    : 'http://localhost:8000/api',
  TIMEOUT: 0, // No timeout
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 200 * 1024 * 1024, // 200MB
  MAX_FILES: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  ALLOWED_AUDIO_TYPES: ['audio/mp3', 'audio/wav', 'audio/ogg'],
} as const;

// Pagination Configuration
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
} as const;

// Social Media Configuration
export const SOCIAL_CONFIG = {
  MAX_POST_LENGTH: 2000,
  MAX_COMMENT_LENGTH: 500,
  MAX_BIO_LENGTH: 160,
  MAX_USERNAME_LENGTH: 30,
  MIN_USERNAME_LENGTH: 3,
} as const;

// Theme Configuration
export const THEME_CONFIG = {
  STORAGE_KEYS: {
    THEME_MODE: 'vetora-theme-mode',
    FONT_SIZE: 'vetora-font-size',
    REDUCED_MOTION: 'vetora-reduced-motion',
    HIGH_CONTRAST: 'vetora-high-contrast',
  },
  FONT_SIZE_SCALES: {
    'small': 0.875,
    'medium': 1,
    'large': 1.125,
    'extra-large': 1.25,
  },
} as const;

// Wallet Configuration
export const WALLET_CONFIG = {
  SUPPORTED_NETWORKS: [1, 137, 56], // Ethereum, Polygon, BSC
  DEFAULT_NETWORK: 1,
  RPC_URLS: {
    1: 'https://mainnet.infura.io/v3/',
    137: 'https://polygon-rpc.com/',
    56: 'https://bsc-dataseed.binance.org/',
  },
} as const;

// Stream Configuration
export const STREAM_CONFIG = {
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  QUALITY_OPTIONS: ['720p', '1080p', '1440p', '4k'],
  DEFAULT_QUALITY: '1080p',
} as const;

// Marketplace Configuration
export const MARKETPLACE_CONFIG = {
  MAX_PRODUCT_TITLE_LENGTH: 100,
  MAX_PRODUCT_DESCRIPTION_LENGTH: 2000,
  MAX_PRODUCT_IMAGES: 10,
  CURRENCY_SYMBOLS: {
    USD: '$',
    EUR: '€',
    ETH: 'Ξ',
    BTC: '₿',
  },
} as const;

// DAO Configuration
export const DAO_CONFIG = {
  MAX_PROPOSAL_TITLE_LENGTH: 100,
  MAX_PROPOSAL_DESCRIPTION_LENGTH: 5000,
  VOTING_PERIODS: {
    SHORT: 3 * 24 * 60 * 60, // 3 days in seconds
    MEDIUM: 7 * 24 * 60 * 60, // 7 days in seconds
    LONG: 14 * 24 * 60 * 60, // 14 days in seconds
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UPLOAD_ERROR: 'Failed to upload file. Please try again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Login successful!',
  REGISTER: 'Registration successful! Welcome to Vetora!',
  LOGOUT: 'Logged out successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  POST_CREATED: 'Post created successfully',
  POST_UPDATED: 'Post updated successfully',
  POST_DELETED: 'Post deleted successfully',
  COMMENT_ADDED: 'Comment added successfully',
  FOLLOW: 'User followed successfully',
  UNFOLLOW: 'User unfollowed successfully',
  UPLOAD_SUCCESS: 'File uploaded successfully',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
  },
  SOCIAL: {
    FEED: '/social-new',
    PROFILE: '/social-new/profile',
    USER_PROFILE: (username: string) => `/social-new/profile/${username}`,
    POST: (id: string) => `/social-new/post/${id}`,
  },
  MARKETPLACE: {
    HOME: '/marketplace',
    PRODUCT: (id: string) => `/marketplace/product/${id}`,
    CATEGORY: (category: string) => `/marketplace/category/${category}`,
    ORDERS: '/marketplace/orders',
  },
  STREAMS: {
    HOME: '/streams',
    STREAM: (id: string) => `/streams/${id}`,
    CREATE: '/streams/create',
    MANAGE: '/streams/manage',
  },
  DAO: {
    HOME: '/dao',
    PROPOSAL: (id: string) => `/dao/proposal/${id}`,
    CREATE_PROPOSAL: '/dao/create-proposal',
  },
  NFTS: {
    HOME: '/nfts',
    COLLECTION: (id: string) => `/nfts/collection/${id}`,
    TOKEN: (id: string) => `/nfts/token/${id}`,
  },
  MESSAGES: {
    HOME: '/messages',
    CONVERSATION: (id: string) => `/messages/${id}`,
  },
  SETTINGS: {
    HOME: '/settings',
    PROFILE: '/settings/profile',
    PRIVACY: '/settings/privacy',
    NOTIFICATIONS: '/settings/notifications',
    SECURITY: '/settings/security',
  },
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'vetora-auth-token',
  REFRESH_TOKEN: 'vetora-refresh-token',
  USER_PREFERENCES: 'vetora-user-preferences',
  DRAFT_POST: 'vetora-draft-post',
  THEME_SETTINGS: 'vetora-theme-settings',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_WALLET_LOGIN: true,
  ENABLE_BIOMETRIC_AUTH: true,
  ENABLE_DARK_MODE: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: true,
  ENABLE_MARKETPLACE: true,
  ENABLE_STREAMS: true,
  ENABLE_DAO: true,
  ENABLE_NFTS: true,
} as const;

// Social Media Platforms
export const SOCIAL_PLATFORMS = {
  TWITTER: 'twitter',
  DISCORD: 'discord',
  TELEGRAM: 'telegram',
  INSTAGRAM: 'instagram',
  LINKEDIN: 'linkedin',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  MENTION: 'mention',
  SYSTEM: 'system',
  MESSAGE: 'message',
  STREAM: 'stream',
  DAO: 'dao',
  MARKETPLACE: 'marketplace',
} as const;