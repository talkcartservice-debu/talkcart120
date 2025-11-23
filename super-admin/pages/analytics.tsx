import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Grid,
  Card,
  CardContent,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Stack,
  TextField,
  MenuItem,
  Button
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  ShoppingCart as ShoppingCartIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';

interface AnalyticsOverview {
  products: { total: number; active: number };
  orders: { total: number; completed: number };
  revenue: number;
  users: number;
  vendors: number;
}

interface SalesTrend {
  _id: string;
  sales: number;
  revenue: number;
  items: number;
}

interface TopProduct {
  _id: string;
  productName: string;
  category: string;
  vendorName: string;
  totalSales: number;
  totalRevenue: number;
  orderCount: number;
}

interface VendorPerformance {
  _id: string;
  vendorName: string;
  vendorEmail: string;
  totalSales: number;
  totalRevenue: number;
  orderCount: number;
  productCount: number;
  avgOrderValue: number;
}

export default function AnalyticsAdmin() {
  const guard = useAdminGuard();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [salesTrends, setSalesTrends] = useState<SalesTrend[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [overviewRes, trendsRes, productsRes, vendorsRes] = await Promise.all([
        AdminApi.getAnalyticsOverview(),
        AdminApi.getSalesTrends({ period }),
        AdminApi.getTopProducts({ period, limit: 10 }),
        AdminApi.getVendorPerformance({ period, limit: 10 })
      ]);

      if (overviewRes?.success) setOverview(overviewRes.data);
      if (trendsRes?.success) setSalesTrends(trendsRes.data || []);
      if (productsRes?.success) setTopProducts(productsRes.data || []);
      if (vendorsRes?.success) setVendorPerformance(vendorsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Analytics Dashboard</Typography>
        <Typography>Loading analytics...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">Analytics Dashboard</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            select
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={fetchAnalytics}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShoppingCartIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Total Products
                </Typography>
              </Box>
              <Typography variant="h4">
                {formatNumber(overview?.products.total || 0)}
              </Typography>
              <Typography variant="body2" color="success.main">
                {formatNumber(overview?.products.active || 0)} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Total Orders
                </Typography>
              </Box>
              <Typography variant="h4">
                {formatNumber(overview?.orders.total || 0)}
              </Typography>
              <Typography variant="body2" color="success.main">
                {formatNumber(overview?.orders.completed || 0)} completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Total Revenue
                </Typography>
              </Box>
              <Typography variant="h4">
                {formatCurrency(overview?.revenue || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                From completed orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Active Vendors
                </Typography>
              </Box>
              <Typography variant="h4">
                {formatNumber(overview?.vendors || 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {formatNumber(overview?.users || 0)} total users
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Sales Trends */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Sales Trends ({period})
            </Typography>
            {salesTrends.length === 0 ? (
              <Typography color="textSecondary">No sales data available</Typography>
            ) : (
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {salesTrends.map((trend, index) => (
                  <Box key={trend._id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: index < salesTrends.length - 1 ? '1px solid #eee' : 'none' }}>
                    <Typography variant="body2">{trend._id}</Typography>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{trend.sales} orders</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatCurrency(trend.revenue)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Products ({period})
            </Typography>
            {topProducts.length === 0 ? (
              <Typography color="textSecondary">No product data available</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Sales</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topProducts.slice(0, 5).map((product) => (
                    <TableRow key={product._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {product.productName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {product.category} • {product.vendorName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {product.totalSales}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(product.totalRevenue)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        {/* Vendor Performance */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Vendor Performance ({period})
            </Typography>
            {vendorPerformance.length === 0 ? (
              <Typography color="textSecondary">No vendor data available</Typography>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vendor</TableCell>
                    <TableCell align="right">Products</TableCell>
                    <TableCell align="right">Orders</TableCell>
                    <TableCell align="right">Total Sales</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Avg Order Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorPerformance.map((vendor) => (
                    <TableRow key={vendor._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {vendor.vendorName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {vendor.vendorEmail}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {vendor.productCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {vendor.orderCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {vendor.totalSales}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(vendor.totalRevenue)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(vendor.avgOrderValue)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
