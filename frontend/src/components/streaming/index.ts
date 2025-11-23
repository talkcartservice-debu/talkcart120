// Enhanced streaming components with improved styling and user experience
export { default as EnhancedStreamSidebar } from './containers/EnhancedStreamSidebar';
export { default as EnhancedStreamCard } from './EnhancedStreamCard';
export { default as EnhancedLiveChat } from './EnhancedLiveChat';
export { default as EnhancedStreamPlayerV2 } from './EnhancedStreamPlayerV2';

// Theme and styling utilities
export { 
  createStreamingTheme, 
  createStreamingStyles, 
  streamingAnimations 
} from './styles/streamingTheme';

// Legacy components (for backward compatibility)
export { default as StreamSidebar } from './containers/StreamSidebar';
export { default as StreamCard } from './StreamCard';
export { default as LiveChat } from './LiveChat';
export { default as EnhancedStreamPlayer } from './EnhancedStreamPlayer';
export { default as StreamManager } from './StreamManager';
// export { default as StreamAnalytics } from './StreamAnalytics';
export { default as ModerationPanel } from './ModerationPanel';
export { default as GiftPanel } from './GiftPanel';
export { default as SubscriptionPanel } from './SubscriptionPanel';
export { default as StreamScheduler } from './StreamScheduler';
export { default as HostList } from './HostList';
export { default as VideoTile } from './VideoTile';
export { default as WebRTCTiles } from './WebRTCTiles';

// UI components
export { default as LiveBadge } from './ui/LiveBadge';
export { default as StreamActions } from './ui/StreamActions';
export { default as StreamHeader } from './ui/StreamHeader';
export { default as StreamInfo } from './ui/StreamInfo';
export { default as StreamMetrics } from './ui/StreamMetrics';

// Container components
export { default as StreamPlayerContainer } from './containers/StreamPlayerContainer';
export { default as StreamMobileDrawer } from './containers/StreamMobileDrawer';