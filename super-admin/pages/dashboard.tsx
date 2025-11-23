import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Grid,
  Card,
  CardContent,
  Box,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Stack
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  ShoppingCart as ShoppingCartIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Inventory as InventoryIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';

interface LiveStats {
  overview: {
    products: { total: number; active: number };
    orders: { total: number; completed: number };
    revenue: number;
    users: number;
    vendors: number;
  };
  recentActivity: Array<{
    type: 'order' | 'product' | 'user';
    message: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }>;
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    api: 'healthy' | 'warning' | 'error';
    storage: 'healthy' | 'warning' | 'error';
    payments: 'healthy' | 'warning' | 'error';
  };
}

export default function DashboardAdmin() {
  const guard = useAdminGuard();
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchLiveStats = async () => {
    try {
      setLoading(true);
      const [overviewRes] = await Promise.all([
        AdminApi.getAnalyticsOverview()
      ]);

      // Simulate real-time data - in production, this would come from WebSocket or real-time API
      const mockStats: LiveStats = {
        overview: overviewRes?.success ? overviewRes.data : {
          products: { total: 0, active: 0 },
          orders: { total: 0, completed: 0 },
          revenue: 0,
          users: 0,
          vendors: 0
        },
        recentActivity: [
          {
            type: 'order',
            message: 'New order #ORD-2025-001 received',
            timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
            status: 'success'
          },
          {
            type: 'product',
            message: 'Product "Digital Art NFT" approved',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            status: 'success'
          },
          {
            type: 'user',
            message: 'New vendor registration pending KYC',
            timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
            status: 'warning'
          },
          {
            type: 'order',
            message: 'Payment failed for order #ORD-2025-002',
            timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
            status: 'error'
          }
        ],
        systemHealth: {
          database: 'healthy',
          api: 'healthy',
          storage: 'healthy',
          payments: 'warning'
        }
      };

      setStats(mockStats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch live stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStats();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLiveStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Guard checks after all hooks are defined
  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <SpeedIcon />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCartIcon />;
      case 'product': return <InventoryIcon />;
      case 'user': return <PeopleIcon />;
      default: return <SpeedIcon />;
    }
  };

  if (loading && !stats) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Live Dashboard</Typography>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">Live Marketplace Dashboard</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" color="textSecondary">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Typography>
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<RefreshIcon />}
            onClick={fetchLiveStats}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <InventoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Products
                </Typography>
              </Box>
              <Typography variant="h4">
                {formatNumber(stats?.overview.products.total || 0)}
              </Typography>
              <Typography variant="body2" color="success.main">
                {formatNumber(stats?.overview.products.active || 0)} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShoppingCartIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Orders
                </Typography>
              </Box>
              <Typography variant="h4">
                {formatNumber(stats?.overview.orders.total || 0)}
              </Typography>
              <Typography variant="body2" color="success.main">
                {formatNumber(stats?.overview.orders.completed || 0)} completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Revenue
                </Typography>
              </Box>
              <Typography variant="h4">
                {formatCurrency(stats?.overview.revenue || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total earned
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Vendors
                </Typography>
              </Box>
              <Typography variant="h4">
                {formatNumber(stats?.overview.vendors || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active sellers
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Users
                </Typography>
              </Box>
              <Typography variant="h4">
                {formatNumber(stats?.overview.users || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total registered
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Health
              </Typography>
              <List>
                {stats?.systemHealth && Object.entries(stats.systemHealth).map(([system, status]) => (
                  <React.Fragment key={system}>
                    <ListItem>
                      <ListItemIcon>
                        {getHealthIcon(status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={system.charAt(0).toUpperCase() + system.slice(1)}
                        secondary={
                          <Chip 
                            label={status} 
                            size="small" 
                            color={getHealthColor(status) as any}
                          />
                        }
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <List>
                {stats?.recentActivity.map((activity, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemIcon>
                        {getActivityIcon(activity.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.message}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption">
                              {formatTimeAgo(activity.timestamp)}
                            </Typography>
                            <Chip 
                              label={activity.status} 
                              size="small" 
                              color={getHealthColor(activity.status) as any}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < stats.recentActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
