import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Stack,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Storage as StorageIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  TrendingUp as TrendingUpIcon,
  CloudUpload as UploadIcon,
  Assessment as AnalyticsIcon
} from '@mui/icons-material';
import { AdminExtraApi } from '@/services/adminExtra';

interface MediaDashboardProps {
  timeRange?: string;
}

export default function MediaDashboard({ timeRange = '30d' }: MediaDashboardProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [analyticsRes, summaryRes] = await Promise.all([
        AdminExtraApi.getMediaAnalytics(timeRange),
        AdminExtraApi.getMediaSummary()
      ]);

      if (analyticsRes?.success) {
        setAnalytics(analyticsRes.data);
      }
      
      if (summaryRes?.success) {
        setSummary(summaryRes.data);
      }
    } catch (err) {
      console.error('Failed to load media dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const storageUsage = analytics?.storage_usage || {};
  const totalFiles = analytics?.total_files || 0;
  const recentUploads = summary?.recent_uploads || 0;
  const formatDistribution = analytics?.format_distribution || [];
  const uploadTrends = analytics?.upload_trends || [];

  // Calculate storage usage percentage (assuming 10GB limit for demo)
  const storageLimit = 10 * 1024 * 1024 * 1024; // 10GB in bytes
  const storagePercentage = Math.min((storageUsage.used_bytes || 0) / storageLimit * 100, 100);

  return (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  backgroundColor: 'primary.main',
                  color: 'white'
                }}
              >
                <ImageIcon />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatNumber(totalFiles)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Files
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  backgroundColor: 'success.main',
                  color: 'white'
                }}
              >
                <StorageIcon />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatFileSize(storageUsage.used_bytes || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Storage Used
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  backgroundColor: 'warning.main',
                  color: 'white'
                }}
              >
                <UploadIcon />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatNumber(recentUploads)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Recent Uploads (24h)
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  backgroundColor: 'info.main',
                  color: 'white'
                }}
              >
                <AnalyticsIcon />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatFileSize(analytics?.average_size || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Average File Size
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Storage Usage */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Storage Usage
            </Typography>
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">
                  {formatFileSize(storageUsage.used_bytes || 0)} / {formatFileSize(storageLimit)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {storagePercentage.toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={storagePercentage}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip 
                label={`${storageUsage.used_mb?.toFixed(1) || 0} MB`} 
                size="small" 
                color="primary" 
              />
              <Chip 
                label={`${storageUsage.used_gb?.toFixed(2) || 0} GB`} 
                size="small" 
                color="secondary" 
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Format Distribution */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              File Format Distribution
            </Typography>
            <Stack spacing={2}>
              {formatDistribution.slice(0, 5).map((format: any, index: number) => {
                const percentage = totalFiles > 0 ? (format.count / totalFiles * 100) : 0;
                return (
                  <Box key={format._id || index}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {format._id?.toUpperCase() || 'Unknown'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {format.count} files ({percentage.toFixed(1)}%)
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Upload Trends */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Upload Activity ({timeRange})
            </Typography>
            {uploadTrends.length > 0 ? (
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Daily upload activity over the selected time period
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={2}>
                  {uploadTrends.slice(-7).map((trend: any, index: number) => (
                    <Chip
                      key={index}
                      label={`${trend.date}: ${trend.count} files`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary">
                No upload activity data available for the selected period.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
