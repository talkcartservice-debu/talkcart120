import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, CircularProgress, useTheme, Button } from '@mui/material';
import ProductCard from '@/components/marketplace/ProductCard';
import { api } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: Array<{
    secure_url?: string;
    url: string;
    public_id: string;
  } | string>;
  category: string;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
  isNFT: boolean;
  featured?: boolean;
  tags: string[];
  stock: number;
  rating: number;
  reviewCount: number;
  sales: number;
  views: number;
  availability: string;
  createdAt: string;
  discount?: number;
  freeShipping?: boolean;
  fastDelivery?: boolean;
  prime?: boolean;
}

const TrendingProducts: React.FC<{ limit?: number; title?: string }> = ({ limit = 10, title = "Trending Products" }) => {
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingProducts();
  }, []);

  const fetchTrendingProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: any = await api.marketplace.getTrendingProducts(limit);
      
      if (response?.success && response?.data?.products) {
        setProducts(response.data.products);
      } else {
        throw new Error('Failed to fetch trending products');
      }
    } catch (err: any) {
      console.error('Error fetching trending products:', err);
      setError(err.message || 'Failed to load trending products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button variant="outlined" onClick={fetchTrendingProducts}>
          Try Again
        </Button>
      </Box>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
        {title}
      </Typography>
      <Grid container spacing={2}>
        {products.map((product) => (
          <Grid item xs={6} sm={4} md={3} key={product.id}>
            <ProductCard product={product} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TrendingProducts;