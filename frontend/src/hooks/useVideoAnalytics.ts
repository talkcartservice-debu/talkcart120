import { useState, useEffect, useRef } from 'react';

interface VideoAnalyticsEvent {
  type: 'play' | 'pause' | 'seek' | 'ended' | 'error' | 'quality_change' | 'buffer';
  timestamp: number;
  currentTime: number;
  duration: number;
  metadata?: any;
}

interface VideoMetrics {
  playCount: number;
  pauseCount: number;
  totalWatchTime: number;
  averageWatchTime: number;
  completionRate: number;
  bufferEvents: number;
  qualityChanges: number;
  retentionPoints: number[];
  engagementScore: number;
  loadTime: number;
  errors: number;
}

interface UseVideoAnalyticsProps {
  postId: string;
  videoElement?: HTMLVideoElement | null;
  autoTrack?: boolean;
  onEvent?: (event: VideoAnalyticsEvent) => void;
  onMetricsUpdate?: (metrics: VideoMetrics) => void;
}

export const useVideoAnalytics = ({
  postId,
  videoElement,
  autoTrack = true,
  onEvent,
  onMetricsUpdate,
}: UseVideoAnalyticsProps) => {
  const [metrics, setMetrics] = useState<VideoMetrics>({
    playCount: 0,
    pauseCount: 0,
    totalWatchTime: 0,
    averageWatchTime: 0,
    completionRate: 0,
    bufferEvents: 0,
    qualityChanges: 0,
    retentionPoints: [],
    engagementScore: 0,
    loadTime: 0,
    errors: 0,
  });

  const [events, setEvents] = useState<VideoAnalyticsEvent[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  
  const startTimeRef = useRef<number>(0);
  const lastPlayTimeRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(0);
  const retentionIntervalRef = useRef<NodeJS.Timeout>();
  const loadStartTimeRef = useRef<number>(0);

  // Track video events
  const trackEvent = (type: VideoAnalyticsEvent['type'], metadata?: any) => {
    const video = videoElement;
    if (!video) return;

    const event: VideoAnalyticsEvent = {
      type,
      timestamp: Date.now(),
      currentTime: video.currentTime,
      duration: video.duration || 0,
      metadata,
    };

    setEvents(prev => [...prev, event]);
    onEvent?.(event);

    // Update metrics based on event type
    setMetrics(prev => {
      const updated = { ...prev };

      switch (type) {
        case 'play':
          updated.playCount += 1;
          lastPlayTimeRef.current = video.currentTime;
          break;
        
        case 'pause':
          updated.pauseCount += 1;
          const watchTime = video.currentTime - lastPlayTimeRef.current;
          updated.totalWatchTime += watchTime;
          break;
        
        case 'ended':
          updated.completionRate = video.currentTime / video.duration;
          const finalWatchTime = video.currentTime - lastPlayTimeRef.current;
          updated.totalWatchTime += finalWatchTime;
          break;
        
        case 'buffer':
          updated.bufferEvents += 1;
          break;
        
        case 'quality_change':
          updated.qualityChanges += 1;
          break;
        
        case 'error':
          updated.errors += 1;
          break;
      }

      // Calculate derived metrics
      if (updated.playCount > 0) {
        updated.averageWatchTime = updated.totalWatchTime / updated.playCount;
        updated.engagementScore = calculateEngagementScore(updated);
      }

      return updated;
    });
  };

  // Calculate engagement score based on various factors
  const calculateEngagementScore = (metrics: VideoMetrics): number => {
    let score = 0;
    
    // Base score from completion rate (0-40 points)
    score += metrics.completionRate * 40;
    
    // Bonus for replays (0-20 points)
    if (metrics.playCount > 1) {
      score += Math.min(metrics.playCount - 1, 5) * 4;
    }
    
    // Penalty for too many pauses (-0 to -10 points)
    const pauseRatio = metrics.pauseCount / Math.max(metrics.playCount, 1);
    if (pauseRatio > 1) {
      score -= Math.min((pauseRatio - 1) * 10, 10);
    }
    
    // Penalty for buffer events (-0 to -10 points)
    score -= Math.min(metrics.bufferEvents * 2, 10);
    
    // Penalty for errors (-5 points each)
    score -= metrics.errors * 5;
    
    // Bonus for watch time relative to video length (0-20 points)
    if (metrics.averageWatchTime > 0) {
      const watchRatio = metrics.averageWatchTime / (videoElement?.duration || 1);
      score += Math.min(watchRatio * 20, 20);
    }
    
    return Math.max(0, Math.min(100, score));
  };

  // Track retention points
  const trackRetention = () => {
    const video = videoElement;
    if (!video || !video.duration) return;

    const progress = video.currentTime / video.duration;
    const retentionPoint = Math.floor(progress * 20); // 20 points for 5% increments
    
    setMetrics(prev => {
      const updated = { ...prev };
      if (!updated.retentionPoints[retentionPoint]) {
        updated.retentionPoints[retentionPoint] = 0;
      }
      updated.retentionPoints[retentionPoint] += 1;
      return updated;
    });
  };

  // Setup video event listeners
  useEffect(() => {
    const video = videoElement;
    if (!video || !autoTrack) return;

    const handleLoadStart = () => {
      loadStartTimeRef.current = performance.now();
    };

    const handleCanPlay = () => {
      const loadTime = performance.now() - loadStartTimeRef.current;
      setMetrics(prev => ({ ...prev, loadTime }));
    };

    const handlePlay = () => {
      trackEvent('play');
      sessionStartRef.current = Date.now();
      
      // Start retention tracking
      retentionIntervalRef.current = setInterval(trackRetention, 1000);
    };

    const handlePause = () => {
      trackEvent('pause');
      if (retentionIntervalRef.current) {
        clearInterval(retentionIntervalRef.current);
      }
    };

    const handleSeeked = () => {
      trackEvent('seek');
    };

    const handleEnded = () => {
      trackEvent('ended');
      if (retentionIntervalRef.current) {
        clearInterval(retentionIntervalRef.current);
      }
    };

    const handleError = () => {
      trackEvent('error', { error: video.error });
    };

    const handleWaiting = () => {
      trackEvent('buffer');
    };

    // Add event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);

    setIsTracking(true);

    return () => {
      // Cleanup event listeners
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);

      if (retentionIntervalRef.current) {
        clearInterval(retentionIntervalRef.current);
      }

      setIsTracking(false);
    };
  }, [videoElement, autoTrack, postId]);

  // Update metrics callback
  useEffect(() => {
    onMetricsUpdate?.(metrics);
  }, [metrics, onMetricsUpdate]);

  // Send analytics data to server periodically
  useEffect(() => {
    if (!isTracking || events.length === 0) return;

    const sendAnalytics = () => {
      // In a real implementation, send data to analytics API
      console.log('📊 Video Analytics Data:', {
        postId,
        metrics,
        eventCount: events.length,
        lastEvents: events.slice(-5),
      });
    };

    const interval = setInterval(sendAnalytics, 30000); // Send every 30 seconds
    
    return () => clearInterval(interval);
  }, [postId, metrics, events, isTracking]);

  const startTracking = () => {
    setIsTracking(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (retentionIntervalRef.current) {
      clearInterval(retentionIntervalRef.current);
    }
  };

  const resetMetrics = () => {
    setMetrics({
      playCount: 0,
      pauseCount: 0,
      totalWatchTime: 0,
      averageWatchTime: 0,
      completionRate: 0,
      bufferEvents: 0,
      qualityChanges: 0,
      retentionPoints: [],
      engagementScore: 0,
      loadTime: 0,
      errors: 0,
    });
    setEvents([]);
  };

  const getAnalyticsReport = () => {
    const video = videoElement;
    const sessionDuration = Date.now() - sessionStartRef.current;

    return {
      postId,
      metrics,
      events,
      session: {
        duration: sessionDuration,
        startTime: sessionStartRef.current,
        endTime: Date.now(),
      },
      video: {
        duration: video?.duration || 0,
        currentTime: video?.currentTime || 0,
        readyState: video?.readyState || 0,
        networkState: video?.networkState || 0,
      },
      performance: {
        loadTime: metrics.loadTime,
        bufferRatio: metrics.bufferEvents / Math.max(metrics.playCount, 1),
        qualityChangeRatio: metrics.qualityChanges / Math.max(metrics.playCount, 1),
        errorRate: metrics.errors / Math.max(metrics.playCount, 1),
      },
    };
  };

  return {
    metrics,
    events,
    isTracking,
    trackEvent,
    startTracking,
    stopTracking,
    resetMetrics,
    getAnalyticsReport,
  };
};