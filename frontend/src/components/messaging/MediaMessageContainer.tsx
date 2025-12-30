import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  useTheme,
  alpha,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Slider,
  Stack
} from '@mui/material';
import {
  Play,
  Pause,
  Download,
  MoreVertical,
  Image as ImageIcon,
  Video,
  Mic,
  File,
  Volume2,
  VolumeX,
  RotateCcw,
  Copy,
  Reply,
  Forward,
  Trash2
} from 'lucide-react';
import { Message, MessageMedia } from '@/types/message';
import UnifiedImageMedia from '../media/UnifiedImageMedia';
import UnifiedVideoMedia from '../media/UnifiedVideoMedia';
import { isKnownMissingFile } from '@/utils/mediaUtils';

interface MediaMessageContainerProps {
  message: Message;
  onReply?: () => void;
  onForward?: () => void;
  onDelete?: (messageId: string) => Promise<boolean>;
  onDownload?: (mediaUrl: string, filename: string) => void;
  onRetry?: (media: MessageMedia) => void;
  onPlay?: (mediaUrl: string) => void;
  onPause?: () => void;
  onVolumeChange?: (volume: number) => void;
  onMuteToggle?: () => void;
  showActions?: boolean;
  showTimestamp?: boolean;
  isOwn?: boolean;
}

