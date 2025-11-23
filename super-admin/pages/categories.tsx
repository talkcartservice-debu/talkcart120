import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Paper, 
  Typography, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Chip,
  Box,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';

interface Category {
  name: string;
  productCount: number;
  activeProductCount: number;
}

export default function CategoriesAdmin() {
  const guard = useAdminGuard();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Check if the method exists before calling it
      if (AdminApi && typeof AdminApi.getCategories === 'function') {
        const res = await AdminApi.getCategories();
        if (res?.success) {
          setCategories(res.data || []);
        }
      } else {
        console.error('AdminApi.getCategories is not available');
        // Set some default categories if the method doesn't exist
        setCategories([
          { name: 'Digital Art', productCount: 0, activeProductCount: 0 },
          { name: 'Electronics', productCount: 0, activeProductCount: 0 },
          { name: 'Fashion', productCount: 0, activeProductCount: 0 },
          { name: 'Gaming', productCount: 0, activeProductCount: 0 },
          { name: 'Music', productCount: 0, activeProductCount: 0 },
          { name: 'Books', productCount: 0, activeProductCount: 0 },
          { name: 'Collectibles', productCount: 0, activeProductCount: 0 },
          { name: 'Other', productCount: 0, activeProductCount: 0 }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Guard checks after all hooks are defined
  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const totalProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0);
  const totalActiveProducts = categories.reduce((sum, cat) => sum + cat.activeProductCount, 0);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Categories</Typography>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>Marketplace Categories</Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Categories
              </Typography>
              <Typography variant="h4">
                {categories.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Products
              </Typography>
              <Typography variant="h4">
                {totalProducts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Products
              </Typography>
              <Typography variant="h4" color="success.main">
                {totalActiveProducts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Inactive Products
              </Typography>
              <Typography variant="h4" color="warning.main">
                {totalProducts - totalActiveProducts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Categories Table */}
      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Category Breakdown
          </Typography>
        </Box>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category Name</TableCell>
              <TableCell align="right">Total Products</TableCell>
              <TableCell align="right">Active Products</TableCell>
              <TableCell align="right">Inactive Products</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => {
              const inactiveCount = category.productCount - category.activeProductCount;
              const activePercentage = category.productCount > 0 
                ? Math.round((category.activeProductCount / category.productCount) * 100)
                : 0;

              return (
                <TableRow key={category.name}>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {category.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {category.productCount}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main">
                      {category.activeProductCount}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="warning.main">
                      {inactiveCount}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${activePercentage}% Active`}
                      color={activePercentage >= 80 ? 'success' : activePercentage >= 50 ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* Category Distribution Chart would go here */}
      <Paper sx={{ mt: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Category Insights
        </Typography>
        <Grid container spacing={2}>
          {categories
            .sort((a, b) => b.productCount - a.productCount)
            .slice(0, 3)
            .map((category, index) => (
              <Grid item xs={12} sm={4} key={category.name}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    #{index + 1}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {category.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {category.productCount} products
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    {category.activeProductCount} active
                  </Typography>
                </Box>
              </Grid>
            ))}
        </Grid>
      </Paper>
    </Container>
  );
}