/**
 * Smooth Scroll Video Manager
 * Handles intelligent video switching during scroll with performance optimizations
 */

import { getVideoIntersectionOptimizer, VideoIntersectionData } from './videoIntersectionOptimizer';

interface ScrollVideoConfig {
  scrollThreshold: number; // Minimum scroll distance to trigger evaluation
  velocityThreshold: number; // Scroll velocity threshold for immediate switching
  debounceMs: number; // Debounce time for scroll events
  preloadDistance: number; // Distance ahead to preload videos
  smoothTransition: boolean; // Enable smooth video transitions
  adaptiveQuality: boolean; // Enable adaptive quality based on scroll speed
}

interface VideoPlaybackState {
  videoId: string;
  element: HTMLVideoElement;
  isPlaying: boolean;
  isPreloaded: boolean;
  playPromise: Promise<void> | null;
  lastPlayTime: number;
  transitionState: 'idle' | 'switching' | 'loading';
}

class SmoothScrollVideoManager {
  private config: ScrollVideoConfig;
  private intersectionOptimizer = getVideoIntersectionOptimizer();
  private playbackStates = new Map<string, VideoPlaybackState>();
  private currentPlayingVideo: string | null = null;
  private lastScrollY = 0;
  private scrollVelocity = 0;
  private lastScrollTime = 0;
  private isScrolling = false;
  private scrollTimeout: NodeJS.Timeout | null = null;
  private rafId: number | null = null;
  private scrollDirection: 'up' | 'down' | null = null; // Add scroll direction tracking

  // Callbacks
  private onVideoPlay: ((videoId: string) => void) | null = null;
  private onVideoPause: ((videoId: string) => void) | null = null;
  private onVideoSwitch: ((fromId: string | null, toId: string) => void) | null = null;
  private onScrollStateChange: ((isScrolling: boolean, velocity: number) => void) | null = null;

  constructor(config: Partial<ScrollVideoConfig> = {}) {
    this.config = {
      scrollThreshold: 30, // Reduced for more responsive detection
      velocityThreshold: 1.5, // Adjusted for better sensitivity
      debounceMs: 10, // Reduced for faster response
      preloadDistance: 300, // Increased for better preload
      smoothTransition: true,
      adaptiveQuality: true,
      ...config,
    };

    this.initializeScrollListener();
    this.setupIntersectionCallbacks();
  }

