import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CircularProgress, 
  useTheme,
  Chip,
  LinearProgress
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/lib/api';

interface AnalyticsData {
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  recentSales: number;
  averageRating: number;
  totalReviews: number;
  topProducts: Array<{
    id: string;
    name: string;
    revenue: number;
    sales: number;
    quantity: number;
    rating: number;
  }>;
  orderStatusDistribution: Array<{
    status: string;
    count: number;
  }>;
  salesTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
    sales: number;
  }>;
}

const VendorAnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorAnalytics();
  }, []);

  const fetchVendorAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.marketplace.getVendorPerformanceOverview();
      
      if (response?.success && response?.data) {
        // Map the API response to match our expected data structure
        const overviewData = {
          totalSales: typeof response.data.overview?.totalSales === 'number' ? response.data.overview.totalSales : 0,
          totalRevenue: typeof response.data.overview?.totalSales === 'number' ? response.data.overview.totalSales : 0, // Using totalSales as revenue since API doesn't provide separate revenue
          totalOrders: typeof response.data.overview?.totalOrders === 'number' ? response.data.overview.totalOrders : 0,
          avgOrderValue: typeof response.data.overview?.avgOrderValue === 'number' ? response.data.overview.avgOrderValue : 0,
          recentSales: typeof response.data.overview?.recentSales === 'number' ? response.data.overview.recentSales : 0,
          averageRating: typeof response.data.overview?.avgRating === 'number' ? response.data.overview.avgRating : 0,
          totalReviews: typeof response.data.overview?.totalReviews === 'number' ? response.data.overview.totalReviews : 0,
          topProducts: Array.isArray(response.data.topProducts) ? response.data.topProducts : [],
          // These fields are not provided by the current API, so we'll keep them as empty arrays
          // In a real implementation, these would come from separate API calls
          orderStatusDistribution: [],
          salesTrend: []
        };
        
        setAnalytics(overviewData);
      } else {
        throw new Error('Failed to fetch vendor analytics');
      }
    } catch (err: any) {
      console.error('Error fetching vendor analytics:', err);
      setError(err.message || 'Failed to load vendor analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography>No analytics data available</Typography>
      </Box>
    );
  }

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  
  // Format sales trend data for the chart (only if we have data)
  const salesTrendData = analytics?.salesTrend && Array.isArray(analytics.salesTrend) && analytics.salesTrend.length > 0 
    ? analytics.salesTrend.map(item => ({
        ...item,
        date: item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown'
      })).filter(item => item.date !== 'Invalid Date')
    : [];

  // Format order status distribution for pie chart (only if we have data)
  const statusData = analytics?.orderStatusDistribution && Array.isArray(analytics.orderStatusDistribution) && analytics.orderStatusDistribution.length > 0
    ? analytics.orderStatusDistribution.map(item => ({
        name: typeof item.status === 'string' ? item.status : 'Unknown',
        value: typeof item.count === 'number' ? item.count : 0
      }))
    : [];

  return (
    <Box sx={{ mb: 4 }}>
      <Typography 
        variant="h5" 
        sx={{ 
          fontWeight: 600, 
          mb: { xs: 2, sm: 3 }, 
          color: theme.palette.primary.main,
          fontSize: { xs: '1.25rem', sm: '1.5rem' }
        }}
      >
        Vendor Analytics Dashboard
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 4 } }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography 
                variant="h6" 
                color="text.secondary" 
                gutterBottom
                sx={{ fontSize: { xs: '0.875rem', sm: '1.125rem' } }}
              >
                Total Revenue
              </Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: theme.palette.success.main,
                  fontSize: { xs: '1.5rem', sm: '2.125rem' }
                }}
              >
                ${typeof analytics.totalRevenue === 'number' ? analytics.totalRevenue.toFixed(2) : '0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography 
                variant="h6" 
                color="text.secondary" 
                gutterBottom
                sx={{ fontSize: { xs: '0.875rem', sm: '1.125rem' } }}
              >
                Total Sales
              </Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: theme.palette.info.main,
                  fontSize: { xs: '1.5rem', sm: '2.125rem' }
                }}
              >
                {typeof analytics.totalSales === 'number' ? analytics.totalSales : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography 
                variant="h6" 
                color="text.secondary" 
                gutterBottom
                sx={{ fontSize: { xs: '0.875rem', sm: '1.125rem' } }}
              >
                Total Orders
              </Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: theme.palette.warning.main,
                  fontSize: { xs: '1.5rem', sm: '2.125rem' }
                }}
              >
                {typeof analytics.totalOrders === 'number' ? analytics.totalOrders : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography 
                variant="h6" 
                color="text.secondary" 
                gutterBottom
                sx={{ fontSize: { xs: '0.875rem', sm: '1.125rem' } }}
              >
                Average Rating
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700, 
                    color: theme.palette.secondary.main,
                    fontSize: { xs: '1.5rem', sm: '2.125rem' }
                  }}
                >
                  {typeof analytics.averageRating === 'number' ? analytics.averageRating.toFixed(1) : '0.0'}
                </Typography>
                <Chip 
                  label={`${typeof analytics.totalReviews === 'number' ? analytics.totalReviews : 0} reviews`} 
                  size="small" 
                  sx={{ 
                    ml: 1, 
                    bgcolor: theme.palette.secondary.light, 
                    color: 'white',
                    fontSize: { xs: '0.6rem', sm: '0.75rem' },
                    height: { xs: 20, sm: 24 }
                  }} 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Charts */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Sales Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 1, sm: 3 } }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2, 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                Sales Trend
              </Typography>
              <Box sx={{ height: { xs: 200, sm: 300 } }}>
                {salesTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesTrendData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }} 
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }} 
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue ($)" fill={COLORS[0]} />
                      <Bar dataKey="orders" name="Orders" fill={COLORS[1]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%',
                    p: 2
                  }}>
                    <Typography 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, textAlign: 'center' }}
                    >
                      No sales trend data available
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Order Status Distribution */}
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 1, sm: 3 } }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2, 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                Order Status Distribution
              </Typography>
              <Box sx={{ height: { xs: 200, sm: 300 } }}>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={(props: any) => {
                          const { name, percent } = props;
                          if (name && typeof percent === 'number' && !isNaN(percent)) {
                            return `${name}: ${(percent * 100).toFixed(0)}%`;
                          }
                          return name ? `${name}: 0%` : 'Unknown: 0%';
                        }}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%',
                    p: 2
                  }}>
                    <Typography 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, textAlign: 'center' }}
                    >
                      No order status data available
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Top Products */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent sx={{ p: { xs: 1, sm: 3 } }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2, 
                  fontWeight: 600,
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                Top Performing Products
              </Typography>
              <Box sx={{ 
                maxHeight: { xs: 200, sm: 300 }, 
                overflow: 'auto',
                pr: 1
              }}>
                {analytics.topProducts && analytics.topProducts.length > 0 ? (
                  analytics.topProducts.map((product, index) => (
                    <Box key={product.id || index} sx={{ mb: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        mb: 1,
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 0.5
                      }}>
                        <Typography 
                          variant="subtitle1"
                          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                        >
                          {product.name || 'Unnamed Product'}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                        >
                          ${typeof product.revenue === 'number' ? product.revenue.toFixed(2) : '0.00'} • {typeof product.sales === 'number' ? product.sales : 0} sales • {typeof product.quantity === 'number' ? product.quantity : 0} units
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={analytics.topProducts && analytics.topProducts.length > 0 
                          ? (() => {
                              const revenues = analytics.topProducts.map(p => typeof p.revenue === 'number' ? p.revenue : 0);
                              const maxRevenue = revenues.length > 0 ? Math.max(...revenues) : 0;
                              return maxRevenue > 0 && typeof product.revenue === 'number' ? (product.revenue / maxRevenue) * 100 : 0;
                            })()
                          : 0}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%',
                    p: 2
                  }}>
                    <Typography 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.875rem', sm: '1rem' }, textAlign: 'center' }}
                    >
                      No top products data available
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VendorAnalyticsDashboard;