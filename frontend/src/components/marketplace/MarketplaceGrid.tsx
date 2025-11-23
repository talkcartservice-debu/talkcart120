import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import ProductCard from '@/components/marketplace/ProductCard';

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

interface MarketplaceGridProps {
  products: Product[];
  loading?: boolean;
  userCurrency?: string;
}

const MarketplaceGrid: React.FC<MarketplaceGridProps> = ({
  products,
  loading = false,
  userCurrency,
}) => {
  console.log('MarketplaceGrid received products:', products);
  console.log('MarketplaceGrid loading state:', loading);
  
  if (loading) {
    return (
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          {Array.from(new Array(12)).map((_, index) => (
            <Grid item xs={6} sm={4} md={3} key={index}>
              <ProductCard loading={true} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={2}>
        {products && products.length > 0 ? (
          products.map((product) => (
            <Grid item xs={6} sm={4} md={3} key={product.id}>
              <ProductCard
                product={product}
                userCurrency={userCurrency}
              />
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No products found
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default MarketplaceGrid;