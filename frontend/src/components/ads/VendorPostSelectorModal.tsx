import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { X, ShoppingCart, Image } from 'lucide-react';
import { api } from '@/lib/api';
import { Post } from '@/types/social';

interface VendorPostSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onPostSelected: (postId: string) => void;
  vendorId: string;
}

const VendorPostSelectorModal: React.FC<VendorPostSelectorModalProps> = ({
  open,
  onClose,
  onPostSelected,
  vendorId,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, get the user by ID to retrieve their username
      const userResponse: any = await api.users.getById(vendorId);
      
      if (userResponse.success && userResponse.data?.username) {
        // Now fetch posts using the username
        const postsResponse: any = await api.posts.getUserPosts(userResponse.data.username, { limit: 20 });
        
        if (postsResponse.success && postsResponse.data?.posts) {
          setPosts(postsResponse.data.posts);
        } else {
          setError(postsResponse.message || 'Failed to load posts');
        }
      } else {
        setError(userResponse.message || 'Failed to retrieve vendor information');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [vendorId, setLoading, setError, setPosts]);

  useEffect(() => {
    if (open && vendorId) {
      fetchPosts();
    }
  }, [open, vendorId, fetchPosts]);

  const handleSelectPost = (postId: string) => {
    setSelectedPost(postId);
  };

  const handleConfirm = () => {
    if (selectedPost) {
      onPostSelected(selectedPost);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedPost(null);
    onClose();
  };

  const getPostMedia = (post: Post) => {
    if (post.media && Array.isArray(post.media) && post.media.length > 0) {
      const mediaItem = post.media[0];
      if (mediaItem && typeof mediaItem === 'object') {
        return (mediaItem as any).secure_url || (mediaItem as any).url || '/images/placeholder-image.png';
      }
    }
    return '/images/placeholder-image.png';
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={600}>Select Post for Shoppable Link</Typography>
          <Button onClick={handleClose} size="small" sx={{ minWidth: 'auto' }}>
            <X size={20} />
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ py: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button 
              startIcon={<X size={16} />} 
              onClick={fetchPosts}
              size="small"
              sx={{ ml: 2 }}
            >
              Retry
            </Button>
          </Alert>
        ) : posts.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <Image size={48} className="text-gray-400 mb-2" />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Posts Available
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              You don&apos;t have any posts yet. Create posts first before linking products.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select a post to link products to. The selected post will become a shoppable post.
            </Typography>
            
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)' }, 
              gap: 2 
            }}>
              {posts.map((post) => (
                <Card
                  key={post.id}
                  onClick={() => handleSelectPost(post.id)}
                  sx={{
                    cursor: 'pointer',
                    border: selectedPost === post.id 
                      ? `2px solid ${theme.palette.primary.main}` 
                      : `1px solid ${theme.palette.divider}`,
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    },
                    transition: 'all 0.2s ease-in-out',
                    overflow: 'hidden',
                  }}
                >
                  <CardMedia
                    component="img"
                    image={getPostMedia(post)}
                    alt={post.content.substring(0, 50) + '...'}
                    sx={{ height: 120, objectFit: 'cover' }}
                  />
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        display: '-webkit-box', 
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical', 
                        overflow: 'hidden',
                        minHeight: '2.5em',
                        lineHeight: 1.3
                      }}
                    >
                      {post.content}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        size="small"
                        label={`Created: ${new Date(post.createdAt).toLocaleDateString()}`}
                        variant="outlined"
                        sx={{ fontSize: '0.65rem' }}
                      />
                      {selectedPost === post.id && (
                        <Chip
                          size="small"
                          icon={<ShoppingCart size={14} />}
                          label="Selected"
                          color="primary"
                          variant="filled"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleConfirm} 
          disabled={!selectedPost}
          startIcon={<ShoppingCart size={16} />}
        >
          Link Products to Selected Post
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VendorPostSelectorModal;