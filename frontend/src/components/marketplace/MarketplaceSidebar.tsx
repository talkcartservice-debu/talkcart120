import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Divider, useTheme, IconButton, Collapse, Grid, Card, CardContent, Button, CircularProgress } from '@mui/material';
import { ChevronRight, ChevronDown, Sparkles, TrendingUp, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRecommendations } from '@/hooks/useRecommendations';
import { api } from '@/lib/api';
import OptimizedImage from '@/components/media/OptimizedImage';
import { useRouter } from 'next/router';

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

const SidebarProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const router = useRouter();
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);

  const getImageSrc = () => {
    if (!product?.images || product.images.length === 0) {
      return '/images/placeholder-image.png';
    }
    
    const firstImage = product.images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    return firstImage?.secure_url || firstImage?.url || '/images/placeholder-image.png';
  };

  return (
    <Card
      sx={{
        width: '100%', // Changed to 100% to fill container
        display: 'flex',
        flexDirection: 'row',
        borderRadius: 2, // Increased border radius
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        mb: 2, // Increased margin
      }}
    >
      {/* Product Image */}
      <Box sx={{ 
        width: 120, // Increased width
        height: 120, // Increased height
        position: 'relative',
        backgroundColor: '#f8f8f8',
      }}>
        {!imageError ? (
          <OptimizedImage
            src={getImageSrc()}
            alt={product?.name || 'Product'}
            fill
            sizes="120px" // Updated size
            style={{ 
              objectFit: 'cover', 
              width: '100%', 
              height: '100%',
            }}
            onError={() => setImageError(true)}
            quality={85}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.palette.grey[100],
            }}
          >
            <Box 
              sx={{ 
                width: 60, // Increased placeholder size
                height: 60,
                backgroundColor: theme.palette.grey[300],
                borderRadius: '50%'
              }} 
            />
          </Box>
        )}
      </Box>
      
      {/* Product Info and Button */}
      <CardContent sx={{ 
        flexGrow: 1, 
        p: 2, // Increased padding
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <Typography 
          variant="body1" // Increased variant
          sx={{ 
            fontWeight: 600, // Increased font weight
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            display: '-webkit-box', 
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4em',
            fontSize: '1rem' // Increased font size
          }}
        >
          {product?.name || 'Product'}
        </Typography>
        
        <Button
          variant="contained"
          size="medium" // Changed to medium
          startIcon={<Eye size={16} />} // Increased icon size
          onClick={() => router.push(`/marketplace/${product.id}`)}
          sx={{
            py: 1, // Increased padding
            px: 2, // Added horizontal padding
            fontSize: '0.875rem', // Increased font size
            fontWeight: 600,
            borderRadius: 1,
            textTransform: 'none',
            backgroundColor: '#FF9900',
            color: 'white',
            minWidth: 'auto',
            alignSelf: 'flex-start',
            '&:hover': {
              backgroundColor: '#e68a00',
            }
          }}
        >
          View
        </Button>
      </CardContent>
    </Card>
  );
};

const SidebarRecommendedProducts: React.FC<{ userId: string | null; limit?: number }> = ({ userId, limit = 5 }) => {
  const { products, loading, error } = useRecommendations(userId, limit);
  const theme = useTheme();

  // Add better error handling
  const [apiError, setApiError] = useState<string | null>(null);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]); // New state for displayed products
  const [currentIndex, setCurrentIndex] = useState(0); // Track current index for rotation

  useEffect(() => {
    // If there's an error from the hook, set it to state for display
    if (error) {
      setApiError(error);
    }
  }, [error]);

  // Rotate products every 30 seconds
  useEffect(() => {
    if (products.length === 0) return;

    // Set initial display products
    setDisplayProducts(products.slice(0, 4));

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const newIndex = (prevIndex + 4) % products.length;
        const newDisplayProducts: Product[] = [];
        
        for (let i = 0; i < 4; i++) {
          const product = products[(newIndex + i) % products.length];
          if (product) {
            newDisplayProducts.push(product);
          }
        }
        
        // Filter out any undefined values and ensure we have exactly 4 products
        const filteredProducts = newDisplayProducts.filter((product): product is Product => product !== undefined);
        setDisplayProducts(filteredProducts);
        return newIndex;
      });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [products]);

  if (!userId) {
    return null;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  // Show error message if there's an API error, but don't block the UI completely
  if (apiError) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="textSecondary">
          {apiError.includes('Internal Server Error') 
            ? 'Recommendations temporarily unavailable' 
            : apiError}
        </Typography>
      </Box>
    );
  }

  // If no products and no error, show a friendly message
  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      pb: 2,
    }}>
      {displayProducts.map((product) => (
        <Box 
          key={product.id} 
          sx={{ 
            cursor: 'pointer',
            borderRadius: 2,
            overflow: 'hidden',
            border: `1px solid ${theme.palette.divider}`,
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}
          onClick={() => window.location.href = `/marketplace/${product.id}`}
        >
          <ImageOnlyProductCard product={product} />
        </Box>
      ))}
    </Box>
  );
};

const ImageOnlyProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);

  const getImageSrc = () => {
    if (!product?.images || product.images.length === 0) {
      return '/images/placeholder-image.png';
    }
    
    const firstImage = product.images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    return firstImage?.secure_url || firstImage?.url || '/images/placeholder-image.png';
  };

  return (
    <Box
      sx={{
        width: '100%',
        position: 'relative',
        backgroundColor: '#f8f8f8',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transform: 'translateY(-2px)',
        }
      }}
    >
      {/* Product Image Only */}
      <Box sx={{ 
        height: { xs: 180, sm: 200, md: 220 }, // Increased height for better visibility
        position: 'relative'
      }}>
        {!imageError ? (
          <OptimizedImage
            src={getImageSrc()}
            alt={product?.name || 'Product'}
            fill
            sizes="100vw" // Changed to 100vw to fill the container
            style={{ 
              objectFit: 'cover', 
              width: '100%', 
              height: '100%',
            }}
            onError={() => setImageError(true)}
            quality={85}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.palette.grey[100],
            }}
          >
            <Box 
              sx={{ 
                width: { xs: 80, sm: 100, md: 120 }, // Increased placeholder size
                height: { xs: 80, sm: 100, md: 120 },
                backgroundColor: theme.palette.grey[300],
                borderRadius: '50%',
                opacity: 0.7,
              }} 
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

const SidebarTrendingProducts: React.FC<{ limit?: number }> = ({ limit = 10 }) => {
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]); // New state for displayed products
  const [currentIndex, setCurrentIndex] = useState(0); // Track current index for rotation

  useEffect(() => {
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

    fetchTrendingProducts();
  }, [limit]);

  // Rotate products every 30 seconds
  useEffect(() => {
    if (products.length === 0) return;

    // Set initial display products
    setDisplayProducts(products.slice(0, 4));

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const newIndex = (prevIndex + 4) % products.length;
        const newDisplayProducts: Product[] = [];
        
        for (let i = 0; i < 4; i++) {
          const product = products[(newIndex + i) % products.length];
          if (product) {
            newDisplayProducts.push(product);
          }
        }
        
        // Filter out any undefined values and ensure we have exactly 4 products
        const filteredProducts = newDisplayProducts.filter((product): product is Product => product !== undefined);
        setDisplayProducts(filteredProducts);
        return newIndex;
      });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [products]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="error">{error}</Typography>
      </Box>
    );
  }

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      pb: 1.5,
    }}>
      {displayProducts.map((product) => (
        <Box 
          key={product.id} 
          sx={{ 
            cursor: 'pointer',
            borderRadius: 2,
            overflow: 'hidden',
            border: `1px solid ${theme.palette.divider}`,
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}
          onClick={() => window.location.href = `/marketplace/${product.id}`}
        >
          <ImageOnlyProductCard product={product} />
        </Box>
      ))}
    </Box>
  );
};

interface MarketplaceSidebarProps {
  userId: string | null;
}

const MarketplaceSidebar: React.FC<MarketplaceSidebarProps> = ({ userId }) => {
  const theme = useTheme();
  const [openSections, setOpenSections] = useState({
    trending: true
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <Box 
      sx={{ 
        width: '100%', // Changed to 100% to fully fill the container
        borderRight: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        height: '100%',
        overflowY: 'auto'
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
          Smart Recommendations
        </Typography>
      </Box>
      
      <Divider />
      
      {/* Trending Products Section - Always visible and expanded */}
      <ListItem 
        onClick={() => toggleSection('trending')}
        sx={{ 
          backgroundColor: theme.palette.grey[50],
          '&:hover': {
            backgroundColor: theme.palette.grey[100]
          },
          cursor: 'pointer'
        }}
      >
        <TrendingUp size={18} style={{ marginRight: 8, color: theme.palette.secondary.main }} />
        <ListItemText primary="Trending Products" />
        <IconButton edge="end">
          {openSections.trending ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </IconButton>
      </ListItem>
      
      <Collapse in={openSections.trending} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2 }}>
          <SidebarTrendingProducts limit={10} />
        </Box>
      </Collapse>
    </Box>
  );
};

export default MarketplaceSidebar;