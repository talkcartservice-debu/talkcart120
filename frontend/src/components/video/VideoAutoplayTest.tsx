import React, { useState, useRef } from 'react';
import { Box, Button, Typography, Paper, Slider, FormControlLabel, Switch } from '@mui/material';
import { VideoFeedProvider, useVideoFeed } from './VideoFeedManager';

// Mock video component for testing
const TestVideoComponent: React.FC<{ id: string }> = ({ id }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { registerVideo, settings } = useVideoFeed();
  
  React.useEffect(() => {
    if (videoRef.current && containerRef.current) {
      const cleanup = registerVideo(id, videoRef.current, containerRef.current);
      
      // Set initial muted state
      if (videoRef.current) {
        videoRef.current.muted = settings.muteByDefault;
      }
      
      return cleanup;
    }
    // Explicitly return undefined for the case when condition is not met
    return undefined;
  }, [id, registerVideo, settings.muteByDefault]);

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        width: '100%', 
        height: 200, 
        bgcolor: 'black', 
        position: 'relative',
        mb: 2,
        borderRadius: 1,
      }}
    >
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        muted
        loop
        playsInline
      >
        <source src="https://sample-videos.com/video123/mp4/360/big_buck_bunny_360p_1mb.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <Box sx={{ 
        position: 'absolute', 
        top: 8, 
        left: 8, 
        bgcolor: 'rgba(0,0,0,0.7)', 
        color: 'white', 
        px: 1, 
        py: 0.5, 
        borderRadius: 1 
      }}>
        Video {id}
      </Box>
    </Box>
  );
};

const VideoAutoplayTestContent: React.FC = () => {
  const [videoCount, setVideoCount] = useState(5);
  const [showPerformance, setShowPerformance] = useState(true);
  
  const videos = Array.from({ length: videoCount }, (_, i) => `video-${i + 1}`);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Video Auto-Play Performance Test
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Controls
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography>Number of Videos:</Typography>
          <Slider
            value={videoCount}
            onChange={(_, newValue) => setVideoCount(newValue as number)}
            min={1}
            max={20}
            step={1}
            sx={{ width: 200 }}
          />
          <Typography>{videoCount}</Typography>
        </Box>
        
        <FormControlLabel
          control={
            <Switch
              checked={showPerformance}
              onChange={(_, checked) => setShowPerformance(checked)}
            />
          }
          label="Show Performance Monitor"
        />
      </Paper>
      
      <VideoFeedProvider
        showControls={true}
        showStats={true}
        initialSettings={{
          enabled: true,
          threshold: 0.7,
          pauseOnScroll: true,
          muteByDefault: true,
          preloadStrategy: 'metadata',
          maxConcurrentVideos: 1,
          scrollPauseDelay: 100,
          viewTrackingThreshold: 3,
          autoplayOnlyOnWifi: false,
          respectReducedMotion: true,
        }}
      >
        <Box sx={{ height: '200vh' }}>
          {videos.map(id => (
            <Box key={id} sx={{ mb: 4 }}>
              <TestVideoComponent id={id} />
              <Typography variant="body1">
                This is test content for video {id}. Scroll to see auto-play behavior.
              </Typography>
            </Box>
          ))}
        </Box>
      </VideoFeedProvider>
    </Box>
  );
};

const VideoAutoplayTest: React.FC = () => {
  return <VideoAutoplayTestContent />;
};

export default VideoAutoplayTest;