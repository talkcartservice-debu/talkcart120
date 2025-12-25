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
  LinearProgress,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { api } from '@/lib/api';

// Define TypeScript interfaces for our data structures
interface OverviewData {
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  recentSales: number;
  averageRating: number;
  totalReviews: number;
}

interface TopProduct {
  id: string;
  name: string;
  revenue: number;
  sales: number;
  quantity: number;
  rating: number;
}

interface SalesTrend {
  date: string;
  revenue: number;
  orders: number;
  sales: number;
}

interface OrderStatusDistribution {
  status: string;
  count: number;
}

interface CustomerLocation {
  [key: string]: number;
}

interface SpendingRange {
  '0-50': number;
  '51-100': number;
  '101-500': number;
  '501-1000': number;
  '1001+': number;
}

interface TopCustomer {
  id: string;
  username: string;
  displayName: string;
  email: string;
  location: string;
  orderCount: number;
  totalSpent: number;
  firstOrder: string;
  lastOrder: string;
}

interface CustomerDemographicsData {
  totalCustomers: number;
  locations: CustomerLocation;
  spendingRanges: SpendingRange;
  topCustomers: TopCustomer[];
}

interface InventoryData {
  totalProducts: number;
  totalStock: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  avgStockPerProduct: number;
  categoryDistribution: {
    [key: string]: {
      count: number;
      stock: number;
      value: number;
    };
  };
}

interface PerformanceBenchmarksData {
  vendor: {
    totalSales: number;
    totalOrders: number;
    avgOrderValue: number;
  };
  industry: {
    avgSales: number;
    avgOrders: number;
    avgOrderValue: number;
  };
  benchmarks: {
    salesPerformance: string;
    ordersPerformance: string;
    aovPerformance: string;
  };
  rankings: {
    sales: number;
    orders: number;
    avgOrderValue: number;
  };
}

interface AnalyticsData {
  overview: OverviewData;
  topProducts: TopProduct[];
  salesTrend: SalesTrend[];
  orderStatusDistribution: OrderStatusDistribution[];
  customerDemographics: CustomerDemographicsData;
  inventory: InventoryData;
  performanceBenchmarks: PerformanceBenchmarksData;
}

const EnhancedVendorAnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all analytics data in parallel
      const [
        overviewResponse,
        salesTrendResponse,
        detailedAnalyticsResponse,
        customerDemographicsResponse,
        inventoryAnalyticsResponse,
        performanceBenchmarksResponse
      ] = await Promise.all([
        api.marketplace.getVendorPerformanceOverview(),
        api.marketplace.getVendorSalesTrends({ period: '30d' }),
        api.marketplace.getDetailedVendorAnalytics({ period: '30d' }),
        api.marketplace.getCustomerDemographics(),
        api.marketplace.getInventoryAnalytics(),
        api.marketplace.getPerformanceBenchmarks()
      ]);

      // Process and combine all data
      const overviewData: OverviewData = {
        totalSales: (overviewResponse && typeof overviewResponse === 'object' && 'data' in overviewResponse && overviewResponse.data && typeof overviewResponse.data === 'object' && 'overview' in overviewResponse.data && overviewResponse.data.overview && typeof overviewResponse.data.overview === 'object' && 'totalSales' in overviewResponse.data.overview) 
          ? Number(overviewResponse.data.overview.totalSales) || 0
          : 0,
        totalRevenue: (overviewResponse && typeof overviewResponse === 'object' && 'data' in overviewResponse && overviewResponse.data && typeof overviewResponse.data === 'object' && 'overview' in overviewResponse.data && overviewResponse.data.overview && typeof overviewResponse.data.overview === 'object' && 'totalRevenue' in overviewResponse.data.overview) 
          ? Number(overviewResponse.data.overview.totalRevenue) || 0
          : 0,
        totalOrders: (overviewResponse && typeof overviewResponse === 'object' && 'data' in overviewResponse && overviewResponse.data && typeof overviewResponse.data === 'object' && 'overview' in overviewResponse.data && overviewResponse.data.overview && typeof overviewResponse.data.overview === 'object' && 'totalOrders' in overviewResponse.data.overview) 
          ? Number(overviewResponse.data.overview.totalOrders) || 0
          : 0,
        avgOrderValue: (overviewResponse && typeof overviewResponse === 'object' && 'data' in overviewResponse && overviewResponse.data && typeof overviewResponse.data === 'object' && 'overview' in overviewResponse.data && overviewResponse.data.overview && typeof overviewResponse.data.overview === 'object' && 'avgOrderValue' in overviewResponse.data.overview) 
          ? Number(overviewResponse.data.overview.avgOrderValue) || 0
          : 0,
        recentSales: (overviewResponse && typeof overviewResponse === 'object' && 'data' in overviewResponse && overviewResponse.data && typeof overviewResponse.data === 'object' && 'overview' in overviewResponse.data && overviewResponse.data.overview && typeof overviewResponse.data.overview === 'object' && 'recentSales' in overviewResponse.data.overview) 
          ? Number(overviewResponse.data.overview.recentSales) || 0
          : 0,
        averageRating: (overviewResponse && typeof overviewResponse === 'object' && 'data' in overviewResponse && overviewResponse.data && typeof overviewResponse.data === 'object' && 'overview' in overviewResponse.data && overviewResponse.data.overview && typeof overviewResponse.data.overview === 'object' && 'averageRating' in overviewResponse.data.overview) 
          ? Number(overviewResponse.data.overview.averageRating) || 0
          : 0,
        totalReviews: (overviewResponse && typeof overviewResponse === 'object' && 'data' in overviewResponse && overviewResponse.data && typeof overviewResponse.data === 'object' && 'overview' in overviewResponse.data && overviewResponse.data.overview && typeof overviewResponse.data.overview === 'object' && 'totalReviews' in overviewResponse.data.overview) 
          ? Number(overviewResponse.data.overview.totalReviews) || 0
          : 0
      };

      const topProducts = (overviewResponse && typeof overviewResponse === 'object' && 'data' in overviewResponse && overviewResponse.data && typeof overviewResponse.data === 'object' && 'topProducts' in overviewResponse.data && Array.isArray(overviewResponse.data.topProducts)) 
        ? overviewResponse.data.topProducts 
        : [];
        
      const salesTrend = (salesTrendResponse && typeof salesTrendResponse === 'object' && 'data' in salesTrendResponse && Array.isArray(salesTrendResponse.data)) 
        ? salesTrendResponse.data 
        : [];
        
      const orderStatusDistribution = (detailedAnalyticsResponse && typeof detailedAnalyticsResponse === 'object' && 'data' in detailedAnalyticsResponse && detailedAnalyticsResponse.data && typeof detailedAnalyticsResponse.data === 'object' && 'orders' in detailedAnalyticsResponse.data && detailedAnalyticsResponse.data.orders && typeof detailedAnalyticsResponse.data.orders === 'object' && 'statusDistribution' in detailedAnalyticsResponse.data.orders && detailedAnalyticsResponse.data.orders.statusDistribution) 
        ? Object.entries(detailedAnalyticsResponse.data.orders.statusDistribution as Record<string, number>).map(([status, count]) => ({
            status,
            count: typeof count === 'number' ? count : 0
          }))
        : [];
      
      const customerDemographics = (customerDemographicsResponse && typeof customerDemographicsResponse === 'object' && 'data' in customerDemographicsResponse && customerDemographicsResponse.data) || {
        totalCustomers: 0,
        locations: {},
        spendingRanges: {
          '0-50': 0,
          '51-100': 0,
          '101-500': 0,
          '501-1000': 0,
          '1001+': 0
        },
        topCustomers: []
      };

      const inventory = (inventoryAnalyticsResponse && typeof inventoryAnalyticsResponse === 'object' && 'data' in inventoryAnalyticsResponse && inventoryAnalyticsResponse.data && typeof inventoryAnalyticsResponse.data === 'object' && 'inventory' in inventoryAnalyticsResponse.data && inventoryAnalyticsResponse.data.inventory) || {
        totalProducts: 0,
        totalStock: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalValue: 0,
        avgStockPerProduct: 0,
        categoryDistribution: {}
      };

      const performanceBenchmarks = (performanceBenchmarksResponse && typeof performanceBenchmarksResponse === 'object' && 'data' in performanceBenchmarksResponse && performanceBenchmarksResponse.data) || {
        vendor: {
          totalSales: 0,
          totalOrders: 0,
          avgOrderValue: 0
        },
        industry: {
          avgSales: 0,
          avgOrders: 0,
          avgOrderValue: 0
        },
        benchmarks: {
          salesPerformance: 'N/A',
          ordersPerformance: 'N/A',
          aovPerformance: 'N/A'
        },
        rankings: {
          sales: 0,
          orders: 0,
          avgOrderValue: 0
        }
      };

      setAnalytics({
        overview: overviewData,
        topProducts,
        salesTrend: salesTrend as SalesTrend[],
        orderStatusDistribution: orderStatusDistribution as OrderStatusDistribution[],
        customerDemographics: customerDemographics as CustomerDemographicsData,
        inventory: inventory as InventoryData,
        performanceBenchmarks: performanceBenchmarks as PerformanceBenchmarksData
      });

    } catch (err: any) {
      console.error('Error fetching vendor analytics:', err);
      setError(err.message || 'Failed to load vendor analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

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

  // Format sales trend data for the chart
  const salesTrendData = analytics.salesTrend.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })).filter(item => item.date !== 'Invalid Date');

  // Format order status distribution for pie chart
  const statusData = analytics.orderStatusDistribution.map(item => ({
    name: item.status,
    value: item.count
  }));

  // Format customer location data
  const locationData = analytics.customerDemographics.locations 
    ? Object.entries(analytics.customerDemographics.locations).map(([location, count]) => ({
        name: location,
        value: typeof count === 'number' ? count : 0
      }))
    : [];

  // Format spending range data
  const spendingRangeData = analytics.customerDemographics.spendingRanges 
    ? Object.entries(analytics.customerDemographics.spendingRanges).map(([range, count]) => ({
        name: range,
        value: typeof count === 'number' ? count : 0
      }))
    : [];

  // Format inventory category distribution
  const categoryData = analytics.inventory.categoryDistribution 
    ? Object.entries(analytics.inventory.categoryDistribution).map(([category, data]) => ({
        name: category,
        value: data && typeof data === 'object' && 'value' in data ? data.value : 0
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
          fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' }
        }}
      >
        Enhanced Vendor Analytics Dashboard
      </Typography>
      
      {/* Tabs for different analytics sections */}
      <Paper elevation={0} sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: { xs: 40, sm: 48 },
              fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
              minWidth: { xs: 60, sm: 72 }
            }
          }}
        >
          <Tab label="Overview" />
          <Tab label="Sales Trends" />
          <Tab label="Customer Insights" />
          <Tab label="Inventory" />
          <Tab label="Performance" />
        </Tabs>
      </Paper>
      
      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {/* Summary Cards */}
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 4 } }}>
            <Grid item xs={6} sm={6} md={3}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    color="text.secondary" 
                    gutterBottom
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                  >
                    Total Revenue
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: theme.palette.success.main,
                      fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
                    }}
                  >
                    ${analytics.overview.totalRevenue.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={6} sm={6} md={3}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    color="text.secondary" 
                    gutterBottom
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                  >
                    Total Sales
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: theme.palette.info.main,
                      fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
                    }}
                  >
                    {analytics.overview.totalSales}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={6} sm={6} md={3}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    color="text.secondary" 
                    gutterBottom
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                  >
                    Total Orders
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: theme.palette.warning.main,
                      fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
                    }}
                  >
                    {analytics.overview.totalOrders}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={6} sm={6} md={3}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    color="text.secondary" 
                    gutterBottom
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                  >
                    Average Rating
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 0.5 }}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 700, 
                        color: theme.palette.secondary.main,
                        fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
                      }}
                    >
                      {analytics.overview.averageRating.toFixed(1)}
                    </Typography>
                    <Box component="span" sx={{ display: 'inline-block' }}>
                      <Chip 
                        label={`${analytics.overview.totalReviews} reviews`} 
                        size="small" 
                        sx={{ 
                          bgcolor: theme.palette.secondary.light, 
                          color: 'white',
                          fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.75rem' },
                          height: { xs: 16, sm: 18, md: 24 }
                        }} 
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Charts */}
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            {/* Sales Trend Chart */}
            <Grid item xs={12} md={8}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Sales Trend
                  </Typography>
                  <Box sx={{ height: { xs: 180, sm: 220, md: 300 } }}>
                    {salesTrendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={salesTrendData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10 }} 
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }} 
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
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textAlign: 'center' }}
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
                <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Order Status Distribution
                  </Typography>
                  <Box sx={{ height: { xs: 180, sm: 220, md: 300 } }}>
                    {statusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent !== undefined ? percent * 100 : 0).toFixed(0)}%`}
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
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textAlign: 'center' }}
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
                <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Top Performing Products
                  </Typography>
                  <Box sx={{ 
                    maxHeight: { xs: 150, sm: 200, md: 300 }, 
                    overflow: 'auto',
                    pr: 1
                  }}>
                    {analytics.topProducts.length > 0 ? (
                      analytics.topProducts.map((product, index) => (
                        <Box key={product.id || index} sx={{ mb: 1.5 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            mb: 0.5,
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: 0.5
                          }}>
                            <Typography 
                              variant="subtitle1"
                              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                            >
                              {product.name || 'Unnamed Product'}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' } }}
                            >
                              ${product.revenue.toFixed(2)} • {product.sales} sales • {product.quantity} units
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={analytics.topProducts.length > 0 
                              ? (product.revenue / Math.max(...analytics.topProducts.map(p => p.revenue))) * 100 
                              : 0}
                            sx={{ height: 6, borderRadius: 3 }}
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
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textAlign: 'center' }}
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
      )}
      
      {activeTab === 1 && (
        <Box>
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            {/* Revenue Trend Chart */}
            <Grid item xs={12} md={12}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Revenue Trend (30 Days)
                  </Typography>
                  <Box sx={{ height: { xs: 180, sm: 250, md: 400 } }}>
                    {salesTrendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={salesTrendData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10 }} 
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }} 
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip 
                            formatter={(value) => [`$${value}`, 'Revenue']}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            name="Revenue" 
                            stroke={COLORS[0]} 
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
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
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textAlign: 'center' }}
                        >
                          No revenue trend data available
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Sales Volume Trend */}
            <Grid item xs={12} md={12}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Sales Volume Trend (30 Days)
                  </Typography>
                  <Box sx={{ height: { xs: 180, sm: 250, md: 400 } }}>
                    {salesTrendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={salesTrendData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10 }} 
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }} 
                          />
                          <Tooltip />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="sales" 
                            name="Sales Volume" 
                            stroke={COLORS[1]} 
                            fill={COLORS[1]} 
                            fillOpacity={0.3}
                          />
                        </AreaChart>
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
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textAlign: 'center' }}
                        >
                          No sales volume data available
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {activeTab === 2 && (
        <Box>
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            {/* Customer Overview */}
            <Grid item xs={12} md={4}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Customer Overview
                  </Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        fontWeight: 700, 
                        color: theme.palette.primary.main,
                        mb: 1,
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                      }}
                    >
                      {analytics.customerDemographics.totalCustomers}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                    >
                      Total Customers
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Top Customers */}
            <Grid item xs={12} md={8}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Top Customers
                  </Typography>
                  <Box sx={{ 
                    maxHeight: { xs: 150, sm: 200, md: 300 }, 
                    overflow: 'auto',
                    pr: 1
                  }}>
                    {analytics.customerDemographics.topCustomers.length > 0 ? (
                      analytics.customerDemographics.topCustomers.map((customer, index) => (
                        <Box key={customer.id || index} sx={{ mb: 1.5 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            mb: 0.5,
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: 0.5
                          }}>
                            <Typography 
                              variant="subtitle1"
                              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                            >
                              {customer.displayName || customer.username || 'Anonymous Customer'}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' } }}
                            >
                              ${customer.totalSpent.toFixed(2)} • {customer.orderCount} orders
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={analytics.customerDemographics.topCustomers.length > 0 
                              ? (customer.totalSpent / Math.max(...analytics.customerDemographics.topCustomers.map(c => c.totalSpent))) * 100 
                              : 0}
                            sx={{ height: 6, borderRadius: 3 }}
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
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textAlign: 'center' }}
                        >
                          No customer data available
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Customer Locations */}
            <Grid item xs={12} md={6}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Customer Locations
                  </Typography>
                  <Box sx={{ height: { xs: 180, sm: 220, md: 300 } }}>
                    {locationData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={locationData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent !== undefined ? percent * 100 : 0).toFixed(0)}%`}
                          >
                            {locationData.map((entry, index) => (
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
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textAlign: 'center' }}
                        >
                          No location data available
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Spending Distribution */}
            <Grid item xs={12} md={6}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Customer Spending Distribution
                  </Typography>
                  <Box sx={{ height: { xs: 180, sm: 220, md: 300 } }}>
                    {spendingRangeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={spendingRangeData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 10 }} 
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }} 
                          />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Customers" fill={COLORS[2]} />
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
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textAlign: 'center' }}
                        >
                          No spending data available
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {activeTab === 3 && (
        <Box>
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            {/* Inventory Overview */}
            <Grid item xs={6} sm={6} md={3}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    color="text.secondary" 
                    gutterBottom
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                  >
                    Total Products
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: theme.palette.info.main,
                      fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
                    }}
                  >
                    {analytics.inventory.totalProducts}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={6} sm={6} md={3}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    color="text.secondary" 
                    gutterBottom
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                  >
                    Total Stock
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: theme.palette.success.main,
                      fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
                    }}
                  >
                    {analytics.inventory.totalStock}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={6} sm={6} md={3}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    color="text.secondary" 
                    gutterBottom
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                  >
                    Low Stock Items
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: theme.palette.warning.main,
                      fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
                    }}
                  >
                    {analytics.inventory.lowStockItems}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={6} sm={6} md={3}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    color="text.secondary" 
                    gutterBottom
                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                  >
                    Out of Stock
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700, 
                      color: theme.palette.error.main,
                      fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' }
                    }}
                  >
                    {analytics.inventory.outOfStockItems}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Inventory Value */}
            <Grid item xs={12} md={12}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Inventory Value
                  </Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        fontWeight: 700, 
                        color: theme.palette.primary.main,
                        mb: 1,
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                      }}
                    >
                      ${analytics.inventory.totalValue.toFixed(2)}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                    >
                      Total Inventory Value
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Category Distribution */}
            <Grid item xs={12} md={12}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Inventory by Category
                  </Typography>
                  <Box sx={{ height: { xs: 180, sm: 250, md: 400 } }}>
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={categoryData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 10 }} 
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }} 
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip 
                            formatter={(value) => [`$${value}`, 'Value']}
                          />
                          <Legend />
                          <Bar dataKey="value" name="Value ($)" fill={COLORS[3]} />
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
                          sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' }, textAlign: 'center' }}
                        >
                          No category data available
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {activeTab === 4 && (
        <Box>
          <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
            {/* Performance Benchmarks */}
            <Grid item xs={12} sm={4} md={4}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Sales Performance
                  </Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        fontWeight: 700, 
                        color: analytics.performanceBenchmarks.benchmarks.salesPerformance === 'Above Average' 
                          ? theme.palette.success.main 
                          : analytics.performanceBenchmarks.benchmarks.salesPerformance === 'Below Average' 
                            ? theme.palette.error.main 
                            : theme.palette.warning.main,
                        mb: 1,
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                      }}
                    >
                      {analytics.performanceBenchmarks.rankings.sales.toFixed(0)}%
                    </Typography>
                    <Typography 
                      variant="h6" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                    >
                      {analytics.performanceBenchmarks.benchmarks.salesPerformance}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mt: 1, fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' } }}
                    >
                      Your sales: ${analytics.performanceBenchmarks.vendor.totalSales.toFixed(2)}
                      <br />
                      Industry avg: ${analytics.performanceBenchmarks.industry.avgSales.toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4} md={4}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Orders Performance
                  </Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        fontWeight: 700, 
                        color: analytics.performanceBenchmarks.benchmarks.ordersPerformance === 'Above Average' 
                          ? theme.palette.success.main 
                          : analytics.performanceBenchmarks.benchmarks.ordersPerformance === 'Below Average' 
                            ? theme.palette.error.main 
                            : theme.palette.warning.main,
                        mb: 1,
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                      }}
                    >
                      {analytics.performanceBenchmarks.rankings.orders.toFixed(0)}%
                    </Typography>
                    <Typography 
                      variant="h6" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                    >
                      {analytics.performanceBenchmarks.benchmarks.ordersPerformance}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mt: 1, fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' } }}
                    >
                      Your orders: {analytics.performanceBenchmarks.vendor.totalOrders}
                      <br />
                      Industry avg: {analytics.performanceBenchmarks.industry.avgOrders.toFixed(0)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={4} md={4}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Avg Order Value
                  </Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        fontWeight: 700, 
                        color: analytics.performanceBenchmarks.benchmarks.aovPerformance === 'Above Average' 
                          ? theme.palette.success.main 
                          : analytics.performanceBenchmarks.benchmarks.aovPerformance === 'Below Average' 
                            ? theme.palette.error.main 
                            : theme.palette.warning.main,
                        mb: 1,
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' }
                      }}
                    >
                      {analytics.performanceBenchmarks.rankings.avgOrderValue.toFixed(0)}%
                    </Typography>
                    <Typography 
                      variant="h6" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
                    >
                      {analytics.performanceBenchmarks.benchmarks.aovPerformance}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mt: 1, fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.875rem' } }}
                    >
                      Your AOV: ${analytics.performanceBenchmarks.vendor.avgOrderValue.toFixed(2)}
                      <br />
                      Industry avg: ${analytics.performanceBenchmarks.industry.avgOrderValue.toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Performance Comparison Chart */}
            <Grid item xs={12} md={12}>
              <Card elevation={3}>
                <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: 2, 
                      fontWeight: 600,
                      fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' }
                    }}
                  >
                    Performance Comparison
                  </Typography>
                  <Box sx={{ height: { xs: 180, sm: 250, md: 400 } }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { 
                            name: 'Your Performance', 
                            sales: analytics.performanceBenchmarks.vendor.totalSales,
                            orders: analytics.performanceBenchmarks.vendor.totalOrders,
                            aov: analytics.performanceBenchmarks.vendor.avgOrderValue
                          },
                          { 
                            name: 'Industry Average', 
                            sales: analytics.performanceBenchmarks.industry.avgSales,
                            orders: analytics.performanceBenchmarks.industry.avgOrders,
                            aov: analytics.performanceBenchmarks.industry.avgOrderValue
                          }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 10 }} 
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fontSize: 10 }} 
                          tickFormatter={(value) => `$${value}`}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 10 }} 
                        />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'sales' || name === 'aov') {
                              return [`$${value}`, name === 'sales' ? 'Sales' : 'AOV'];
                            }
                            return [value, 'Orders'];
                          }}
                        />
                        <Legend />
                        <Bar 
                          yAxisId="left"
                          dataKey="sales" 
                          name="Sales ($)" 
                          fill={COLORS[0]} 
                        />
                        <Bar 
                          yAxisId="right"
                          dataKey="orders" 
                          name="Orders" 
                          fill={COLORS[1]} 
                        />
                        <Bar 
                          yAxisId="left"
                          dataKey="aov" 
                          name="Avg Order Value ($)" 
                          fill={COLORS[2]} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default EnhancedVendorAnalyticsDashboard;