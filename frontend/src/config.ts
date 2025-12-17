// API configuration
// Prefer same-origin proxy in browser to avoid CORS issues; use env on server
export const API_URL = typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || '/api');

// Socket URL (used by WebSocketContext and others)
// Ensure we're using the correct protocol and path for Socket.IO
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';

// WebRTC ICE servers (STUN/TURN) from env
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  ...(process.env.NEXT_PUBLIC_TURN_URL
    ? [{ urls: process.env.NEXT_PUBLIC_TURN_URL, username: process.env.NEXT_PUBLIC_TURN_USERNAME, credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL } as any]
    : []),
];

// Authentication configuration
export const AUTH_TOKEN_KEY = 'token';
export const AUTH_REFRESH_TOKEN_KEY = 'refreshToken';

// App configuration
export const APP_NAME = 'TalkCart';
export const APP_DESCRIPTION = 'Web3 super application combining social networking, marketplace, streaming, DAO governance, and messaging';

// UI assets and fallbacks
export const DEFAULT_AVATAR_URL = process.env.NEXT_PUBLIC_DEFAULT_AVATAR_URL || '/images/default-avatar.png';

// Feature flags
export const FEATURES = {
  SOCIAL: true,
  MARKETPLACE: true,
  STREAMING: true,
  DAO: true,
  MESSAGING: true,
  WALLET: true,
  NOTIFICATIONS: true,
  SEARCH: true,
};

// Streaming capability flags (configurable via env)
const STREAMING_ENABLED = (process.env.NEXT_PUBLIC_STREAMING_ENABLED || 'false') === 'true';
const IS_DEV = process.env.NODE_ENV !== 'production';
const envTrue = (v?: string) => (v || '').toLowerCase() === 'true';
export const STREAMING_CAPABILITIES = {
  // In development, default chat to enabled unless explicitly disabled via env
  chatEnabled: envTrue(
    process.env.NEXT_PUBLIC_STREAMING_CHAT_ENABLED ??
    (IS_DEV ? 'true' : (STREAMING_ENABLED ? 'true' : 'false'))
  ),
  // Default moderation/donations to enabled in development unless explicitly disabled
  moderationEnabled: envTrue(
    process.env.NEXT_PUBLIC_STREAMING_MODERATION_ENABLED ??
    (IS_DEV ? 'true' : (STREAMING_ENABLED ? 'true' : 'false'))
  ),
  donationsEnabled: envTrue(
    process.env.NEXT_PUBLIC_STREAMING_DONATIONS_ENABLED ??
    (IS_DEV ? 'true' : (STREAMING_ENABLED ? 'true' : 'false'))
  ),
};

// Default pagination
export const DEFAULT_PAGE_SIZE = 20;

// Search configuration
export const SEARCH_DEBOUNCE_MS = 300;
export const MIN_SEARCH_CHARS = 2;

// File upload limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];

// Social media sharing
export const SHARE_URL = process.env.NEXT_PUBLIC_SHARE_URL || 'https://talkcart.io';

const config = {
  API_URL,
  SOCKET_URL,
  AUTH_TOKEN_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  APP_NAME,
  APP_DESCRIPTION,
  FEATURES,
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  MIN_SEARCH_CHARS,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  SHARE_URL
};

export default config;