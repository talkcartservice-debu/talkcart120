import React from 'react';
import { Card, CardContent, Stack, Box, Typography, Avatar, Chip, Divider, Tooltip } from '@mui/material';
import { Verified } from 'lucide-react';
import { format } from 'date-fns';

export type CreatorSummary = {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string | null;
    isVerified?: boolean;
    followerCount?: number;
    postCount?: number;
  };
  posts: {
    totalPosts: number;
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalBookmarks: number;
    topPosts: { id: string; title: string; views: number; createdAt?: string }[];
  };
  streams: {
    totalStreams: number;
    liveNow: number;
    totalViews: number;
    peakLiveViewers: number;
    topStreams: { id: string; title: string; totalViews: number; peakViewerCount?: number; category?: string; isLive?: boolean; thumbnail?: string | null; createdAt?: string }[];
  };
  donations: {
    totalDonationsCount: number;
    totalAmount: number;
    totalNetAmount: number;
  };
};

const StatBox: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <Box textAlign="center">
    <Typography variant="h6" fontWeight={700}>{value}</Typography>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
  </Box>
);

export interface CreatorOverviewCardProps {
  data: CreatorSummary;
}

const CreatorOverviewCard: React.FC<CreatorOverviewCardProps> = ({ data }) => {
  const u = data.user;
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar src={u.avatar || undefined} alt={u.displayName} />
            <Box>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>{u.displayName}</Typography>
                {u.isVerified ? (
                  <Tooltip title="Verified">
                    <Verified size={16} color="#1976d2" />
                  </Tooltip>
                ) : null}
              </Stack>
              <Typography variant="caption" color="text.secondary">@{u.username}</Typography>
            </Box>
            <Box flex={1} />
            <Chip label={`${data.streams.liveNow > 0 ? 'LIVE' : 'Offline'}`} color={data.streams.liveNow > 0 ? 'error' : 'default'} size="small" />
          </Stack>

          {/* Totals */}
          <Box>
            <Stack direction="row" spacing={3} divider={<Divider orientation="vertical" flexItem />}> 
              <StatBox label="Followers" value={u.followerCount ?? 0} />
              <StatBox label="Posts" value={data.posts.totalPosts} />
              <StatBox label="Post Views" value={data.posts.totalViews} />
              <StatBox label="Stream Views" value={data.streams.totalViews} />
              <StatBox label="Donations" value={data.donations.totalDonationsCount} />
            </Stack>
          </Box>

          {/* Top Streams */}
          {Array.isArray(data.streams.topStreams) && data.streams.topStreams.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Top Streams</Typography>
              <Stack spacing={0.75}>
                {data.streams.topStreams.map((s) => (
                  <Stack key={s.id} direction="row" spacing={1} alignItems="center">
                    {!!s.isLive && <Chip size="small" label="LIVE" color="error" />}
                    <Typography variant="body2" sx={{ flex: 1 }} noWrap title={s.title}>{s.title}</Typography>
                    <Typography variant="caption" color="text.secondary">views: {s.totalViews}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          {/* Top Posts */}
          {Array.isArray(data.posts.topPosts) && data.posts.topPosts.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Top Posts</Typography>
              <Stack spacing={0.75}>
                {data.posts.topPosts.map((p) => (
                  <Stack key={p.id} direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" sx={{ flex: 1 }} noWrap title={p.title}>{p.title}</Typography>
                    <Typography variant="caption" color="text.secondary">views: {p.views}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default CreatorOverviewCard;