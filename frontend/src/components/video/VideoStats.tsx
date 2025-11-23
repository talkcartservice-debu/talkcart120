import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Play,
  Eye,
  ThumbsUp,
  Share,
  MessageCircle,
  TrendingUp,
  Clock,
  Users,
} from 'lucide-react';

interface VideoAnalytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTime: number; // in seconds
  avgWatchTime: number; // in seconds
  completionRate: number; // percentage
  engagement: number; // percentage
  topCountries: Array<{ country: string; views: number; percentage: number }>;
  viewsByHour: Array<{ hour: number; views: number }>;
  demographics: {
    ageGroups: Array<{ range: string; percentage: number }>;
    gender: Array<{ type: string; percentage: number }>;
  };
}

interface VideoStatsProps {
  analytics: VideoAnalytics;
  videoTitle: string;
  videoDuration: number;
  publishDate: Date;
}

export const VideoStats: React.FC<VideoStatsProps> = ({
  analytics,
  videoTitle,
  videoDuration,
  publishDate,
}) => {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getEngagementColor = (rate: number) => {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Video Analytics
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        {videoTitle}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
        Published: {publishDate.toLocaleDateString()} • Duration: {formatDuration(videoDuration)}
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Eye />
                </Avatar>
                <Box>
                  <Typography variant="h4">{formatNumber(analytics.views)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Views
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <ThumbsUp />
                </Avatar>
                <Box>
                  <Typography variant="h4">{formatNumber(analytics.likes)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Likes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <MessageCircle />
                </Avatar>
                <Box>
                  <Typography variant="h4">{formatNumber(analytics.comments)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Comments
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <Share />
                </Avatar>
                <Box>
                  <Typography variant="h4">{formatNumber(analytics.shares)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Shares
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Engagement Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Engagement Metrics
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Completion Rate</Typography>
                  <Typography variant="body2">{analytics.completionRate}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analytics.completionRate}
                  color={getEngagementColor(analytics.completionRate)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Engagement Rate</Typography>
                  <Typography variant="body2">{analytics.engagement}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={analytics.engagement}
                  color={getEngagementColor(analytics.engagement)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">{formatDuration(analytics.avgWatchTime)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Avg Watch Time
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6">{formatDuration(analytics.watchTime)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Watch Time
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Countries */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Countries
              </Typography>
              <List dense>
                {analytics.topCountries.slice(0, 5).map((country, index) => (
                  <ListItem key={country.country} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Chip
                        label={index + 1}
                        size="small"
                        color="primary"
                        sx={{ width: 24, height: 24 }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={country.country}
                      secondary={`${formatNumber(country.views)} views (${country.percentage}%)`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Demographics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Demographics
              </Typography>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Age Groups
              </Typography>
              {analytics.demographics.ageGroups.map((group) => (
                <Box key={group.range} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{group.range}</Typography>
                    <Typography variant="body2">{group.percentage}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={group.percentage}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Gender Distribution
              </Typography>
              <Grid container spacing={2}>
                {analytics.demographics.gender.map((gender) => (
                  <Grid item xs={6} key={gender.type}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6">{gender.percentage}%</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {gender.type}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Insights */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Insights
              </Typography>
              
              <List>
                <ListItem sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>
                      <TrendingUp />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="High Engagement"
                    secondary={`${analytics.engagement}% engagement rate is above average`}
                  />
                </ListItem>
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.main' }}>
                      <Clock />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Watch Time"
                    secondary={`Average watch time: ${formatDuration(analytics.avgWatchTime)}`}
                  />
                </ListItem>
                
                <ListItem sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <Users />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Audience Retention"
                    secondary={`${analytics.completionRate}% of viewers watched to the end`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VideoStats;