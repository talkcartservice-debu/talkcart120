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
        mb: 2, 
        borderRadius: 3, 
        border: `1px solid ${theme.palette.divider}`,
        position: 'relative',
        overflow: 'visible',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      {/* Shoppable label */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 8, 
          left: 8, 
          zIndex: 1,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
          px: 1,
          py: 0.5,
          borderRadius: 1,
        }}
      >
        <Chip 
          label="Shoppable" 
          size="small" 
          color="secondary" 
          variant="outlined"
          sx={{ 
            fontSize: '0.7rem',
            height: '20px'
          }}
        />
      </Box>

      {/* Dismiss button */}
      <IconButton
        onClick={handleDismiss}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
        }}
      >
        <X size={16} />
      </IconButton>

      {/* Product post content */}
      <Box>
        {/* Author info */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 1.5,
            pb: 1,
          }}
        >
          <Avatar 
            src={productPost.author?.avatar} 
            alt={productPost.author?.displayName}
            sx={{ width: 32, height: 32, mr: 1.5 }}
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
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
                  </Box>
                </Box>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Shoppable Post
            </Typography>
          </Box>
          <IconButton size="small">
            <MoreVertical size={16} />
          </IconButton>
        </Box>

        {/* Post content */}
        {productPost.content && (
          <CardContent sx={{ pt: 1, pb: 1 }}>
            <Typography variant="body2" paragraph>
              {productPost.content}
            </Typography>
          </CardContent>
        )}

        {/* Product media */}
        {primaryImage && (
          <CardMedia
            component="img"
            image={primaryImage.secure_url || primaryImage.url}
            alt={product.name}
            sx={{
              width: '100%',
              maxHeight: isMobile ? 300 : 400,
              objectFit: 'cover',
              cursor: 'pointer',
            }}
            onClick={handleProductClick}
          />
        )}

        {/* Product info overlay */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            p: 2,
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
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
        <CardContent sx={{ pt: 1, pb: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={handleProductClick}
              startIcon={<ShoppingCart size={16} />}
              sx={{ 
                textTransform: 'none',
                fontWeight: 500,
                flex: 1
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
                fontWeight: 500,
              }}
            >
              Add to Cart
            </Button>
          </Stack>
          
          {/* Engagement buttons */}
          <Stack direction="row" spacing={2} sx={{ pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Button
              startIcon={
                <Heart 
                  size={16} 
                  fill={isLiked ? 'currentColor' : 'none'} 
                />
              }
              onClick={handleLike}
              size="small"
              sx={{ 
                textTransform: 'none',
                color: isLiked ? 'error.main' : 'inherit',
                minWidth: 'auto',
                padding: '6px 8px'
              }}
            >
              <Typography variant="caption">
                {likeCount}
              </Typography>
            </Button>
            
            <Button
              startIcon={<MessageCircle size={16} />}
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
                padding: '6px 8px'
              }}
            >
              <Typography variant="caption">
                {productPost.comments || 0}
              </Typography>
            </Button>
            
            <Button
              startIcon={<Share2 size={16} />}
              onClick={handleShare}
              size="small"
              sx={{ 
                textTransform: 'none',
                minWidth: 'auto',
                padding: '6px 8px'
              }}
            >
              <Typography variant="caption">Share</Typography>
            </Button>
            
            <Button
              startIcon={<Bookmark size={16} />}
              size="small"
              sx={{ 
                textTransform: 'none',
                minWidth: 'auto',
                padding: '6px 8px'
              }}
            >
              <Typography variant="caption">Save</Typography>
            </Button>
          </Stack>
        </CardContent>
      </Box>
    </Card>
  );
};

export default ProductPostCard;