const MediaMessageContainer: React.FC<MediaMessageContainerProps> = ({
  message,
  onReply,
  onForward,
  onDelete,
  onDownload,
  onRetry,
  onPlay,
  onPause,
  onVolumeChange,
  onMuteToggle,
  showActions = true,
  showTimestamp = true,
  isOwn = false
}) => {
  const theme = useTheme();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [showVolumeControl, setShowVolumeControl] = useState(false);

  const media = message.media?.[0]; // Use first media item

  // Initialize media based on type
  useEffect(() => {
    if (!media) return;

    if (media.type === 'audio') {
      const audio = audioRef.current;
      if (audio) {
        audio.volume = volume;
        audio.muted = isMuted;
      }
    }
  }, [media, volume, isMuted]);

  // Handle audio playback
  const handlePlayPause = () => {
    if (!media || media.type !== 'audio') return;

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPause?.();
    } else {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          onPlay?.(media.url);
        })
        .catch(error => {
          console.error('Error playing audio:', error);
          setError(true);
        });
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (event: Event, newValue: number | number[]) => {
    const audio = audioRef.current;
    if (audio && typeof newValue === 'number') {
      const newTime = (newValue / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (event: Event, newValue: number | number[]) => {
    if (typeof newValue === 'number') {
      const newVolume = newValue / 100;
      setVolume(newVolume);
      onVolumeChange?.(newVolume);
      
      const audio = audioRef.current;
      if (audio) {
        audio.volume = newVolume;
        setIsMuted(newVolume === 0);
      }
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    onMuteToggle?.();
    
    const audio = audioRef.current;
    if (audio) {
      audio.muted = newMuted;
      if (newMuted) {
        setVolume(0);
      } else {
        setVolume(1); // Restore to full volume when unmuting
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRetry = () => {
    if (media) {
      setLoading(true);
      setError(false);
      onRetry?.(media);
    }
  };

  const handleDownload = () => {
    if (media) {
      onDownload?.(media.url, media.filename || 'media');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleDelete = async () => {
    if (message.id && onDelete) {
      const success = await onDelete(message.id);
      if (success) {
        handleMenuClose();
      }
    }
  };

  // Check for known missing files
  const isMissingFile = media?.url && isKnownMissingFile(media.url);

  // Render different media types
  const renderMediaContent = () => {
    if (!media) return null;

    if (isMissingFile) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 120,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            border: `1px dashed ${alpha(theme.palette.error.main, 0.3)}`,
            borderRadius: 2,
            p: 2,
            position: 'relative'
          }}
        >
          <Box sx={{ textAlign: 'center', color: theme.palette.text.secondary }}>
            <File size={48} style={{ marginBottom: 8 }} />
            <Typography variant="body2">File Unavailable</Typography>
            <Typography variant="caption" color="text.secondary">
              {media.filename}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <IconButton size="small" onClick={handleRetry} title="Retry">
                <RotateCcw size={16} />
              </IconButton>
            </Box>
          </Box>
        </Box>
      );
    }

    switch (media.type) {
      case 'image':
        return (
          <Box sx={{ width: '100%', maxHeight: { xs: 200, sm: 300, md: 400 } }}>
            <UnifiedImageMedia
              src={media.url}
              alt={media.filename || 'Image'}
              maxHeight="100%"
              style={{
                borderRadius: '12px',
                objectFit: 'cover',
                display: 'block',
                width: '100%',
                height: '100%'
              }}
            />
          </Box>
        );

      case 'video':
        return (
          <Box sx={{ width: '100%', maxHeight: { xs: 200, sm: 300, md: 400 } }}>
            <UnifiedVideoMedia
              src={media.url}
              alt={media.filename || 'Video'}
              maxHeight="100%"
              style={{
                borderRadius: '12px',
                objectFit: 'cover',
                display: 'block',
                width: '100%',
                height: '100%'
              }}
            />
          </Box>
        );

      case 'audio':
        return (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: isOwn
                ? alpha(theme.palette.primary.main, 0.1)
                : alpha(theme.palette.background.paper, 0.8),
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              backdropFilter: 'blur(10px)',
              position: 'relative',
              minWidth: 120,
              maxWidth: 200
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <IconButton
                size="small"
                onClick={handlePlayPause}
                disabled={loading}
                sx={{
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  width: 24,
                  height: 24,
                  minWidth: 'unset',
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  },
                  '&.Mui-disabled': {
                    bgcolor: alpha(theme.palette.primary.main, 0.3),
                  }
                }}
              >
                {loading ? (
                  <CircularProgress size={12} />
                ) : isPlaying ? (
                  <Pause size={12} />
                ) : (
                  <Play size={12} />
                )}
              </IconButton>
              <Mic size={12} color={theme.palette.primary.main} />
              <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {media.filename || 'Voice Message'}
              </Typography>
            </Box>

            <Box sx={{ px: 0.5, mb: 1 }}>
              <Slider
                size="small"
                value={duration ? (currentTime / duration) * 100 : 0}
                onChange={handleSeek}
                sx={{ height: 2 }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={toggleMute}
                  sx={{ width: 16, height: 16, minWidth: 'unset' }}
                >
                  {isMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleMenuOpen}
                  sx={{ width: 16, height: 16, minWidth: 'unset' }}
                >
                  <MoreVertical size={10} />
                </IconButton>
              </Box>
            </Box>

            {/* Hidden audio element */}
            <audio
              ref={audioRef}
              src={media.url}
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              style={{ display: 'none' }}
            />
          </Paper>
        );

      default:
        return (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              border: `1px solid ${theme.palette.divider}`,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: alpha(theme.palette.background.paper, 0.7),
              }
            }}
            onClick={handleDownload}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <File size={16} />
              <Typography variant="body2" sx={{ flex: 1 }}>
                {media.filename}
              </Typography>
            </Box>
          </Paper>
        );
    }
  };

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 100,
          bgcolor: alpha(theme.palette.error.main, 0.1),
          border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
          borderRadius: 2,
          p: 2
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="error">
            Failed to load media
          </Typography>
          <IconButton size="small" onClick={handleRetry}>
            <RotateCcw size={16} />
          </IconButton>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {renderMediaContent()}

      {showActions && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
            opacity: 0,
            transition: 'opacity 0.2s',
            '&:hover': {
              opacity: 1
            }
          }}
        >
          <IconButton
            size="small"
            onClick={handleDownload}
            sx={{
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(10px)',
              '&:hover': {
                bgcolor: theme.palette.background.paper
              }
            }}
          >
            <Download size={14} />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(10px)',
              '&:hover': {
                bgcolor: theme.palette.background.paper
              }
            }}
          >
            <MoreVertical size={14} />
          </IconButton>
        </Box>
      )}

      {showTimestamp && message.createdAt && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: isOwn ? 'right' : 'left',
            mt: 0.5,
            color: theme.palette.text.secondary,
            fontSize: '0.65rem'
          }}
        >
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Typography>
      )}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => { onReply?.(); handleMenuClose(); }}>
          <ListItemIcon>
            <Reply size={16} />
          </ListItemIcon>
          <ListItemText>Reply</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onForward?.(); handleMenuClose(); }}>
          <ListItemIcon>
            <Forward size={16} />
          </ListItemIcon>
          <ListItemText>Forward</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <ListItemIcon>
            <Download size={16} />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Copy size={16} />
          </ListItemIcon>
          <ListItemText>Copy</ListItemText>
        </MenuItem>
        {message.isOwn && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Trash2 size={16} color={theme.palette.error.main} />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default MediaMessageContainer;