import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Block as BlockIcon,
  Verified as VerifiedIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { AdminApi } from '../src/services/api';

interface UserSummary {
  total_users: number;
  active_users: number;
  suspended_users: number;
  vendor_users: number;
  recent_signups: number;
}

interface UserDashboardProps {
  timeRange?: string;
  onRefresh?: () => void;
}

export default function UserDashboard({ timeRange = '30d', onRefresh }: UserDashboardProps) {
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch users with different filters to get summary data
      const [allUsersRes, activeUsersRes, suspendedUsersRes, vendorUsersRes] = await Promise.all([
        AdminApi.listUsers({}),
        AdminApi.listUsers({ status: 'active' }),
        AdminApi.listUsers({ status: 'suspended' }),
        AdminApi.listUsers({ role: 'vendor' })
      ]);

      if (allUsersRes?.success && activeUsersRes?.success && suspendedUsersRes?.success && vendorUsersRes?.success) {
        const totalUsers = allUsersRes.data?.length || 0;
        const activeUsers = activeUsersRes.data?.length || 0;
        const suspendedUsers = suspendedUsersRes.data?.length || 0;
        const vendorUsers = vendorUsersRes.data?.length || 0;
        
        // Calculate recent signups (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentSignups = allUsersRes.data?.filter((user: any) => 
          new Date(user.createdAt) > oneDayAgo
        ).length || 0;

        setSummary({
          total_users: totalUsers,
          active_users: activeUsers,
          suspended_users: suspendedUsers,
          vendor_users: vendorUsers,
          recent_signups: recentSignups
        });
      }
    } catch (err) {
      console.error('Failed to fetch user dashboard data:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const handleRefresh = () => {
    fetchData();
    onRefresh?.();
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          User Analytics Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  if (!summary) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          User Analytics Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Total Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'primary.main',
                    color: 'white'
                  }}
                >
                  <PeopleIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                  <Typography variant="h4">
                    {summary.total_users || 0}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    +{summary.recent_signups} new (24h)
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'success.main',
                    color: 'white'
                  }}
                >
                  <VerifiedIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                  <Typography variant="h4">
                    {summary.active_users || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.total_users > 0 
                      ? formatPercentage((summary.active_users / summary.total_users) * 100)
                      : '0%'} of total
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Vendors */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'info.main',
                    color: 'white'
                  }}
                >
                  <AssessmentIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Vendors
                  </Typography>
                  <Typography variant="h4">
                    {summary.vendor_users || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.total_users > 0 
                      ? formatPercentage((summary.vendor_users / summary.total_users) * 100)
                      : '0%'} of total
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Suspended Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'error.main',
                    color: 'white'
                  }}
                >
                  <BlockIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Suspended
                  </Typography>
                  <Typography variant="h4">
                    {summary.suspended_users || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.total_users > 0 
                      ? formatPercentage((summary.suspended_users / summary.total_users) * 100)
                      : '0%'} of total
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* User Growth Rate */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TrendingUpIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Recent Signups (24h)
                  </Typography>
                </Stack>
                <Typography variant="h5">
                  {summary.recent_signups}
                </Typography>
                <Chip 
                  label={summary.recent_signups > 0 ? 'Active Growth' : 'No New Signups'}
                  color={summary.recent_signups > 0 ? 'success' : 'default'}
                  size="small"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}