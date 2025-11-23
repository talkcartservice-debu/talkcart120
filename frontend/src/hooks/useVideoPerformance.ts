import { useState, useEffect } from 'react';

interface VideoPerformanceMetrics {
  loadTime: number;
  bufferHealth: number;
  playbackQuality: string;
  droppedFrames: number;
}

interface UseVideoPerformanceReturn {
  metrics: VideoPerformanceMetrics;
  isLoading: boolean;
  error: string | null;
}

const useVideoPerformance = (videoElement?: HTMLVideoElement): UseVideoPerformanceReturn => {
  const [metrics, setMetrics] = useState<VideoPerformanceMetrics>({
    loadTime: 0,
    bufferHealth: 0,
    playbackQuality: 'auto',
    droppedFrames: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoElement) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      // Mock performance metrics
      setMetrics({
        loadTime: Math.random() * 2000 + 500, // 500-2500ms
        bufferHealth: Math.random() * 100,
        playbackQuality: 'HD',
        droppedFrames: Math.floor(Math.random() * 10),
      });
    };

    const handleError = () => {
      setIsLoading(false);
      setError('Failed to load video');
    };

    videoElement.addEventListener('loadstart', handleLoadStart);
    videoElement.addEventListener('canplay', handleCanPlay);
    videoElement.addEventListener('error', handleError);

    return () => {
      videoElement.removeEventListener('loadstart', handleLoadStart);
      videoElement.removeEventListener('canplay', handleCanPlay);
      videoElement.removeEventListener('error', handleError);
    };
  }, [videoElement]);

  return {
    metrics,
    isLoading,
    error,
  };
};

export default useVideoPerformance;