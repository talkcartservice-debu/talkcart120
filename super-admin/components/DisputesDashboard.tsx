import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Stack
} from '@mui/material';
import {
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  MonetizationOn as MoneyIcon,
  Assessment as AssessmentIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { AdminExtraApi } from '@/services/adminExtra';

interface DisputesSummary {
  urgent_count: number;
  total_pending: number;
  total_amount_at_risk: number;
  needs_response: number;
  overdue_evidence: number;
}

interface DisputesAnalytics {
  total: number;
  by_status: Record<string, number>;
  by_reason: Record<string, number>;
  total_amount: number;
  average_amount: number;
  recent_trend: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}

export default function DisputesDashboard() {
  const [summary, setSummary] = useState<DisputesSummary | null>(null);
  const [analytics, setAnalytics] = useState<DisputesAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, analyticsRes] = await Promise.all([
        AdminExtraApi.getDisputesSummary(),
        AdminExtraApi.getDisputesAnalytics('30d')
      ]);

      if (summaryRes?.success) {
        setSummary(summaryRes.data);
      }
      if (analyticsRes?.success) {
        setAnalytics(analyticsRes.data);
      }
    } catch (err) {
      setError('Failed to fetch disputes data');
      console.error('Disputes dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'needs_response': return 'error';
      case 'under_review': return 'warning';
      case 'won': return 'success';
      case 'lost': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={fetchData} sx={{ ml: 2 }}>Retry</Button>
      </Alert>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      {summary && (
        <>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: summary.urgent_count > 0 ? 'error.light' : 'background.paper' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>Urgent Disputes</Typography>
                    <Typography variant="h4" color={summary.urgent_count > 0 ? 'error.contrastText' : 'text.primary'}>
                      {summary.urgent_count}
                    </Typography>
                    <Typography variant="body2" color={summary.urgent_count > 0 ? 'error.contrastText' : 'text.secondary'}>
                      Evidence due &lt; 24h
                    </Typography>
                  </Box>
                  <WarningIcon color={summary.urgent_count > 0 ? 'inherit' : 'disabled'} sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>Pending Disputes</Typography>
                    <Typography variant="h4">{summary.total_pending}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Needs attention
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>Amount at Risk</Typography>
                    <Typography variant="h4" color="error">
                      {formatCurrency(summary.total_amount_at_risk)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending disputes
                    </Typography>
                  </Box>
                  <MoneyIcon color="error" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: summary.overdue_evidence > 0 ? 'warning.light' : 'background.paper' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>Overdue Evidence</Typography>
                    <Typography variant="h4" color={summary.overdue_evidence > 0 ? 'warning.contrastText' : 'text.primary'}>
                      {summary.overdue_evidence}
                    </Typography>
                    <Typography variant="body2" color={summary.overdue_evidence > 0 ? 'warning.contrastText' : 'text.secondary'}>
                      Past due date
                    </Typography>
                  </Box>
                  <ErrorIcon color={summary.overdue_evidence > 0 ? 'inherit' : 'disabled'} sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}

      {/* Analytics */}
      {analytics && (
        <>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssessmentIcon />
                  Disputes by Status
                </Typography>
                <List>
                  {Object.entries(analytics.by_status).map(([status, count]) => (
                    <ListItem key={status} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Chip 
                          label={status.replace('_', ' ')} 
                          color={getStatusColor(status) as any}
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`${count} disputes`}
                        secondary={`${((count / analytics.total) * 100).toFixed(1)}%`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon />
                  Recent Activity
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Total Disputes (30 days)</Typography>
                    <Typography variant="h5">{analytics.total}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Total Amount</Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(analytics.total_amount)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Average Amount</Typography>
                    <Typography variant="body1">
                      {formatCurrency(analytics.average_amount)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Top Dispute Reasons</Typography>
                <List>
                  {Object.entries(analytics.by_reason)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([reason, count]) => (
                      <ListItem key={reason} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <Chip label={reason} variant="outlined" size="small" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={`${count} disputes`}
                          secondary={`${((count as number / analytics.total) * 100).toFixed(1)}% of total`}
                        />
                      </ListItem>
                    ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}

      {/* Quick Actions */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <Stack direction="row" spacing={2}>
              <Button variant="outlined" href="/disputes">
                View All Disputes
              </Button>
              <Button variant="outlined" href="/disputes?status=needs_response">
                Needs Response
              </Button>
              <Button variant="outlined" href="/disputes?status=under_review">
                Under Review
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
