import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  useTheme,
  alpha,
  Chip,
  Button,
  useMediaQuery,
  Stack,
  Badge,
} from '@mui/material';
import {
  Eye,
  AlertCircle,
  Heart,
  Share2,
  Sparkles,
  ShoppingCart,
} from 'lucide-react';
import OptimizedImage from '@/components/media/OptimizedImage';
import { convertUsdToCurrency, convertCurrencyToUsd, formatCurrencyAmount } from '@/utils/currencyConverter';
import { getUserCurrency } from '@/utils/userCurrencyDetector';
import dynamic from 'next/dynamic';
import { useCart } from '@/hooks/useCart';
import toast from 'react-hot-toast';
const ChatbotButton = dynamic(() => import('./ChatbotButton'), { ssr: false });

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
  inStock?: boolean;
  recommendationReason?: string;
}

interface ProductCardProps {
  product?: Product;
  loading?: boolean;
  userCurrency?: string; // Add user's preferred currency
  onCurrencyConverted?: (convertedPrice: number) => void; // Callback for converted price
  onFeedback?: (productId: string, feedback: 'like' | 'dislike', reason?: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  loading = false,
  userCurrency,
  onCurrencyConverted,
  onFeedback,
}) => {
  console.log('ProductCard received product:', product);
  console.log('ProductCard loading state:', loading);
  
  // Get cart functions - Moved to top to avoid conditional hook calls
  const { addToCart } = useCart();

  // Handle add to cart with useCallback to prevent unnecessary re-renders
  // Moved to top to avoid conditional hook calls
  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only add to cart if product exists
    if (!product?.id) return;
    
    try {
      const success = await addToCart(product.id, 1);
      if (success) {
        toast.success(`${product.name || 'Product'} added to cart!`);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  }, [product?.name, product?.id, addToCart]);

  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [imageError, setImageError] = useState(false);
  const [convertedPrice, setConvertedPrice] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [detectedCurrency, setDetectedCurrency] = useState<string>('USD');

  // Detect user's currency when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const detectCurrency = async () => {
      try {
        console.log('Starting currency detection in ProductCard');
        const currency = await getUserCurrency();
        console.log('Detected currency:', currency);
        // Validate currency before setting state
        if (isMounted && currency && typeof currency === 'string' && currency.length === 3) {
          console.log('Setting detected currency:', currency.toUpperCase());
          setDetectedCurrency(currency.toUpperCase());
        } else if (isMounted) {
          // Fallback to USD if currency detection returns invalid data
          console.log('Invalid currency detected, using USD');
          setDetectedCurrency('USD');
        }
      } catch (error) {
        console.error('Error detecting currency:', error);
        // Use default currency if detection fails
        if (isMounted) {
          console.log('Error in currency detection, using USD');
          setDetectedCurrency('USD');
        }
      }
    };

    // Add a small delay to prevent blocking the main thread
    const timer = setTimeout(() => {
      console.log('Starting currency detection');
      detectCurrency();
    }, 100);

    return () => {
      console.log('Cleaning up currency detection useEffect');
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Use detected currency if no userCurrency prop is provided
  const effectiveUserCurrency = userCurrency || detectedCurrency;
  console.log('ProductCard: effectiveUserCurrency', effectiveUserCurrency);
  console.log('ProductCard: product.currency', product?.currency);
  console.log('ProductCard: currencies different', product?.currency !== effectiveUserCurrency);

  // Convert price to user's currency when product or userCurrency changes
  useEffect(() => {
    const convertPrice = async () => {
      if (!product) {
        setConvertedPrice(null);
        return;
      }

      // Debug logging
      console.log('Currency conversion debug:', {
        productCurrency: product?.currency,
        userCurrency: effectiveUserCurrency,
        areCurrenciesDifferent: product?.currency !== effectiveUserCurrency
      });

      // Only attempt conversion if currencies are different and both are valid
      if (product?.currency && effectiveUserCurrency && product.currency !== effectiveUserCurrency) {
        setIsConverting(true);
        try {
          // If product is already in USD, convert to user's currency
          if (product.currency === 'USD') {
            const converted = await convertUsdToCurrency(product?.price || 0, effectiveUserCurrency);
            console.log('Converted from USD to user currency:', { original: product?.price || 0, converted, currency: effectiveUserCurrency });
            setConvertedPrice(converted);
            onCurrencyConverted?.(converted);
          } 
          // If user wants USD but product is in another currency, convert to USD
          else if (effectiveUserCurrency === 'USD') {
            const converted = await convertCurrencyToUsd(product?.price || 0, product?.currency);
            console.log('Converted to USD from product currency:', { original: product?.price || 0, converted, currency: product?.currency });
            setConvertedPrice(converted);
            onCurrencyConverted?.(converted);
          }
          // If both product and user currency are non-USD, convert through USD
          else {
            // First convert product currency to USD
            const inUsd = await convertCurrencyToUsd(product?.price || 0, product?.currency);
            // Then convert USD to user's currency
            const converted = await convertUsdToCurrency(inUsd, effectiveUserCurrency);
            console.log('Converted through USD:', { 
              original: product?.price || 0, 
              inUsd: inUsd,
              converted: converted, 
              fromCurrency: product?.currency,
              toCurrency: effectiveUserCurrency 
            });
            setConvertedPrice(converted);
            onCurrencyConverted?.(converted);
          }
        } catch (error) {
          console.error('Error converting currency:', error);
          setConvertedPrice(null);
        } finally {
          setIsConverting(false);
        }
      } else {
        // Currencies are the same, set converted price to null to indicate no conversion needed
        console.log('Currencies are the same, setting converted price to null');
        setConvertedPrice(null);
      }
    };

    convertPrice();
  }, [product, effectiveUserCurrency, onCurrencyConverted]);

  const getImageSrc = () => {
    // Add safety check for product
    if (!product?.images || product.images.length === 0) {
      return '/images/placeholder-image.png';
    }
    
    const firstImage = product.images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    return firstImage?.secure_url || firstImage?.url || '/images/placeholder-image.png';
  };

  // Handle navigation to product detail page
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if the click originated from the chat button
    if ((e.target as HTMLElement).closest('.chatbot-button-container')) {
      e.stopPropagation();
      return;
    }
    // Only navigate if product exists
    if (product?.id) {
      router.push(`/marketplace/${product.id}`);
    }
  };

  // Handle chat button click
  const handleChatClick = (e: React.MouseEvent) => {
    // Stop propagation to prevent card click handler from firing
    e.stopPropagation();
  };

  // Loading skeleton - Updated for modern design
  if (loading || !product) {
    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 0 }} />
        <CardContent sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2 }, pt: { xs: 1.25, sm: 1.75 } }}>
          <Skeleton variant="text" width="70%" height={20} sx={{ mb: 1, borderRadius: 1 }} />
          <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1.5, borderRadius: 1 }} />
          <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 2 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
        },
      }}
      onClick={handleCardClick}
    >
      {/* Product Image - Enhanced styling */}
      <Box sx={{ 
        position: 'relative', 
        height: { xs: 180, sm: 200, md: 220, lg: 240 },
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        '&:hover .product-image': {
          transform: 'scale(1.05)'
        },
        '&:hover .product-overlay': {
          opacity: 1,
        },
      }}>
        {!imageError ? (
          <OptimizedImage
            src={getImageSrc()}
            alt={product?.name || 'Product'}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ 
              objectFit: 'contain', 
              width: '100%', 
              height: '100%',
              transition: 'transform 0.3s ease-in-out'
            }}
            className="product-image"
            onError={() => setImageError(true)}
            quality={90}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.grey[300], 0.3),
            }}
          >
            <AlertCircle size={36} color={theme.palette.text.secondary} />
          </Box>
        )}
        
        {/* Product overlay with quick actions */}
        <Box 
          className="product-overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.3s ease-in-out',
            gap: 1,
            zIndex: 1,
          }}
        >
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<Heart size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              toast.success('Added to favorites!');
            }}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: 'white',
              },
              borderRadius: '50px',
              minWidth: 'auto',
              p: 0.5,
            }}
          >
            <Heart size={16} />
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<Share2 size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              toast.success('Link copied to clipboard!');
            }}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: 'white',
              },
              borderRadius: '50px',
              minWidth: 'auto',
              p: 0.5,
            }}
          >
            <Share2 size={16} />
          </Button>
        </Box>
        
        {/* Special badges */}
        <Box sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          zIndex: 2,
        }}>
          {product?.featured && (
            <Chip
              icon={<Sparkles size={14} />}
              label="Featured"
              size="small"
              color="primary"
              variant="filled"
              sx={{
                height: 24,
                fontSize: '0.65rem',
                fontWeight: 600,
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                borderRadius: 2,
                '& .MuiChip-label': {
                  px: 0.75,
                },
              }}
            />
          )}
          {product?.discount && product.discount > 0 && (
            <Chip
              label={`${Math.round(product.discount)}% OFF`}
              size="small"
              color="error"
              variant="filled"
              sx={{
                height: 24,
                fontSize: '0.65rem',
                fontWeight: 600,
                backgroundColor: '#e53e3e',
                color: 'white',
                borderRadius: 2,
                '& .MuiChip-label': {
                  px: 0.75,
                },
              }}
            />
          )}
          {product?.prime && (
            <Chip
              label="Prime"
              size="small"
              color="info"
              variant="filled"
              sx={{
                height: 24,
                fontSize: '0.65rem',
                fontWeight: 600,
                backgroundColor: '#00a8e1',
                color: 'white',
                borderRadius: 2,
                '& .MuiChip-label': {
                  px: 0.75,
                },
              }}
            />
          )}
        </Box>
        
        {/* Free Shipping Badge */}
        {product?.freeShipping && (
          <Box sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
          }}>
            <Chip
              label="Free Shipping"
              size="small"
              color="success"
              variant="outlined"
              sx={{
                height: 24,
                fontSize: '0.65rem',
                fontWeight: 600,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: '#2e7d32',
                borderRadius: 2,
                '& .MuiChip-label': {
                  px: 0.75,
                },
              }}
            />
          </Box>
        )}
      </Box>
              
      {/* Product Info - Only Favorite functionality */}
      <CardContent sx={{ 
        p: { xs: 0.5, sm: 1 }, 
        display: 'flex',
        justifyContent: 'flex-end',
        position: 'relative',
        '&:hover .favorite-button': {
          opacity: 1,
        },
      }}>
        <Button
          className="favorite-button"
          size="small"
          variant="contained"
          color="primary"
          startIcon={<Heart size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            toast.success('Added to favorites!');
          }}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            color: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: 'white',
            },
            borderRadius: '50px',
            minWidth: 'auto',
            p: 0.5,
            opacity: 0,
            transition: 'opacity 0.3s ease-in-out',
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 2,
          }}
        >
          <Heart size={16} />
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProductCard;