/**
 * Video Intersection Optimizer
 * Handles video element intersection detection and optimization for smooth scrolling
 */

export interface VideoIntersectionData {
  videoId: string;
  element: HTMLVideoElement;
  container: HTMLElement;
  intersectionRatio: number;
  isVisible: boolean;
  distanceFromCenter: number;
  performanceScore: number;
  lastUpdate: number;
  viewportPosition?: 'above' | 'center' | 'below';
}

interface IntersectionCallback {
  (videoId: string): void;
}

interface PerformanceMetrics {
  totalVideos: number;
  visibleVideos: number;
  intersectionChecks: number;
  lastCheckTime: number;
  averageCheckTime: number;
}

class VideoIntersectionOptimizer {
  private videos = new Map<string, VideoIntersectionData>();
  private intersectionObserver: IntersectionObserver | null = null;
  private optimalVideoChangeCallback: IntersectionCallback | null = null;
  private performanceMetrics: PerformanceMetrics = {
    totalVideos: 0,
    visibleVideos: 0,
    intersectionChecks: 0,
    lastCheckTime: 0,
    averageCheckTime: 0,
  };
  private rafId: number | null = null;
  private lastUpdateTimestamp = 0; // Add timestamp tracking

  constructor() {
    this.initializeIntersectionObserver();
  }

