// Video Components
export { VideoFeedProvider, useVideoFeed } from './VideoFeedManager';
export { VideoSettings } from './VideoSettings';
export { VideoAnalytics } from './VideoAnalytics';
export { VideoControls } from './VideoControls';
export { default as VideoPerformanceMonitor } from './VideoPerformanceMonitor';
export { default as VideoAutoplayTest } from './VideoAutoplayTest'; // Add test component

// Hooks
export { useVideoAutoscroll } from '../../hooks/useVideoAutoscroll';

// Utils
export { 
  getVideoMaintenanceManager
} from '../../utils/videoMaintenance';
export { 
  getVideoQualityManager 
} from '../../utils/videoQualityManager';
export { 
  getSmoothScrollVideoManager,
  createSmoothScrollVideoManager 
} from '../../utils/smoothScrollVideoManager';
export { 
  getVideoIntersectionOptimizer,
  createVideoIntersectionOptimizer 
} from '../../utils/videoIntersectionOptimizer';

// Types
export type {
  VideoMediaItem,
  VideoPost,
  VideoContainerProps,
  UseVideoPostOptions,
  VideoPostState,
  VideoPostActions,
  VideoState,
} from './types';