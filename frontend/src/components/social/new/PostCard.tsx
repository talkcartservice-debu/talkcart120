import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  IconButton, 
  Box, 
  useTheme,
  keyframes,
  Collapse,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TextField,
  Menu,
  MenuItem
} from '@mui/material';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark,
  ImageIcon,
  MoreVertical,
  X as CloseIcon,
  Award,
  Trophy,
  Target,
  Star
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import UserAvatar from '@/components/common/UserAvatar';
import { Post } from '@/types/social';
import CommentSection from '@/components/Comments/CommentSection';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import UnifiedVideoMedia from '@/components/media/UnifiedVideoMedia';
import UnifiedImageMedia from '@/components/media/UnifiedImageMedia';

// Define the MediaItem interface based on the social types
interface MediaItem {
  id?: string;
  _id?: string;
  resource_type: string;
  secure_url?: string;
  url?: string;
  thumbnail_url?: string;
  public_id?: string;
  format?: string;
  duration?: number;
  bytes?: number;
  width?: number;
  height?: number;
  created_at?: string;
}

// Define PostCardProps interface
interface PostCardProps {
  post: Post;
  onBookmark?: (postId: string) => void;
  onLike?: (postId: string) => void;
  onShare?: (post: Post) => void;
  onComment?: (postId: string) => void;
  onProductClick?: (productId: string) => void;
  expandedCommentsPostId?: string | null;
  onDelete?: (postId: string) => void;
  onPostUpdate?: (updatedPost: Post) => void;
}