  private initializeIntersectionObserver() {
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        // Throttle updates to improve performance
        const now = Date.now();
        if (now - this.lastUpdateTimestamp < 16) { // ~60fps limit
          return;
        }
        this.lastUpdateTimestamp = now;
        
        this.handleIntersectionChange(entries);
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0, 0.25, 0.5, 0.75, 1.0], // Optimized thresholds
      }
    );
  }

  private handleIntersectionChange(entries: IntersectionObserverEntry[]) {
    const startTime = performance.now();

    entries.forEach((entry) => {
      const videoId = entry.target.getAttribute('data-video-id');
      if (!videoId) return;

      const videoData = this.videos.get(videoId);
      if (!videoData) return;

      // Update intersection data
      videoData.intersectionRatio = entry.intersectionRatio;
      videoData.isVisible = entry.isIntersecting;
      videoData.lastUpdate = Date.now();

      // Calculate distance from center
      if (entry.isIntersecting) {
        const rect = entry.boundingClientRect;
        const viewportCenter = window.innerHeight / 2;
        const elementCenter = rect.top + rect.height / 2;
        videoData.distanceFromCenter = Math.abs(elementCenter - viewportCenter);
        
        // Determine viewport position
        if (elementCenter < viewportCenter * 0.7) {
          videoData.viewportPosition = 'above';
        } else if (elementCenter > viewportCenter * 1.3) {
          videoData.viewportPosition = 'below';
        } else {
          videoData.viewportPosition = 'center';
        }
      }

      // Calculate performance score based on intersection and distance
      videoData.performanceScore = this.calculatePerformanceScore(videoData);

      // Update performance metrics
      this.performanceMetrics.intersectionChecks++;
      this.performanceMetrics.lastCheckTime = Date.now();
    });

    // Update average check time
    const endTime = performance.now();
    const checkTime = endTime - startTime;
    this.performanceMetrics.averageCheckTime = 
      (this.performanceMetrics.averageCheckTime * (this.performanceMetrics.intersectionChecks - 1) + checkTime) / 
      this.performanceMetrics.intersectionChecks;

    // Trigger optimal video change callback if needed
    this.triggerOptimalVideoChange();
  }

  private calculatePerformanceScore(videoData: VideoIntersectionData): number {
    let score = 0;

    // Intersection ratio contributes to score (weighted more heavily)
    score += videoData.intersectionRatio * 0.6;

    // Distance from center (closer is better)
    const maxDistance = window.innerHeight / 2;
    const distanceScore = Math.max(0, 1 - (videoData.distanceFromCenter / maxDistance));
    score += distanceScore * 0.3;

    // Recency bonus
    const timeSinceUpdate = Date.now() - videoData.lastUpdate;
    const recencyScore = Math.max(0, 1 - (timeSinceUpdate / 1000)); // 1 second max
    score += recencyScore * 0.1;

    return Math.min(1, Math.max(0, score));
  }

  private triggerOptimalVideoChange() {
    if (!this.optimalVideoChangeCallback) return;

    // Find the video with the best performance score
    let bestVideo: VideoIntersectionData | null = null;
    let bestScore = -1;

    for (const videoData of this.videos.values()) {
      if (videoData.isVisible && videoData.performanceScore > bestScore) {
        bestScore = videoData.performanceScore;
        bestVideo = videoData;
      }
    }

    // Only trigger change if score is significantly high
    if (bestVideo && bestScore > 0.6) {
      this.optimalVideoChangeCallback(bestVideo.videoId);
    }
  }

  public registerVideo(
    videoId: string, 
    element: HTMLVideoElement, 
    container: HTMLElement
  ): () => void {
    // Set data attribute for identification
    element.setAttribute('data-video-id', videoId);

    // Create video data
    const videoData: VideoIntersectionData = {
      videoId,
      element,
      container,
      intersectionRatio: 0,
      isVisible: false,
      distanceFromCenter: 0,
      performanceScore: 0,
      lastUpdate: Date.now(),
    };

    this.videos.set(videoId, videoData);
    this.performanceMetrics.totalVideos++;

    // Observe the element
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }

    // Return unregister function
    return () => {
      this.unregisterVideo(videoId);
    };
  }

  public unregisterVideo(videoId: string): void {
    const videoData = this.videos.get(videoId);
    if (!videoData) return;

    // Stop observing
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(videoData.element);
    }

    // Remove data attribute
    videoData.element.removeAttribute('data-video-id');

    // Remove from tracking
    this.videos.delete(videoId);
    this.performanceMetrics.totalVideos--;

    // Update visible count if needed
    if (videoData.isVisible) {
      this.performanceMetrics.visibleVideos--;
    }
  }

  public getCurrentVideoData(): VideoIntersectionData[] {
    return Array.from(this.videos.values());
  }

  public getVisibleVideos(): VideoIntersectionData[] {
    return Array.from(this.videos.values()).filter(video => video.isVisible);
  }

  public getBestVideoForDirection(direction: 'up' | 'down'): VideoIntersectionData | null {
    const visibleVideos = this.getVisibleVideos();
    if (visibleVideos.length === 0) return null;

    // Sort by performance score and distance from center
    const sortedVideos = visibleVideos.sort((a, b) => {
      // Primary sort by performance score
      if (Math.abs(a.performanceScore - b.performanceScore) > 0.1) {
        return b.performanceScore - a.performanceScore;
      }

      // Secondary sort by distance from center
      return a.distanceFromCenter - b.distanceFromCenter;
    });

    return sortedVideos.length > 0 ? sortedVideos[0] : null;
  }

  public setOptimalVideoChangeCallback(callback: IntersectionCallback): void {
    this.optimalVideoChangeCallback = callback;
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    // Update visible videos count
    this.performanceMetrics.visibleVideos = this.getVisibleVideos().length;
    
    return { ...this.performanceMetrics };
  }

  public destroy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.videos.clear();
    this.optimalVideoChangeCallback = null;
  }
}

// Singleton instance
let intersectionOptimizerInstance: VideoIntersectionOptimizer | null = null;

export function getVideoIntersectionOptimizer(): VideoIntersectionOptimizer {
  if (!intersectionOptimizerInstance) {
    intersectionOptimizerInstance = new VideoIntersectionOptimizer();
  }
  return intersectionOptimizerInstance;
}

export function createVideoIntersectionOptimizer(): VideoIntersectionOptimizer {
  return new VideoIntersectionOptimizer();
}

export function destroyVideoIntersectionOptimizer(): void {
  if (intersectionOptimizerInstance) {
    intersectionOptimizerInstance.destroy();
    intersectionOptimizerInstance = null;
  }
}
