import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Chip,
  Avatar,
  LinearProgress,
  Fade,
  useTheme,
  alpha,
  Stack,
  IconButton,
  Tooltip,
  Paper,
  Divider,
} from '@mui/material';
import { Grid } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as ProductsIcon,
  ShoppingCart as OrdersIcon,
  People as UsersIcon,
  Analytics as AnalyticsIcon,
  TrendingUp,
  Notifications,
  Refresh,
  AttachMoney as MoneyIcon,
  Timeline,
  ArrowUpward,
  Speed,
  Store,
} from '@mui/icons-material';
import { AdminApi } from '@/services/api';
import StatsCard from '@/components/UI/StatsCard';
import { gradients } from '@/theme';

interface QuickStats {
  products: { total: number; active: number };
  orders: { total: number; completed: number };
  users: { total: number; verified: number };
  revenue: { total: number; thisMonth: number };
}

export default function Dashboard() {
  const theme = useTheme();
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchQuickStats = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API calls
      const mockStats: QuickStats = {
        products: { total: 156, active: 142 },
        orders: { total: 1247, completed: 1189 },
        users: { total: 8934, verified: 8456 },
        revenue: { total: 125670, thisMonth: 23450 },
      };
      
      setTimeout(() => {
        setStats(mockStats);
        setLoading(false);
        setLastUpdate(new Date());
      }, 1000);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuickStats();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchQuickStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const quickActions = [
    {
      title: 'Products',
      description: 'Manage marketplace products',
      icon: <ProductsIcon />,
      href: '/products',
      color: 'primary',
      count: stats?.products.total || 0,
    },
    {
      title: 'Orders',
      description: 'View and manage orders',
      icon: <OrdersIcon />,
      href: '/orders',
      color: 'success',
      count: stats?.orders.total || 0,
    },
    {
      title: 'Users',
      description: 'User management',
      icon: <UsersIcon />,
      href: '/users',
      color: 'info',
      count: stats?.users.total || 0,
    },
    {
      title: 'Analytics',
      description: 'View detailed analytics',
      icon: <AnalyticsIcon />,
      href: '/analytics',
      color: 'secondary',
      count: '24/7',
    },
  ];

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                background: gradients.primary,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              Welcome Back! 👋
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              Here's what's happening with your marketplace today
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                icon={<Speed />}
                label="All Systems Operational"
                color="success"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                icon={<Notifications />}
                label="3 New Notifications"
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
              <Typography variant="body2" color="text.secondary">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </Typography>
            </Stack>
          </Box>
          <Tooltip title="Refresh Data">
            <IconButton
              onClick={fetchQuickStats}
              disabled={loading}
              sx={{
                background: gradients.primary,
                color: 'white',
                '&:hover': {
                  background: gradients.primary,
                  filter: 'brightness(1.1)',
                },
                '&:disabled': {
                  background: theme.palette.grey[300],
                },
              }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Products"
            value={stats?.products.total || 0}
            change={12.5}
            changeLabel="vs last month"
            icon={<ProductsIcon />}
            color="primary"
            loading={loading}
            subtitle={`${stats?.products.active || 0} active`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Orders"
            value={stats?.orders.total || 0}
            change={8.2}
            changeLabel="vs last month"
            icon={<OrdersIcon />}
            color="success"
            loading={loading}
            subtitle={`${stats?.orders.completed || 0} completed`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Users"
            value={stats?.users.total || 0}
            change={15.3}
            changeLabel="vs last month"
            icon={<UsersIcon />}
            color="info"
            loading={loading}
            subtitle={`${stats?.users.verified || 0} verified`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Revenue"
            value={`$${(stats?.revenue.total || 0).toLocaleString()}`}
            change={23.1}
            changeLabel="vs last month"
            icon={<MoneyIcon />}
            color="warning"
            loading={loading}
            subtitle={`$${(stats?.revenue.thisMonth || 0).toLocaleString()} this month`}
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper
        sx={{
          p: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={3}>
          {quickActions.map((action, index) => (
            <Grid item xs={12} sm={6} md={3} key={action.title}>
              <Fade in={!loading} timeout={500 + index * 100}>
                <Card
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: `0 20px 40px ${alpha(
                        action.color === 'primary' ? theme.palette.primary.main :
                        action.color === 'secondary' ? theme.palette.secondary.main :
                        action.color === 'success' ? theme.palette.success.main :
                        action.color === 'info' ? theme.palette.info.main :
                        theme.palette.primary.main, 0.2)}`,
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          background: alpha(
                            action.color === 'primary' ? theme.palette.primary.main :
                            action.color === 'secondary' ? theme.palette.secondary.main :
                            action.color === 'success' ? theme.palette.success.main :
                            action.color === 'info' ? theme.palette.info.main :
                            theme.palette.primary.main, 0.1),
                          color: action.color === 'primary' ? theme.palette.primary.main :
                            action.color === 'secondary' ? theme.palette.secondary.main :
                            action.color === 'success' ? theme.palette.success.main :
                            action.color === 'info' ? theme.palette.info.main :
                            theme.palette.primary.main,
                        }}
                      >
                        {action.icon}
                      </Avatar>
                      <Chip
                        label={action.count}
                        size="small"
                        color={action.color as any}
                        sx={{ fontWeight: 600 }}
                      />
                    </Stack>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 3, pt: 0 }}>
                    <Link href={action.href} passHref>
                      <Button
                        variant="outlined"
                        color={action.color as any}
                        endIcon={<ArrowUpward sx={{ transform: 'rotate(45deg)' }} />}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        Manage
                      </Button>
                    </Link>
                  </CardActions>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
}
