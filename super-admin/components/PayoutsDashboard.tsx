import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  AccountBalance,
  Warning,
  CheckCircle,
  Schedule,
  Error
} from '@mui/icons-material';
import { AdminExtraApi } from '@/services/adminExtra';

interface PayoutsSummary {
  pending_count: number;
  total_pending_amount: number;
  failed_count: number;
  total_failed_amount: number;
}

interface PayoutsAnalytics {
  total: number;
  by_status: Record<string, number>;
  by_destination: Record<string, number>;
  total_amount: number;
  average_amount: number;
  recent_trend: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}

export default function PayoutsDashboard() {
  const [summary, setSummary] = useState<PayoutsSummary | null>(null);
  const [analytics, setAnalytics] = useState<PayoutsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [summaryRes, analyticsRes] = await Promise.all([
        AdminExtraApi.getPayoutsSummary(),
        AdminExtraApi.getPayoutsAnalytics('30d')
      ]);

      if (summaryRes?.success) {
        setSummary(summaryRes.data);
      }
      
      if (analyticsRes?.success) {
        setAnalytics(analyticsRes.data);
      }
    } catch (err) {
      console.error('Failed to load payouts dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'canceled': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle />;
      case 'pending': return <Schedule />;
      case 'failed': return <Error />;
      case 'canceled': return <Warning />;
      default: return <AccountBalance />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={loadDashboardData}>
          Retry
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Payouts Overview
      </Typography>
      
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Pending Payouts
                  </Typography>
                  <Typography variant="h5">
                    {summary?.pending_count || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {formatCurrency(summary?.total_pending_amount || 0)}
                  </Typography>
                </Box>
                <Schedule color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Failed Payouts
                  </Typography>
                  <Typography variant="h5" color="error">
                    {summary?.failed_count || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {formatCurrency(summary?.total_failed_amount || 0)}
                  </Typography>
                </Box>
                <Error color="error" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Payouts (30d)
                  </Typography>
                  <Typography variant="h5">
                    {analytics?.total || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {formatCurrency(analytics?.total_amount || 0)}
                  </Typography>
                </Box>
                <TrendingUp color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Average Amount
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(analytics?.average_amount || 0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Per payout
                  </Typography>
                </Box>
                <AccountBalance color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Distribution
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {analytics?.by_status && Object.entries(analytics.by_status).map(([status, count]) => (
                  <Chip
                    key={status}
                    icon={getStatusIcon(status)}
                    label={`${status}: ${count}`}
                    color={getStatusColor(status) as any}
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Destinations */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Destinations
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                {analytics?.by_destination && Object.entries(analytics.by_destination)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([destination, count]) => (
                    <Box key={destination} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>
                        {destination.length > 20 ? `${destination.substring(0, 20)}...` : destination}
                      </Typography>
                      <Chip label={count} size="small" />
                    </Box>
                  ))}
                {(!analytics?.by_destination || Object.keys(analytics.by_destination).length === 0) && (
                  <Typography variant="body2" color="textSecondary">
                    No destination data available
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Trend */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity (Last 7 Days)
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                {analytics?.recent_trend?.map((day) => (
                  <Box key={day.date} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">
                      {new Date(day.date).toLocaleDateString()}
                    </Typography>
                    <Box display="flex" gap={2}>
                      <Typography variant="body2">
                        {day.count} payouts
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(day.amount)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
