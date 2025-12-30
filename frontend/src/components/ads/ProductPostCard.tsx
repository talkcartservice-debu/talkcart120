import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Link,
  Avatar,
  Badge,
  Stack,
} from '@mui/material';
import { 
  ShoppingCart, 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark,
  Info,
  X,
  MoreVertical,
  Tag,
  Percent 
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { formatCurrency } from '@/utils/format';

interface ProductPostCardProps {
  productPost: any; // Product post object from backend
  onProductClick?: (productId: string) => void;
  onProductInteraction?: (productPostId: string, type: string) => void;
  onDismiss?: (productPostId: string) => void;
}

const ProductPostCard: React.FC<ProductPostCardProps> = ({ 
  productPost, 
  onProductClick, 
  onProductInteraction, 
  onDismiss 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const { user } = useAuth();
  const [impressionRecorded, setImpressionRecorded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(productPost.likes?.length || 0);

  // Record impression when product post becomes visible
  useEffect(() => {
    if (!impressionRecorded && productPost.id) {
      recordView();
      setImpressionRecorded(true);
    }
  }, [productPost.id, impressionRecorded]);

  const recordView = async () => {
    try {
      await api.ads.recordProductPostView(productPost.id);
      onProductInteraction?.(productPost.id, 'view');
    } catch (error) {
      console.error('Failed to record product post view:', error);
    }
  };

  const handleProductClick = async () => {
    try {
      // Record click interaction
      await api.ads.recordProductPostInteraction(productPost.id, 'click');
      onProductInteraction?.(productPost.id, 'click');
      
      // Navigate to product page
      if (productPost.product?.id) {
        router.push(`/marketplace/${productPost.product.id}`);
      }
    } catch (error) {
      console.error('Failed to record product post click:', error);
    }
  };

  const handleAddToCart = async () => {
    try {
      // Record add to cart interaction
      await api.ads.recordProductPostInteraction(productPost.id, 'add_to_cart');
      onProductInteraction?.(productPost.id, 'add_to_cart');
      
      // Add to cart and navigate to cart
      if (productPost.product?.id) {
        const success = await api.marketplace.addToCart(productPost.product.id, 1);
        if (success) {
          router.push('/marketplace/cart');
        }
      }
    } catch (error) {
      console.error('Failed to add product to cart:', error);
    }
  };

  const handleLike = async () => {
    try {
      setIsLiked(!isLiked);
      const newLikeCount = isLiked ? likeCount - 1 : likeCount + 1;
      setLikeCount(newLikeCount);
      
      // In a real app, you would call the API to toggle like status
      // For now, just record the interaction
      onProductInteraction?.(productPost.id, isLiked ? 'unlike' : 'like');
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setIsLiked(!isLiked); // Revert if API call fails
    }
  };

  const handleDismiss = () => {
    onDismiss?.(productPost.id);
  };

  const handleShare = () => {
    onProductInteraction?.(productPost.id, 'share');
    // Implement share functionality
    if (navigator.share) {
      navigator.share({
        title: productPost.product?.name,
        text: productPost.product?.description,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Get product data
  const product = productPost.product || {};
  const primaryImage = product.images?.[0] || productPost.originalPost?.media?.[0];

  return (
    <Card 
      sx={{ 
        mb: 2.5, 
        borderRadius: 3, 
        border: `1px solid ${theme.palette.divider}`,
        position: 'relative',
        overflow: 'visible',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* Shoppable label */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 12, 
          left: 12, 
          zIndex: 1,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
          px: 1.2,
          py: 0.6,
          borderRadius: 1.5,
        }}
      >
        <Chip 
          icon={<ShoppingCart size={14} />}
          label="Shoppable" 
          size="small" 
          color="secondary" 
          variant="filled"
          sx={{ 
            fontSize: '0.75rem',
            height: '22px',
            fontWeight: 600,
            '& .MuiChip-label': {
              pl: 0.5,
            },
          }}
        />
      </Box>

      {/* Dismiss button */}
      <IconButton
        onClick={handleDismiss}
        size="small"
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
          color: theme.palette.text.secondary,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      >
        <X size={18} />
      </IconButton>

      {/* Product post content */}
      <Box>
        {/* Author info */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2,
            pb: 1.5,
          }}
        >
          <Avatar 
            src={productPost.author?.avatar} 
            alt={productPost.author?.displayName}
            sx={{ width: 36, height: 36, mr: 1.5 }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              {productPost.author?.displayName}
              {productPost.author?.isVerified && (
                <Box
                  component="span"
                  sx={{
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    component="svg"
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
                  </Box>
                </Box>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              Shoppable Post
            </Typography>
          </Box>
          <IconButton size="small" sx={{ color: theme.palette.text.secondary }}>
            <MoreVertical size={18} />
          </IconButton>
        </Box>

        {/* Post content */}
        {productPost.content && (
          <CardContent sx={{ pt: 1, pb: 1, px: 2 }}>
            <Typography variant="body2" paragraph sx={{ mb: 0, fontSize: '0.9rem' }}>
              {productPost.content}
            </Typography>
          </CardContent>
        )}

        {/* Product media */}
        {primaryImage && (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
            onClick={handleProductClick}
          >
            <CardMedia
              component="img"
              image={primaryImage.secure_url || primaryImage.url}
              alt={product.name}
              sx={{
                width: '100%',
                maxHeight: isMobile ? 300 : 400,
                objectFit: 'cover',
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'scale(1.02)',
                },
              }}
            />
            
            {/* Quick action overlay on hover */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3))',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.3s',
                '&:hover': {
                  opacity: 1,
                },
              }}
            >
              <Button
                variant="contained"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart();
                }}
                startIcon={<ShoppingCart size={16} />}
                sx={{ 
                  mb: 2,
                  backgroundColor: 'white',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.9)',
                  },
                }}
              >
                Quick Add to Cart
              </Button>
            </Box>
          </Box>
        )}

        {/* Product info overlay */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 100,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            p: 2,
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            zIndex: 0,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', maxWidth: '70%' }}>
              {product.name}
            </Typography>
            
            {/* Discount badge */}
            {product.discount > 0 && (
              <Chip
                icon={<Percent size={14} />}
                label={`${product.discount}% OFF`}
                size="small"
                color="error"
                variant="filled"
                sx={{ 
                  fontSize: '0.7rem',
                  height: '22px',
                  backgroundColor: 'red',
                  color: 'white'
                }}
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 700,
                color: product.discount > 0 ? 'error.main' : 'inherit'
              }}
            >
              {formatCurrency(product.price, product.currency)}
            </Typography>
            
            {product.originalPrice && product.originalPrice > product.price && (
              <Typography 
                variant="body2" 
                sx={{ 
                  textDecoration: 'line-through',
                  color: 'text.secondary',
                  fontSize: '0.8rem'
                }}
              >
                {formatCurrency(product.originalPrice, product.currency)}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Action buttons */}
        <CardContent sx={{ pt: 2, pb: 2, px: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleProductClick}
              startIcon={<ShoppingCart size={16} />}
              sx={{ 
                textTransform: 'none',
                fontWeight: 600,
                flex: 1,
                py: 1,
              }}
            >
              View Product
            </Button>
            
            <Button
              variant="outlined"
              size="small"
              onClick={handleAddToCart}
              startIcon={<ShoppingCart size={14} />}
              sx={{ 
                textTransform: 'none',
                fontWeight: 600,
                py: 1,
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  borderColor: 'primary.dark',
                },
              }}
            >
              Add to Cart
            </Button>
          </Stack>
          
          {/* Engagement buttons */}
          <Stack direction="row" spacing={2} sx={{ pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Button
              startIcon={
                <Heart 
                  size={18} 
                  fill={isLiked ? 'currentColor' : 'none'} 
                />
              }
              onClick={handleLike}
              size="small"
              sx={{ 
                textTransform: 'none',
                color: isLiked ? 'error.main' : 'inherit',
                minWidth: 'auto',
                padding: '6px 10px',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <Typography variant="caption" fontWeight={500}>
                {likeCount}
              </Typography>
            </Button>
            
            <Button
              startIcon={<MessageCircle size={18} />}
              onClick={() => {
                // Navigate to post comments
                if (productPost.originalPostId) {
                  router.push(`/post/${productPost.originalPostId}`);
                }
              }}
              size="small"
              sx={{ 
                textTransform: 'none',
                minWidth: 'auto',
                padding: '6px 10px',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <Typography variant="caption" fontWeight={500}>
                {productPost.comments || 0}
              </Typography>
            </Button>
            
            <Button
              startIcon={<Share2 size={18} />}
              onClick={handleShare}
              size="small"
              sx={{ 
                textTransform: 'none',
                minWidth: 'auto',
                padding: '6px 10px',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <Typography variant="caption" fontWeight={500}>Share</Typography>
            </Button>
            
            <Button
              startIcon={<Bookmark size={18} />}
              size="small"
              sx={{ 
                textTransform: 'none',
                minWidth: 'auto',
                padding: '6px 10px',
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <Typography variant="caption" fontWeight={500}>Save</Typography>
            </Button>
          </Stack>
        </CardContent>
      </Box>
    </Card>
  );
};

export default ProductPostCard;