// Define pulse animation keyframes
const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
`;

// Improved normalizeMediaUrl function with better URL handling
const normalizeMediaUrl = (url: string, resourceType: string) => {
  // Simple implementation - in a real app this would have more logic
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  // Handle localhost URLs
  if (url.includes('localhost:') || url.includes('127.0.0.1')) {
    // Convert full URLs to relative paths for proxying
    if (url.startsWith('http://localhost:8000/')) {
      return url.replace('http://localhost:8000', '');
    }
    // Already a relative path
    if (url.startsWith('/uploads/')) {
      return url;
    }
  }
  
  // For Cloudinary URLs, ensure they use HTTPS
  if (url.includes('cloudinary.com') && url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  
  // Return the URL as is for other cases
  return url;
};

// Helper function to safely parse numeric values
const parseNumericValue = (value: any): number => {
  if (value === undefined || value === null) return 0;
  
  // If it's already a number, return it
  if (typeof value === 'number') return value;
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  // For any other type, convert to string first then parse
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? 0 : parsed;
};

const PostCard: React.FC<PostCardProps> = ({ post, onBookmark, onLike, onShare, onComment, onProductClick, expandedCommentsPostId, onDelete, onPostUpdate }) => {
  console.log('PostCard component rendering with post:', post);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const createdLabel = post.createdAt ? formatDistanceToNow(parseISO(post.createdAt), { addSuffix: true }) : '';
  const { user: currentUser } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  useEffect(() => {
    console.log('PostCard received post:', post);
    console.log('Post media:', post.media);
    console.log('Post media length:', post.media?.length);
  }, [post]);
  
  useEffect(() => {
    console.log('Rendering action buttons for post:', post.id);
  }, [post.id]);
  
  const [isClient, setIsClient] = useState(false);
  const [liked, setLiked] = useState(post.isLiked || false);
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [openCommentDialog, setOpenCommentDialog] = useState(false);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    // Set isClient to true only on the client side to prevent hydration errors
    setIsClient(true);
  }, []);

  // Update liked state when post.isLiked changes
  useEffect(() => {
    setLiked(post.isLiked || false);
  }, [post.isLiked]);

  // Handle like action with animation
  const handleLike = useCallback(() => {
    console.log('Like button clicked for post:', post.id);
    // Update local state immediately for better UX
    setLiked(!liked);
    // Update the like count immediately
    const updatedLikeCount = liked ? (post.likeCount || 0) - 1 : (post.likeCount || 0) + 1;
    // Update the post's like count directly
    post.likeCount = updatedLikeCount;
    post.isLiked = !liked;
    
    // Trigger the animation
    if (!liked) {
      setLikeAnimation(true);
      setTimeout(() => setLikeAnimation(false), 600);
    }
    
    // Call the parent's like handler which will make the actual API call
    onLike?.(post.id);
  }, [liked, onLike, post]);

  // Handle comment action by toggling comment section and opening dialog
  const handleComment = useCallback(() => {
    console.log('Comment button clicked for post:', post.id);
    // If there's an onComment callback, call it to toggle the comments section
    if (onComment) {
      onComment(post.id);
    }
    // Also open the comment dialog for adding a new comment
    setOpenCommentDialog(true);
  }, [post.id, onComment]);

  // Handle closing comment dialog
  const handleCloseCommentDialog = useCallback(() => {
    setOpenCommentDialog(false);
    setCommentText('');
  }, []);

  // Handle submitting comment
  const handleSubmitComment = useCallback(() => {
    if (commentText.trim()) {
      // Check if comment is too long
      if (commentText.length > 1000) {
        if (typeof window !== 'undefined') {
          import('react-hot-toast').then((module) => {
            module.default.error('Comment is too long. Maximum 1000 characters allowed.');
          });
        }
        return;
      }
      
      // Call the API to submit the comment
      console.log('Submitting comment:', commentText, 'for post:', post.id);
      
      // Show loading state
      const tempId = 'temp-' + Date.now();
      
      // Call the comments API to submit the comment
      api.comments.create({
        postId: post.id,
        content: commentText.trim()
      }).then((response: any) => {
        // Check if response exists and has the expected structure
        if (response && response.success) {
          console.log('Comment submitted successfully:', response.data);
          // Show success message
          if (typeof window !== 'undefined') {
            import('react-hot-toast').then((module) => {
              module.default.success('Comment posted successfully!');
            });
          }
          // Update the post's comment count by calling the onComment callback
          if (onComment) {
            onComment(post.id);
          }
          // Close the dialog
          handleCloseCommentDialog();
        } else {
          // Handle case where response doesn't have success property or is falsy
          console.error('Failed to submit comment:', response);
          // Show error message to user
          if (typeof window !== 'undefined') {
            import('react-hot-toast').then((module) => {
              module.default.error('Failed to post comment. Please try again.');
            });
          }
        }
      }).catch((error: any) => {
        console.error('Error submitting comment:', error);
        // Show error message to user
        if (typeof window !== 'undefined') {
          import('react-hot-toast').then((module) => {
            module.default.error('Failed to post comment. Please try again.');
          });
        }
      });
    }
  }, [commentText, post.id, handleCloseCommentDialog, onComment]);

  // Handle pressing Enter in comment dialog to submit
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  }, [handleSubmitComment]);

  // Handle product click
  const handleProductClick = useCallback(() => {
    // Check if post has productId property (not in Post interface but might be added dynamically)
    const productId = (post as any).productId;
    if (productId && onProductClick) {
      onProductClick(productId);
    }
  }, [post, onProductClick]);

  const getValidMediaUrl = (mediaItem: MediaItem) => {
    try {
      // Handle case where mediaItem might be null or undefined
      if (!mediaItem) {
        return '/images/placeholder-image-new.png';
      }
      
      // Handle case where mediaItem might be a string URL
      if (typeof mediaItem === 'string') {
        return mediaItem;
      }
      
      // Extract URL from media item - try multiple possible fields
      let url = mediaItem.secure_url || mediaItem.url || (mediaItem as any).src;
      
      // Handle case where URL might be nested in another object
      if (url && typeof url === 'object' && url.url) {
        url = url.url;
      }
      
      if (!url) {
        console.log('No URL found in media item, returning placeholder');
        return mediaItem.resource_type === 'video' 
          ? '/images/placeholder-video-new.png' 
          : '/images/placeholder-image-new.png';
      }
      
      // Convert to string if it's not already
      url = String(url);
      
      // Additional validation to prevent very short or invalid URLs
      if (url.length < 5) {
        console.log('URL is too short, treating as invalid:', url);
        return mediaItem.resource_type === 'video' 
          ? '/images/placeholder-video-new.png' 
          : '/images/placeholder-image-new.png';
      }
      
      // For Cloudinary URLs, use them directly to avoid proxy issues
      if (url.includes('cloudinary.com')) {
        console.log('Using Cloudinary URL directly:', url);
        return url;
      }
      
      // For localhost URLs, ensure they're properly formatted
      if (url.includes('localhost:') || url.includes('127.0.0.1')) {
        // Make sure localhost URLs have the correct protocol
        let normalizedUrl = url;
        if (normalizedUrl.startsWith('http://localhost:8000/')) {
          // Convert to relative path for proxy
          normalizedUrl = normalizedUrl.replace('http://localhost:8000', '');
        } else if (normalizedUrl.startsWith('/uploads/')) {
          // Already a relative path
          console.log('Using relative URL:', normalizedUrl);
          return normalizedUrl;
        }
        
        const finalUrl = normalizedUrl || url;
        
        // Add cache-busting in development
        if (process.env.NODE_ENV === 'development' && !finalUrl.includes('?')) {
          const cacheBustedUrl = `${finalUrl}?v=${Date.now()}`;
          console.log('Cache-busted URL:', cacheBustedUrl);
          return cacheBustedUrl;
        }
        
        console.log('Using localhost URL:', finalUrl);
        return finalUrl;
      }
      
      // Use the enhanced normalizeMediaUrl utility for better handling
      const normalizedUrl = normalizeMediaUrl(url, mediaItem.resource_type);
      
      // Even if normalization fails, return the original URL as fallback
      const finalUrl = normalizedUrl || url;
      
      // For localhost URLs, add cache-busting in development
      if (process.env.NODE_ENV === 'development' && 
          (finalUrl.includes('localhost:') || finalUrl.includes('127.0.0.1')) &&
          !finalUrl.includes('?')) {
        const cacheBustedUrl = `${finalUrl}?v=${Date.now()}`;
        console.log('Development cache-busted URL:', cacheBustedUrl);
        return cacheBustedUrl;
      }
      
      console.log('Returning final URL:', finalUrl);
      
      // Final validation before returning
      if (!finalUrl || typeof finalUrl !== 'string' || finalUrl.length < 5) {
        console.log('Final URL validation failed, returning placeholder');
        return mediaItem.resource_type === 'video' 
          ? '/images/placeholder-video-new.png' 
          : '/images/placeholder-image-new.png';
      }
      
      return finalUrl;
    } catch (error) {
      console.error('❌ Error in getValidMediaUrl:', error);
      // Always return a fallback URL
      return mediaItem && mediaItem.resource_type === 'video' 
        ? '/images/placeholder-video-new.png' 
        : '/images/placeholder-image-new.png';
    }
  };

  // Function to render media content
  const renderMediaContent = (mediaItem: MediaItem) => {
    try {
      // Debug logging
      console.log('Rendering media item:', mediaItem);
      console.log('Post type:', post?.type);
      
      // Get the valid media URL using our enhanced function
      let mediaUrl = getValidMediaUrl(mediaItem);
      
      console.log('Media URL after getValidMediaUrl:', mediaUrl);
      console.log('Media URL type:', typeof mediaUrl);
      console.log('Media URL length:', mediaUrl ? mediaUrl.length : 0);
      
      // Use Cloudinary URLs directly without proxy
      if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.includes('cloudinary.com')) {
        console.log('Using Cloudinary URL directly in renderMediaContent:', mediaUrl);
      }
      
      // If no URL, show placeholder
      if (!mediaUrl) {
        console.log('No media URL found, showing placeholder');
        return (
          <Box sx={{ 
            width: '100%', 
            height: '100%',
            minHeight: isMobile ? 20 : 30,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            bgcolor: 'background.default',
            color: 'text.secondary'
          }}>
            <ImageIcon size={isMobile ? 6 : 8} />
            <Typography sx={{ ml: 0.25, fontSize: isMobile ? '0.35rem' : '0.45rem' }}>
              No media
            </Typography>
          </Box>
        );
      }
      
      // Determine if it's a video - enhanced detection
      const isVideo = mediaItem?.resource_type === 'video' || 
                     (mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') || mediaUrl.includes('.ogg') || mediaUrl.includes('.mov') || mediaUrl.includes('.avi')));
      
      // Additional check for video posts that might not have proper extension in URL
      const isVideoPost = post?.type === 'video';
      
      // If it's marked as a video post but our detection didn't catch it, treat it as video
      const shouldRenderAsVideo = isVideo || isVideoPost;
      
      if (shouldRenderAsVideo) {
        // Check if the media URL is valid
        const isMediaUrlValid = mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://') || mediaUrl.startsWith('/'));
        
        // Less strict validation for video URLs
        const isVideoUrlValid = isMediaUrlValid && mediaUrl.length > 5; // Basic sanity check
        
        if (!isVideoUrlValid) {
          console.log('Invalid video URL detected:', { mediaUrl, isMediaUrlValid, length: mediaUrl ? mediaUrl.length : 0 });
          return (
            <Box sx={{ 
              width: '100%', 
              height: '100%',
              minHeight: isMobile ? 20 : 30,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              bgcolor: 'background.default',
              color: 'error.main'
            }}>
              <Typography sx={{ fontSize: isMobile ? '0.45rem' : '0.55rem' }}>
                Video not available
              </Typography>
            </Box>
          );
        }
        
        // Additional check for suspiciously short URLs that might cause rendering issues
        // But allow Cloudinary URLs which can be shorter
        if (mediaUrl && mediaUrl.length < 10 && !mediaUrl.includes('cloudinary.com')) {
          console.log('Suspiciously short video URL detected:', mediaUrl);
          return (
            <Box sx={{ 
              width: '100%', 
              height: '100%',
              minHeight: isMobile ? 20 : 30,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              bgcolor: 'background.default',
              color: 'error.main'
            }}>
              <Typography sx={{ fontSize: isMobile ? '0.45rem' : '0.55rem' }}>
                Video URL invalid
              </Typography>
            </Box>
          );
        }
        
        // Use the UnifiedVideoMedia component for consistent video handling
        return (
          <Box sx={{ 
            width: '100%', 
            height: '100%',
            minHeight: isMobile ? 20 : 30,
            position: 'relative',
            bgcolor: 'background.default',
            zIndex: 0
          }}>
            <Box sx={{ position: 'relative', pt: '80%', width: '100%' }}> {/* Changed to 80% for 5:4 aspect ratio */}
              <UnifiedVideoMedia 
                src={mediaUrl} 
                alt={post.content || 'Post video'}
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
          </Box>
        );
      } else {
        // Check if the media URL is valid
        const isMediaUrlValid = mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://') || mediaUrl.startsWith('/'));
        
        // Less strict validation for image URLs
        const isImageUrlValid = isMediaUrlValid && mediaUrl.length > 5; // Basic sanity check
        
        if (!isImageUrlValid) {
          console.log('Invalid image URL detected:', { mediaUrl, isMediaUrlValid, length: mediaUrl ? mediaUrl.length : 0 });
          return (
            <Box sx={{ 
              width: '100%', 
              height: '100%',
              minHeight: isMobile ? 20 : 30,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              bgcolor: 'background.default',
              color: 'error.main'
            }}>
              <Typography sx={{ fontSize: isMobile ? '0.45rem' : '0.55rem' }}>
                Image not available
              </Typography>
            </Box>
          );
        }
        
        // Additional check for suspiciously short URLs
        // But allow Cloudinary URLs which can be shorter
        if (mediaUrl && mediaUrl.length < 5 && !mediaUrl.includes('cloudinary.com')) {
          console.log('Suspiciously short image URL detected:', mediaUrl);
          return (
            <Box sx={{ 
              width: '100%', 
              height: '100%',
              minHeight: isMobile ? 20 : 30,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              bgcolor: 'background.default',
              color: 'error.main'
            }}>
              <Typography sx={{ fontSize: isMobile ? '0.45rem' : '0.55rem' }}>
                Image URL invalid
              </Typography>
            </Box>
          );
        }
        
        // Use the UnifiedImageMedia component for consistent image handling
        return (
          <Box sx={{ 
            width: '100%', 
            height: '100%',
            minHeight: isMobile ? 20 : 30,
            position: 'relative',
            bgcolor: 'background.default',
            zIndex: 0
          }}>
            <Box sx={{ position: 'relative', pt: '80%', width: '100%' }}> {/* Changed to 80% for 5:4 aspect ratio */}
              <UnifiedImageMedia 
                src={mediaUrl} 
                alt={post.content || 'Post image'}
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
          </Box>
        );
      }
    } catch (error) {
      console.error('❌ Error in renderMediaContent:', error);
      return (
        <Box sx={{ 
          width: '100%', 
          height: '100%',
          minHeight: isMobile ? 20 : 30,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: '#f0f0f0',
          color: 'error.main'
        }}>
          <Typography sx={{ fontSize: isMobile ? '0.45rem' : '0.55rem' }}>
            Error loading media
          </Typography>
        </Box>
      );
    }
  };

// Add handleMenuClick function
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Add handleMenuClose function
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Delete confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  const handleDeleteClick = useCallback(() => {
    // Close the menu
    setAnchorEl(null);
    // Open confirmation dialog
    setDeleteConfirmOpen(true);
  }, []);
  
  const handleDeleteConfirm = useCallback(async () => {
    try {
      const response: any = await api.posts.delete(post.id);
      if (response && response.success) {
        toast.success('Post deleted successfully');
        // Call the onDelete callback to remove the post from the parent component
        onDelete?.(post.id);
      } else {
        throw new Error(response?.message || 'Failed to delete post');
      }
    } catch (err: any) {
      console.error('Error deleting post:', err);
      toast.error(err.message || 'Failed to delete post. Please try again later.');
    } finally {
      // Close the confirmation dialog
      setDeleteConfirmOpen(false);
    }
  }, [post.id, onDelete]);
  
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmOpen(false);
  }, []);

  // Add these new handler functions after the existing handleDelete function
  const handleHideLikes = useCallback(async () => {
    // Close the menu
    setAnchorEl(null);
    
    try {
      const response: any = await api.posts.hideLikes(post.id, !post.hideLikes);
      if (response && response.success) {
        toast.success(post.hideLikes ? 'Likes are now visible' : 'Likes are now hidden');
        // Update the post in the parent component
        onPostUpdate?.({
          ...post,
          hideLikes: !post.hideLikes
        });
      } else {
        throw new Error(response?.message || 'Failed to update post');
      }
    } catch (err: any) {
      console.error('Error updating post:', err);
      toast.error(err.message || 'Failed to update post. Please try again later.');
    }
  }, [post, onPostUpdate]);

  const handleHideComments = useCallback(async () => {
    // Close the menu
    setAnchorEl(null);
    
    try {
      const response: any = await api.posts.hideComments(post.id, !post.hideComments);
      if (response && response.success) {
        toast.success(post.hideComments ? 'Comments are now visible' : 'Comments are now hidden');
        // Update the post in the parent component
        onPostUpdate?.({
          ...post,
          hideComments: !post.hideComments
        });
      } else {
        throw new Error(response?.message || 'Failed to update post');
      }
    } catch (err: any) {
      console.error('Error updating post:', err);
      toast.error(err.message || 'Failed to update post. Please try again later.');
    }
  }, [post, onPostUpdate]);

  // Add function to track post view
  const trackPostView = useCallback(async () => {
    try {
      await api.posts.trackView(post.id);
    } catch (err: any) {
      console.error('Error tracking post view:', err);
    }
  }, [post.id]);

  // Call trackPostView when component mounts
  useEffect(() => {
    if (post.id) {
      trackPostView();
    }
  }, [post.id, trackPostView]);

  // Function to get achievement icon based on type
  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'award':
        return <Award size={isMobile ? 16 : 20} />;
      case 'challenge':
        return <Target size={isMobile ? 16 : 20} />;
      case 'custom':
        return <Star size={isMobile ? 16 : 20} />;
      default: // milestone
        return <Trophy size={isMobile ? 16 : 20} />;
    }
  };

  // Function to get achievement title based on type
  const getAchievementTitle = (type: string) => {
    switch (type) {
      case 'award':
        return 'Award';
      case 'challenge':
        return 'Challenge';
      case 'custom':
        return 'Custom';
      default: // milestone
        return 'Milestone';
    }
  };


  return (
    <Card sx={{ 
      minHeight: isMobile ? 60 : 80,
      width: '100%',
      maxWidth: '100%',
      margin: 0,
      bgcolor: 'background.paper',
      color: 'text.primary',
      borderRadius: isMobile ? 0 : 1,
      boxShadow: isMobile ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
      border: isMobile ? 'none' : '1px solid rgba(0,0,0,0.05)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Achievement Badge - Show only for achievement posts */}
      {post.isAchievement && (
        <Box sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          zIndex: 100,
          bgcolor: 'primary.main',
          color: 'white',
          borderRadius: '12px',
          px: 1,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5
        }}>
          {getAchievementIcon(post.achievementType || 'milestone')}
          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem' }}>
            {getAchievementTitle(post.achievementType || 'milestone')}
          </Typography>
        </Box>
      )}
      
      {/* Post Header */}
      <CardContent sx={{ pb: 0.25, pt: isMobile ? 0.25 : 0.5, px: 0.5, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
          <UserAvatar 
            src={post.author?.avatar}
            alt={post.author?.displayName || post.author?.username}
            size={isMobile ? 14 : 20}
          />
          <Box sx={{ ml: 0.5, flex: 1 }}>
            <Typography variant={isMobile ? "caption" : "body2"} fontWeight={600} sx={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}>
              {post.author?.displayName || post.author?.username || 'Unknown User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.5rem' : '0.55rem' }}>
              {createdLabel}
            </Typography>
          </Box>
          <IconButton 
            size="small" 
            aria-label="More options" 
            sx={{ p: 0.1 }}
            onClick={handleMenuClick}
          >
            <MoreVertical size={isMobile ? 8 : 10} />
          </IconButton>
          {/* Add Menu component */}
          <Menu
            anchorEl={anchorEl}
            open={openMenu}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            {/* Show delete option only if the current user is the author of the post */}
            {currentUser && post.author && (currentUser.id === post.author.id || currentUser._id === post.author._id) && (
              <>
                {post.isAchievement ? (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      Achievement Post (Cannot Edit)
                    </Typography>
                  </MenuItem>
                ) : (
                  <>
                    <MenuItem onClick={handleHideLikes}>
                      <Typography variant="body2">
                        {post.hideLikes ? 'Show Likes' : 'Hide Likes'}
                      </Typography>
                    </MenuItem>
                    <MenuItem onClick={handleHideComments}>
                      <Typography variant="body2">
                        {post.hideComments ? 'Show Comments' : 'Hide Comments'}
                      </Typography>
                    </MenuItem>
                  </>
                )}
                <MenuItem onClick={handleDeleteClick}>
                  <Typography variant="body2" color="error">
                    Delete Post
                  </Typography>
                </MenuItem>
              </>
            )}
          </Menu>
        </Box>
      </CardContent>

      {/* Post Media Content - Takes available space */}
      <Box sx={{ flexGrow: 1, minHeight: isMobile ? 30 : 50 }}>
        {post.isAchievement ? (
          // Achievement post content
          <Box sx={{ p: isMobile ? 0.5 : 2, textAlign: 'center' }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              mb: 1,
              color: 'primary.main'
            }}>
              {getAchievementIcon(post.achievementType || 'milestone')}
              <Typography variant="h6" sx={{ ml: 1, fontWeight: 'bold', fontSize: isMobile ? '0.8rem' : '1rem' }}>
                {post.achievementData?.title || 'Achievement'}
              </Typography>
            </Box>
            {post.achievementData?.description && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>
                {post.achievementData.description}
              </Typography>
            )}
          </Box>
        ) : post.media && post.media.length > 0 && post.media[0] ? renderMediaContent(post.media[0] as MediaItem) : (
          <Box sx={{ 
            width: '100%', 
            height: '100%',
            minHeight: isMobile ? 20 : 30,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            bgcolor: 'background.default',
            color: 'text.secondary'
          }}>
            <ImageIcon size={isMobile ? 6 : 8} />
            <Typography sx={{ ml: 0.25, fontSize: isMobile ? '0.35rem' : '0.45rem' }}>
              No media
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Horizontal Action Bar at Bottom */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-around',
        p: isMobile ? 0.1 : 0.25,
        gap: isMobile ? 0.1 : 0.25,
        bgcolor: 'background.paper',
        minHeight: isMobile ? 30 : 40
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0.05 : 0.1 }}>
          <IconButton 
            size="small"
            onClick={handleLike}
            sx={{ 
              color: liked ? 'error.main' : 'text.secondary',
              animation: likeAnimation ? `${pulse} 0.6s ease` : 'none',
              minWidth: isMobile ? 16 : 20,
              minHeight: isMobile ? 16 : 20,
              padding: isMobile ? 0.05 : 0.1,
              zIndex: 10
            }}
          >
            <Heart size={isMobile ? 10 : 12} fill={liked ? 'currentColor' : 'none'} />
          </IconButton>
          {!post.hideLikes && post.likeCount !== undefined && post.likeCount > 0 && (
            <Typography variant="caption" sx={{ 
              fontSize: isMobile ? '0.5rem' : '0.6rem', 
              fontWeight: 'bold',
              color: 'text.secondary'
            }}>
              {parseNumericValue(post.likeCount)}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0.05 : 0.1 }}>
          <IconButton 
            size="small"
            onClick={handleComment}
            sx={{ 
              minWidth: isMobile ? 16 : 20,
              minHeight: isMobile ? 16 : 20,
              padding: isMobile ? 0.05 : 0.1,
              zIndex: 10
            }}
          >
            <MessageCircle size={isMobile ? 10 : 12} />
          </IconButton>
          {!post.hideComments && post.commentCount !== undefined && post.commentCount > 0 && (
            <Typography variant="caption" sx={{ 
              fontSize: isMobile ? '0.5rem' : '0.6rem', 
              fontWeight: 'bold',
              color: 'text.secondary'
            }}>
              {parseNumericValue(post.commentCount)}
            </Typography>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0.05 : 0.1 }}>
          <IconButton 
            size="small"
            onClick={() => {
              console.log('Share button clicked for post:', post.id);
              onShare?.(post);
            }}
            sx={{ 
              minWidth: isMobile ? 16 : 20,
              minHeight: isMobile ? 16 : 20,
              position: 'relative',
              padding: isMobile ? 0.05 : 0.1,
              zIndex: 10
            }}
          >
            <Share2 size={isMobile ? 10 : 12} />
          </IconButton>
          {post.shareCount !== undefined && post.shareCount > 0 && (
            <Box
              sx={{
                position: 'relative',
                bgcolor: 'primary.main',
                color: 'white',
                borderRadius: '8px',
                width: isMobile ? 10 : 12,
                height: isMobile ? 10 : 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '0.4rem' : '0.5rem',
                fontWeight: 'bold',
                zIndex: 11
              }}
            >
              {parseNumericValue(post.shareCount)}
            </Box>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 0.05 : 0.1 }}>
          <IconButton 
            size="small"
            onClick={() => {
              console.log('Bookmark button clicked for post:', post.id);
              onBookmark?.(post.id);
            }}
            sx={{ 
              minWidth: isMobile ? 16 : 20,
              minHeight: isMobile ? 16 : 20,
              padding: isMobile ? 0.05 : 0.1,
              zIndex: 10
            }}
          >
            <Bookmark size={isMobile ? 10 : 12} />
          </IconButton>
          {post.bookmarkCount !== undefined && post.bookmarkCount > 0 && (
            <Typography variant="caption" sx={{ 
              fontSize: isMobile ? '0.5rem' : '0.6rem', 
              fontWeight: 'bold',
              color: 'text.secondary'
            }}>
              {parseNumericValue(post.bookmarkCount)}
            </Typography>
          )}
        </Box>
      </Box>
      
      {/* Comment Dialog */}
      <Dialog 
        open={openCommentDialog} 
        onClose={handleCloseCommentDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          Add a Comment
          <IconButton
            aria-label="close"
            onClick={handleCloseCommentDialog}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'grey.500',
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 1 }}>
            <UserAvatar 
              src={post.author?.avatar}
              alt={post.author?.displayName || post.author?.username}
              size={24}
              sx={{ mr: 1 }}
            />
            <TextField
              autoFocus
              margin="dense"
              id="comment"
              label="Write a comment..."
              type="text"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={handleKeyPress}
              helperText={`${commentText.length}/1000`}
              sx={{ mt: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCommentDialog}>Cancel</Button>
          <Button onClick={handleSubmitComment} variant="contained" disabled={!commentText.trim()}>
            Comment
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Comment Section - Only show when comments are expanded */}
      {post.id && expandedCommentsPostId === post.id && (
        <Box sx={{ px: isMobile ? 0.25 : 0.5, pb: isMobile ? 0.25 : 0.5 }}>
          <CommentSection
            key={post.id}
            postId={post.id}
            initialCommentCount={post.commentCount || 0}
            isExpanded={true}
            enableRealTime={true}
            maxDepth={isMobile ? 1 : 2}
          />
        </Box>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-description"
      >
        <DialogTitle id="delete-confirm-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-confirm-description">
            Are you sure you want to delete this post? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PostCard;