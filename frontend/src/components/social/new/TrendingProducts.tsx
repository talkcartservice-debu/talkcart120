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
      const response: any = await api.marketplace.getRandomProducts(4); // Fetch 4 products for 2x2 grid
      
      if (response?.data?.success && response?.data?.data?.products) {
        setProducts(response.data.data.products);
      } else if (response?.success && response?.data?.products) {
        setProducts(response.data.products);
      } else {
        // Use mock data in development
        if (process.env.NODE_ENV === 'development') {
          const mockProducts: Product[] = [
            {
              id: '1',
              _id: '1',
              name: 'Mock Product 1',
              description: 'This is a mock product for testing',
              price: 29.99,
              currency: 'USD',
              images: [{
                public_id: 'mock1',
                secure_url: '/images/placeholder-image-new.png',
                url: '/images/placeholder-image-new.png',
                _id: 'img1'
              }],
              category: 'Electronics',
              tags: ['mock', 'test'],
              stock: 10,
              featured: true,
              isNFT: false,
              rating: 4.5,
              reviewCount: 12,
              sales: 42,
              views: 120,
              createdAt: new Date().toISOString(),
              vendor: {
                id: 'vendor1',
                username: 'mockvendor',
                displayName: 'Mock Vendor',
                avatar: '',
                isVerified: true,
                walletAddress: '0x123456789'
              }
            },
            {
              id: '2',
              _id: '2',
              name: 'Mock Product 2',
              description: 'This is another mock product for testing',
              price: 49.99,
              currency: 'USD',
              images: [{
                public_id: 'mock2',
                secure_url: '/images/placeholder-image-new.png',
                url: '/images/placeholder-image-new.png',
                _id: 'img2'
              }],
              category: 'Fashion',
              tags: ['mock', 'test'],
              stock: 5,
              featured: false,
              isNFT: true,
              rating: 4.2,
              reviewCount: 8,
              sales: 28,
              views: 85,
              createdAt: new Date().toISOString(),
              vendor: {
                id: 'vendor2',
                username: 'testvendor',
                displayName: 'Test Vendor',
                avatar: '',
                isVerified: false,
                walletAddress: '0x987654321'
              }
            },
            {
              id: '3',
              _id: '3',
              name: 'Mock Product 3',
              description: 'Third mock product for testing',
              price: 39.99,
              currency: 'USD',
              images: [{
                public_id: 'mock3',
                secure_url: '/images/placeholder-image-new.png',
                url: '/images/placeholder-image-new.png',
                _id: 'img3'
              }],
              category: 'Home',
              tags: ['mock', 'test'],
              stock: 15,
              featured: true,
              isNFT: false,
              rating: 4.7,
              reviewCount: 20,
              sales: 55,
              views: 150,
              createdAt: new Date().toISOString(),
              vendor: {
                id: 'vendor3',
                username: 'testvendor3',
                displayName: 'Test Vendor 3',
                avatar: '',
                isVerified: true,
                walletAddress: '0x111111111'
              }
            },
            {
              id: '4',
              _id: '4',
              name: 'Mock Product 4',
              description: 'Fourth mock product for testing',
              price: 59.99,
              currency: 'USD',
              images: [{
                public_id: 'mock4',
                secure_url: '/images/placeholder-image-new.png',
                url: '/images/placeholder-image-new.png',
                _id: 'img4'
              }],
              category: 'Sports',
              tags: ['mock', 'test'],
              stock: 8,
              featured: false,
              isNFT: false,
              rating: 4.0,
              reviewCount: 5,
              sales: 22,
              views: 95,
              createdAt: new Date().toISOString(),
              vendor: {
                id: 'vendor4',
                username: 'testvendor4',
                displayName: 'Test Vendor 4',
                avatar: '',
                isVerified: false,
                walletAddress: '0x222222222'
              }
            },
            {
              id: '5',
              _id: '5',
              name: 'Mock Product 5',
              description: 'Fifth mock product for testing',
              price: 19.99,
              currency: 'USD',
              images: [{
                public_id: 'mock5',
                secure_url: '/images/placeholder-image-new.png',
                url: '/images/placeholder-image-new.png',
                _id: 'img5'
              }],
              category: 'Books',
              tags: ['mock', 'test'],
              stock: 25,
              featured: true,
              isNFT: false,
              rating: 4.8,
              reviewCount: 30,
              sales: 75,
              views: 200,
              createdAt: new Date().toISOString(),
              vendor: {
                id: 'vendor5',
                username: 'testvendor5',
                displayName: 'Test Vendor 5',
                avatar: '',
                isVerified: true,
                walletAddress: '0x333333333'
              }
            },
            {
              id: '6',
              _id: '6',
              name: 'Mock Product 6',
              description: 'Sixth mock product for testing',
              price: 89.99,
              currency: 'USD',
              images: [{
                public_id: 'mock6',
                secure_url: '/images/placeholder-image-new.png',
                url: '/images/placeholder-image-new.png',
                _id: 'img6'
              }],
              category: 'Technology',
              tags: ['mock', 'test'],
              stock: 3,
              featured: false,
              isNFT: true,
              rating: 4.3,
              reviewCount: 12,
              sales: 18,
              views: 70,
              createdAt: new Date().toISOString(),
              vendor: {
                id: 'vendor6',
                username: 'testvendor6',
                displayName: 'Test Vendor 6',
                avatar: '',
                isVerified: false,
                walletAddress: '0x444444444'
              }
            },
            {
              id: '7',
              _id: '7',
              name: 'Mock Product 7',
              description: 'Seventh mock product for testing',
              price: 34.99,
              currency: 'USD',
              images: [{
                public_id: 'mock7',
                secure_url: '/images/placeholder-image-new.png',
                url: '/images/placeholder-image-new.png',
                _id: 'img7'
              }],
              category: 'Beauty',
              tags: ['mock', 'test'],
              stock: 12,
              featured: true,
              isNFT: false,
              rating: 4.6,
              reviewCount: 15,
              sales: 40,
              views: 110,
              createdAt: new Date().toISOString(),
              vendor: {
                id: 'vendor7',
                username: 'testvendor7',
                displayName: 'Test Vendor 7',
                avatar: '',
                isVerified: true,
                walletAddress: '0x555555555'
              }
            },
            {
              id: '8',
              _id: '8',
              name: 'Mock Product 8',
              description: 'Eighth mock product for testing',
              price: 64.99,
              currency: 'USD',
              images: [{
                public_id: 'mock8',
                secure_url: '/images/placeholder-image-new.png',
                url: '/images/placeholder-image-new.png',
                _id: 'img8'
              }],
              category: 'Toys',
              tags: ['mock', 'test'],
              stock: 7,
              featured: false,
              isNFT: false,
              rating: 4.1,
              reviewCount: 9,
              sales: 25,
              views: 80,
              createdAt: new Date().toISOString(),
              vendor: {
                id: 'vendor8',
                username: 'testvendor8',
                displayName: 'Test Vendor 8',
                avatar: '',
                isVerified: false,
                walletAddress: '0x666666666'
              }
            },
            {
              id: '9',
              _id: '9',
              name: 'Mock Product 9',
              description: 'Ninth mock product for testing',
              price: 44.99,
              currency: 'USD',
              images: [{
                public_id: 'mock9',
                secure_url: '/images/placeholder-image-new.png',
                url: '/images/placeholder-image-new.png',
                _id: 'img9'
              }],
              category: 'Food',
              tags: ['mock', 'test'],
              stock: 20,
              featured: true,
              isNFT: false,
              rating: 4.9,
              reviewCount: 25,
              sales: 60,
              views: 180,
              createdAt: new Date().toISOString(),
              vendor: {
                id: 'vendor9',
                username: 'testvendor9',
                displayName: 'Test Vendor 9',
                avatar: '',
                isVerified: true,
                walletAddress: '0x777777777'
              }
            }
          ];
          setProducts(mockProducts);
        }
      }
    } catch (err: any) {
      console.error('Error fetching trending products:', err);
      // Use mock data in development
      if (process.env.NODE_ENV === 'development') {
        const mockProducts: Product[] = [
          {
            id: '1',
            _id: '1',
            name: 'Mock Product 1',
            description: 'This is a mock product for testing',
            price: 29.99,
            currency: 'USD',
            images: [{
              public_id: 'mock1',
              secure_url: '/images/placeholder-image-new.png',
              url: '/images/placeholder-image-new.png',
              _id: 'img1'
            }],
            category: 'Electronics',
            tags: ['mock', 'test'],
            stock: 10,
            featured: true,
            isNFT: false,
            rating: 4.5,
            reviewCount: 12,
            sales: 42,
            views: 120,
            createdAt: new Date().toISOString(),
            vendor: {
              id: 'vendor1',
              username: 'mockvendor',
              displayName: 'Mock Vendor',
              avatar: '',
              isVerified: true,
              walletAddress: '0x123456789'
            }
          },
          {
            id: '2',
            _id: '2',
            name: 'Mock Product 2',
            description: 'This is another mock product for testing',
            price: 49.99,
            currency: 'USD',
            images: [{
              public_id: 'mock2',
              secure_url: '/images/placeholder-image-new.png',
              url: '/images/placeholder-image-new.png',
              _id: 'img2'
            }],
            category: 'Fashion',
            tags: ['mock', 'test'],
            stock: 5,
            featured: false,
            isNFT: true,
            rating: 4.2,
            reviewCount: 8,
            sales: 28,
            views: 85,
            createdAt: new Date().toISOString(),
            vendor: {
              id: 'vendor2',
              username: 'testvendor',
              displayName: 'Test Vendor',
              avatar: '',
              isVerified: false,
              walletAddress: '0x987654321'
            }
          },
          {
            id: '3',
            _id: '3',
            name: 'Mock Product 3',
            description: 'Third mock product for testing',
            price: 39.99,
            currency: 'USD',
            images: [{
              public_id: 'mock3',
              secure_url: '/images/placeholder-image-new.png',
              url: '/images/placeholder-image-new.png',
              _id: 'img3'
            }],
            category: 'Home',
            tags: ['mock', 'test'],
            stock: 15,
            featured: true,
            isNFT: false,
            rating: 4.7,
            reviewCount: 20,
            sales: 55,
            views: 150,
            createdAt: new Date().toISOString(),
            vendor: {
              id: 'vendor3',
              username: 'testvendor3',
              displayName: 'Test Vendor 3',
              avatar: '',
              isVerified: true,
              walletAddress: '0x111111111'
            }
          },
          {
            id: '4',
            _id: '4',
            name: 'Mock Product 4',
            description: 'Fourth mock product for testing',
            price: 59.99,
            currency: 'USD',
            images: [{
              public_id: 'mock4',
              secure_url: '/images/placeholder-image-new.png',
              url: '/images/placeholder-image-new.png',
              _id: 'img4'
            }],
            category: 'Sports',
            tags: ['mock', 'test'],
            stock: 8,
            featured: false,
            isNFT: false,
            rating: 4.0,
            reviewCount: 5,
            sales: 22,
            views: 95,
            createdAt: new Date().toISOString(),
            vendor: {
              id: 'vendor4',
              username: 'testvendor4',
              displayName: 'Test Vendor 4',
              avatar: '',
              isVerified: false,
              walletAddress: '0x222222222'
            }
          },
          {
            id: '5',
            _id: '5',
            name: 'Mock Product 5',
            description: 'Fifth mock product for testing',
            price: 19.99,
            currency: 'USD',
            images: [{
              public_id: 'mock5',
              secure_url: '/images/placeholder-image-new.png',
              url: '/images/placeholder-image-new.png',
              _id: 'img5'
            }],
            category: 'Books',
            tags: ['mock', 'test'],
            stock: 25,
            featured: true,
            isNFT: false,
            rating: 4.8,
            reviewCount: 30,
            sales: 75,
            views: 200,
            createdAt: new Date().toISOString(),
            vendor: {
              id: 'vendor5',
              username: 'testvendor5',
              displayName: 'Test Vendor 5',
              avatar: '',
              isVerified: true,
              walletAddress: '0x333333333'
            }
          },
          {
            id: '6',
            _id: '6',
            name: 'Mock Product 6',
            description: 'Sixth mock product for testing',
            price: 89.99,
            currency: 'USD',
            images: [{
              public_id: 'mock6',
              secure_url: '/images/placeholder-image-new.png',
              url: '/images/placeholder-image-new.png',
              _id: 'img6'
            }],
            category: 'Technology',
            tags: ['mock', 'test'],
            stock: 3,
            featured: false,
            isNFT: true,
            rating: 4.3,
            reviewCount: 12,
            sales: 18,
            views: 70,
            createdAt: new Date().toISOString(),
            vendor: {
              id: 'vendor6',
              username: 'testvendor6',
              displayName: 'Test Vendor 6',
              avatar: '',
              isVerified: false,
              walletAddress: '0x444444444'
            }
          },
          {
            id: '7',
            _id: '7',
            name: 'Mock Product 7',
            description: 'Seventh mock product for testing',
            price: 34.99,
            currency: 'USD',
            images: [{
              public_id: 'mock7',
              secure_url: '/images/placeholder-image-new.png',
              url: '/images/placeholder-image-new.png',
              _id: 'img7'
            }],
            category: 'Beauty',
            tags: ['mock', 'test'],
            stock: 12,
            featured: true,
            isNFT: false,
            rating: 4.6,
            reviewCount: 15,
            sales: 40,
            views: 110,
            createdAt: new Date().toISOString(),
            vendor: {
              id: 'vendor7',
              username: 'testvendor7',
              displayName: 'Test Vendor 7',
              avatar: '',
              isVerified: true,
              walletAddress: '0x555555555'
            }
          },
          {
            id: '8',
            _id: '8',
            name: 'Mock Product 8',
            description: 'Eighth mock product for testing',
            price: 64.99,
            currency: 'USD',
            images: [{
              public_id: 'mock8',
              secure_url: '/images/placeholder-image-new.png',
              url: '/images/placeholder-image-new.png',
              _id: 'img8'
            }],
            category: 'Toys',
            tags: ['mock', 'test'],
            stock: 7,
            featured: false,
            isNFT: false,
            rating: 4.1,
            reviewCount: 9,
            sales: 25,
            views: 80,
            createdAt: new Date().toISOString(),
            vendor: {
              id: 'vendor8',
              username: 'testvendor8',
              displayName: 'Test Vendor 8',
              avatar: '',
              isVerified: false,
              walletAddress: '0x666666666'
            }
          },
          {
            id: '9',
            _id: '9',
            name: 'Mock Product 9',
            description: 'Ninth mock product for testing',
            price: 44.99,
            currency: 'USD',
            images: [{
              public_id: 'mock9',
              secure_url: '/images/placeholder-image-new.png',
              url: '/images/placeholder-image-new.png',
              _id: 'img9'
            }],
            category: 'Food',
            tags: ['mock', 'test'],
            stock: 20,
            featured: true,
            isNFT: false,
            rating: 4.9,
            reviewCount: 25,
            sales: 60,
            views: 180,
            createdAt: new Date().toISOString(),
            vendor: {
              id: 'vendor9',
              username: 'testvendor9',
              displayName: 'Test Vendor 9',
              avatar: '',
              isVerified: true,
              walletAddress: '0x777777777'
            }
          }
        ];
        setProducts(mockProducts);
      }
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
          // Enhanced grid view with 3x3 layout
          <Grid container spacing={1.5}>
            {products.slice(0, 4).map((product, index) => (
              <Grid item xs={6} key={product.id || product._id}> {/* 2x2 grid */}
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