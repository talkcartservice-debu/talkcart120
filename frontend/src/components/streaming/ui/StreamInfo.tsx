import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Collapse,
  IconButton,
  Avatar,
  Divider,
  useTheme,
} from '@mui/material';
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Eye,
  Users,
  Clock,
  Verified,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatNumber } from '@/utils/format';

interface StreamInfoProps {
  stream: any;
  creatorSummary?: any;
}

export default function StreamInfo({ stream, creatorSummary }: StreamInfoProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (!stream) return null;

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Card
      sx={{
        mt: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(18,18,18,0.9)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(6px)'
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Stream title and basic info */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {stream.title}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <Chip
                label={stream.category || 'General'}
                size="small"
                color="primary"
              />
              
              {Array.isArray(stream.tags) && stream.tags.map((tag: string) => (
                <Chip
                  key={tag}
                  label={`#${tag}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>

          {/* Stream metrics */}
          <Stack direction="row" spacing={3} flexWrap="wrap">
            {stream.viewerCount !== undefined && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Eye size={16} color={theme.palette.text.secondary} />
                <Typography variant="body2" color="text.secondary">
                  {formatNumber(stream.viewerCount)} viewers
                </Typography>
              </Stack>
            )}

            {stream.startedAt && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Clock size={16} color={theme.palette.text.secondary} />
                <Typography variant="body2" color="text.secondary">
                  Started {formatDistanceToNow(new Date(stream.startedAt), { addSuffix: true })}
                </Typography>
              </Stack>
            )}

            {stream.totalViews !== undefined && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Users size={16} color={theme.palette.text.secondary} />
                <Typography variant="body2" color="text.secondary">
                  {formatNumber(stream.totalViews)} total views
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Expandable description */}
          {stream.description && (
            <>
              <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Typography variant="body2" color="text.secondary">
                  {stream.description}
                </Typography>
              </Collapse>

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <IconButton onClick={toggleExpanded} size="small">
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </IconButton>
              </Box>
            </>
          )}

          {/* Streamer info */}
          <Divider />
          
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              src={stream.streamer?.avatar}
              sx={{ width: 48, height: 48 }}
            >
              {stream.streamer?.displayName?.[0]?.toUpperCase()}
            </Avatar>

            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {stream.streamer?.displayName || stream.streamer?.username}
                </Typography>
                {stream.streamer?.isVerified && (
                  <Verified size={16} color={theme.palette.primary.main} />
                )}
              </Stack>

              <Typography variant="body2" color="text.secondary">
                {formatNumber(stream.streamer?.followerCount || 0)} followers
              </Typography>

              {creatorSummary && (
                <Typography variant="caption" color="text.secondary">
                  {creatorSummary.totalStreams} streams • {creatorSummary.totalViews} total views
                </Typography>
              )}
            </Box>
          </Stack>

          {/* Additional stream info when expanded */}
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Stack spacing={1}>
              <Divider />
              
              {stream.createdAt && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Calendar size={16} color={theme.palette.text.secondary} />
                  <Typography variant="body2" color="text.secondary">
                    Created {formatDistanceToNow(new Date(stream.createdAt), { addSuffix: true })}
                  </Typography>
                </Stack>
              )}

              {stream.language && (
                <Typography variant="body2" color="text.secondary">
                  Language: {stream.language}
                </Typography>
              )}

              {stream.settings?.isMatureContent && (
                <Chip
                  label="Mature Content"
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Stack>
          </Collapse>
        </Stack>
      </CardContent>
    </Card>
  );
}
