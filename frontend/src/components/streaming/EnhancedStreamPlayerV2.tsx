import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  IconButton,
  Button,
  Chip,
  Avatar,
  Slider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Fade,
  LinearProgress,
  Stack,
  Paper,
  Badge,
  alpha,
  useTheme,
  Zoom,
  Slide,
  Backdrop,
} from '@mui/material';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Share2,
  Heart,
  Users,
  Eye,
  Gift,
  Flag,
  MoreVertical,
  Wifi,
  WifiOff,
  Download,
  Bookmark,
  ThumbsUp,
  Verified,
  Radio,
  Zap,
  MessageCircle,
  Crown,
  Shield,
  PictureInPicture2,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Cast,
  Headphones,
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  HardDrive,
  Signal,
  Activity,
  TrendingUp,
  Award,
  Star,
  Flame,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { createStreamingStyles, streamingAnimations } from './styles/streamingTheme';
import FollowButton from '@/components/common/FollowButton';

interface EnhancedStreamPlayerV2Props {
  streamId: string;
  streamUrl: string;
  title: string;
  streamer: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    isVerified: boolean;
    followerCount: number;
    isFollowing: boolean;
  };
  isLive: boolean;
  viewerCount: number;
  duration: string;
  category: string;
  tags: string[];
  isHost?: boolean;
  thumbnail?: string;
  onFollow?: (streamerId: string) => void;
  onUnfollow?: (streamerId: string) => void;
  onLike?: (streamId: string) => void;
  onShare?: (streamId: string) => void;
  onReport?: (streamId: string, reason: string) => void;
  onSendGift?: (streamId: string, giftType: string) => void;
}

interface StreamQuality {
  label: string;
  value: string;
  bitrate: number;
  resolution: string;
}

interface StreamHealth {
  status: 'excellent' | 'good' | 'fair' | 'poor';
  bitrate: number;
  fps: number;
  quality: string;
  latency: number;
  droppedFrames: number;
  bufferHealth: number;
}

interface FloatingElement {
  id: string;
  type: 'like' | 'gift' | 'follow' | 'subscriber';
  content: string;
  emoji?: string;
  x: number;
  y: number;
  color: string;
}

const MotionBox = motion(Box);
const MotionChip = motion(Chip);