  private initializeScrollListener() {
    if (typeof window === 'undefined') return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        this.rafId = requestAnimationFrame(() => {
          this.processScrollEvent();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  private processScrollEvent() {
    const currentScrollY = window.scrollY;
    const currentTime = performance.now();
    const timeDelta = currentTime - this.lastScrollTime;

    // Calculate scroll direction
    this.scrollDirection = currentScrollY > this.lastScrollY ? 'down' : 'up';

    if (timeDelta > 0) {
      const distance = Math.abs(currentScrollY - this.lastScrollY);
      this.scrollVelocity = distance / timeDelta;

      // Process if scroll distance is significant or velocity is high
      if (distance >= this.config.scrollThreshold || this.scrollVelocity > this.config.velocityThreshold) {
        this.handleScrollChange(this.scrollDirection);
      }
    }

    this.lastScrollY = currentScrollY;
    this.lastScrollTime = currentTime;
    this.isScrolling = true;

    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Set scroll end timeout with adaptive delay
    const adaptiveDelay = Math.min(
      this.config.debounceMs * 3,
      Math.max(this.config.debounceMs, this.config.debounceMs - (this.scrollVelocity * 5))
    );

    this.scrollTimeout = setTimeout(() => {
      this.handleScrollEnd();
    }, adaptiveDelay);

    // Notify scroll state change
    this.onScrollStateChange?.(true, this.scrollVelocity);
  }

  private handleScrollChange(direction: 'up' | 'down') {
    // Get current video data
    const videoData = this.intersectionOptimizer.getCurrentVideoData();
    const visibleVideos = videoData.filter(v => v.isVisible);

    if (visibleVideos.length === 0) {
      this.pauseCurrentVideo();
      return;
    }

    // Find the best video based on scroll direction and position
    const bestVideo = this.findBestVideoForScroll(visibleVideos, direction);
    
    if (bestVideo && bestVideo.videoId !== this.currentPlayingVideo) {
      this.switchToVideo(bestVideo);
    }

    // Preload nearby videos
    this.preloadNearbyVideos(videoData, direction);
  }

  private findBestVideoForScroll(videos: VideoIntersectionData[], direction: 'up' | 'down'): VideoIntersectionData | null {
    if (videos.length === 0) return null;

    // High velocity scroll - prefer videos in scroll direction
    if (this.scrollVelocity > this.config.velocityThreshold) {
      const directionVideos = videos.filter(v => {
        if (!v.viewportPosition) return false; // Skip videos without viewport position
        if (direction === 'down') {
          return v.viewportPosition === 'center' || v.viewportPosition === 'below';
        } else {
          return v.viewportPosition === 'center' || v.viewportPosition === 'above';
        }
      });

      if (directionVideos.length > 0) {
        return directionVideos[0] || null; // Already sorted by priority
      }
    }

    // Normal scroll - prefer center videos with highest intersection ratio
    const centerVideos = videos.filter(v => v.viewportPosition === 'center');
    if (centerVideos.length > 0) {
      // Sort by intersection ratio for better selection
      return centerVideos.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0] || null;
    }

    // Fallback to highest priority video (already sorted by intersection optimizer)
    return videos[0] || null;
  }

  private switchToVideoTimeout: NodeJS.Timeout | null = null;
  private lastSwitchVideoId: string | null = null;

  private async switchToVideo(videoData: VideoIntersectionData) {
    const { videoId, element } = videoData;
    
    // Debounce rapid video switches to prevent AbortError
    // Clear any existing switch timeout
    if (this.switchToVideoTimeout) {
      clearTimeout(this.switchToVideoTimeout);
    }
    
    // If this is the same video as the last switch request, and it's very recent, debounce
    if (this.lastSwitchVideoId === videoId) {
      // Create a new timeout to delay this switch
      this.switchToVideoTimeout = setTimeout(async () => {
        await this.performSwitchToVideo(videoData);
        this.switchToVideoTimeout = null;
      }, 50); // 50ms debounce delay
      
      return;
    }
    
    // Update last switch video ID
    this.lastSwitchVideoId = videoId;
    
    // Perform immediate switch for different videos
    await this.performSwitchToVideo(videoData);
  }

  private async performSwitchToVideo(videoData: VideoIntersectionData) {
    const { videoId, element } = videoData;
    
    // Update transition state
    this.updatePlaybackState(videoId, { transitionState: 'switching' });

    try {
      // Pause current video smoothly
      if (this.currentPlayingVideo) {
        await this.pauseVideoSmoothly(this.currentPlayingVideo);
      }

      // Play new video
      await this.playVideoSmoothly(videoId, element);
      
      // Update current playing video
      const previousVideo = this.currentPlayingVideo;
      this.currentPlayingVideo = videoId;

      // Notify callbacks
      this.onVideoSwitch?.(previousVideo, videoId);
      this.onVideoPlay?.(videoId);

    } catch (error) {
      // Handle AbortError specifically - this is often expected during rapid switching
      if ((error as Error).name === 'AbortError') {
        console.warn(`Video switch to ${videoId} aborted, likely due to rapid switching`);
        // Don't treat this as a critical error
      } else {
        console.warn(`Failed to switch to video ${videoId}:`, error);
        this.updatePlaybackState(videoId, { transitionState: 'idle' });
      }
    }
  }

  private async playVideoSmoothly(videoId: string, element: HTMLVideoElement): Promise<void> {
    const state = this.playbackStates.get(videoId);
    
    // Cancel any existing play promise
    if (state?.playPromise) {
      try {
        await state.playPromise;
      } catch (error) {
        // Ignore cancellation errors
      }
    }

    // Set up video for playback
    element.muted = false; // Ensure autoplay works
    
    // Apply adaptive quality if enabled
    if (this.config.adaptiveQuality) {
      this.applyAdaptiveQuality(element);
    }

    // Guard: ensure element has a valid source before playing
    const hasSrc = Boolean(element.currentSrc || element.src);
    if (!hasSrc) {
      // Try to find a <source> child that the browser can play
      const sources = Array.from(element.getElementsByTagName('source'));
      const playable = sources.find((s) => !s.type || element.canPlayType(s.type) !== '');
      if (playable) {
        element.src = playable.src;
      }
    }

    // If still no source or browser reports it cannot play type, abort early
    if (!(element.currentSrc || element.src)) {
      throw new Error('No supported video source');
    }

    // Preload if needed for better performance
    if (element.readyState < 2) {
      element.load();
      
      // Wait for metadata to load with improved error handling
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          element.removeEventListener('loadedmetadata', onLoaded);
          element.removeEventListener('error', onError);
          // Instead of rejecting, resolve to continue with playback attempt
          resolve(null);
        }, 5000); // Increased timeout to 5 seconds
        
        const onLoaded = () => {
          clearTimeout(timeout);
          element.removeEventListener('error', onError);
          resolve(null);
        };
        
        const onError = () => {
          clearTimeout(timeout);
          element.removeEventListener('loadedmetadata', onLoaded);
          // Instead of rejecting, resolve to continue with playback attempt
          resolve(null);
        };
        
        element.addEventListener('loadedmetadata', onLoaded);
        element.addEventListener('error', onError);
      });
    }

    // Debounce rapid play requests to prevent AbortError
    // Check if there's a recent play request for this video
    const lastPlayTime = state?.lastPlayTime || 0;
    const timeSinceLastPlay = Date.now() - lastPlayTime;
    
    // If less than 100ms since last play request, debounce
    if (timeSinceLastPlay < 100) {
      // Wait a bit to see if another request comes in
      await new Promise(resolve => setTimeout(resolve, 100 - timeSinceLastPlay));
      
      // Check if there's a newer play request
      const currentState = this.playbackStates.get(videoId);
      if (currentState && currentState.lastPlayTime > lastPlayTime) {
        // A newer request has come in, abort this one
        console.warn(`Video play for ${videoId} debounced due to rapid switching`);
        return;
      }
    }

    // Create play promise with better error handling
    const playPromise = element.play();
    
    this.updatePlaybackState(videoId, {
      element,
      isPlaying: true,
      playPromise,
      lastPlayTime: Date.now(),
      transitionState: 'loading',
    });

    try {
      await playPromise;
      this.updatePlaybackState(videoId, { 
        transitionState: 'idle',
        playPromise: null 
      });
    } catch (error) {
      this.updatePlaybackState(videoId, { 
        isPlaying: false,
        transitionState: 'idle',
        playPromise: null 
      });
      
      // Re-throw error unless it's an AbortError (which is often expected)
      if ((error as Error).name !== 'AbortError') {
        throw error;
      }
      // For AbortError, we just log it but don't treat it as a critical failure
      console.warn(`Video play for ${videoId} was aborted, likely due to rapid switching`);
    }
  }

  private async pauseVideoSmoothly(videoId: string): Promise<void> {
    const state = this.playbackStates.get(videoId);
    if (!state || !state.element) return;

    // Cancel any pending play promise
    if (state.playPromise) {
      try {
        await state.playPromise;
      } catch (error) {
        // Ignore cancellation errors
      }
    }

    // Smooth transition if enabled
    if (this.config.smoothTransition && !state.element.paused) {
      // Fade out audio if not muted
      if (!state.element.muted && state.element.volume > 0) {
        const originalVolume = state.element.volume;
        const fadeSteps = 10;
        const fadeInterval = 50;

        for (let i = fadeSteps; i > 0; i--) {
          state.element.volume = (originalVolume * i) / fadeSteps;
          await new Promise(resolve => setTimeout(resolve, fadeInterval));
        }
      }
    }

    state.element.pause();
    this.updatePlaybackState(videoId, { 
      isPlaying: false,
      playPromise: null,
      transitionState: 'idle'
    });

    this.onVideoPause?.(videoId);
  }

  private pauseCurrentVideo() {
    if (this.currentPlayingVideo) {
      this.pauseVideoSmoothly(this.currentPlayingVideo);
      this.currentPlayingVideo = null;
    }
  }

  private preloadNearbyVideos(videoData: VideoIntersectionData[], direction: 'up' | 'down') {
    const currentIndex = videoData.findIndex(v => v.videoId === this.currentPlayingVideo);
    // Use a fixed preload count (will be managed by VideoFeedProvider)
    const preloadCount = 2;

    // Determine which videos to preload based on scroll direction
    let videosToPreload: VideoIntersectionData[] = [];
    
    if (direction === 'down') {
      videosToPreload = videoData.slice(currentIndex + 1, currentIndex + 1 + preloadCount);
    } else {
      const startIndex = Math.max(0, currentIndex - preloadCount);
      videosToPreload = videoData.slice(startIndex, currentIndex);
    }

    videosToPreload.forEach(video => {
      this.preloadVideo(video.videoId, video.element);
    });
  }

  private preloadVideo(videoId: string, element: HTMLVideoElement) {
    const state = this.playbackStates.get(videoId);
    if (state?.isPreloaded) return;

    // Set preload strategy
    element.preload = 'metadata';
    
    // Load metadata
    if (element.readyState < 1) {
      element.load();
    }

    this.updatePlaybackState(videoId, { 
      element,
      isPreloaded: true 
    });
  }

  private applyAdaptiveQuality(element: HTMLVideoElement) {
    // Reduce quality during fast scrolling to improve performance
    if (this.scrollVelocity > this.config.velocityThreshold * 2) {
      // Request lower quality if available
      if ('requestVideoFrameCallback' in element) {
        // Modern browsers - can implement frame-based quality adjustment
      }
    }
  }

  private handleScrollEnd() {
    this.isScrolling = false;
    this.scrollVelocity = 0;
    
    // Notify scroll state change
    this.onScrollStateChange?.(false, 0);

    // Re-evaluate video playback after scroll ends
    const videoData = this.intersectionOptimizer.getCurrentVideoData();
    const visibleVideos = videoData.filter(v => v.isVisible);

    if (visibleVideos.length > 0) {
      const bestVideo = visibleVideos[0]; // Highest priority
      if (bestVideo && bestVideo.videoId !== this.currentPlayingVideo) {
        this.switchToVideo(bestVideo);
      }
    }
  }

  private setupIntersectionCallbacks() {
    this.intersectionOptimizer.setOptimalVideoChangeCallback((videoId) => {
      // Only switch if not currently scrolling fast
      if (!this.isScrolling || this.scrollVelocity < this.config.velocityThreshold) {
        if (videoId && videoId !== this.currentPlayingVideo) {
          const videoData = this.intersectionOptimizer.getCurrentVideoData();
          const targetVideo = videoData.find(v => v.videoId === videoId);
          if (targetVideo) {
            // Add a small delay to debounce rapid switches from intersection changes
            setTimeout(() => {
              // Check if video is still the best choice
              const currentVideoData = this.intersectionOptimizer.getCurrentVideoData();
              const currentVisibleVideos = currentVideoData.filter(v => v.isVisible);
              if (currentVisibleVideos.length > 0) {
                const bestVideo = currentVisibleVideos[0]; // Already sorted by priority
                if (bestVideo && bestVideo.videoId === videoId) {
                  this.switchToVideo(targetVideo);
                }
              }
            }, 100); // 100ms delay to debounce
          }
        }
      }
    });
  }

  private updatePlaybackState(videoId: string, updates: Partial<VideoPlaybackState>) {
    const current = this.playbackStates.get(videoId) || {
      videoId,
      element: updates.element!,
      isPlaying: false,
      isPreloaded: false,
      playPromise: null,
      lastPlayTime: 0,
      transitionState: 'idle' as const,
    };

    this.playbackStates.set(videoId, { ...current, ...updates });
  }

  /**
   * Register a video with the manager
   */
  registerVideo(videoId: string, element: HTMLVideoElement, container: HTMLElement) {
    // Register with intersection optimizer
    const unregisterIntersection = this.intersectionOptimizer.registerVideo(videoId, element, container);

    // Initialize playback state
    this.updatePlaybackState(videoId, {
      videoId,
      element,
      isPlaying: false,
      isPreloaded: false,
      playPromise: null,
      lastPlayTime: 0,
      transitionState: 'idle',
    });

    // Return cleanup function
    return () => {
      unregisterIntersection();
      this.playbackStates.delete(videoId);
      
      if (this.currentPlayingVideo === videoId) {
        this.currentPlayingVideo = null;
      }
    };
  }

  /**
   * Manually play a specific video
   */
  async playVideo(videoId: string): Promise<void> {
    const state = this.playbackStates.get(videoId);
    if (!state) return;

    const videoData = this.intersectionOptimizer.getCurrentVideoData();
    const targetVideo = videoData.find(v => v.videoId === videoId);
    
    if (targetVideo) {
      await this.switchToVideo(targetVideo);
    }
  }

  /**
   * Manually pause a specific video
   */
  async pauseVideo(videoId: string): Promise<void> {
    await this.pauseVideoSmoothly(videoId);
    
    if (this.currentPlayingVideo === videoId) {
      this.currentPlayingVideo = null;
    }
  }

  /**
   * Pause all videos
   */
  async pauseAllVideos(): Promise<void> {
    const pausePromises = Array.from(this.playbackStates.keys()).map(videoId => 
      this.pauseVideoSmoothly(videoId)
    );
    
    await Promise.all(pausePromises);
    this.currentPlayingVideo = null;
  }

  /**
   * Set callback for video play events
   */
  onVideoPlayCallback(callback: (videoId: string) => void) {
    this.onVideoPlay = callback;
  }

  /**
   * Set callback for video pause events
   */
  onVideoPauseCallback(callback: (videoId: string) => void) {
    this.onVideoPause = callback;
  }

  /**
   * Set callback for video switch events
   */
  onVideoSwitchCallback(callback: (fromId: string | null, toId: string) => void) {
    this.onVideoSwitch = callback;
  }

  /**
   * Set callback for scroll state changes
   */
  onScrollStateChangeCallback(callback: (isScrolling: boolean, velocity: number) => void) {
    this.onScrollStateChange = callback;
  }

  /**
   * Get current playback state
   */
  getCurrentPlayingVideo(): string | null {
    return this.currentPlayingVideo;
  }

  /**
   * Get all playback states
   */
  getPlaybackStates(): Map<string, VideoPlaybackState> {
    return new Map(this.playbackStates);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      registeredVideos: this.playbackStates.size,
      currentPlayingVideo: this.currentPlayingVideo,
      isScrolling: this.isScrolling,
      scrollVelocity: this.scrollVelocity,
      config: this.config,
      intersectionMetrics: this.intersectionOptimizer.getPerformanceMetrics(),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ScrollVideoConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear timeouts and animation frames
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    // Clear switch video timeout
    if (this.switchToVideoTimeout) {
      clearTimeout(this.switchToVideoTimeout);
    }

    // Pause all videos
    this.pauseAllVideos();

    // Clear states
    this.playbackStates.clear();
    this.currentPlayingVideo = null;

    // Clear callbacks
    this.onVideoPlay = null;
    this.onVideoPause = null;
    this.onVideoSwitch = null;
    this.onScrollStateChange = null;
  }
}

// Singleton instance
let globalScrollVideoManager: SmoothScrollVideoManager | null = null;

/**
 * Get or create the global smooth scroll video manager
 */
export const getSmoothScrollVideoManager = (config?: Partial<ScrollVideoConfig>): SmoothScrollVideoManager => {
  if (!globalScrollVideoManager) {
    globalScrollVideoManager = new SmoothScrollVideoManager(config);
  } else if (config) {
    globalScrollVideoManager.updateConfig(config);
  }
  return globalScrollVideoManager;
};

/**
 * Create a new smooth scroll video manager instance
 */
export const createSmoothScrollVideoManager = (config?: Partial<ScrollVideoConfig>): SmoothScrollVideoManager => {
  return new SmoothScrollVideoManager(config);
};

export type { ScrollVideoConfig, VideoPlaybackState };
export { SmoothScrollVideoManager };