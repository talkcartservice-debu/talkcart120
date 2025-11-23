import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  IconButton,
  Tooltip,
  Fade,
  useTheme,
  useMediaQuery,
  Stack,
  Typography,
  Chip,
} from '@mui/material';
import {
  Maximize,
  Minimize,
  Settings,
  PictureInPicture,
  Volume2,
  VolumeX,
} from 'lucide-react';
import EnhancedStreamPlayer from '../EnhancedStreamPlayer';
import WebRTCTiles from '../WebRTCTiles';
import StreamMetrics from '../ui/StreamMetrics';

interface StreamPlayerContainerProps {
  stream: any;
  streamId: string;
  isStreamer: boolean;
  onFollow?: (streamerId: string) => void;
  onUnfollow?: (streamerId: string) => void;
  onLike?: (streamId: string) => void;
  onShare?: (streamId: string) => void;
  onReport?: (streamId: string, reason: string) => void;
  onSendGift?: (streamId: string, giftType: string) => void;
}

export default function StreamPlayerContainer({
  stream,
  streamId,
  isStreamer,
  onFollow,
  onUnfollow,
  onLike,
  onShare,
  onReport,
  onSendGift,
}: StreamPlayerContainerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPiP, setIsPiP] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen handling
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // Picture-in-Picture handling
  const togglePiP = async () => {
    const video = containerRef.current?.querySelector('video');
    if (!video) return;

    try {
      if (!document.pictureInPictureElement) {
        await video.requestPictureInPicture();
        setIsPiP(true);
      } else {
        await document.exitPictureInPicture();
        setIsPiP(false);
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  // Auto-hide controls in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const timer = setTimeout(() => setShowControls(false), 3000);
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timer);
      setTimeout(() => setShowControls(false), 3000);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handlePiPChange = () => {
      setIsPiP(!!document.pictureInPictureElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('enterpictureinpicture', handlePiPChange);
    document.addEventListener('leavepictureinpicture', handlePiPChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('enterpictureinpicture', handlePiPChange);
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, []);

  if (!stream) {
    return (
      <Card sx={{ position: 'relative', aspectRatio: '16/9', bgcolor: 'black' }}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            textAlign: 'center',
          }}
        >
          <Typography variant="h6">Stream not found</Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        borderRadius: isFullscreen ? 0 : 2,
        overflow: 'hidden',
        boxShadow: isFullscreen ? 'none' : (theme.palette.mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)'),
        border: isFullscreen ? 'none' : '1px solid',
        borderColor: isFullscreen ? 'transparent' : 'divider',
        background: isFullscreen ? 'black' : (theme.palette.mode === 'dark' ? 'linear-gradient(180deg, rgba(30,30,30,0.9), rgba(20,20,20,0.9))' : 'linear-gradient(180deg, #ffffff, #fafafa)'),
        ...(isFullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          bgcolor: 'black',
        }),
      }}
    >
      {/* Main Stream Player */}
      <EnhancedStreamPlayer
        streamId={streamId}
        streamUrl={stream.playbackUrl || stream.streamUrl || ''}
        title={stream.title}
        streamer={{
          id: stream.streamer?.id || (stream.streamer as any)?._id || '',
          username: stream.streamer?.username || '',
          displayName: stream.streamer?.displayName || '',
          avatar: stream.streamer?.avatar,
          isVerified: !!stream.streamer?.isVerified,
          followerCount: Number(stream.streamer?.followerCount) || 0,
          isFollowing: !!(stream.streamer as any)?.isFollowing,
        }}
        isLive={!!stream.isLive}
        viewerCount={Number(stream.viewerCount) || 0}
        duration={typeof stream.duration === 'number' ? `${Math.floor(stream.duration / 60)}:${(stream.duration % 60).toString().padStart(2, '0')}` : '0:00'}
        category={stream.category || 'General'}
        tags={Array.isArray(stream.tags) ? stream.tags : []}
        isHost={isStreamer}
        onFollow={onFollow}
        onUnfollow={onUnfollow}
        onLike={onLike}
        onShare={onShare}
        onReport={onReport}
        onSendGift={onSendGift}
      />

      {/* WebRTC Face-to-Face Tiles */}
      {stream.isLive && (
        <Box sx={{ mt: 2 }}>
          <WebRTCTiles
            streamId={streamId}
            hostUserId={(stream.streamer?.id || (stream.streamer as any)?._id || 'unknown') as string}
          />
        </Box>
      )}

      {/* Player Controls Overlay */}
      <Fade in={showControls || !isFullscreen}>
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            gap: 1,
            zIndex: 10,
          }}
        >
          <Tooltip title="Picture in Picture">
            <IconButton
              onClick={togglePiP}
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.8)' },
              }}
            >
              <PictureInPicture size={20} />
            </IconButton>
          </Tooltip>

          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton
              onClick={toggleFullscreen}
              sx={{
                bgcolor: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.8)' },
              }}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Fade>

      {/* Stream Metrics Overlay */}
      {stream.isLive && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 10,
          }}
        >
          <StreamMetrics
            viewerCount={stream.viewerCount}
            isLive={stream.isLive}
            category={stream.category}
            compact={isFullscreen}
          />
        </Box>
      )}
    </Box>
  );
}
