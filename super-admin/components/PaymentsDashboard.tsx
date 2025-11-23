import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';
import { AdminExtraApi } from '../src/services/adminExtra';

interface PaymentsSummary {
  pending_count: number;
  successful_count: number;
  failed_count: number;
  total_amount: number;
  total_pending_amount: number;
}

interface PaymentsAnalytics {
  total: number;
  by_status: Record<string, number>;
  by_currency: Record<string, number>;
  by_payment_method: Record<string, number>;
  total_amount: number;
  average_amount: number;
  recent_trend: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}

export default function PaymentsDashboard() {
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [analytics, setAnalytics] = useState<PaymentsAnalytics | null>(null);
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
        AdminExtraApi.getPaymentsSummary(),
        AdminExtraApi.getPaymentsAnalytics('30d')
      ]);

      if (summaryRes?.success) {
        setSummary(summaryRes.data);
      }
      
      if (analyticsRes?.success) {
        setAnalytics(analyticsRes.data);
      }
    } catch (err) {
      console.error('Failed to load payments dashboard:', err);
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
      case 'succeeded': return 'success';
      case 'pending': 
      case 'requires_payment_method':
      case 'requires_confirmation': return 'warning';
      case 'payment_failed':
      case 'canceled': return 'error';
      default: return 'default';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'flutterwave': return 'Flutterwave';
      case 'mobile_money': return 'Mobile Money';
      case 'airtel_money': return 'Airtel Money';
      case 'paystack': return 'Paystack';
      case 'card_payment': return 'Card Payment';
      default: return method.replace('_', ' ');
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
    return <Alert severity="error">{error}</Alert>;
  }

  const successRate = summary && (summary.successful_count + summary.failed_count) > 0 
    ? (summary.successful_count / (summary.successful_count + summary.failed_count) * 100).toFixed(1)
    : '0';

  return (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Successful Payments
                </Typography>
                <Typography variant="h4" color="success.main">
                  {summary?.successful_count || 0}
                </Typography>
              </Box>
              <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Pending Payments
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {summary?.pending_count || 0}
                </Typography>
              </Box>
              <ScheduleIcon color="warning" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Failed Payments
                </Typography>
                <Typography variant="h4" color="error.main">
                  {summary?.failed_count || 0}
                </Typography>
              </Box>
              <ErrorIcon color="error" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Total Revenue
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {formatCurrency(summary?.total_amount || 0)}
                </Typography>
              </Box>
              <AttachMoneyIcon color="primary" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Success Rate */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Success Rate (Last 7 Days)
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Box flexGrow={1}>
                <LinearProgress 
                  variant="determinate" 
                  value={parseFloat(successRate)} 
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="h6" color="success.main">
                {successRate}%
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {summary?.successful_count || 0} successful out of {(summary?.successful_count || 0) + (summary?.failed_count || 0)} total attempts
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Status Distribution */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Payment Status Distribution
            </Typography>
            <Stack spacing={1}>
              {analytics?.by_status && Object.entries(analytics.by_status).map(([status, count]) => (
                <Box key={status} display="flex" justifyContent="space-between" alignItems="center">
                  <Chip 
                    label={status.replace('_', ' ')} 
                    color={getStatusColor(status) as any}
                    size="small"
                  />
                  <Typography variant="body2" fontWeight="bold">
                    {count}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Payment Method Distribution */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Payment Method Distribution
            </Typography>
            <Stack spacing={1}>
              {analytics?.by_payment_method && Object.entries(analytics.by_payment_method).map(([method, count]) => (
                <Box key={method} display="flex" justifyContent="space-between" alignItems="center">
                  <Chip 
                    label={getPaymentMethodLabel(method)} 
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                  <Typography variant="body2" fontWeight="bold">
                    {count} payments
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Currency Distribution */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Currency Distribution
            </Typography>
            <Stack spacing={1}>
              {analytics?.by_currency && Object.entries(analytics.by_currency).map(([currency, count]) => (
                <Box key={currency} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" fontWeight="medium">
                    {currency.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {count} payments
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity (7 Days)
            </Typography>
            <Stack spacing={1}>
              {analytics?.recent_trend?.slice(-3).map((day, index) => (
                <Box key={day.date} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">
                    {new Date(day.date).toLocaleDateString()}
                  </Typography>
                  <Box textAlign="right">
                    <Typography variant="body2" fontWeight="bold">
                      {day.count} payments
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {formatCurrency(day.amount)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {/* Average Payment */}
      <Grid item xs={12} md={12}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <TrendingUpIcon color="primary" />
              <Box>
                <Typography variant="h6">
                  Average Payment Amount
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {formatCurrency(analytics?.average_amount || 0)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Based on {analytics?.total || 0} payments in the last 30 days
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}