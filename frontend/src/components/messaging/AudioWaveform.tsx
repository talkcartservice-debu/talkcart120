import React, { useEffect, useRef, useState } from 'react';
import { Box, useTheme } from '@mui/material';

interface AudioWaveformProps {
  audioUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  color?: string;
  height?: number;
  barWidth?: number;
  gap?: number;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  onSeek,
  color,
  height = 30,
  barWidth = 3,
  gap = 1,
}) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate a simple waveform based on the duration
  useEffect(() => {
    if (!audioUrl) return;

    const generateWaveform = async () => {
      setLoading(true);
      try {
        // In a real implementation, you would analyze the audio file to get actual waveform data
        // For now, we'll generate a simple visualization based on duration
        const barCount = Math.max(20, Math.min(100, Math.floor(duration))); // 20-100 bars based on duration
        const data = Array.from({ length: barCount }, () => 
          Math.random() * 0.8 + 0.2 // Random values between 0.2 and 1.0
        );
        setWaveformData(data);
      } catch (error) {
        console.error('Error generating waveform:', error);
        // Fallback to simple waveform
        const data = Array.from({ length: 50 }, () => 
          Math.random() * 0.8 + 0.2
        );
        setWaveformData(data);
      } finally {
        setLoading(false);
      }
    };

    generateWaveform();
  }, [audioUrl, duration]);

  // Draw the waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = waveformData.length * (barWidth + gap);
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw waveform bars
    const progress = duration > 0 ? currentTime / duration : 0;
    const playedIndex = Math.floor(progress * waveformData.length);

    waveformData.forEach((amplitude, index) => {
      const x = index * (barWidth + gap);
      const barHeight = amplitude * height * 0.8; // Scale the bar height
      const y = (height - barHeight) / 2; // Center the bar vertically

      // Choose color based on whether it's played or unplayed
      ctx.fillStyle = index <= playedIndex 
        ? color || theme.palette.primary.main 
        : theme.palette.mode === 'dark' 
          ? theme.palette.grey[600] 
          : theme.palette.grey[400];

      // Draw the bar
      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }, [waveformData, height, barWidth, gap, currentTime, duration, color, theme]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (duration <= 0 || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * duration;

    onSeek(newTime);
  };

  if (loading || waveformData.length === 0) {
    return (
      <Box 
        sx={{ 
          height: `${height}px`, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          borderRadius: 1,
        }}
      >
        Loading waveform...
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        px: 1,
        cursor: 'pointer'
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          height: `${height}px`,
        }}
      />
    </Box>
  );
};

export default AudioWaveform;