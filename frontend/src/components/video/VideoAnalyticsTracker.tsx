import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  useTheme,
} from '@mui/material';
import {
  Play,
  Pause,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Download,
  TrendingUp,
  Clock,
  Users,
  Globe,
  BarChart3,
  Activity,
  Calendar,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface VideoAnalyticsData {
  postId: string;
  videoUrl: string;
  title: string;
  uploadTime: Date;
  duration: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  downloads: number;
  averageWatchTime: number;
  retentionRate: number[];
  viewsByHour: Array<{ hour: number; views: number }>;
  demographics: {
    ageGroups: Array<{ age: string; percentage: number }>;
    locations: Array<{ country: string; views: number }>;
  };
  engagement: {
    likeRate: number;
    commentRate: number;
    shareRate: number;
    bounceRate: number;
  };
  performance: {
    loadTime: number;
    bufferingEvents: number;
    qualityChanges: number;
    completionRate: number;
  };
}

interface VideoAnalyticsTrackerProps {
  videoData: VideoAnalyticsData;
  isLive?: boolean;
  onExportData?: () => void;
}

export const VideoAnalyticsTracker: React.FC<VideoAnalyticsTrackerProps> = ({
  videoData,
  isLive = false,
  onExportData,
}) => {
  const theme = useTheme();
  const [showDetails, setShowDetails] = useState(false);
  const [realTimeData, setRealTimeData] = useState(videoData);
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // Simulate real-time updates for demo
  useEffect(() => {
    if (isLive) {
      updateIntervalRef.current = setInterval(() => {
        setRealTimeData(prev => ({
          ...prev,
          views: prev.views + Math.floor(Math.random() * 5),
          likes: prev.likes + Math.floor(Math.random() * 2),
          comments: prev.comments + (Math.random() > 0.8 ? 1 : 0),
        }));
      }, 3000);
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isLive]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getEngagementColor = (rate: number) => {
    if (rate >= 0.1) return 'success';
    if (rate >= 0.05) return 'warning';
    return 'error';
  };

  const retentionChartData = realTimeData.retentionRate.map((rate, index) => ({
    time: `${Math.floor((index / realTimeData.retentionRate.length) * realTimeData.duration)}s`,
    retention: rate * 100,
  }));

  const viewsChartData = realTimeData.viewsByHour.map(item => ({
    hour: `${item.hour}:00`,
    views: item.views,
  }));

  return (
    <Box>
      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Eye color={theme.palette.primary.main} size={24} />
              <Typography variant="h6" sx={{ mt: 1 }}>
                {formatNumber(realTimeData.views)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Views
              </Typography>
              {isLive && (
                <Chip 
                  label="LIVE" 
                  color="error" 
                  size="small" 
                  sx={{ mt: 0.5 }}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Heart color={theme.palette.error.main} size={24} />
              <Typography variant="h6" sx={{ mt: 1 }}>
                {formatNumber(realTimeData.likes)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Likes
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(realTimeData.engagement.likeRate * 100).toFixed(1)}% rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <MessageCircle color={theme.palette.info.main} size={24} />
              <Typography variant="h6" sx={{ mt: 1 }}>
                {formatNumber(realTimeData.comments)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Comments
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(realTimeData.engagement.commentRate * 100).toFixed(1)}% rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Share2 color={theme.palette.success.main} size={24} />
              <Typography variant="h6" sx={{ mt: 1 }}>
                {formatNumber(realTimeData.shares)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Shares
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(realTimeData.engagement.shareRate * 100).toFixed(1)}% rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Watch Time Analytics
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Average Watch Time: {formatDuration(realTimeData.averageWatchTime)}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(realTimeData.averageWatchTime / realTimeData.duration) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {((realTimeData.averageWatchTime / realTimeData.duration) * 100).toFixed(1)}% of total duration
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Completion Rate: {(realTimeData.performance.completionRate * 100).toFixed(1)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={realTimeData.performance.completionRate * 100}
                  color={realTimeData.performance.completionRate > 0.5 ? 'success' : 'warning'}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Load Time
                  </Typography>
                  <Typography variant="body1">
                    {realTimeData.performance.loadTime.toFixed(2)}s
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Buffering Events
                  </Typography>
                  <Typography variant="body1">
                    {realTimeData.performance.bufferingEvents}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Engagement Overview
              </Typography>

              <Box sx={{ mb: 2 }}>
                {[
                  { label: 'Like Rate', value: realTimeData.engagement.likeRate, icon: <Heart size={16} /> },
                  { label: 'Comment Rate', value: realTimeData.engagement.commentRate, icon: <MessageCircle size={16} /> },
                  { label: 'Share Rate', value: realTimeData.engagement.shareRate, icon: <Share2 size={16} /> },
                  { label: 'Bounce Rate', value: realTimeData.engagement.bounceRate, icon: <TrendingUp size={16} /> },
                ].map((metric) => (
                  <Box key={metric.label} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {metric.icon}
                    <Typography variant="body2" sx={{ ml: 1, flex: 1 }}>
                      {metric.label}
                    </Typography>
                    <Chip
                      label={`${(metric.value * 100).toFixed(1)}%`}
                      size="small"
                      color={getEngagementColor(metric.value)}
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => setShowDetails(true)}
                startIcon={<BarChart3 />}
              >
                View Detailed Analytics
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Stats
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Clock size={20} />
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Duration
                    </Typography>
                    <Typography variant="h6">
                      {formatDuration(realTimeData.duration)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Download size={20} />
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Downloads
                    </Typography>
                    <Typography variant="h6">
                      {formatNumber(realTimeData.downloads)}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Activity size={20} />
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Retention
                    </Typography>
                    <Typography variant="h6">
                      {(realTimeData.retentionRate.reduce((a, b) => a + b, 0) / realTimeData.retentionRate.length * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Calendar size={20} />
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Published
                    </Typography>
                    <Typography variant="body1">
                      {realTimeData.uploadTime.toLocaleDateString()}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Analytics Dialog */}
      <Dialog 
        open={showDetails} 
        onClose={() => setShowDetails(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Detailed Video Analytics</Typography>
            {onExportData && (
              <Button
                variant="outlined"
                size="small"
                onClick={onExportData}
                startIcon={<Download />}
              >
                Export Data
              </Button>
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3}>
            {/* Retention Chart */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Audience Retention
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={retentionChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <RechartsTooltip formatter={(value) => [`${value}%`, 'Retention']} />
                    <Line 
                      type="monotone" 
                      dataKey="retention" 
                      stroke={theme.palette.primary.main} 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Views by Hour */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Views by Hour
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={viewsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar 
                      dataKey="views" 
                      fill={theme.palette.primary.main}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Demographics */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Age Demographics
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Age Group</TableCell>
                        <TableCell align="right">Percentage</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {realTimeData.demographics.ageGroups.map((group) => (
                        <TableRow key={group.age}>
                          <TableCell>{group.age}</TableCell>
                          <TableCell align="right">{group.percentage.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Top Locations */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Top Locations
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Country</TableCell>
                        <TableCell align="right">Views</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {realTimeData.demographics.locations
                        .sort((a, b) => b.views - a.views)
                        .slice(0, 5)
                        .map((location) => (
                          <TableRow key={location.country}>
                            <TableCell>{location.country}</TableCell>
                            <TableCell align="right">{formatNumber(location.views)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
};