import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, LinearProgress, Chip } from '@mui/material';

interface VideoPerformanceData {
  videoId: string;
  playCount: number;
  pauseCount: number;
  errorCount: number;
  averageLoadTime: number;
  averagePlayTime: number;
  lastPlayed: number;
}

interface PerformanceMetrics {
  totalVideos: number;
  playingVideos: number;
  errors: number;
  averageLoadTime: number;
  fps: number;
}

const VideoPerformanceMonitor: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<Record<string, VideoPerformanceData>>({});
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalVideos: 0,
    playingVideos: 0,
    errors: 0,
    averageLoadTime: 0,
    fps: 60,
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Add performance data for a video
  const addPerformanceData = useCallback((videoId: string, data: Partial<VideoPerformanceData>) => {
    setPerformanceData(prev => {
      const existingData = prev[videoId] || {
        videoId: videoId,
        playCount: 0,
        pauseCount: 0,
        errorCount: 0,
        averageLoadTime: 0,
        averagePlayTime: 0,
        lastPlayed: 0,
      };
      
      return {
        ...prev,
        [videoId]: {
          ...existingData,
          ...data,
        },
      };
    });
  }, []);

  // Update metrics
  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => ({
      ...prev,
      ...newMetrics,
    }));
  }, []);

  // Calculate FPS
  useEffect(() => {
    if (!isMonitoring) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 60;

    const calculateFPS = () => {
      const now = performance.now();
      frameCount++;

      if (now - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (now - lastTime));
        frameCount = 0;
        lastTime = now;
        updateMetrics({ fps });
      }

      requestAnimationFrame(calculateFPS);
    };

    const rafId = requestAnimationFrame(calculateFPS);
    
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isMonitoring, updateMetrics]);

  if (!isMonitoring) {
    return (
      <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
        <Chip 
          label="Start Monitoring" 
          onClick={() => setIsMonitoring(true)} 
          color="primary" 
          variant="outlined" 
        />
      </Box>
    );
  }

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 20, 
        right: 20, 
        zIndex: 9999, 
        p: 2, 
        maxWidth: 300,
        bgcolor: 'background.paper',
        boxShadow: 3,
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Video Performance</Typography>
        <Chip 
          label="Stop Monitoring" 
          onClick={() => setIsMonitoring(false)} 
          size="small"
        />
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          FPS: {metrics.fps}
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={Math.min(100, (metrics.fps / 60) * 100)} 
          color={metrics.fps > 30 ? 'success' : metrics.fps > 15 ? 'warning' : 'error'} 
        />
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Playing: {metrics.playingVideos}/{metrics.totalVideos}
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={metrics.totalVideos > 0 ? (metrics.playingVideos / metrics.totalVideos) * 100 : 0} 
        />
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Errors: {metrics.errors}
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={Math.min(100, metrics.errors * 10)} 
          color={metrics.errors === 0 ? 'success' : metrics.errors < 5 ? 'warning' : 'error'} 
        />
      </Box>
      
      <Typography variant="body2" color="text.secondary">
        Avg Load Time: {metrics.averageLoadTime.toFixed(2)}ms
      </Typography>
    </Paper>
  );
};

export default VideoPerformanceMonitor;