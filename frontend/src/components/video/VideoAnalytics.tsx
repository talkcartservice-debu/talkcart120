import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Wifi,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  X,
  Play,
  Pause,
  Eye,
  Users,
} from 'lucide-react';
import { getVideoMaintenanceManager, VideoPerformanceMetrics } from '@/utils/videoMaintenance';
import { useVideoFeed } from './VideoFeedManager';

interface VideoAnalyticsProps {
  open: boolean;
  onClose: () => void;
}

export const VideoAnalytics: React.FC<VideoAnalyticsProps> = ({ open, onClose }) => {
  const { getVideoStats } = useVideoFeed();
  const [performanceData, setPerformanceData] = useState<{
    summary: any;
    recommendations: string[];
    metrics: VideoPerformanceMetrics[];
  }>({
    summary: {},
    recommendations: [],
    metrics: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  // Refresh performance data
  const refreshData = async () => {
    setRefreshing(true);
    try {
      const manager = getVideoMaintenanceManager();
      const summary = manager.getPerformanceSummary();
      const recommendations = manager.getOptimizationRecommendations();
      
      setPerformanceData({
        summary,
        recommendations,
        metrics: [], // Would be populated from manager if we had access to metrics
      });
    } catch (error) {
      console.error('Failed to refresh analytics data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-refresh data when dialog opens
  useEffect(() => {
    if (open) {
      refreshData();
      const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
    // Explicitly return undefined for the case when open is false
    return undefined;
  }, [open]);

  const feedStats = getVideoStats();

  // Format performance score
  const getPerformanceScore = () => {
    const { summary } = performanceData;
    if (!summary.totalVideos) return 0;

    let score = 100;
    
    // Deduct points for high load times
    if (summary.avgLoadTime > 3000) score -= 20;
    else if (summary.avgLoadTime > 1500) score -= 10;
    
    // Deduct points for errors
    if (summary.totalErrors > 0) score -= Math.min(30, summary.totalErrors * 5);
    
    // Deduct points for high memory usage
    if (summary.memoryUsage > 400) score -= 15;
    else if (summary.memoryUsage > 200) score -= 5;
    
    // Deduct points for poor network
    if (summary.networkCondition === 'slow') score -= 10;
    
    return Math.max(0, score);
  };

  const performanceScore = getPerformanceScore();
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle color="#4caf50" />;
    if (score >= 60) return <AlertTriangle color="#ff9800" />;
    return <XCircle color="#f44336" />;
  };

  // Export analytics data
  const exportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      feedStats,
      performanceData,
      performanceScore,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <BarChart3 size={24} />
            <Typography variant="h6">Video Analytics</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh Data">
              <IconButton onClick={refreshData} disabled={refreshing}>
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export Data">
              <IconButton onClick={exportData}>
                <Download size={20} />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} size="small">
              <X size={20} />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 1 }}>
          {/* Performance Score */}
          <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Overall Performance Score</Typography>
                {getScoreIcon(performanceScore)}
              </Box>
              
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={performanceScore}
                    color={getScoreColor(performanceScore) as any}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Typography variant="h4" color={`${getScoreColor(performanceScore)}.main`}>
                  {performanceScore}
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {performanceScore >= 80 && 'Excellent video performance'}
                {performanceScore >= 60 && performanceScore < 80 && 'Good video performance with room for improvement'}
                {performanceScore < 60 && 'Video performance needs optimization'}
              </Typography>
            </CardContent>
          </Card>

          {/* Current Session Stats */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Session Statistics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                      <Play size={20} color="#2196f3" />
                    </Box>
                    <Typography variant="h4" color="primary">
                      {feedStats.totalVideos}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Videos
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                      <Eye size={20} color="#4caf50" />
                    </Box>
                    <Typography variant="h4" color="success.main">
                      {feedStats.playingVideos}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Currently Playing
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                      <Users size={20} color="#ff9800" />
                    </Box>
                    <Typography variant="h4" color="warning.main">
                      {feedStats.visibleVideos}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Visible Videos
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Box textAlign="center">
                    <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
                      <Clock size={20} color="#9c27b0" />
                    </Box>
                    <Typography variant="h4" color="secondary.main">
                      {Math.floor(feedStats.totalViewTime / 60)}m
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Watch Time
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Metrics
                  </Typography>
                  
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Average Load Time</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {performanceData.summary.avgLoadTime ? 
                          `${Math.round(performanceData.summary.avgLoadTime)}ms` : 'N/A'}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (performanceData.summary.avgLoadTime || 0) / 50)}
                      color={performanceData.summary.avgLoadTime > 3000 ? 'error' : 
                             performanceData.summary.avgLoadTime > 1500 ? 'warning' : 'success'}
                      sx={{ height: 4 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Memory Usage</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {performanceData.summary.memoryUsage || 0}MB
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (performanceData.summary.memoryUsage || 0) / 5)}
                      color={performanceData.summary.memoryUsage > 400 ? 'error' : 
                             performanceData.summary.memoryUsage > 200 ? 'warning' : 'success'}
                      sx={{ height: 4 }}
                    />
                  </Box>

                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">Total Errors</Typography>
                      <Typography variant="body2" fontWeight="bold" color={
                        performanceData.summary.totalErrors > 0 ? 'error.main' : 'success.main'
                      }>
                        {performanceData.summary.totalErrors || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Information
                  </Typography>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Wifi size={20} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Network Condition"
                        secondary={
                          <Chip
                            label={performanceData.summary.networkCondition || 'Unknown'}
                            size="small"
                            color={
                              performanceData.summary.networkCondition === 'fast' ? 'success' :
                              performanceData.summary.networkCondition === 'moderate' ? 'warning' :
                              performanceData.summary.networkCondition === 'slow' ? 'error' : 'default'
                            }
                          />
                        }
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <Monitor size={20} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Device Performance"
                        secondary={
                          <Chip
                            label={performanceData.summary.devicePerformance || 'Unknown'}
                            size="small"
                            color={
                              performanceData.summary.devicePerformance === 'high' ? 'success' :
                              performanceData.summary.devicePerformance === 'medium' ? 'warning' :
                              performanceData.summary.devicePerformance === 'low' ? 'error' : 'default'
                            }
                          />
                        }
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <Clock size={20} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Total Buffering Time"
                        secondary={`${Math.round((performanceData.summary.totalBufferingTime || 0) / 1000)}s`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recommendations */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Optimization Recommendations
              </Typography>
              
              {performanceData.recommendations.length === 0 ? (
                <Alert severity="info">
                  Loading recommendations...
                </Alert>
              ) : (
                <List>
                  {performanceData.recommendations.map((recommendation, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemIcon>
                          {recommendation.includes('optimal') ? (
                            <CheckCircle size={20} color="#4caf50" />
                          ) : (
                            <AlertTriangle size={20} color="#ff9800" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={recommendation}
                          primaryTypographyProps={{
                            color: recommendation.includes('optimal') ? 'success.main' : 'text.primary'
                          }}
                        />
                      </ListItem>
                      {index < performanceData.recommendations.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>

          {/* Performance Trends */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Trends
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Performance trend data will be available after extended usage. 
                Keep the analytics running to collect historical data.
              </Alert>
              
              <Box display="flex" alignItems="center" gap={2}>
                <TrendingUp size={20} color="#4caf50" />
                <Typography variant="body2" color="text.secondary">
                  Trend analysis requires at least 24 hours of usage data
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button onClick={refreshData} disabled={refreshing} startIcon={<RefreshCw size={16} />}>
          Refresh Data
        </Button>
        <Button onClick={exportData} variant="outlined" startIcon={<Download size={16} />}>
          Export Analytics
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VideoAnalytics;