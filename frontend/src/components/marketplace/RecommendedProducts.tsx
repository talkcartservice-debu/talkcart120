import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, CircularProgress, useTheme, Button, Chip } from '@mui/material';
import ProductCard from '@/components/marketplace/ProductCard';
import { useAuth } from '@/contexts/AuthContext';
import { useRecommendations } from '@/hooks/useRecommendations';

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
  recommendationReason?: string;
}

const RecommendedProducts: React.FC<{ limit?: number; title?: string }> = ({ limit = 10, title = "Recommended For You" }) => {
  console.log('RecommendedProducts: Component rendered with props:', { limit, title });
  const theme = useTheme();
  const { user } = useAuth();
  console.log('RecommendedProducts: User from context:', user);
  const { products, loading, error, refreshRecommendations, provideFeedback } = useRecommendations(user?.id || null, limit);
  console.log('RecommendedProducts: useRecommendations hook returned:', { products: products.length, loading, error });

  const handleFeedback = useCallback(async (productId: string, feedback: 'like' | 'dislike', reason?: string) => {
    try {
      await provideFeedback(productId, feedback, reason);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to provide feedback:', error);
    }
  }, [provideFeedback]);

  if (!user) {
    console.log('RecommendedProducts: No user, returning null');
    return null;
  }

  if (loading) {
    console.log('RecommendedProducts: Loading, showing spinner');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    console.log('RecommendedProducts: Error, showing error message', error);
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button variant="outlined" onClick={refreshRecommendations}>
          Try Again
        </Button>
      </Box>
    );
  }

  if (products.length === 0) {
    console.log('RecommendedProducts: No products, returning null');
    return null;
  }

  console.log('RecommendedProducts: Rendering products', products);
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
        {title}
      </Typography>
      <Grid container spacing={2}>
        {products.map((product) => (
          <Grid item xs={6} sm={4} md={3} key={product.id}>
            <ProductCard 
              product={product} 
              onFeedback={handleFeedback}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default RecommendedProducts;