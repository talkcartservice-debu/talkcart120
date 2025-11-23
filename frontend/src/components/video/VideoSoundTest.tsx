import React, { useState, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Play, Volume2, VolumeX } from 'lucide-react';

interface VideoSoundTestProps {
  videoUrl: string;
}

export const VideoSoundTest: React.FC<VideoSoundTestProps> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        // Ensure video is unmuted when user initiates play
        videoRef.current.muted = false;
        setIsMuted(false);
        
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.error('Video play failed:', error);
        });
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  return (
    <Box sx={{ 
      position: 'relative', 
      width: '100%', 
      height: 300,
      bgcolor: 'black',
      borderRadius: 2,
      overflow: 'hidden'
    }}>
      <video
        ref={videoRef}
        src={videoUrl}
        muted={isMuted}
        loop
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {/* Play/Pause button */}
      <Button
        variant="contained"
        startIcon={isPlaying ? '⏸️' : '▶️'}
        onClick={togglePlay}
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'rgba(255,255,255,0.8)',
          color: 'black',
          '&:hover': { 
            bgcolor: 'rgba(255,255,255,0.95)',
          },
        }}
      >
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
      
      {/* Mute/Unmute button */}
      <Button
        variant="contained"
        startIcon={isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        onClick={toggleMute}
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          bgcolor: 'rgba(0,0,0,0.6)',
          color: 'white',
          '&:hover': { 
            bgcolor: 'rgba(0,0,0,0.8)',
          },
        }}
      >
        {isMuted ? 'Unmute' : 'Mute'}
      </Button>
      
      <Box sx={{ 
        position: 'absolute', 
        bottom: 16, 
        left: 16, 
        color: 'white',
        bgcolor: 'rgba(0,0,0,0.6)',
        px: 1,
        py: 0.5,
        borderRadius: 1,
      }}>
        <Typography variant="body2">
          Sound: {isMuted ? 'Off' : 'On'}
        </Typography>
      </Box>
    </Box>
  );
};