const EnhancedStreamPlayerV2: React.FC<EnhancedStreamPlayerV2Props> = ({
  streamId,
  streamUrl,
  title,
  streamer,
  isLive,
  viewerCount: initialViewerCount,
  duration,
  category,
  tags,
  isHost = false,
  thumbnail,
  onFollow,
  onUnfollow,
  onLike,
  onShare,
  onReport,
  onSendGift,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const streamingStyles = createStreamingStyles(theme);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { socket, isConnected, joinStream, leaveStream } = useWebSocket();

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [streamQuality, setStreamQuality] = useState('auto');
  const [playbackRate, setPlaybackRate] = useState(1);

  // UI state
  const [showControls, setShowControls] = useState(true);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null);
  const [showStats, setShowStats] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);

  // Interactive elements
  const [floatingElements, setFloatingElements] = useState<FloatingElement[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [viewerCount, setViewerCount] = useState(initialViewerCount);
  const [totalLikes, setTotalLikes] = useState(0);
  const [recentActions, setRecentActions] = useState<string[]>([]);

  // Stream health and quality
  const [streamHealth, setStreamHealth] = useState<StreamHealth>({
    status: 'good',
    bitrate: 3000,
    fps: 30,
    quality: '720p',
    latency: 2500,
    droppedFrames: 0,
    bufferHealth: 85,
  });

  // Quality options
  const qualityOptions: StreamQuality[] = [
    { label: '4K', value: '2160p', bitrate: 15000, resolution: '3840x2160' },
    { label: '1440p', value: '1440p', bitrate: 9000, resolution: '2560x1440' },
    { label: '1080p60', value: '1080p60', bitrate: 6000, resolution: '1920x1080' },
    { label: '1080p', value: '1080p', bitrate: 4500, resolution: '1920x1080' },
    { label: '720p60', value: '720p60', bitrate: 3500, resolution: '1280x720' },
    { label: '720p', value: '720p', bitrate: 2500, resolution: '1280x720' },
    { label: '480p', value: '480p', bitrate: 1000, resolution: '854x480' },
    { label: '360p', value: '360p', bitrate: 600, resolution: '640x360' },
    { label: 'Auto', value: 'auto', bitrate: 0, resolution: 'Adaptive' },
  ];

  // Resolve stream URL
  const resolvedStreamUrl = useMemo(() => {
    if (!streamUrl) return '';
    try {
      const asUrl = new URL(streamUrl, window.location.origin);
      if (asUrl.origin === window.location.origin && asUrl.pathname.startsWith('/hls')) {
        return `${window.location.protocol}//${window.location.hostname}:8000${asUrl.pathname}${asUrl.search}`;
      }
      return asUrl.toString();
    } catch {
      return streamUrl;
    }
  }, [streamUrl]);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    
    if (isPlaying && !isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isFullscreen]);

  // Mouse activity handler
  const handleMouseActivity = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Initialize video source and HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedStreamUrl) return;

    // Clean up old HLS instance
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying HLS:', e);
      }
      hlsRef.current = null;
    }

    const isHls = /\.m3u8($|\?)/i.test(resolvedStreamUrl);

    if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = resolvedStreamUrl;
    } else if (isHls) {
      // Use HLS.js for other browsers
      import('hls.js')
        .then(({ default: Hls }) => {
          if (Hls && Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90,
              maxBufferLength: 600,
              maxMaxBufferLength: 1200,
              liveSyncDurationCount: 3,
              liveMaxLatencyDurationCount: 10,
            });
            
            hlsRef.current = hls;
            hls.loadSource(resolvedStreamUrl);
            hls.attachMedia(video);

            // HLS events
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
              console.log('HLS media attached');
            });

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              console.log('HLS manifest parsed');
              if (isLive) {
                video.play().catch(console.warn);
              }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              console.error('HLS error:', data);
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    hls.recoverMediaError();
                    break;
                  default:
                    hls.destroy();
                    break;
                }
              }
            });
          } else {
            video.src = resolvedStreamUrl;
          }
        })
        .catch(() => {
          video.src = resolvedStreamUrl;
        });
    } else {
      // Non-HLS source
      video.src = resolvedStreamUrl;
    }

    // Video event listeners
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleProgress = () => {
      if (video.buffered.length > 0 && video.duration) {
        setBuffered((video.buffered.end(0) / video.duration) * 100);
      }
    };
    const handleLoadStart = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsPlaying(true);
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying HLS on cleanup:', e);
        }
      }
    };
  }, [resolvedStreamUrl, isLive]);

  // WebSocket events for real-time interactions
  useEffect(() => {
    if (!socket || !streamId) return;

    const handleLikeBurst = (data: any) => {
      const count = Math.min(data.count || 1, 10);
      for (let i = 0; i < count; i++) {
        const id = Math.random().toString(36);
        const element: FloatingElement = {
          id,
          type: 'like',
          content: '👍',
          x: Math.random() * 80 + 10,
          y: Math.random() * 20 + 70,
          color: '#ff4d6d',
        };
        
        setFloatingElements(prev => [...prev, element]);
        setTimeout(() => {
          setFloatingElements(prev => prev.filter(el => el.id !== id));
        }, 2000);
      }
    };

    const handleGiftReceived = (data: any) => {
      const giftEmojis = { heart: '💖', star: '⭐', diamond: '💎', crown: '👑', rocket: '🚀' };
      const emoji = giftEmojis[data.giftType as keyof typeof giftEmojis] || '🎁';
      
      const id = Math.random().toString(36);
      const element: FloatingElement = {
        id,
        type: 'gift',
        content: emoji,
        emoji: data.fromUsername || 'Anonymous',
        x: Math.random() * 60 + 20,
        y: Math.random() * 30 + 50,
        color: '#ffd700',
      };
      
      setFloatingElements(prev => [...prev, element]);
      setRecentActions(prev => [`${data.fromUsername || 'Someone'} sent ${data.giftType}!`, ...prev.slice(0, 4)]);
      
      setTimeout(() => {
        setFloatingElements(prev => prev.filter(el => el.id !== id));
      }, 3000);
    };

    const handleViewerUpdate = (data: any) => {
      if (data.streamId === streamId) {
        setViewerCount(data.viewerCount);
      }
    };

    const handleNewFollower = (data: any) => {
      const id = Math.random().toString(36);
      const element: FloatingElement = {
        id,
        type: 'follow',
        content: '❤️',
        emoji: `${data.username} followed!`,
        x: Math.random() * 40 + 30,
        y: Math.random() * 20 + 40,
        color: '#ff6b6b',
      };
      
      setFloatingElements(prev => [...prev, element]);
      setRecentActions(prev => [`${data.username} started following!`, ...prev.slice(0, 4)]);
      
      setTimeout(() => {
        setFloatingElements(prev => prev.filter(el => el.id !== id));
      }, 2500);
    };

    socket.on('live:like:burst', handleLikeBurst);
    socket.on('live:gift:received', handleGiftReceived);
    socket.on('live:viewer:count', handleViewerUpdate);
    socket.on('live:new:follower', handleNewFollower);

    return () => {
      socket.off('live:like:burst', handleLikeBurst);
      socket.off('live:gift:received', handleGiftReceived);
      socket.off('live:viewer:count', handleViewerUpdate);
      socket.off('live:new:follower', handleNewFollower);
    };
  }, [socket, streamId]);

  // Player controls
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play().catch(console.warn);
      }
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  const handleVolumeChange = useCallback((newValue: number | number[]) => {
    const video = videoRef.current;
    if (video) {
      const vol = (Array.isArray(newValue) ? newValue[0] : newValue) ?? 0;
      video.volume = vol / 100;
      setVolume(vol / 100);
      setIsMuted(vol === 0);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    if (!document.fullscreenElement) {
      player.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.warn);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.warn);
    }
  }, []);

  const togglePiP = useCallback(() => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;

    if (!document.pictureInPictureElement) {
      video.requestPictureInPicture().then(() => {
        setIsPiP(true);
      }).catch(console.warn);
    } else {
      document.exitPictureInPicture().then(() => {
        setIsPiP(false);
      }).catch(console.warn);
    }
  }, []);

  const handleLike = useCallback(() => {
    setIsLiked(true);
    setTotalLikes(prev => prev + 1);
    onLike?.(streamId);
    
    // Create like burst effect
    const id = Math.random().toString(36);
    const element: FloatingElement = {
      id,
      type: 'like',
      content: '❤️',
      x: Math.random() * 20 + 40,
      y: Math.random() * 20 + 60,
      color: '#ff4d6d',
    };
    
    setFloatingElements(prev => [...prev, element]);
    setTimeout(() => {
      setFloatingElements(prev => prev.filter(el => el.id !== id));
    }, 1500);
    
    setTimeout(() => setIsLiked(false), 1000);
  }, [streamId, onLike]);

  // Quality indicator component
  const QualityIndicator = () => {
    const getStatusColor = () => {
      switch (streamHealth.status) {
        case 'excellent': return theme.palette.success.main;
        case 'good': return theme.palette.warning.main;
        case 'fair': return '#ff9800'; // Fallback color since orange may not exist
        case 'poor': return theme.palette.error.main;
        default: return theme.palette.grey[500];
      }
    };

    return (
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: getStatusColor(),
            boxShadow: `0 0 6px ${alpha(getStatusColor(), 0.5)}`,
          }}
        />
        <Typography variant="caption" fontWeight={600}>
          {streamHealth.quality}
        </Typography>
      </Stack>
    );
  };

  // Stats overlay
  const StatsOverlay = () => (
    <Fade in={showStats}>
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          p: 2,
          minWidth: 200,
          bgcolor: alpha('#000', 0.8),
          color: '#fff',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          zIndex: 10,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Stream Statistics</Typography>
        <Stack spacing={0.5}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Quality:</Typography>
            <Typography variant="caption" fontWeight={600}>{streamHealth.quality}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Bitrate:</Typography>
            <Typography variant="caption" fontWeight={600}>{streamHealth.bitrate} kbps</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">FPS:</Typography>
            <Typography variant="caption" fontWeight={600}>{streamHealth.fps}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Latency:</Typography>
            <Typography variant="caption" fontWeight={600}>{streamHealth.latency}ms</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Dropped:</Typography>
            <Typography variant="caption" fontWeight={600}>{streamHealth.droppedFrames}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Buffer:</Typography>
            <Typography variant="caption" fontWeight={600}>{streamHealth.bufferHealth}%</Typography>
          </Box>
        </Stack>
      </Paper>
    </Fade>
  );

  return (
    <Card
      ref={playerRef}
      sx={{
        position: 'relative',
        bgcolor: '#000',
        overflow: 'hidden',
        aspectRatio: '16/9',
        cursor: showControls ? 'default' : 'none',
        ...streamingStyles.glassContainer(),
      }}
      onMouseMove={handleMouseActivity}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isPlaying && setShowControls(false)}
    >
      {/* Video element */}
      <Box
        component="video"
        ref={videoRef}
        poster={thumbnail}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        onClick={togglePlayPause}
        muted={isMuted}
        playsInline
        preload={isLive ? 'none' : 'metadata'}
      />

      {/* Loading overlay */}
      <AnimatePresence>
        {isBuffering && (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha('#000', 0.3),
              zIndex: 5,
            }}
          >
            <Stack alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTop: '3px solid #fff',
                  borderRadius: '50%',
                  animation: `${streamingAnimations.livePulse} 1s linear infinite`,
                }}
              />
              <Typography variant="body2" color="#fff">
                {isLive ? 'Connecting to live stream...' : 'Buffering...'}
              </Typography>
            </Stack>
          </MotionBox>
        )}
      </AnimatePresence>

      {/* Floating interactive elements */}
      <AnimatePresence>
        {floatingElements.map((element) => (
          <motion.div
            key={element.id}
            initial={{ 
              opacity: 0, 
              scale: 0, 
              x: `${element.x}%`, 
              y: `${element.y}%` 
            }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              scale: [0, 1.2, 1, 0.8], 
              y: [element.y, element.y - 20, element.y - 40, element.y - 60] 
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              fontSize: '2rem',
              pointerEvents: 'none',
              zIndex: 8,
              color: element.color,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            <Stack alignItems="center" spacing={0.5}>
              <Box sx={{ fontSize: '2rem' }}>{element.content}</Box>
              {element.emoji && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#fff', 
                    fontWeight: 600,
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {element.emoji}
                </Typography>
              )}
            </Stack>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Live indicator and stream info */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
        }}
      >
        <Stack spacing={1}>
          {isLive && (
            <MotionChip
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              label="LIVE"
              sx={{
                ...streamingStyles.liveIndicator('lg'),
                boxShadow: '0 4px 12px rgba(255, 68, 68, 0.5)',
              }}
            />
          )}
          
          <Chip
            icon={<Users size={14} />}
            label={viewerCount.toLocaleString()}
            size="small"
            sx={{
              bgcolor: alpha('#000', 0.7),
              color: '#fff',
              backdropFilter: 'blur(10px)',
              '& .MuiChip-icon': { color: '#fff' },
            }}
          />
        </Stack>
      </Box>

      {/* Quality indicator and controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
        }}
      >
        <Stack spacing={1} alignItems="flex-end">
          <QualityIndicator />
          
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Stream statistics">
              <IconButton
                size="small"
                onClick={() => setShowStats(!showStats)}
                sx={{
                  bgcolor: alpha('#000', 0.6),
                  color: '#fff',
                  '&:hover': { bgcolor: alpha('#000', 0.8) },
                }}
              >
                <Activity size={14} />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Picture in Picture">
              <IconButton
                size="small"
                onClick={togglePiP}
                sx={{
                  bgcolor: alpha('#000', 0.6),
                  color: '#fff',
                  '&:hover': { bgcolor: alpha('#000', 0.8) },
                }}
              >
                <PictureInPicture2 size={14} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* Recent actions ticker */}
      <AnimatePresence>
        {recentActions.length > 0 && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: 80,
              left: 16,
              right: 16,
              zIndex: 9,
            }}
          >
            <Paper
              sx={{
                p: 1,
                bgcolor: alpha('#000', 0.8),
                backdropFilter: 'blur(10px)',
                borderRadius: 2,
              }}
            >
              <Stack spacing={0.5}>
                {recentActions.slice(0, 3).map((action, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <Sparkles size={12} color="#ffd700" />
                      {action}
                    </Typography>
                  </motion.div>
                ))}
              </Stack>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              backdropFilter: 'blur(10px)',
            }}
          >
            {/* Progress bar */}
            {!isLive && (
              <Box sx={{ px: 2, pb: 1 }}>
                <Slider
                  value={(currentTime / (videoRef.current?.duration || 1)) * 100}
                  onChange={(_, value) => {
                    const video = videoRef.current;
                    if (video && video.duration) {
                      const newTime = ((value as number) / 100) * video.duration;
                      video.currentTime = newTime;
                      setCurrentTime(newTime);
                    }
                  }}
                  sx={{
                    height: 4,
                    '& .MuiSlider-thumb': {
                      width: 16,
                      height: 16,
                      '&:hover': { boxShadow: '0 0 0 8px rgba(255,255,255,0.16)' },
                    },
                    '& .MuiSlider-track': {
                      border: 'none',
                      background: 'linear-gradient(90deg, #ff6b6b, #4ecdc4)',
                    },
                    '& .MuiSlider-rail': {
                      bgcolor: 'rgba(255,255,255,0.3)',
                    },
                  }}
                />
              </Box>
            )}

            {/* Control buttons */}
            <Box sx={{ px: 2, pb: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                {/* Left controls */}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton onClick={togglePlayPause} sx={{ color: '#fff' }}>
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </IconButton>
                  
                  <IconButton onClick={toggleMute} sx={{ color: '#fff' }}>
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </IconButton>
                  
                  <Box sx={{ width: 80 }}>
                    <Slider
                      value={volume * 100}
                      onChange={(_, value) => handleVolumeChange(value)}
                      sx={{
                        color: '#fff',
                        '& .MuiSlider-thumb': {
                          width: 12,
                          height: 12,
                        },
                      }}
                    />
                  </Box>

                  <Typography variant="caption" sx={{ color: '#fff', minWidth: '4rem' }}>
                    {isLive ? 'LIVE' : `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`}
                  </Typography>
                </Stack>

                {/* Right controls */}
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Tooltip title="Like">
                    <IconButton 
                      onClick={handleLike}
                      sx={{ 
                        color: isLiked ? '#ff4d6d' : '#fff',
                        transform: isLiked ? 'scale(1.2)' : 'scale(1)',
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Share">
                    <IconButton onClick={() => onShare?.(streamId)} sx={{ color: '#fff' }}>
                      <Share2 size={20} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Settings">
                    <IconButton 
                      onClick={(e) => setSettingsAnchor(e.currentTarget)}
                      sx={{ color: '#fff' }}
                    >
                      <Settings size={20} />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Fullscreen">
                    <IconButton onClick={toggleFullscreen} sx={{ color: '#fff' }}>
                      {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stream info overlay (bottom left) */}
      <Fade in={showControls}>
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            maxWidth: '50%',
            zIndex: 11,
          }}
        >
          <Stack spacing={1}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#fff', 
                fontWeight: 600,
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </Typography>
            
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar
                src={streamer.avatar}
                sx={{ width: 24, height: 24 }}
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                {streamer.displayName}
              </Typography>
              {streamer.isVerified && (
                <Verified size={14} color="#4fc3f7" />
              )}
              
              <FollowButton
                user={streamer}
                variant="button"
                size="small"
              />
            </Stack>
          </Stack>
        </Box>
      </Fade>

      {/* Settings menu */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={() => setSettingsAnchor(null)}
        PaperProps={{
          sx: {
            bgcolor: alpha('#000', 0.9),
            backdropFilter: 'blur(10px)',
            color: '#fff',
            minWidth: 200,
          },
        }}
      >
        <MenuItem>
          <ListItemIcon>
            <Monitor size={20} color="#fff" />
          </ListItemIcon>
          <ListItemText primary="Quality" secondary={streamHealth.quality} />
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <Zap size={20} color="#fff" />
          </ListItemIcon>
          <ListItemText primary="Playback Speed" secondary={`${playbackRate}x`} />
        </MenuItem>
        <MenuItem onClick={() => setShowStats(!showStats)}>
          <ListItemIcon>
            <Activity size={20} color="#fff" />
          </ListItemIcon>
          <ListItemText primary="Statistics" />
        </MenuItem>
      </Menu>

      {/* Statistics overlay */}
      <StatsOverlay />
    </Card>
  );
};

export default EnhancedStreamPlayerV2;