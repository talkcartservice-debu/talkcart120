import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExternalLink,
  Share2,
  Heart,
  DollarSign,
  Info,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface NFTCardProps {
  nft: any;
  variant?: 'outlined' | 'elevation';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

const NFTCard: React.FC<NFTCardProps> = ({ 
  nft, 
  variant = 'outlined',
  size = 'medium',
  onClick
}) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Format price with proper decimals
  const formatPrice = (price: number | string) => {
    if (!price) return '0';
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (numPrice < 0.01) {
      return numPrice.toFixed(6);
    } else if (numPrice < 1) {
      return numPrice.toFixed(4);
    } else {
      return numPrice.toFixed(2);
    }
  };

  // Handle card click
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/nft/${nft.id || nft._id}`);
    }
  };

  // Handle share
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nftUrl = `${window.location.origin}/nft/${nft.id || nft._id}`;
    
    if (navigator.share) {
      navigator.share({
        title: nft.name,
        text: `Check out this NFT: ${nft.name}`,
        url: nftUrl,
      }).catch(error => {
        console.error('Error sharing:', error);
        copyNftLink(nftUrl);
      });
    } else {
      copyNftLink(nftUrl);
    }
  };

  // Copy NFT link to clipboard
  const copyNftLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('NFT link copied to clipboard!');
  };

  // Handle external link click
  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nft.externalUrl) {
      window.open(nft.externalUrl, '_blank');
    } else if (nft.marketplaceUrl) {
      window.open(nft.marketplaceUrl, '_blank');
    } else {
      toast.error('No external link available');
    }
  };

  // Determine image height based on card size
  const imageHeight = size === 'small' ? 150 : size === 'medium' ? 200 : 250;

  return (
    <Card 
      variant={variant === 'outlined' ? 'outlined' : 'elevation'} 
      sx={{ 
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
        }
      }}
      onClick={handleCardClick}
    >
      <Box
        sx={{
          height: imageHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {nft.image ? (
          <Box
            component="img"
            src={nft.image}
            alt={nft.name}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Typography variant="h3" color="text.secondary">
            NFT
          </Typography>
        )}
        
        {/* Overlay actions */}
        <Box 
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
          }}
        >
          <IconButton 
            size="small" 
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.8)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
            }}
            onClick={handleShare}
          >
            <Share2 size={16} />
          </IconButton>
          
          {(nft.externalUrl || nft.marketplaceUrl) && (
            <IconButton 
              size="small" 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.8)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
              }}
              onClick={handleExternalLink}
            >
              <ExternalLink size={16} />
            </IconButton>
          )}
        </Box>
        
        {/* Collection tag */}
        {nft.collection && (
          <Chip
            label={nft.collection}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              bgcolor: 'rgba(255,255,255,0.8)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
            }}
          />
        )}
      </Box>
      
      <CardContent sx={{ p: size === 'small' ? 1.5 : 2 }}>
        <Typography 
          variant={size === 'small' ? 'subtitle2' : 'h6'} 
          fontWeight={600} 
          gutterBottom
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {nft.name}
        </Typography>
        
        {nft.description && size !== 'small' && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {nft.description}
          </Typography>
        )}
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Box display="flex" alignItems="center">
            <Tooltip title={`${formatPrice(nft.price)} ${nft.currency || 'ETH'}`}>
              <Box display="flex" alignItems="center">
                <DollarSign size={16} color="#666" />
                <Typography variant="body2" fontWeight={600} sx={{ ml: 0.5 }}>
                  {formatPrice(nft.price)} {nft.currency || 'ETH'}
                </Typography>
              </Box>
            </Tooltip>
          </Box>
          
          <Button 
            size="small" 
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/nft/${nft.id || nft._id}`);
            }}
          >
            View
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default NFTCard;