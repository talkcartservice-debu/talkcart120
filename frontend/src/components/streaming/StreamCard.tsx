import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Avatar,
  Stack,
  IconButton,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Play,
  Users,
  Eye,
  Heart,
  Share2,
  MoreVertical,
  Radio,
  Clock,
} from 'lucide-react';
import { useRouter } from 'next/router';
import OptimizedImage from '@/components/media/OptimizedImage';
import { Stream } from '@/services/streamingApi';
import { formatDistanceToNow } from 'date-fns';
import { formatNumber } from '@/utils/format';

interface StreamCardProps {
  stream: Stream;
  variant?: 'default' | 'compact' | 'featured';
  showActions?: boolean;
  onClick?: () => void;
}

const StreamCard: React.FC<StreamCardProps> = ({
  stream,
  variant = 'default',
  showActions = true,
  onClick,
}) => {
  const theme = useTheme();
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/streams/${stream.id}`);
    }
  };

  const handleStreamerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/profile/${stream.streamer.username}`);
  };

  const handleActionClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    // Handle actions like like, share, etc.
    console.log(`Action: ${action} on stream ${stream.id}`);
  };

  const getThumbnail = () => {
    if (stream.thumbnail?.secure_url) {
      return stream.thumbnail.secure_url;
    }
    // Fallback to a placeholder
    return `https://picsum.photos/400/225?random=${stream.id}`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m`;
    }
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  if (variant === 'compact') {
    return (
      <Card
        sx={{
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[8],
          },
        }}
        onClick={handleClick}
      >
        <Box sx={{ display: 'flex', p: 2 }}>
          <Box sx={{ position: 'relative', mr: 2 }}>
            <Box
              sx={{
                width: 120,
                height: 68,
                borderRadius: 1,
                overflow: 'hidden',
                position: 'relative',
                bgcolor: 'grey.200',
              }}
            >
              <OptimizedImage src={getThumbnail()} alt={stream.title} fill sizes="240px" style={{ objectFit: 'cover' }} quality={80} />
              {stream.isLive && (
                <Chip
                  label="LIVE"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    bgcolor: 'error.main',
                    color: 'white',
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
              )}
            </Box>
          </Box>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={600} noWrap>
              {stream.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {stream.streamer.displayName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Users size={12} />
                <Typography variant="caption">
                  {formatNumber(stream.viewerCount)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {stream.category}
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: 3,
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[12],
          '& .stream-overlay': {
            opacity: 1,
          },
          '& .stream-actions': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
      }}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <Box sx={{ position: 'relative', aspectRatio: '16/9' }}>
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <OptimizedImage src={getThumbnail()} alt={stream.title} fill sizes="(max-width: 1200px) 100vw, 50vw" style={{ objectFit: 'cover' }} quality={80} />
        </Box>
        
        {/* Live Badge */}
        {stream.isLive && (
          <Badge
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              '& .MuiBadge-badge': {
                bgcolor: 'error.main',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 600,
                px: 1,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              },
            }}
            badgeContent={
              <>
                <Radio size={10} />
                LIVE
              </>
            }
          />
        )}

        {/* Duration for non-live streams */}
        {!stream.isLive && stream.duration > 0 && (
          <Chip
            label={formatDuration(stream.duration)}
            size="small"
            sx={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              bgcolor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              fontSize: '0.75rem',
            }}
          />
        )}

        {/* Viewer Count */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.75rem',
          }}
        >
          <Eye size={12} />
          <Typography variant="caption" color="inherit">
            {formatNumber(stream.viewerCount)}
          </Typography>
        </Box>

        {/* Hover Overlay */}
        <Box
          className="stream-overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          <IconButton
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              '&:hover': {
                bgcolor: 'white',
                transform: 'scale(1.1)',
              },
            }}
          >
            <Play size={24} />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <CardContent sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={600} noWrap gutterBottom>
          {stream.title}
        </Typography>

        {/* Streamer Info */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Avatar
            src={stream.streamer.avatar}
            alt={stream.streamer.displayName}
            sx={{ width: 24, height: 24, cursor: 'pointer' }}
            onClick={handleStreamerClick}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ cursor: 'pointer' }}
            onClick={handleStreamerClick}
          >
            {stream.streamer.displayName}
          </Typography>
          {stream.streamer.isVerified && (
            <Box sx={{ color: 'primary.main' }}>
              ✓
            </Box>
          )}
        </Stack>

        {/* Category and Tags */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Chip
            label={stream.category}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
          {stream.tags.slice(0, 2).map((tag) => (
            <Chip
              key={tag}
              label={`#${tag}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          ))}
        </Stack>

        {/* Stream Stats */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Eye size={14} />
            <Typography variant="caption">
              {formatNumber(stream.totalViews)} views
            </Typography>
          </Box>
          {stream.startedAt && (
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(stream.startedAt), { addSuffix: true })}
            </Typography>
          )}
        </Stack>

        {/* Actions */}
        {showActions && (
          <Stack
            className="stream-actions"
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              opacity: 0.7,
              transform: 'translateY(4px)',
              transition: 'all 0.3s ease',
            }}
          >
            <Stack direction="row" spacing={1}>
              <IconButton
                size="small"
                onClick={(e) => handleActionClick(e, 'like')}
              >
                <Heart size={16} />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => handleActionClick(e, 'share')}
              >
                <Share2 size={16} />
              </IconButton>
            </Stack>
            <IconButton
              size="small"
              onClick={(e) => handleActionClick(e, 'more')}
            >
              <MoreVertical size={16} />
            </IconButton>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default StreamCard;