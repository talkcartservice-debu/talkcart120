import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Chip,
  Avatar,
  Badge,
  Slider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tooltip,
  Fade,
  LinearProgress,
  Snackbar,
  Stack,
  Paper,
  Divider,
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
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import FollowButton from '@/components/common/FollowButton';

interface EnhancedStreamPlayerProps {
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
  isHost?: boolean; // current viewer is the host/streamer
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
}

interface StreamHealth {
  status: string;
  bitrate: number;
  fps: number;
  quality: string;
  latency: number;
  droppedFrames: number;
}

const EnhancedStreamPlayer: React.FC<EnhancedStreamPlayerProps> = ({
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
  onFollow,
  onUnfollow,
  onLike,
  onShare,
  onReport,
  onSendGift,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null); // holds Hls.js instance when used
  const {
    isConnected,
    joinStream,
    leaveStream,
    onViewerUpdate,
    onStreamUpdate,
    offViewerUpdate,
    offStreamUpdate,
    socket
  } = useWebSocket();

  // UI State
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [streamQuality, setStreamQuality] = useState('720p');
  const [showControls, setShowControls] = useState(true);
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null);
  const [hostMenuAnchor, setHostMenuAnchor] = useState<null | HTMLElement>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');

  // Hearts overlay + like count
  const [hearts, setHearts] = useState<Array<{ id: string; left: number; color: string; scale: number }>>([]);
  const [totalLikes, setTotalLikes] = useState<number>(0);
  // Gifts overlay, goals, polls, and viewer toasts
  const [giftBursts, setGiftBursts] = useState<Array<{ id: string; emoji: string; text: string; color: string }>>([]);
  const [goal, setGoal] = useState<null | { type: 'likes' | 'donations'; target: number; title?: string; progress: number }>(null);
  const [poll, setPoll] = useState<null | { question: string; options: string[]; counts: number[]; active: boolean }>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [viewerToasts, setViewerToasts] = useState<Array<{ id: string; text: string }>>([]);


  // Resolve relative HLS URLs to backend origin in dev
  const resolvedStreamUrl = useMemo(() => {
    if (!streamUrl) return '';
    try {
      // If already absolute, return as is
      const asUrl = new URL(streamUrl, window.location.origin);
      // If path starts with /hls and host is frontend, point to backend 8000
      if (asUrl.origin === window.location.origin && asUrl.pathname.startsWith('/hls')) {
        return `${window.location.protocol}//${window.location.hostname}:8000${asUrl.pathname}${asUrl.search}`;
      }
      return asUrl.toString();
    } catch {
      return streamUrl; // Fallback
    }
  }, [streamUrl]);

  // Real-time state
  const [viewerCount, setViewerCount] = useState(initialViewerCount);
  const [streamHealth, setStreamHealth] = useState<StreamHealth>({
    status: 'good',
    bitrate: 3000,
    fps: 30,
    quality: '720p',
    latency: 2500,
    droppedFrames: 0,
  });
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('good');

  const qualityOptions: StreamQuality[] = [
    { label: '1080p', value: '1080p', bitrate: 6000 },
    { label: '720p', value: '720p', bitrate: 3000 },
    { label: '480p', value: '480p', bitrate: 1500 },
    { label: '360p', value: '360p', bitrate: 800 },
    { label: 'Auto', value: 'auto', bitrate: 0 },
  ];

  const giftOptions = [
    { name: 'Heart', emoji: '❤️', cost: 1 },
    { name: 'Star', emoji: '⭐', cost: 5 },
    { name: 'Diamond', emoji: '💎', cost: 10 },
    { name: 'Crown', emoji: '👑', cost: 25 },
    { name: 'Rocket', emoji: '🚀', cost: 50 },
  ];

  // WebSocket event handlers
  useEffect(() => {
    if (isConnected && streamId) {
      joinStream(streamId);

      const handleViewerUpdate = (data: any) => {
        if (data.streamId === streamId) {
          setViewerCount(data.viewerCount);
        }
      };

      const handleStreamUpdate = (data: any) => {
        if (data.streamId === streamId) {
          if (data.health) {
            setStreamHealth(data.health);

            // Update connection quality based on health metrics
            if (data.health.latency < 2000 && data.health.droppedFrames < 5) {
              setConnectionQuality('excellent');
            } else if (data.health.latency < 4000 && data.health.droppedFrames < 15) {
              setConnectionQuality('good');
            } else {
              setConnectionQuality('poor');
            }
          }
        }
      };

      onViewerUpdate(handleViewerUpdate);
      onStreamUpdate(handleStreamUpdate);

      return () => {
        leaveStream(streamId);
        offViewerUpdate(handleViewerUpdate);
        offStreamUpdate(handleStreamUpdate);
      };
    }
    
    // Return a no-op cleanup function when conditions are not met
    return () => {};
  }, [isConnected, streamId, joinStream, leaveStream, onViewerUpdate, onStreamUpdate, offViewerUpdate, offStreamUpdate]);

  // Live like/gift/goal/poll/toast subscriptions
  useEffect(() => {
    if (!socket || !streamId) return;

    // Likes
    const onBurst = (d: any) => {
      const c = Math.min(Math.max(Number(d?.count) || 1, 1), 10);
      for (let i = 0; i < c; i++) {
        const id = Math.random().toString(36).slice(2);
        const left = 10 + Math.random() * 80;
        const scale = 0.8 + Math.random() * 0.6;
        const colors = ['#ff4d6d', '#ff6b6b', '#f50057', '#e91e63'];
        const color = colors[Math.floor(Math.random() * colors.length)] || '#ff4d6d';
        setHearts((prev) => [...prev, { id, left, color, scale }]);
        setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== id)), 1200);
      }
    };
    const onCount = (d: any) => {
      if (d?.streamId === streamId && typeof d?.totalLikes === 'number') setTotalLikes(d.totalLikes);
    };
    socket.on('live:like:burst', onBurst);
    socket.on('live:like:count', onCount);

    // Gifts overlay
    const emojiMap: Record<string, string> = { heart: '💖', star: '⭐', diamond: '💎', crown: '👑', rocket: '🚀' };
    const colorMap: Record<string, string> = { heart: '#ff4d6d', star: '#ffd700', diamond: '#4dd0e1', crown: '#ffca28', rocket: '#90caf9' };
    const onGift = (p: any) => {
      const type = String(p?.giftType || 'heart');
      const id = Math.random().toString(36).slice(2);
      const emoji = emojiMap[type] || '🎁';
      const color = colorMap[type] || '#ff9800';
      const from = p?.fromUsername || 'Anonymous';
      setGiftBursts((prev) => [...prev, { id, emoji, color, text: `${from} sent ${type}` }]);
      setTimeout(() => setGiftBursts((prev) => prev.filter((g) => g.id !== id)), 2500);
    };
    socket.on('live:gift:received', onGift);
    // Also support legacy REST-broadcast event
    socket.on('gift:new', onGift);

    // Goals
    const onGoalCurrent = (d: any) => setGoal(d?.goal || null);
    const onGoalUpdate = (d: any) => setGoal(d?.goal || null);
    const onGoalClear = () => setGoal(null);
    const onGoalAchieved = (d: any) => {
      setGoal(d?.goal || null);
      setSnackbarMessage('Goal achieved!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    };
    socket.on('live:goal:current', onGoalCurrent);
    socket.on('live:goal:update', onGoalUpdate);
    socket.on('live:goal:clear', onGoalClear);
    socket.on('live:goal:achieved', onGoalAchieved);
    try { socket.emit('live:goal:get', { streamId }); } catch {}

    // Polls
    const onPollUpdate = (d: any) => setPoll(d?.poll || null);
    const onPollEnded = (d: any) => setPoll(d?.poll || null);
    socket.on('live:poll:update', onPollUpdate);
    socket.on('live:poll:ended', onPollEnded);

    // Viewer toasts
    const pushToast = (text: string) => {
      const id = Math.random().toString(36).slice(2);
      setViewerToasts((prev) => [...prev, { id, text }]);
      setTimeout(() => setViewerToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };
    const onJoin = (d: any) => pushToast(`${d?.username || 'Viewer'} joined`);
    const onLeft = (d: any) => pushToast(`${d?.username || 'Viewer'} left`);
    socket.on('live:viewer:joined', onJoin);
    socket.on('live:viewer:left', onLeft);

    return () => {
      socket.off('live:like:burst', onBurst);
      socket.off('live:like:count', onCount);
      socket.off('live:gift:received', onGift);
      socket.off('gift:new', onGift);
      socket.off('live:goal:current', onGoalCurrent);
      socket.off('live:goal:update', onGoalUpdate);
      socket.off('live:goal:clear', onGoalClear);
      socket.off('live:goal:achieved', onGoalAchieved);
      socket.off('live:poll:update', onPollUpdate);
      socket.off('live:poll:ended', onPollEnded);
      socket.off('live:viewer:joined', onJoin);
      socket.off('live:viewer:left', onLeft);
    };
  }, [socket, streamId]);

  // Replace streamUrl usage below with resolvedStreamUrl

  // Initialize video source (supports HLS via hls.js) and attach event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clean up old HLS instance if any
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }

    // If no URL, show message and exit
    if (!resolvedStreamUrl) {
      setSnackbarMessage('Stream is not available yet');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      return;
    }

    const isHls = /\.m3u8($|\?)/i.test(resolvedStreamUrl);

    // If native HLS is supported (Safari) and URL is HLS
    if (isHls && (video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('application/x-mpegURL'))) {
      video.src = resolvedStreamUrl;
    } else if (isHls) {
      // Dynamically import hls.js only in browser
      import('hls.js')
        .then(({ default: Hls }) => {
          if (Hls && Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90,
            });
            hlsRef.current = hls;
            hls.loadSource(resolvedStreamUrl);
            hls.attachMedia(video);
          } else {
            // Fallback: let the browser try directly
            video.src = resolvedStreamUrl;
          }
        })
        .catch(() => {
          // Fallback: set src directly
          video.src = resolvedStreamUrl;
        });
    } else {
      // Non-HLS source (e.g., MP4)
      video.src = resolvedStreamUrl;
    }

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleProgress = () => {
      if (video.buffered.length > 0 && video.duration) {
        setBuffered((video.buffered.end(0) / video.duration) * 100);
      }
    };
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => {
      setIsBuffering(false);
      // Attempt to autoplay live streams; if blocked, mute and retry per browser policy
      if (isLive) {
        video.play().catch(() => {
          try {
            video.muted = true;
            setIsMuted(true);
            video.volume = 0;
            video.play().catch(() => {});
          } catch {}
        });
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setIsBuffering(false);
      const err = video.error;
      // If no supported sources, show clearer message
      if (err?.code === 4) {
        setSnackbarMessage('This browser cannot play the stream format');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage('Error loading video stream');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
    };
  }, [resolvedStreamUrl, isLive]);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimeout = () => {
      clearTimeout(timeout);
      setShowControls(true);
      if (isPlaying) {
        timeout = setTimeout(() => setShowControls(false), 3000);
      }
    };

    resetTimeout();
    return () => clearTimeout(timeout);
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!resolvedStreamUrl) {
      setSnackbarMessage('No stream URL available');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      return;
    }

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch((error) => {
        console.error('Failed to play video:', error);
        setSnackbarMessage('Failed to play video');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      });
    }
  }, [isPlaying, resolvedStreamUrl]);

  const handleVolumeChange = useCallback((newValue: number | number[]) => {
    const volumeValue = (Array.isArray(newValue) ? newValue[0] : newValue) ?? 0;
    setVolume(volumeValue);
    if (videoRef.current) {
      videoRef.current.volume = volumeValue;
    }
    setIsMuted(volumeValue === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
      if (newMuted) {
        videoRef.current.volume = 0;
      } else {
        videoRef.current.volume = volume;
      }
    }
  }, [isMuted, volume]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen().catch((error) => {
        console.error('Failed to enter fullscreen:', error);
        setSnackbarMessage('Failed to enter fullscreen');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((error) => {
        console.error('Failed to exit fullscreen:', error);
      });
      setIsFullscreen(false);
    }
  }, []);

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return <Wifi color="#4caf50" size={16} />;
      case 'good':
        return <Wifi color="#ff9800" size={16} />;
      case 'poor':
        return <WifiOff color="#f44336" size={16} />;
      default:
        return <Wifi color="#ff9800" size={16} />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getHealthColor = () => {
    switch (streamHealth.status) {
      case 'excellent':
        return '#4caf50';
      case 'good':
        return '#ff9800';
      case 'poor':
        return '#f44336';
      default:
        return '#ff9800';
    }
  };

  return (
    <Card sx={{ position: 'relative', overflow: 'hidden' }}>
      {/* Video Player */}
      <Box
        sx={{
          position: 'relative',
          paddingTop: '56.25%', // 16:9 aspect ratio
          bgcolor: 'black',
          cursor: showControls ? 'default' : 'none',
        }}
        onMouseEnter={() => setShowControls(true)}
        onMouseMove={() => {
          if (isPlaying) {
            setShowControls(true);
          }
        }}
        onMouseLeave={() => {
          if (!isPlaying) {
            setShowControls(false);
          }
        }}
      >
        <video
          ref={videoRef}
          // src is set programmatically to support HLS via hls.js
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onClick={togglePlay}
          playsInline
          muted={isMuted}
          controls={false}
          aria-label={`Live stream: ${title} by ${streamer?.displayName || 'Unknown'}`}
          onDoubleClick={() => {
            // Double-tap to like
            try {
              socket?.emit('live:like', { streamId, count: 1 });
            } catch {}
            // Local heart spawn for immediate feedback
            const id = Math.random().toString(36).slice(2);
            const left = 10 + Math.random() * 80;
            const scale = 0.8 + Math.random() * 0.6;
            const colors = ['#ff4d6d', '#ff6b6b', '#f50057', '#e91e63'];
            const color = colors[Math.floor(Math.random() * colors.length)] || '#ff4d6d';
            setHearts((prev) => [...prev, { id, left, color, scale }]);
            setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== id)), 1200);
          }}
        />

        {/* Streamer badge overlay (top-left) */}
        <Box
          sx={{ position: 'absolute', top: 16, left: 72, zIndex: 5,
            display: 'flex', alignItems: 'center', gap: 0.5, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
        >
          <Avatar src={streamer?.avatar} sx={{ width: 18, height: 18 }}>
            {(streamer?.displayName || '?')[0]}
          </Avatar>
          <Typography variant="caption" fontWeight={700}>{streamer?.displayName || 'Unknown'}</Typography>
          <Chip size="small" label="HOST" color="warning" variant="outlined" sx={{ height: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
          {streamer?.isVerified && (
            <Chip size="small" label="VERIFIED" color="primary" variant="outlined" sx={{ height: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
          )}
        </Box>


        {/* Hearts overlay */}
        <Box
          sx={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            zIndex: 6,
            '@keyframes floatUp': {
              '0%': { transform: 'translateY(0) scale(0.8)', opacity: 0.9 },
              '60%': { opacity: 0.9 },
              '100%': { transform: 'translateY(-120%) scale(1.2)', opacity: 0 },
            },
          }}
        >
          {hearts.map((h) => (
            <Box
              key={h.id}
              sx={{
                position: 'absolute',
                bottom: 16,
                left: `${h.left}%`,
                color: h.color,
                fontSize: `${28 * h.scale}px`,
                animation: 'floatUp 1.2s ease-out forwards',
                textShadow: '0 2px 6px rgba(0,0,0,0.4)'
              }}
            >
              ❤
            </Box>
          ))}
        </Box>

        {/* Gifts overlay */}
        <Box sx={{ pointerEvents: 'none', position: 'absolute', left: 16, bottom: 96, zIndex: 6 }}>
          {giftBursts.map((g) => (
            <Fade in key={g.id} timeout={200}>
              <Paper elevation={3} sx={{ mb: 1, px: 1, py: 0.5, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', borderLeft: `3px solid ${g.color}` }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <span style={{ fontSize: 18 }}>{g.emoji}</span>
                  <Typography variant="caption" fontWeight={600}>{g.text}</Typography>

                </Box>
              </Paper>
            </Fade>
          ))}
        </Box>


        {/* Loading/Buffering Overlay */}
        {isBuffering && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              zIndex: 10,
            }}
          >
            <LinearProgress sx={{ width: 200, mb: 1 }} />
            <Typography variant="body2" textAlign="center">
              Buffering...
            </Typography>
          </Box>
        )}

        {/* Live Badge */}
        {isLive && (
          <Chip
            label="LIVE"
            color="error"
            size="small"
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 5,
              fontWeight: 600,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.7 },
                '100%': { opacity: 1 },
              },
            }}
          />
        )}


        {/* Live Poll overlay */}
        {poll && poll.active && (
          <Paper sx={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 6, bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', px: 2, py: 1, minWidth: 260, borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{poll.question}</Typography>
            {poll.options.map((opt, idx) => {
              const total = (poll.counts || []).reduce((a: number, b: number) => a + b, 0) || 0;
              const pct = total ? Math.round(((poll.counts[idx] || 0) / total) * 100) : 0;
              return (
                <Box key={idx} onClick={() => { if (!hasVoted) { try { socket?.emit('live:poll:vote', { streamId, optionIndex: idx }); } catch {}; setHasVoted(true); } }} sx={{ my: 0.5, cursor: hasVoted ? 'default' : 'pointer' }}>
                  <Box sx={{ position: 'relative', height: 22, bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{ position: 'absolute', inset: 0, width: `${pct}%`, bgcolor: 'rgba(33,150,243,0.6)' }} />
                    <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                      <Typography variant="caption">{opt}</Typography>
                      <Typography variant="caption">{pct}%</Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Paper>
        )}

        {/* Viewer Count */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          <Eye size={14} />
          <Typography variant="caption" fontWeight={600}>
            {viewerCount.toLocaleString()}
          </Typography>
        </Box>

        {/* Connection Quality & Stream Health */}
        <Stack
          sx={{
            position: 'absolute',
            top: 60,
            right: 16,
            zIndex: 5,
            gap: 0.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              px: 1,
              py: 0.5,
              borderRadius: 1,
            }}
          >
            {getConnectionIcon()}
            <Typography variant="caption">
              {streamQuality}
            </Typography>
          </Box>

          <Tooltip title={`Health: ${streamHealth.status} | Latency: ${streamHealth.latency}ms | FPS: ${streamHealth.fps}`}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: getHealthColor(),
                px: 1,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              <Zap size={12} />
              <Typography variant="caption">
                {streamHealth.fps}fps
              </Typography>
            </Box>
          </Tooltip>

          {/* Like counter */}
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              bgcolor: 'rgba(0, 0, 0, 0.7)', color: 'white', px: 1, py: 0.5, borderRadius: 1,
            }}
          >
            <Heart size={12} color="#ff6b6b" />
            <Typography variant="caption">{totalLikes.toLocaleString()}</Typography>
          </Box>
          {isHost && (
            <Tooltip title="Host controls">
              <IconButton size="small" sx={{ color: 'white', alignSelf: 'flex-end' }} onClick={(e) => setHostMenuAnchor(e.currentTarget)}>
                <Settings size={14} />
              </IconButton>
            </Tooltip>
          )}

        </Stack>

          {/* Goal widget */}
          {goal && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, bgcolor: 'rgba(0,0,0,0.7)', color: 'white', px: 1, py: 0.75, borderRadius: 1, minWidth: 180 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {goal.type === 'likes' ? <Heart size={12} color="#ff6b6b" /> : <Gift size={12} color="#ffd700" />}
                <Typography variant="caption" sx={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {goal.title || (goal.type === 'likes' ? 'Like Goal' : 'Support Goal')}
                </Typography>
                <Typography variant="caption">{Math.min(goal.progress, goal.target).toLocaleString()}/{goal.target.toLocaleString()}</Typography>
              </Box>
              <LinearProgress variant="determinate" value={goal.target ? Math.min(100, (goal.progress / goal.target) * 100) : 0} sx={{ height: 3, borderRadius: 1 }} />
            </Box>
          )}



        {/* Join/leave toasts */}
        <Box sx={{ position: 'absolute', bottom: 88, left: 16, zIndex: 6 }}>
          {viewerToasts.map((t) => (
            <Fade in key={t.id} timeout={200}>
              <Paper elevation={0} sx={{ mb: 0.5, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', px: 1, py: 0.25, borderRadius: 1 }}>
                <Typography variant="caption">{t.text}</Typography>
              </Paper>
            </Fade>
          ))}
        </Box>

        {/* Controls Overlay */}
        <Fade in={showControls}>
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              p: 2,
              zIndex: 5,
            }}
          >
            {/* Progress Bar */}
            {!isLive && (
              <Box sx={{ mb: 1 }}>
                <LinearProgress
                  variant="buffer"
                  value={videoRef.current?.duration ? (currentTime / videoRef.current.duration) * 100 : 0}
                  valueBuffer={buffered}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
            )}

            {/* Control Buttons */}
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton onClick={togglePlay} sx={{ color: 'white' }}>
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </IconButton>

                <Box display="flex" alignItems="center" gap={1} sx={{ minWidth: 120 }}>
                  <IconButton onClick={toggleMute} sx={{ color: 'white' }}>
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </IconButton>
                  <Slider
                    size="small"
                    value={isMuted ? 0 : volume}
                    onChange={(_, value) => handleVolumeChange(value)}
                    min={0}
                    max={1}
                    step={0.1}
                    sx={{ color: 'white', width: 80 }}
                  />
                </Box>

                {!isLive && (
                  <Typography variant="caption" sx={{ color: 'white', ml: 1 }}>
                    {formatTime(currentTime)} / {duration}
                  </Typography>
                )}
              </Box>

              <Box display="flex" alignItems="center" gap={1}>
                <IconButton
                  onClick={(e) => setSettingsAnchor(e.currentTarget)}
                  sx={{ color: 'white' }}
                >
                  <Settings size={20} />
                </IconButton>
                <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Fade>
      </Box>

      {/* Stream Info */}
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {title}
            </Typography>

            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Avatar src={streamer?.avatar} sx={{ width: 32, height: 32 }}>
                {(streamer?.displayName || '?')[0]}
              </Avatar>
              <Box>
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {streamer?.displayName || 'Unknown'}
                  </Typography>
                  {streamer?.isVerified && <Verified size={16} color="#1976d2" />}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {(streamer?.followerCount || 0).toLocaleString()} followers
                </Typography>
              </Box>
            </Box>

            <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
              <Chip label={category} size="small" color="primary" />
              {tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>

          <Box display="flex" flexDirection="column" gap={1} alignItems="flex-end">
            <FollowButton
              user={streamer}
              variant="button"
              size="small"
              context="stream"
              onFollowChange={(isFollowing) => {
                if (isFollowing) {
                  onFollow?.(streamer.id);
                } else {
                  onUnfollow?.(streamer.id);
                }
              }}
            />

            <Box display="flex" gap={0.5}>
              <Tooltip title="Like">
                <IconButton size="small" onClick={() => onLike?.(streamId)} color={isLiked ? 'error' : 'default'}>
                  <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Share">
                <IconButton size="small" onClick={() => onShare?.(streamId)}>
                  <Share2 size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Send Gift">
                <IconButton size="small" onClick={() => setShowGiftDialog(true)}>
                  <Gift size={16} />
                </IconButton>
              </Tooltip>

              <Tooltip title="More">
                <IconButton size="small" onClick={(e) => setMoreAnchor(e.currentTarget)}>
                  <MoreVertical size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Stream Stats */}
        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
          <Stack direction="row" spacing={3} divider={<Divider orientation="vertical" flexItem />}>
            <Box textAlign="center">
              <Typography variant="h6" fontWeight={600}>
                {viewerCount.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Viewers
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" fontWeight={600}>
                {streamHealth.latency}ms
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Latency
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" fontWeight={600}>
                {streamHealth.fps}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                FPS
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" fontWeight={600}>
                {(streamHealth.bitrate / 1000).toFixed(1)}k
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Bitrate
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </CardContent>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={() => setSettingsAnchor(null)}
      >
        <MenuItem disabled>
          <ListItemText primary="Quality" />
        </MenuItem>
        {qualityOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => {
              setStreamQuality(option.value);
              setSettingsAnchor(null);
            }}
            selected={streamQuality === option.value}
          >
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Menu>

      {/* More Menu */}
      <Menu
        anchorEl={moreAnchor}
        open={Boolean(moreAnchor)}
        onClose={() => setMoreAnchor(null)}
      >
        <MenuItem onClick={() => setIsBookmarked(!isBookmarked)}>
          <ListItemIcon>
            <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
          </ListItemIcon>
          <ListItemText primary={isBookmarked ? 'Remove Bookmark' : 'Bookmark'} />
        </MenuItem>
        <MenuItem onClick={() => console.log('Download')}>
          <ListItemIcon>
            <Download size={16} />
          </ListItemIcon>
          <ListItemText primary="Download" />
        </MenuItem>
        <MenuItem onClick={() => setShowReportDialog(true)}>
          <ListItemIcon>
            <Flag size={16} />
          </ListItemIcon>
          <ListItemText primary="Report" />
        </MenuItem>
      </Menu>

      {isHost && (
        <Menu anchorEl={hostMenuAnchor} open={Boolean(hostMenuAnchor)} onClose={() => setHostMenuAnchor(null)}>
          <MenuItem onClick={() => { try { socket?.emit('live:goal:set', { streamId, type: 'likes', target: 100, title: 'Quick Goal' }); } catch {}; setHostMenuAnchor(null); }}>
            <ListItemText primary="Set Like Goal (100)" />
          </MenuItem>
          <MenuItem onClick={() => { try { socket?.emit('live:goal:clear', { streamId }); } catch {}; setHostMenuAnchor(null); }}>
            <ListItemText primary="Clear Goal" />
          </MenuItem>
          <MenuItem onClick={() => { try { socket?.emit('live:poll:start', { streamId, question: 'Do you like the stream?', options: ['Yes', 'No'] }); } catch {}; setHostMenuAnchor(null); }}>
            <ListItemText primary="Start Quick Poll (Yes/No)" />
          </MenuItem>
          <MenuItem onClick={() => { try { socket?.emit('live:poll:stop', { streamId }); } catch {}; setHostMenuAnchor(null); }}>
            <ListItemText primary="Stop Poll" />
          </MenuItem>
        </Menu>
      )}


      {/* Report Dialog */}
      <Dialog open={showReportDialog} onClose={() => setShowReportDialog(false)}>
        <DialogTitle>Report Stream</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason for reporting"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReportDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              onReport?.(streamId, reportReason);
              setShowReportDialog(false);
              setReportReason('');
            }}
            variant="contained"
            color="error"
          >
            Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Gift Dialog */}
      <Dialog open={showGiftDialog} onClose={() => setShowGiftDialog(false)}>
        <DialogTitle>Send Gift</DialogTitle>
        <DialogContent>
          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} sx={{ mt: 1 }}>
            {giftOptions.map((gift) => (
              <Button
                key={gift.name}
                variant="outlined"
                onClick={() => {
                  onSendGift?.(streamId, gift.name);
                  setShowGiftDialog(false);
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  p: 2,
                  minHeight: 80,
                }}
              >
                <Typography variant="h4">{gift.emoji}</Typography>
                <Typography variant="body2">{gift.name}</Typography>
                <Typography variant="caption" color="primary">
                  {gift.cost} coins
                </Typography>
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGiftDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default EnhancedStreamPlayer;