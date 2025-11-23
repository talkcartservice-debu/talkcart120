# VideoFeedManager Documentation

## Overview
VideoFeedManager is a React context provider and hook system that manages video playback behavior in a social media feed, similar to TikTok's vertical video feed experience.

## Architecture

### Core Components
1. **VideoFeedProvider** - Context provider that manages all video instances
2. **useVideoFeed** - Hook for consuming video feed context
3. **VideoAutoscrollManager** - Handles scroll-based video playback
4. **VideoIntersectionObserver** - Manages video visibility detection

### Key Features
- **Autoplay on scroll** - Videos play when they come into view
- **Pause on scroll** - Videos pause when scrolling quickly
- **Single video playback** - Only one video plays at a time
- **Mute/unmute controls** - Global and individual volume control
- **Performance optimization** - Efficient resource management

## API

### VideoFeedProvider

#### Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Child components |
| `initialSettings` | `VideoAutoscrollSettings` | No | Initial configuration |

#### VideoAutoscrollSettings Interface
```typescript
interface VideoAutoscrollSettings {
  enabled: boolean;
  threshold: number;
  pauseOnScroll: boolean;
  muteByDefault: boolean;
  preloadStrategy: 'none' | 'metadata' | 'auto';
  maxConcurrentVideos: number;
  scrollPauseDelay: number;
  viewTrackingThreshold: number;
  autoplayOnlyOnWifi: boolean;
  respectReducedMotion: boolean;
}
```

### useVideoFeed Hook

#### Return Value
```typescript
interface VideoFeedContextValue {
  registerVideo: (id: string, element: HTMLVideoElement, container: HTMLElement) => void;
  unregisterVideo: (id: string) => void;
  playVideo: (id: string) => void;
  pauseVideo: (id: string) => void;
  pauseAllVideos: () => void;
  currentPlayingVideo: string | null;
  isScrolling: boolean;
  settings: VideoAutoscrollSettings;
  updateSettings: (newSettings: Partial<VideoAutoscrollSettings>) => void;
  getVideoStats: () => VideoStats;
}
```

#### VideoStats Interface
```typescript
interface VideoStats {
  totalVideos: number;
  playingVideos: number;
  pausedVideos: number;
  viewedVideos: number;
  loadingVideos: number;
}
```

## Usage

### Basic Implementation
```tsx
import { VideoFeedProvider, useVideoFeed } from '@/components/video/VideoFeedManager';

// Wrap your feed component with the provider
const App = () => (
  <VideoFeedProvider
    initialSettings={{
      enabled: true,
      threshold: 0.6,
      pauseOnScroll: true,
      muteByDefault: true,
    }}
  >
    <SocialFeed />
  </VideoFeedProvider>
);

// Use the hook in your video components
const VideoPost = ({ videoUrl, postId }: { videoUrl: string; postId: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    registerVideo,
    unregisterVideo,
    currentPlayingVideo,
    isScrolling,
    settings
  } = useVideoFeed();

  useEffect(() => {
    if (videoRef.current && containerRef.current) {
      registerVideo(postId, videoRef.current, containerRef.current);
    }

    return () => {
      unregisterVideo(postId);
    };
  }, [postId, registerVideo, unregisterVideo]);

  return (
    <div ref={containerRef}>
      <video
        ref={videoRef}
        src={videoUrl}
        muted={settings.muteByDefault}
        loop
        playsInline
      />
    </div>
  );
};
```

## Configuration Options

### enabled
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable/disable video autoplay functionality

### threshold
- **Type**: `number` (0-1)
- **Default**: `0.6`
- **Description**: Percentage of video that must be visible to trigger autoplay

### pauseOnScroll
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Pause videos when user is scrolling quickly

### muteByDefault
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Start videos muted by default

### preloadStrategy
- **Type**: `'none' | 'metadata' | 'auto'`
- **Default**: `'metadata'`
- **Description**: Video preload behavior

### maxConcurrentVideos
- **Type**: `number`
- **Default**: `2`
- **Description**: Maximum number of videos to process simultaneously

### scrollPauseDelay
- **Type**: `number` (ms)
- **Default**: `150`
- **Description**: Delay before pausing videos during scroll

### viewTrackingThreshold
- **Type**: `number` (seconds)
- **Default**: `3`
- **Description**: Minimum view time to count as viewed

### autoplayOnlyOnWifi
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Restrict autoplay to WiFi connections only

### respectReducedMotion
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Respect user's reduced motion preference

## Performance Features

### Memory Management
- Automatic cleanup of video elements
- Efficient event listener management
- Resource pooling for better performance

### Scroll Optimization
- Throttled scroll event handling
- Velocity-based pause detection
- Intersection Observer for visibility tracking

### Battery Conservation
- Pause videos when tab is not visible
- Reduced frame rate on battery power
- Smart preload management

## Accessibility

### Keyboard Navigation
- Spacebar to play/pause
- Arrow keys to navigate between videos
- Tab to focus controls

### Screen Reader Support
- ARIA labels for all interactive elements
- Status announcements for video changes
- Focus management

### Reduced Motion
- Respects `prefers-reduced-motion` media query
- Smooth animations with option to disable
- Subtle visual feedback

## Mobile Optimization

### Touch Gestures
- Tap to play/pause
- Swipe to navigate
- Pinch to zoom (when applicable)

### Network Awareness
- WiFi vs cellular detection
- Adaptive quality streaming
- Data-saving modes

### Battery Management
- Reduced background processing
- Lower frame rates when needed
- Smart caching strategies

## Error Handling

### Network Errors
- Graceful fallback for failed video loads
- Retry mechanisms with exponential backoff
- User-friendly error messages

### Playback Errors
- Format compatibility detection
- Fallback to alternative sources
- Error recovery strategies

### Resource Limits
- Memory leak prevention
- Connection limit management
- Cleanup of unused resources

## Testing

### Unit Tests
- Test context provider initialization
- Test hook functionality
- Test settings updates
- Test error scenarios

### Integration Tests
- Test with real video elements
- Test scroll behavior
- Test autoplay logic
- Test performance under load

## Future Enhancements

### Planned Features
- **Adaptive Streaming**: Dynamic quality adjustment
- **Offline Support**: Cached video playback
- **Analytics Integration**: Detailed viewing metrics
- **Social Features**: Reactions and comments overlay
- **Multi-window Support**: Picture-in-picture mode

### Performance Improvements
- **Web Workers**: Offload heavy computations
- **WebAssembly**: Accelerate video processing
- **Preloading Strategies**: Intelligent prefetching
- **Compression**: Reduce bandwidth usage

## Troubleshooting

### Common Issues

#### Videos Not Autoplaying
1. Check if `enabled` setting is true
2. Verify video elements have `muted` attribute
3. Ensure `playsInline` attribute is set
4. Check browser autoplay policies

#### Poor Performance
1. Reduce `maxConcurrentVideos`
2. Increase `scrollPauseDelay`
3. Use `metadata` preload strategy
4. Check for memory leaks

#### Audio Issues
1. Verify `muteByDefault` setting
2. Check user interaction requirements
3. Test with different video formats
4. Verify volume controls work

### Debugging Tools
- Console logging for video events
- Performance monitoring
- Network request tracking
- Memory usage analysis