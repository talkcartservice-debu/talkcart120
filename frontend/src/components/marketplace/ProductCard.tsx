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
} from '@mui/material';
import {
  Eye,
  AlertCircle,
  MessageCircle,
  Star,
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

  // Loading skeleton
  if (loading || !product) {
    return (
      <Card
        sx={{
          height: 320,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
        }}
      >
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 0 }} />
        <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
          <Skeleton variant="text" width="80%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width="60%" height={18} sx={{ mb: 1.5 }} />
          <Skeleton variant="rectangular" width="100%" height={32} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        height: 320,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        transition: 'all 0.3s ease',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
        },
      }}
      onClick={handleCardClick}
    >
      {/* Product Image - Ensuring rectangular shape */}
      <Box sx={{ 
        position: 'relative', 
        height: 200,
        backgroundColor: '#f8f8f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        '&:hover .product-image': {
          transform: 'scale(1.05)'
        }
      }}>
        {!imageError ? (
          <OptimizedImage
            src={getImageSrc()}
            alt={product?.name || 'Product'}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            style={{ 
              objectFit: 'cover', 
              width: '100%', 
              height: '100%',
              transition: 'transform 0.3s ease'
            }}
            className="product-image"
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
              backgroundColor: alpha(theme.palette.grey[300], 0.3),
            }}
          >
            <AlertCircle size={32} color={theme.palette.text.secondary} />
          </Box>
        )}
      </Box>
              
      {/* Product Name and Price */}
      <CardContent sx={{ flexGrow: 1, p: 1.5, pt: 1 }}>
        <Typography 
          variant="subtitle1"
          sx={{ 
            fontWeight: 600, 
            mb: 0.5, 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            display: '-webkit-box', 
            WebkitLineClamp: 1, // Reduced to 1 line
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4em',
            height: '1.4em', // Adjusted height
            fontSize: '1rem',
            color: theme.palette.text.primary
          }}
        >
          {product?.name || 'Product'}
        </Typography>
        
        {/* Price Information - Simplified */}
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            {/* Discounted Price Display */}
            {product?.discount && product.discount > 0 ? (
              <>
                <Typography 
                  variant="h6"
                  color="#B12704"
                  sx={{ 
                    fontWeight: 700,
                    fontSize: '1.1rem',
                  }}
                  component="p"
                >
                  {product?.currency === 'ETH' 
                    ? `${((product?.price || 0) * (1 - (product?.discount || 0)/100)).toFixed(4)} ETH` 
                    : product?.currency === 'USD' 
                      ? `$${((product?.price || 0) * (1 - (product?.discount || 0)/100)).toFixed(2)}` 
                      : `${((product?.price || 0) * (1 - (product?.discount || 0)/100)).toFixed(2)} ${product?.currency || ''}`}
                </Typography>
                <Typography 
                  variant="body2"
                  sx={{ 
                    textDecoration: 'line-through', 
                    color: 'text.secondary',
                    fontSize: '0.9rem'
                  }}
                >
                  {product?.currency === 'ETH' 
                    ? `${(product?.price || 0).toFixed(4)} ETH` 
                    : product?.currency === 'USD' 
                      ? `$${(product?.price || 0).toFixed(2)}` 
                      : `${product?.price || 0} ${product?.currency || ''}`}
                </Typography>
              </>
            ) : (
              /* Regular Price Display */
              <>
                {/* For Rwanda users, show converted price as primary and original as secondary */}
                {effectiveUserCurrency === 'RWF' && convertedPrice !== null ? (
                  <>
                    <Typography 
                      variant="h6"
                      color="#B12704"
                      sx={{ 
                        fontWeight: 700,
                        fontSize: '1.1rem',
                      }}
                      component="p"
                    >
                      {isConverting 
                        ? `Converting...` 
                        : `${formatCurrencyAmount(convertedPrice, effectiveUserCurrency)}`}
                    </Typography>
                  </>
                ) : (
                  <>
                    {/* Converted price in user's currency - Make it more visible */}
                    {convertedPrice !== null ? (
                      <Typography 
                        variant="h6"
                        color="#B12704"
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '1.1rem',
                        }}
                        component="p"
                      >
                        {isConverting 
                          ? `Converting...` 
                          : `${formatCurrencyAmount(convertedPrice, effectiveUserCurrency)}`}
                      </Typography>
                    ) : product?.currency !== effectiveUserCurrency ? (
                      <Typography 
                        variant="h6"
                        color="#B12704"
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          fontStyle: 'italic',
                        }}
                        component="p"
                      >
                        (Conversion failed)
                      </Typography>
                    ) : (
                      // Show original price when currencies are the same
                      <Typography 
                        variant="h6"
                        color="#B12704"
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '1.1rem',
                        }}
                        component="p"
                      >
                        {product?.currency === 'ETH' 
                          ? `${product?.price || 0} ETH` 
                          : product?.currency === 'USD' 
                            ? `$${(product?.price || 0).toFixed(2)}` 
                            : `${product?.price || 0} ${product?.currency || ''}`}
                      </Typography>
                    )}
                  </>
                )}
              </>
            )}
          </Box>
        </Box>
        
        {/* Recommendation Reason */}
        {product?.recommendationReason && (
          <Box sx={{ mb: 1 }}>
            <Chip 
              label={product.recommendationReason}
              size="small"
              sx={{ 
                fontSize: '0.7rem',
                height: '20px',
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                '& .MuiChip-label': {
                  px: 0.5
                }
              }}
            />
          </Box>
        )}
        
        {/* Feedback Buttons */}
        {onFeedback && product?.id && (
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={(e) => {
                e.stopPropagation();
                onFeedback(product.id, 'like', product.recommendationReason);
              }}
              sx={{ 
                minWidth: 0, 
                px: 0.5, 
                py: 0.25, 
                fontSize: '0.7rem',
                minHeight: '24px'
              }}
            >
              👍
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={(e) => {
                e.stopPropagation();
                onFeedback(product.id, 'dislike', product.recommendationReason);
              }}
              sx={{ 
                minWidth: 0, 
                px: 0.5, 
                py: 0.25, 
                fontSize: '0.7rem',
                minHeight: '24px'
              }}
            >
              👎
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<ShoppingCart size={12} />}
            onClick={handleAddToCart}
            sx={{
              flex: 1,
              py: 0.5,
              px: 0.5,
              fontSize: '0.7rem',
              fontWeight: 500,
              borderRadius: 1,
              textTransform: 'none',
              backgroundColor: '#FF9900',
              color: 'white',
              boxShadow: '0 1px 2px rgba(255, 153, 0, 0.2)',
              '&:hover': {
                backgroundColor: '#e68a00',
                boxShadow: '0 2px 4px rgba(255, 153, 0, 0.3)',
              }
            }}
          >
            Add to Cart
          </Button>

        </Box>
      </CardContent>
    </Card>
  );
};

export default ProductCard;