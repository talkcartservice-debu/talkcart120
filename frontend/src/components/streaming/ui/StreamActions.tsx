import React, { useState } from 'react';
import {
  Box,
  Stack,
  Button,
  IconButton,
  Tooltip,
  Fab,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Heart,
  Share,
  Gift,
  Crown,
  MessageCircle,
  Users,
  Flag,
  UserPlus,
  UserMinus,
} from 'lucide-react';

interface StreamActionsProps {
  stream: any;
  isStreamer: boolean;
  isAuthenticated: boolean;
  isFollowing?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onLike?: () => void;
  onShare?: () => void;
  onGift?: () => void;
  onSubscribe?: () => void;
  onReport?: () => void;
  onToggleChat?: () => void;
  showChatButton?: boolean;
}

export default function StreamActions({
  stream,
  isStreamer,
  isAuthenticated,
  isFollowing,
  onFollow,
  onUnfollow,
  onLike,
  onShare,
  onGift,
  onSubscribe,
  onReport,
  onToggleChat,
  showChatButton = false,
}: StreamActionsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    setLiked(!liked);
    onLike?.();
  };

  const handleFollow = () => {
    if (isFollowing) {
      onUnfollow?.();
    } else {
      onFollow?.();
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 2 }}>
        <Button
          variant="contained"
          fullWidth
          href="/auth/login"
          sx={{ borderRadius: 2 }}
        >
          Sign in to interact
        </Button>
      </Box>
    );
  }

  if (isMobile) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {showChatButton && (
          <Fab
            color="primary"
            onClick={onToggleChat}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.9),
              '&:hover': {
                bgcolor: theme.palette.primary.main,
              },
            }}
          >
            <MessageCircle size={24} />
          </Fab>
        )}

        <Fab
          color={liked ? 'error' : 'default'}
          onClick={handleLike}
          sx={{
            bgcolor: liked
              ? alpha(theme.palette.error.main, 0.9)
              : alpha(theme.palette.background.paper, 0.9),
            '&:hover': {
              bgcolor: liked
                ? theme.palette.error.main
                : theme.palette.background.paper,
            },
          }}
        >
          <Heart size={24} fill={liked ? 'currentColor' : 'none'} />
        </Fab>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        {/* Primary actions */}
        <Stack direction="row" spacing={1}>
          {!isStreamer && (
            <Button
              variant={isFollowing ? 'outlined' : 'contained'}
              startIcon={isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
              onClick={handleFollow}
              sx={{ flex: 1 }}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={<Crown size={16} />}
            onClick={onSubscribe}
            sx={{ flex: 1 }}
          >
            Subscribe
          </Button>
        </Stack>

        {/* Secondary actions */}
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip title="Like">
            <IconButton
              onClick={handleLike}
              color={liked ? 'error' : 'default'}
              sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                '&:hover': {
                  bgcolor: alpha(theme.palette.background.paper, 1),
                },
              }}
            >
              <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Share">
            <IconButton
              onClick={onShare}
              sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                '&:hover': {
                  bgcolor: alpha(theme.palette.background.paper, 1),
                },
              }}
            >
              <Share size={20} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Send Gift">
            <IconButton
              onClick={onGift}
              sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                '&:hover': {
                  bgcolor: alpha(theme.palette.background.paper, 1),
                },
              }}
            >
              <Gift size={20} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Report">
            <IconButton
              onClick={onReport}
              sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                '&:hover': {
                  bgcolor: alpha(theme.palette.background.paper, 1),
                },
              }}
            >
              <Flag size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}
