import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  IconButton,
  Slider,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Fade,
  LinearProgress,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Settings,
  Maximize2,
  Minimize2,
  RotateCcw,
  FastForward,
  Rewind,
  SkipBack,
  SkipForward,
  Download,
  Share,
  MoreHorizontal,
  Wifi,
  Monitor,
  Zap,
  Eye,
  Clock,
  Activity,
} from 'lucide-react';
import { getVideoQualityManager, VideoQualityLevel } from '@/utils/videoQualityManager';
import { getVolumeIcon, getVolumeTooltip, formatVideoTime } from '@/utils/videoUtils';

interface VideoControlsProps {
  videoElement: HTMLVideoElement | null;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  buffered: number;
  isFullscreen: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onFullscreenToggle: () => void;
  onQualityChange?: (qualityId: string) => void;
  onDownload?: () => void;
  onShare?: () => void;
  showQualitySelector?: boolean;
  showDownload?: boolean;
  showShare?: boolean;
  showAdvancedControls?: boolean;
  className?: string;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  videoElement,
  isPlaying,
  isMuted,
  volume,
  currentTime,
  duration,
  buffered,
  isFullscreen,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onQualityChange,
  onDownload,
  onShare,
  showQualitySelector = true,
  showDownload = false,
  showShare = false,
  showAdvancedControls = false,
  className,
}) => {
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const [qualityAnchor, setQualityAnchor] = useState<null | HTMLElement>(null);
  const [moreAnchor, setMoreAnchor] = useState<null | HTMLElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [qualityStats, setQualityStats] = useState<any>(null);
  const [adaptiveQuality, setAdaptiveQuality] = useState(true);
  
  const qualityManager = getVideoQualityManager();
  const volumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use centralized time formatting utility
  const formatTime = formatVideoTime;

  // Update quality stats
  useEffect(() => {
    const updateStats = () => {
      setQualityStats(qualityManager.getQualityStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [qualityManager]);

  // Handle seek
  const handleSeek = useCallback((event: Event, value: number | number[]) => {
    if (typeof value === 'number') {
      onSeek(value);
    }
  }, [onSeek]);

  // Handle volume change
  const handleVolumeChange = useCallback((event: Event, value: number | number[]) => {
    if (typeof value === 'number') {
      onVolumeChange(value / 100);
    }
  }, [onVolumeChange]);

  // Handle volume hover
  const handleVolumeHover = useCallback(() => {
    setShowVolumeSlider(true);
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
  }, []);

  const handleVolumeLeave = useCallback(() => {
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 1000);
  }, []);

  // Handle quality change
  const handleQualityChange = useCallback((qualityId: string) => {
    if (qualityId === 'auto') {
      setAdaptiveQuality(true);
      if (videoElement) {
        const optimalQuality = qualityManager.getOptimalQuality(videoElement);
        onQualityChange?.(optimalQuality.id);
      }
    } else {
      setAdaptiveQuality(false);
      onQualityChange?.(qualityId);
    }
    setQualityAnchor(null);
  }, [qualityManager, videoElement, onQualityChange]);

  // Handle skip forward/backward
  const handleSkip = useCallback((seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    onSeek(newTime);
  }, [currentTime, duration, onSeek]);

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercentage = duration > 0 ? (buffered / duration) * 100 : 0;

  // Use centralized volume icon utility

  // Get current quality info
  const getCurrentQualityInfo = () => {
    if (!qualityStats?.currentQuality) return 'Auto';
    const quality = qualityStats.currentQuality;
    return adaptiveQuality ? `Auto (${quality.label})` : quality.label;
  };

  return (
    <Box
      className={className}
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        color: 'white',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {/* Progress Bar */}
      <Box sx={{ position: 'relative', mb: 1 }}>
        {/* Buffer Progress */}
        <LinearProgress
          variant="determinate"
          value={bufferPercentage}
          sx={{
            position: 'absolute',
            width: '100%',
            height: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
            },
          }}
        />
        
        {/* Playback Progress */}
        <Slider
          value={progressPercentage}
          onChange={handleSeek}
          onChangeCommitted={() => setIsDragging(false)}
          onMouseDown={() => setIsDragging(true)}
          sx={{
            position: 'relative',
            height: 4,
            color: 'primary.main',
            '& .MuiSlider-thumb': {
              width: 12,
              height: 12,
              '&:hover, &.Mui-focusVisible': {
                boxShadow: '0 0 0 8px rgba(25, 118, 210, 0.16)',
              },
            },
            '& .MuiSlider-track': {
              height: 4,
              border: 'none',
            },
            '& .MuiSlider-rail': {
              height: 4,
              backgroundColor: 'transparent',
            },
          }}
        />
      </Box>

      {/* Main Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Play/Pause */}
          <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
            <IconButton
              onClick={isPlaying ? onPause : onPlay}
              sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </IconButton>
          </Tooltip>

          {/* Skip Controls */}
          {showAdvancedControls && (
            <>
              <Tooltip title="Skip back 10s">
                <IconButton
                  onClick={() => handleSkip(-10)}
                  sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
                >
                  <SkipBack size={20} />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Skip forward 10s">
                <IconButton
                  onClick={() => handleSkip(10)}
                  sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
                >
                  <SkipForward size={20} />
                </IconButton>
              </Tooltip>
            </>
          )}

          {/* Volume Controls */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}
            onMouseEnter={handleVolumeHover}
            onMouseLeave={handleVolumeLeave}
          >
            <Tooltip title={getVolumeTooltip(volume)}>
              <IconButton
                onClick={onMuteToggle}
                sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
              >
                {getVolumeIcon(volume, isMuted)}
              </IconButton>
            </Tooltip>

            <Fade in={showVolumeSlider}>
              <Box sx={{ width: 80, ml: 1 }}>
                <Slider
                  value={volume * 100}
                  onChange={handleVolumeChange}
                  sx={{
                    color: 'white',
                    '& .MuiSlider-thumb': {
                      width: 12,
                      height: 12,
                    },
                  }}
                />
              </Box>
            </Fade>
          </Box>

          {/* Time Display */}
          <Typography variant="body2" sx={{ color: 'white', minWidth: 100 }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
        </Box>

        {/* Right Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Quality Indicator */}
          {showQualitySelector && qualityStats && (
            <Tooltip title="Video Quality">
              <Chip
                label={getCurrentQualityInfo()}
                size="small"
                onClick={(e) => setQualityAnchor(e.currentTarget)}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  },
                }}
              />
            </Tooltip>
          )}

          {/* Network/Performance Indicators */}
          {qualityStats?.networkCondition && (
            <Tooltip title={`Network: ${qualityStats.networkCondition.connectionType} (${qualityStats.networkCondition.bandwidth}Mbps)`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Wifi size={16} color={
                  qualityStats.networkCondition.bandwidth > 5 ? '#4caf50' :
                  qualityStats.networkCondition.bandwidth > 2 ? '#ff9800' : '#f44336'
                } />
              </Box>
            </Tooltip>
          )}

          {/* Settings */}
          <Tooltip title="Settings">
            <IconButton
              onClick={(e) => setSettingsAnchor(e.currentTarget)}
              sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
            >
              <Settings size={20} />
            </IconButton>
          </Tooltip>

          {/* More Options */}
          {(showDownload || showShare) && (
            <Tooltip title="More options">
              <IconButton
                onClick={(e) => setMoreAnchor(e.currentTarget)}
                sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
              >
                <MoreHorizontal size={20} />
              </IconButton>
            </Tooltip>
          )}

          {/* Fullscreen */}
          <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconButton
              onClick={onFullscreenToggle}
              sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Quality Menu */}
      <Menu
        anchorEl={qualityAnchor}
        open={Boolean(qualityAnchor)}
        onClose={() => setQualityAnchor(null)}
        PaperProps={{
          sx: { bgcolor: 'rgba(0, 0, 0, 0.9)', color: 'white', minWidth: 200 }
        }}
      >
        <MenuItem onClick={() => handleQualityChange('auto')}>
          <ListItemIcon>
            <Zap size={16} color="white" />
          </ListItemIcon>
          <ListItemText 
            primary="Auto" 
            secondary="Adaptive quality"
            secondaryTypographyProps={{ color: 'rgba(255, 255, 255, 0.7)' }}
          />
          {adaptiveQuality && <Activity size={16} color="#4caf50" />}
        </MenuItem>
        
        <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
        
        {qualityStats?.availableQualities
          ?.filter((q: VideoQualityLevel) => q.id !== 'auto')
          ?.reverse()
          ?.map((quality: VideoQualityLevel) => (
            <MenuItem 
              key={quality.id} 
              onClick={() => handleQualityChange(quality.id)}
              selected={!adaptiveQuality && qualityStats?.currentQuality?.id === quality.id}
            >
              <ListItemIcon>
                <Monitor size={16} color="white" />
              </ListItemIcon>
              <ListItemText 
                primary={quality.label}
                secondary={`${quality.bitrate}kbps`}
                secondaryTypographyProps={{ color: 'rgba(255, 255, 255, 0.7)' }}
              />
            </MenuItem>
          ))}
      </Menu>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={() => setSettingsAnchor(null)}
        PaperProps={{
          sx: { bgcolor: 'rgba(0, 0, 0, 0.9)', color: 'white', minWidth: 250 }
        }}
      >
        <MenuItem>
          <FormControlLabel
            control={
              <Switch
                checked={adaptiveQuality}
                onChange={(e) => setAdaptiveQuality(e.target.checked)}
                size="small"
              />
            }
            label="Adaptive Quality"
            sx={{ color: 'white', width: '100%' }}
          />
        </MenuItem>
        
        <Divider sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
        
        {qualityStats && (
          <>
            <MenuItem disabled>
              <ListItemIcon>
                <Activity size={16} color="white" />
              </ListItemIcon>
              <ListItemText 
                primary="Performance"
                secondary={`Buffer: ${Math.round((qualityStats.averageBufferHealth || 0) * 100)}%`}
                secondaryTypographyProps={{ color: 'rgba(255, 255, 255, 0.7)' }}
              />
            </MenuItem>
            
            {qualityStats.networkCondition && (
              <MenuItem disabled>
                <ListItemIcon>
                  <Wifi size={16} color="white" />
                </ListItemIcon>
                <ListItemText 
                  primary="Network"
                  secondary={`${qualityStats.networkCondition.bandwidth}Mbps ${qualityStats.networkCondition.connectionType}`}
                  secondaryTypographyProps={{ color: 'rgba(255, 255, 255, 0.7)' }}
                />
              </MenuItem>
            )}
          </>
        )}
      </Menu>

      {/* More Options Menu */}
      <Menu
        anchorEl={moreAnchor}
        open={Boolean(moreAnchor)}
        onClose={() => setMoreAnchor(null)}
        PaperProps={{
          sx: { bgcolor: 'rgba(0, 0, 0, 0.9)', color: 'white' }
        }}
      >
        {showDownload && (
          <MenuItem onClick={() => { onDownload?.(); setMoreAnchor(null); }}>
            <ListItemIcon>
              <Download size={16} color="white" />
            </ListItemIcon>
            <ListItemText primary="Download" />
          </MenuItem>
        )}
        
        {showShare && (
          <MenuItem onClick={() => { onShare?.(); setMoreAnchor(null); }}>
            <ListItemIcon>
              <Share size={16} color="white" />
            </ListItemIcon>
            <ListItemText primary="Share" />
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default VideoControls;