import React, { useEffect, useRef } from 'react';
import { Box, Chip, Typography } from '@mui/material';

export interface VideoTileProps {
  title: string;
  stream: MediaStream | null;
  muted?: boolean;
  isHost?: boolean;
  isPublisher?: boolean;
}

const VideoTile: React.FC<VideoTileProps> = ({ title, stream, muted, isHost, isPublisher }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) {
      // Assign MediaStream to video element
      (ref.current as any).srcObject = stream as any;
    }
  }, [stream]);
  return (
    <Box sx={{ position: 'relative', background: '#000', borderRadius: 1, overflow: 'hidden', minHeight: 120 }}>
      <video ref={ref} autoPlay playsInline muted={muted} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
      <Box sx={{ position: 'absolute', bottom: 4, left: 6, background: 'rgba(0,0,0,0.5)', color: '#fff', px: 0.5, borderRadius: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="caption">{title}</Typography>
        {isHost && (
          <Chip size="small" color="primary" label="Host" sx={{ height: 18 }} />
        )}
        {isPublisher && !isHost && (
          <Chip size="small" color="secondary" label="Publisher" sx={{ height: 18 }} />
        )}
      </Box>
    </Box>
  );
};

export default VideoTile;