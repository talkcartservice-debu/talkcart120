import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  ArrowLeft,
  Share,
  MoreVertical,
  Verified,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { formatNumber } from '@/utils/format';

import LiveBadge from './LiveBadge';

interface StreamHeaderProps {
  stream: any;
  isLive: boolean;
  onShare?: () => void;
  onMore?: () => void;
}

export default function StreamHeader({
  stream,
  isLive,
  onShare,
  onMore,
}: StreamHeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  if (!stream) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {/* Back button */}
      <IconButton onClick={handleBack} size="small">
        <ArrowLeft size={20} />
      </IconButton>

      {/* Stream info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Avatar
            src={stream.streamer?.avatar}
            sx={{ width: 32, height: 32 }}
          >
            {stream.streamer?.displayName?.[0]?.toUpperCase()}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {stream.streamer?.displayName || stream.streamer?.username}
              </Typography>
              {stream.streamer?.isVerified && (
                <Verified size={14} color={theme.palette.primary.main} />
              )}
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {stream.title}
            </Typography>
          </Box>
        </Stack>

        {/* Stream status and metrics */}
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <LiveBadge isLive={isLive} />

          {stream?.settings?.allowChat === false && (
            <Chip
              label="Chat disabled"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}

          <Chip
            label={stream.category}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.75rem' }}
          />

          {stream.viewerCount !== undefined && (
            <Typography variant="caption" color="text.secondary">
              {formatNumber(stream.viewerCount)} viewers
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Action buttons */}
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Share">
          <IconButton onClick={onShare} size="small">
            <Share size={18} />
          </IconButton>
        </Tooltip>

        <Tooltip title="More options">
          <IconButton onClick={onMore} size="small">
            <MoreVertical size={18} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
