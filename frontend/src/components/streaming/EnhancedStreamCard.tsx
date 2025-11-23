import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Stack,
  Avatar,
  Chip,
  IconButton,
  Badge,
  Tooltip,
  Button,
  useTheme,
  alpha,
  Skeleton,
  Fade,
  Zoom,
  Slide,
  LinearProgress,
} from '@mui/material';
import {
  Play,
  Users,
  Eye,
  Heart,
  Share2,
  MoreVertical,
  Verified,
  Radio,
  Clock,
  Bookmark,
  BookmarkCheck,
  Gift,
  Star,
  TrendingUp,
  Volume2,
  VolumeX,
  Maximize2,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { createStreamingStyles, streamingAnimations } from './styles/streamingTheme';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedStreamCardProps {
  stream: {
    id: string;
    title: string;
    description?: string;
    thumbnail?: {
      secure_url?: string;
      url?: string;
    } | string;
    category: string;
    tags?: string[];
    viewerCount: number;
    totalViews?: number;
    duration?: string;
    isLive: boolean;
    startedAt?: string;
    scheduledAt?: string;
    streamer: {
      id: string;
      username: string;
      displayName: string;
      avatar?: string;
      isVerified?: boolean;
      followerCount?: number;
    };
  };
  variant?: 'default' | 'compact' | 'featured' | 'grid';
  showPreview?: boolean;
  autoPlay?: boolean;
  onPlay?: (streamId: string) => void;
  onBookmark?: (streamId: string) => void;
  onShare?: (streamId: string) => void;
  onFollow?: (streamerId: string) => void;
  loading?: boolean;
  featured?: boolean;
  isBookmarked?: boolean;
}

const MotionCard = motion(Card);

const EnhancedStreamCard: React.FC<EnhancedStreamCardProps> = ({
  stream,
  variant = 'default',
  showPreview = false,
  autoPlay = false,
  onPlay,
  onBookmark,
  onShare,
  onFollow,
  loading = false,
  featured = false,
  isBookmarked = false,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const streamingStyles = createStreamingStyles(theme);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  // Memoized values
  const thumbnailUrl = useMemo(() => {
    if (!stream.thumbnail) return '';
    if (typeof stream.thumbnail === 'string') return stream.thumbnail;
    return stream.thumbnail.secure_url || stream.thumbnail.url || '';
  }, [stream.thumbnail]);

  const formattedDuration = useMemo(() => {
    if (stream.isLive) return 'LIVE';
    if (stream.scheduledAt) {
      return `in ${formatDistanceToNow(new Date(stream.scheduledAt))}`;
    }
    return stream.duration || '0:00';
  }, [stream.isLive, stream.duration, stream.scheduledAt]);

  const categoryColor = useMemo(() => {
    const colors = {
      'Technology': theme.palette.info.main,
      'Gaming': theme.palette.success.main,
      'Music': theme.palette.warning.main,
      'Art': theme.palette.secondary.main,
      'Education': theme.palette.primary.main,
      'Entertainment': theme.palette.error.main,
    };
    return colors[stream.category as keyof typeof colors] || theme.palette.grey[500];
  }, [stream.category, theme.palette]);

  // Handlers
  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onPlay) {
      onPlay(stream.id);
    } else {
      router.push(`/streams/${stream.id}`);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked(!bookmarked);
    onBookmark?.(stream.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(stream.id);
  };

  const handleFollowStreamer = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFollow?.(stream.streamer.id);
  };

  const handlePlayPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  // Animation variants
  const cardVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    hover: { 
      y: -8, 
      scale: 1.02,
      transition: { type: "spring" as const, stiffness: 400, damping: 25 } 
    },
    tap: { scale: 0.98 }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } }
  };

  // Loading state
  if (loading) {
    return (
      <Card sx={{ ...streamingStyles.streamCard(), overflow: 'hidden' }}>
        <Skeleton variant="rectangular" height={200} />
        <CardContent>
          <Skeleton variant="text" height={24} />
          <Skeleton variant="text" height={20} width="60%" />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" height={16} />
              <Skeleton variant="text" height={14} width="40%" />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <MotionCard
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        whileTap="tap"
        onClick={handleCardClick}
        sx={{
          display: 'flex',
          cursor: 'pointer',
          overflow: 'hidden',
          borderRadius: 2,
          height: 120,
          bgcolor: 'background.paper',
          border: featured ? `2px solid ${theme.palette.primary.main}` : 'none',
          boxShadow: featured ? `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}` : undefined,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Box sx={{ position: 'relative', width: 180, flexShrink: 0 }}>
          <CardMedia
            component="img"
            height="120"
            image={thumbnailUrl}
            alt={stream.title}
            onLoad={() => setImageLoaded(true)}
            sx={{ 
              objectFit: 'cover',
              filter: imageLoaded ? 'none' : 'blur(5px)',
              transition: 'filter 0.3s ease-in-out'
            }}
          />
          
          {/* Live indicator */}
          {stream.isLive && (
            <Chip
              label="LIVE"
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                ...streamingStyles.liveIndicator(),
                fontSize: '0.625rem',
                height: 20,
              }}
            />
          )}

          {/* Duration */}
          <Chip
            label={formattedDuration}
            size="small"
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              bgcolor: alpha('#000', 0.7),
              color: '#fff',
              fontSize: '0.625rem',
              height: 20,
            }}
          />
        </Box>

        <CardContent sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.2 }}>
            {stream.title}
          </Typography>
          
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Avatar
              src={stream.streamer.avatar}
              sx={{ width: 24, height: 24 }}
            />
            <Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {stream.streamer.displayName}
                </Typography>
                {stream.streamer.isVerified && (
                  <Verified size={12} color={theme.palette.primary.main} />
                )}
              </Stack>
            </Stack>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Users size={12} />
              <Typography variant="caption">
                {stream.viewerCount.toLocaleString()}
              </Typography>
            </Stack>
            <Chip 
              label={stream.category} 
              size="small" 
              variant="outlined" 
              sx={{ 
                fontSize: '0.625rem',
                height: 18,
                color: categoryColor,
                borderColor: categoryColor,
              }} 
            />
          </Stack>
        </CardContent>
      </MotionCard>
    );
  }

  // Default variant
  return (
    <MotionCard
      ref={cardRef}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      onClick={handleCardClick}
      sx={{
        ...streamingStyles.streamCard(featured),
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        bgcolor: 'background.paper',
        ...(featured && {
          border: `2px solid ${theme.palette.primary.main}`,
          boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.3)}`,
        }),
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        setShowControls(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowControls(false);
      }}
    >
      {/* Main thumbnail/preview area */}
      <Box sx={{ position: 'relative', overflow: 'hidden' }}>
        <CardMedia
          component="img"
          height={variant === 'grid' ? 160 : 200}
          image={thumbnailUrl}
          alt={stream.title}
          onLoad={() => setImageLoaded(true)}
          sx={{ 
            objectFit: 'cover',
            transition: 'transform 0.3s ease-in-out, filter 0.3s ease-in-out',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            filter: imageLoaded ? 'none' : 'blur(5px)',
          }}
        />

        {/* Loading progress for live streams */}
        {stream.isLive && (
          <LinearProgress
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #ff4444, #ff6b6b, #ff8a80)',
              },
            }}
          />
        )}

        {/* Live indicator with pulse animation */}
        {stream.isLive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{ position: 'absolute', top: 12, left: 12 }}
          >
            <Chip
              label="LIVE"
              size="small"
              sx={{
                ...streamingStyles.liveIndicator(),
                boxShadow: '0 2px 8px rgba(255, 68, 68, 0.4)',
              }}
            />
          </motion.div>
        )}

        {/* Viewer count with animated background */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ position: 'absolute', top: 12, right: 12 }}
        >
          <Chip
            icon={<Users size={12} />}
            label={stream.viewerCount.toLocaleString()}
            size="small"
            sx={{
              bgcolor: alpha('#000', 0.7),
              color: '#fff',
              backdropFilter: 'blur(10px)',
              '& .MuiChip-icon': { color: '#fff' },
            }}
          />
        </motion.div>

        {/* Duration/scheduled time */}
        <Chip
          label={formattedDuration}
          size="small"
          sx={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            bgcolor: alpha('#000', 0.8),
            color: '#fff',
            fontSize: '0.625rem',
            fontWeight: 600,
          }}
        />

        {/* Hover overlay with controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <IconButton
                  sx={{
                    bgcolor: alpha('#fff', 0.9),
                    color: theme.palette.primary.main,
                    width: 56,
                    height: 56,
                    '&:hover': {
                      bgcolor: '#fff',
                      transform: 'scale(1.1)',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                  onClick={handlePlayPreview}
                >
                  <Play size={24} fill="currentColor" />
                </IconButton>
              </motion.div>

              {/* Action buttons */}
              <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                <Stack direction="row" spacing={1}>
                  <Tooltip title={bookmarked ? 'Remove bookmark' : 'Bookmark'}>
                    <IconButton
                      size="small"
                      onClick={handleBookmark}
                      sx={{
                        bgcolor: alpha('#fff', 0.2),
                        backdropFilter: 'blur(10px)',
                        color: bookmarked ? theme.palette.warning.main : '#fff',
                        '&:hover': {
                          bgcolor: alpha('#fff', 0.3),
                        },
                      }}
                    >
                      {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Share">
                    <IconButton
                      size="small"
                      onClick={handleShare}
                      sx={{
                        bgcolor: alpha('#fff', 0.2),
                        backdropFilter: 'blur(10px)',
                        color: '#fff',
                        '&:hover': {
                          bgcolor: alpha('#fff', 0.3),
                        },
                      }}
                    >
                      <Share2 size={16} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Quality indicator */}
              <Box sx={{ position: 'absolute', bottom: 12, left: 12 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Box sx={streamingStyles.qualityIndicator('good')} />
                  <Typography variant="caption" sx={{ color: '#fff', fontWeight: 500 }}>
                    HD
                  </Typography>
                </Stack>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Featured badge */}
        {featured && (
          <motion.div
            initial={{ rotate: -10, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.2 }}
            style={{ position: 'absolute', top: -5, left: -5 }}
          >
            <Chip
              icon={<Star size={12} />}
              label="Featured"
              size="small"
              sx={{
                bgcolor: theme.palette.warning.main,
                color: '#fff',
                fontWeight: 600,
                '& .MuiChip-icon': { color: '#fff' },
                boxShadow: '0 2px 8px rgba(255, 152, 0, 0.4)',
              }}
            />
          </motion.div>
        )}
      </Box>

      {/* Content area */}
      <CardContent sx={{ p: 2 }}>
        {/* Title and description */}
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600, 
            mb: 0.5,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {stream.title}
        </Typography>

        {stream.description && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
            }}
          >
            {stream.description}
          </Typography>
        )}

        {/* Streamer info */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
          <Avatar
            src={stream.streamer.avatar}
            sx={{ 
              width: 32, 
              height: 32,
              border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {stream.streamer.displayName}
              </Typography>
              {stream.streamer.isVerified && (
                <Verified size={14} color={theme.palette.primary.main} />
              )}
            </Stack>
            {stream.streamer.followerCount && (
              <Typography variant="caption" color="text.secondary">
                {stream.streamer.followerCount.toLocaleString()} followers
              </Typography>
            )}
          </Box>
          
          <Button
            size="small"
            variant="outlined"
            onClick={handleFollowStreamer}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 'auto',
              px: 1.5,
              borderRadius: 2,
            }}
          >
            Follow
          </Button>
        </Stack>

        {/* Tags and metadata */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Chip 
              label={stream.category} 
              size="small" 
              variant="filled"
              sx={{ 
                bgcolor: alpha(categoryColor, 0.1),
                color: categoryColor,
                fontWeight: 600,
                fontSize: '0.675rem',
              }} 
            />
            
            {stream.tags?.slice(0, 2).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ 
                  fontSize: '0.625rem',
                  height: 22,
                  opacity: 0.8,
                }}
              />
            ))}
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ opacity: 0.7 }}>
            <Eye size={12} />
            <Typography variant="caption">
              {(stream.totalViews || 0).toLocaleString()}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </MotionCard>
  );
};

export default EnhancedStreamCard;