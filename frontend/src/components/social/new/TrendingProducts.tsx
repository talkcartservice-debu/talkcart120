import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Skeleton,
  Typography,
  Grid,
  CircularProgress,
} from '@mui/material';
import api from '@/lib/api';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';
import { convertToProxyUrl } from '@/utils/urlConverter';
import { useCart } from '@/hooks/useCart';
import toast from 'react-hot-toast';
import { ShoppingCart } from 'lucide-react';

interface Product {
  id: string;
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: Array<{
    public_id: string;
    secure_url: string;
    url: string;
    _id: string;
  }>;
  category: string;
  tags: string[];
  stock: number;
  featured: boolean;
  isNFT: boolean;
  rating: number;
  reviewCount: number;
  sales: number;
  views: number;
  createdAt: string;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    walletAddress: string;
  };
}

const TrendingProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { addToCart, addToCartLoading } = useCart();

  const fetchTrendingProducts = async () => {
    try {
      setLoading(true);
      const response: any = await api.marketplace.getTrendingProducts(4); // Fetch 4 products for 2x2 grid
      
      // Handle the expected response structure from backend
      if (response?.data?.products && Array.isArray(response.data.products)) {
        setProducts(response.data.products);
      } else if (response?.data && Array.isArray(response.data)) {
        setProducts(response.data);
      } else if (Array.isArray(response)) {
        setProducts(response);
      } else {
        // If we can't parse the response properly, show an empty state
        setProducts([]);
      }
    } catch (err: any) {
      // Show error state instead of mock data
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial products
    fetchTrendingProducts();
    
    // Fetch new products every 45 seconds to reduce pressure under slow networks
    const interval = setInterval(() => {
      fetchTrendingProducts();
    }, 45000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Get image URL with proper fallbacks
  const getImageUrl = (product: Product) => {
    if (!Array.isArray(product.images) || product.images.length === 0) {
      return '/images/placeholder-image-new.png';
    }
    
    // Always use the first image for simplicity
    const image = product.images[0];
    const raw = image?.secure_url || image?.url || '/images/placeholder-image-new.png';
    // Proxy Cloudinary or backend uploads similar to post images
    const converted = convertToProxyUrl(raw);
    const proxied = proxyCloudinaryUrl(converted);
    return proxied || converted || '/images/placeholder-image-new.png';
  };

  const handleAddToCart = async (productId: string, productName: string) => {
    const success = await addToCart(productId, 1);
    if (success) {
      toast.success(`${productName} added to cart!`);
      // Redirect to cart page after a short delay
      setTimeout(() => {
        router.push('/marketplace/cart');
      }, 1000);
    }
  };

  return (
    <Card variant="outlined" sx={{ 
      borderRadius: 2, 
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
      border: '1px solid rgba(0, 0, 0, 0.05)',
      background: 'transparent',
      p: 0
    }}>
      <CardContent sx={{ pb: 1, pt: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
              <Box key={item} sx={{ width: '100%' }}>
                <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1 }} /> {/* Adjusted height */}
                <Box sx={{ pt: 1 }}>
                  <Skeleton variant="text" width="80%" height={16} />
                  <Skeleton variant="text" width="60%" height={14} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          // Enhanced grid view with 2x2 layout
          <Grid container spacing={1.5}>
            {products.slice(0, 4).map((product, index) => (
              <Grid item xs={6} key={product.id || product._id}> {/* 2x2 grid layout */}
                <Box 
                  onClick={() => window.location.href = `/marketplace/${product.id || product._id}`}
                  sx={{ 
                    width: '100%',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    borderRadius: 1,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <Box sx={{ position: 'relative', pt: '100%', width: '100%' }}> {/* Square aspect ratio for product images */}
                    <img
                      src={getImageUrl(product)}
                      alt={product.name}
                      style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  </Box>
                  <Box sx={{ p: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 600, 
                        mb: 0.5, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        display: '-webkit-box', 
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.3em',
                        height: '2.6em',
                        fontSize: '0.8rem' // Adjusted font size for better fit
                      }}
                    >
                      {product.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: 0.5 }}>
                      <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: '0.8rem' }}>
                        {product.currency} {product.price.toFixed(2)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <Box component="span" sx={{ color: '#FFD700', fontSize: '0.7rem' }}>
                          ★
                        </Box>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.7rem' }}>
                          {product.rating.toFixed(1)}
                        </Typography>
                      </Box>
                    </Box>
                    <Button 
                      variant="contained" 
                      size="small"
                      fullWidth 
                      startIcon={addToCartLoading ? <CircularProgress size={12} /> : <ShoppingCart size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product.id || product._id, product.name);
                      }}
                      sx={{ 
                        mt: 1, 
                        py: 0.5,
                        fontSize: '0.7rem',
                        background: 'primary.main',
                        '&:hover': {
                          background: 'primary.dark'
                        },
                        '&.Mui-disabled': {
                          opacity: 0.7
                        }
                      }}
                      disabled={addToCartLoading}
                    >
                      {addToCartLoading ? 'Adding...' : 'Add to Cart'}
                    </Button>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default TrendingProducts;