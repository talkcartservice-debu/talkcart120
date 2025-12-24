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
  Avatar,
  Stack,
} from '@mui/material';
import { 
  ShoppingCart, 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark,
  X,
  MoreVertical,
  ExternalLink,
  Target,
  TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { formatCurrency } from '@/utils/format';

interface AdCardProps {
  ad: any; // Ad object from backend
  onAdClick?: (adId: string) => void;
  onAdInteraction?: (adId: string, type: string) => void;
  onDismiss?: (adId: string) => void;
}

const AdCard: React.FC<AdCardProps> = ({ 
  ad, 
  onAdClick, 
  onAdInteraction, 
  onDismiss 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const { user } = useAuth();
  const [impressionRecorded, setImpressionRecorded] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(ad.likes?.length || 0);

  // Record impression when ad becomes visible
  useEffect(() => {
    if (!impressionRecorded && ad.id) {
      recordImpression();
      setImpressionRecorded(true);
    }
  }, [ad.id, impressionRecorded]);

  const recordImpression = async () => {
    try {
      await api.ads.recordAdImpression(ad.id);
      onAdInteraction?.(ad.id, 'impression');
    } catch (error) {
      console.error('Failed to record ad impression:', error);
    }
  };

  const handleAdClick = async () => {
    try {
      // Record click interaction
      await api.ads.recordAdClick(ad.id);
      onAdInteraction?.(ad.id, 'click');
      
      // Navigate to ad destination
      if (ad.destinationUrl) {
        window.open(ad.destinationUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to record ad click:', error);
    }
  };

  const handleLike = async () => {
    try {
      setIsLiked(!isLiked);
      const newLikeCount = isLiked ? likeCount - 1 : likeCount + 1;
      setLikeCount(newLikeCount);
      
      // In a real app, you would call the API to toggle like status
      // For now, just record the interaction
      onAdInteraction?.(ad.id, isLiked ? 'unlike' : 'like');
    } catch (error) {
      console.error('Failed to toggle like:', error);
      setIsLiked(!isLiked); // Revert if API call fails
    }
  };

  const handleDismiss = () => {
    onDismiss?.(ad.id);
  };

  const handleShare = () => {
    onAdInteraction?.(ad.id, 'share');
    // Implement share functionality
    if (navigator.share) {
      navigator.share({
        title: ad.headline || ad.title,
        text: ad.description,
        url: ad.destinationUrl || window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(ad.destinationUrl || window.location.href);
    }
  };

  // Get ad data
  const creative = ad.creative || {};
  const primaryImage = creative.imageUrl || creative.media?.[0];

  return (
    <Card 
      sx={{ 
        mb: 2, 
        borderRadius: 3, 
        border: `1px solid ${theme.palette.divider}`,
        position: 'relative',
        overflow: 'visible',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
      }}
    >
      {/* Sponsored label */}
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
          label="Sponsored" 
          size="small" 
          color="primary" 
          variant="outlined"
          sx={{ 
            fontSize: '0.7rem',
            height: '20px',
            fontWeight: 'bold'
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

      {/* Ad content */}
      <Box>
        {/* Advertiser info */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 1.5,
            pb: 1,
          }}
        >
          <Avatar 
            src={ad.advertiser?.avatar || ad.advertiser?.logoUrl} 
            alt={ad.advertiser?.name}
            sx={{ width: 32, height: 32, mr: 1.5 }}
          >
            {ad.advertiser?.name?.charAt(0)}
          </Avatar>
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
              {ad.advertiser?.name}
              {ad.advertiser?.isVerified && (
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
              Paid partnership
            </Typography>
          </Box>
          <IconButton size="small">
            <MoreVertical size={16} />
          </IconButton>
        </Box>

        {/* Ad content */}
        {creative.headline && (
          <CardContent sx={{ pt: 1, pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {creative.headline}
            </Typography>
            {creative.description && (
              <Typography variant="body2" paragraph>
                {creative.description}
              </Typography>
            )}
          </CardContent>
        )}

        {/* Ad media */}
        {primaryImage && (
          <CardMedia
            component="img"
            image={primaryImage.secure_url || primaryImage.url || primaryImage}
            alt={creative.headline || creative.description}
            sx={{
              width: '100%',
              maxHeight: isMobile ? 300 : 400,
              objectFit: 'cover',
              cursor: 'pointer',
            }}
            onClick={handleAdClick}
          />
        )}

        {/* Ad info overlay */}
        {creative.callToAction && (
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
                {creative.headline || ad.advertiser?.name}
              </Typography>
              
              {/* Performance indicators */}
              {ad.performance?.ctr && (
                <Chip
                  icon={<TrendingUp size={14} />}
                  label={`${ad.performance.ctr.toFixed(2)}% CTR`}
                  size="small"
                  color="secondary"
                  variant="filled"
                  sx={{ 
                    fontSize: '0.7rem',
                    height: '22px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white'
                  }}
                />
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleAdClick}
                startIcon={<ExternalLink size={14} />}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 500,
                  backgroundColor: 'white',
                  color: 'black',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.9)',
                  }
                }}
              >
                {creative.callToAction}
              </Button>
            </Box>
          </Box>
        )}

        {/* Action buttons */}
        <CardContent sx={{ pt: 1, pb: 1.5 }}>
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
              onClick={handleAdClick}
              size="small"
              sx={{ 
                textTransform: 'none',
                minWidth: 'auto',
                padding: '6px 8px'
              }}
            >
              <Typography variant="caption">Comment</Typography>
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

export default AdCard;