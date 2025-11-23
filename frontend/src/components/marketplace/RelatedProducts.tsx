import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, CircularProgress, useTheme } from '@mui/material';
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

interface RelatedProductsProps {
  productId: string;
  limit?: number;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ productId, limit = 12 }) => {
  console.log('RelatedProducts: Component rendered with props:', { productId, limit });
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      fetchRelatedProducts();
    }
  }, [productId]);

  const fetchRelatedProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching related products for product ID:', productId);
      const response: any = await api.marketplace.getRelatedProducts(productId, limit);
      console.log('Related products API response:', response);
      
      // Handle different response formats
      if (response?.success && response?.data?.products) {
        console.log('Setting products from response.data.products:', response.data.products);
        setProducts(response.data.products);
      } else if (response?.data?.success && response?.data?.data?.products) {
        console.log('Setting products from response.data.data.products:', response.data.data.products);
        setProducts(response.data.data.products);
      } else if (response?.data?.products) {
        // Direct data format
        console.log('Setting products from response.data.products (direct):', response.data.products);
        setProducts(response.data.products);
      } else if (Array.isArray(response)) {
        // Handle case where response is directly an array
        console.log('Setting products from array response:', response);
        setProducts(response);
      } else if (response?.success === false && response?.error) {
        // Handle explicit error responses
        console.log('Explicit error response:', response.error);
        throw new Error(response.error);
      } else {
        console.log('Unexpected response format, setting empty array:', response);
        // Don't throw an error for empty related products, just show nothing
        setProducts([]);
      }
      
      console.log('Final products state:', products);
    } catch (err: any) {
      console.error('Error fetching related products:', err);
      setError(err.message || 'Failed to load related products');
      setProducts([]); // Set empty array on error to prevent UI blocking
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
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Always render the section with a message if no products
  if (products.length === 0) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
          Related Products
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No related products found for this item.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
        Related Products
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

export default RelatedProducts;