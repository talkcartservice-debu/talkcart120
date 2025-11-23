import React from 'react';
import {
  Box,
  Stack,
  Typography,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Eye,
  Users,
  TrendingUp,
} from 'lucide-react';
import { formatNumber } from '@/utils/format';
import LiveBadge from './LiveBadge';

interface StreamMetricsProps {
  viewerCount?: number;
  peakViewerCount?: number;
  totalViews?: number;
  isLive?: boolean;
  category?: string;
  compact?: boolean;
}

export default function StreamMetrics({
  viewerCount = 0,
  peakViewerCount,
  totalViews,
  isLive = false,
  category,
  compact = false,
}: StreamMetricsProps) {
  const theme = useTheme();

  if (compact) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <LiveBadge isLive={isLive} size="small" />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          <Eye size={12} />
          <Typography variant="caption" fontWeight={600}>
            {formatNumber(viewerCount)}
          </Typography>
        </Box>
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.95),
        borderRadius: 2,
        p: 2,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Stack spacing={2}>
        {/* Live status and category */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <LiveBadge isLive={isLive} />

          {category && (
            <Chip
              label={category}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>

        {/* Metrics */}
        <Stack spacing={1.5}>
          {/* Current viewers */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Eye size={16} color={theme.palette.text.secondary} />
            <Typography variant="body2" color="text.secondary">
              Current viewers:
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatNumber(viewerCount)}
            </Typography>
          </Stack>

          {/* Peak viewers */}
          {peakViewerCount !== undefined && peakViewerCount > 0 && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <TrendingUp size={16} color={theme.palette.text.secondary} />
              <Typography variant="body2" color="text.secondary">
                Peak viewers:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatNumber(peakViewerCount)}
              </Typography>
            </Stack>
          )}

          {/* Total views */}
          {totalViews !== undefined && totalViews > 0 && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Users size={16} color={theme.palette.text.secondary} />
              <Typography variant="body2" color="text.secondary">
                Total views:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatNumber(totalViews)}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
