import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  useTheme, 
  alpha,
  CircularProgress,
  IconButton,
  Button,
  Card,
  CardContent,
  Grid,
  Container,
  Paper,
  Divider,
} from '@mui/material';
import UnifiedVideoMedia from '@/components/media/UnifiedVideoMedia';
import UnifiedImageMedia from '@/components/media/UnifiedImageMedia';

import { 
  Home, 
  Users, 
  Clock, 
  Plus, 
  User,
  Bookmark,
  AlertCircle,
  RefreshCw,
  Compass,
  ShoppingCart,
  MessageSquare,
  Share2 as ShareIcon,
  Heart,
} from 'lucide-react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import TrendingProducts from '@/components/social/new/TrendingProducts';
import WhoToFollow from '@/components/social/new/WhoToFollow';
import { usePosts } from '@/hooks/usePosts';
import { useAdBlending } from '@/components/ads/AdBlendingService';
import AdCard from '@/components/ads/AdCard';
import ProductPostCard from '@/components/ads/ProductPostCard';
import { CreatePostDialog } from '@/components/social/new/CreatePostDialog';
import VendorProductPostCreator from '@/components/ads/VendorProductPostCreator';
import ShareDialog from '@/components/share/ShareDialog';
import api from '@/lib/api';

function a11yProps(index: number) {
  return {
    id: `feed-tab-${index}`,
    'aria-controls': `feed-tabpanel-${index}`,
  };
}

const SocialPage: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [linkPostId, setLinkPostId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [userStats, setUserStats] = useState({
    postCount: 0,
    followerCount: 0,
    followingCount: 0
  });
  
  // State to manage feed type
  const [currentFeedType, setCurrentFeedType] = useState<'for-you' | 'following' | 'recent' | 'trending' | 'bookmarks'>('for-you');
  
  // Use the ad blending service to fetch posts with integrated ads and product posts
  const { feedItems, loading, error, refreshFeed } = useAdBlending({
    userId: user?.id,
    feedType: currentFeedType,
    limit: 20
  });
  
  // Fallback: Also fetch regular posts in case ad blending fails
  const useRegularPostsFeedType: 'for-you' | 'following' | 'recent' | 'trending' = 
    currentFeedType === 'bookmarks' ? 'for-you' : currentFeedType as 'for-you' | 'following' | 'recent' | 'trending';
  
  const { fetchPosts: fetchRegularPosts, posts: regularPosts } = usePosts({
    feedType: useRegularPostsFeedType,
    limit: 20
  });
  
  // Use regular posts as fallback if ad blending returns no items or has an error
  const displayFeedItems = (error || feedItems.length === 0) && regularPosts.length > 0 
    ? regularPosts.map(post => ({ id: post.id, type: 'post', data: post }))
    : feedItems;
  
  // Debug logging to help troubleshoot
  useEffect(() => {
    console.log('Social Page - Ad Blending Service:', { feedItems: feedItems.length, loading, error });
    console.log('Social Page - Regular Posts Service:', { regularPosts: regularPosts.length });
    console.log('Social Page - Display Items:', displayFeedItems.length);
    console.log('Social Page - Current Feed Type:', currentFeedType);
    console.log('Social Page - User:', user);
  }, [feedItems.length, regularPosts.length, displayFeedItems.length, loading, error, currentFeedType, user]);

  // For backward compatibility with existing post functions (use a supported feed type)
  const usePostsFeedType: 'for-you' | 'following' | 'recent' | 'trending' = 
    currentFeedType === 'bookmarks' ? 'for-you' : currentFeedType;
  
  const { fetchPosts, likePost, bookmarkPost } = usePosts({
    feedType: usePostsFeedType,
    limit: 20
  });

  // Handle query parameters
  useEffect(() => {
    if (router.isReady) {
      const { linkPostId: postId } = router.query;
      if (postId && typeof postId === 'string') {
        setLinkPostId(postId);
        // Open the CreatePostDialog with the specific post ID
        setCreatePostOpen(true);
      } else if (postId && Array.isArray(postId) && postId[0]) {
        // Handle case where postId might be an array
        setLinkPostId(postId[0] || null);
        setCreatePostOpen(true);
      }
    }
  }, [router.isReady, router.query]);

  // Fetch user statistics
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        // Get current user profile which includes stats
        const response: any = await api.auth.getProfile();
        if (response?.success && response?.data) {
          setUserStats({
            postCount: response.data.postCount || 0,
            followerCount: response.data.followerCount || 0,
            followingCount: response.data.followingCount || 0
          });
        }
      } catch (err) {
        console.error('Failed to fetch user stats:', err);
        // Keep using defaults if fetch fails
      }
    };

    if (user) {
      fetchUserStats();
    }
  }, [user]);

  // Create a typed wrapper function to avoid TypeScript errors
  const typedFetchPosts = (options: { feedType?: string; page?: number; reset?: boolean }) => {
    return fetchPosts(options);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    
    // Set the appropriate feed type
    switch (newValue) {
      case 0: // For You
        setCurrentFeedType('for-you');
        break;
      case 1: // Following
        setCurrentFeedType('following');
        break;
      case 2: // Recent
        setCurrentFeedType('recent');
        break;
      case 3: // Bookmarks
        // For bookmarks, we need to handle this differently
        // The AdBlendingService will handle the feed type properly
        setCurrentFeedType('bookmarks');
        break;
      default:
        setCurrentFeedType('for-you');
    }
    
    // Refresh the feed to show the new content
    setTimeout(() => {
      refreshFeed();
    }, 100);
  };

  const handleRefresh = () => {
    typedFetchPosts({ reset: true });
    refreshFeed();
    fetchRegularPosts({ reset: true });
  };

  const handleNavigation = (path: string) => {
    router.push(path).catch((err) => {
      console.error(`Failed to navigate to ${path}:`, err);
      alert(`Unable to navigate to ${path}. Please try again.`);
    });
  };

  const handleProfileNavigation = () => {
    if (!user) {
      handleNavigation('/auth/login?redirect=/profile');
      return;
    }
    
    if (user.username) {
      handleNavigation(`/profile/${user.username}`);
    } else {
      handleNavigation('/profile');
    }
  };

  // Handle post interactions
  const handleLikePost = async (postId: string) => {
    await likePost(postId);
  };

  const handleBookmarkPost = async (postId: string) => {
    await bookmarkPost(postId);
  };

  const handleCommentClick = (postId: string) => {
    // Navigate to post detail page for commenting
    router.push(`/post/${postId}`);
  };

  const handleSharePost = (postId: string) => {
    // Find the post in the feedItems array
    const feedItem = feedItems.find(item => item.data.id === postId || item.data._id === postId);
    if (feedItem && feedItem.type === 'post') {
      setSelectedPost(feedItem.data);
      setShareDialogOpen(true);
    }
  };

  const handleCreateProductPost = (postId: string) => {
    // Find the post in the feedItems array
    const feedItem = feedItems.find(item => item.data.id === postId || item.data._id === postId);
    if (feedItem && feedItem.type === 'post') {
      // Open the CreatePostDialog with the VendorProductPostCreator functionality
      // This will be handled by the enhanced CreatePostDialog
      setCreatePostOpen(true);
      // We'll pass the postId to the dialog to link a product to it
      // The dialog will handle this in a special mode
    }
  };

  // Render a single feed item (post, ad, or product post)
  const renderFeedItem = (item: any) => {
    switch (item.type) {
      case 'ad':
        return (
          <AdCard 
            ad={item.data}
            onAdInteraction={(adId, type) => {
              // Handle ad interaction
              console.log(`Ad interaction: ${type} for ad ${adId}`);
            }}
            onDismiss={(adId) => {
              // Handle ad dismissal
              console.log(`Ad dismissed: ${adId}`);
            }}
          />
        );
      case 'product-post':
        return (
          <ProductPostCard
            productPost={item.data}
            onProductInteraction={(productPostId, type) => {
              // Handle product post interaction
              console.log(`Product post interaction: ${type} for product post ${productPostId}`);
            }}
            onDismiss={(productPostId) => {
              // Handle product post dismissal
              console.log(`Product post dismissed: ${productPostId}`);
            }}
          />
        );
      case 'post':
      default:
        const post = item.data;
        return (
          <Card 
            sx={{ 
              mb: 2, 
              borderRadius: 3, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              transition: 'box-shadow 0.2s',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }
            }}
          >
            <CardContent sx={{ pb: 1 }}>
              {/* Post header */}
              <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                <Box 
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: theme.palette.primary.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleNavigation(`/profile/${post.author?.username}`)}
                >
                  {post.author?.displayName?.charAt(0) || post.author?.username?.charAt(0) || 'U'}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => handleNavigation(`/profile/${post.author?.username}`)}
                  >
                    {post.author?.displayName || post.author?.username || 'Unknown User'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{post.author?.username || 'unknown'} · Just now
                  </Typography>
                </Box>
                <IconButton size="small" sx={{ ml: 'auto' }}>
                  <MoreHorizontal size={18} />
                </IconButton>
              </Box>
              
              {/* Post content */}
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="body1" sx={{ lineHeight: 1.5 }}>
                  {post.content}
                </Typography>
              </Box>
              
              {/* Post media */}
              {post.media && post.media.length > 0 && (
                <Box 
                  sx={{ 
                    borderRadius: 2, 
                    overflow: 'hidden', 
                    mb: 1.5,
                    maxHeight: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {post.media[0]?.resource_type === 'video' ? (
                    <UnifiedVideoMedia 
                      src={post.media[0]?.url || post.media[0]?.secure_url} 
                      alt="Post media" 
                      style={{ 
                        width: '100%', 
                        height: 'auto', 
                        maxHeight: 'inherit',
                        objectFit: 'cover',
                        display: 'block'
                      }} 
                    />
                  ) : (
                    <UnifiedImageMedia 
                      src={post.media[0]?.url || post.media[0]?.secure_url} 
                      alt="Post media" 
                      style={{ 
                        width: '100%', 
                        height: 'auto', 
                        maxHeight: 'inherit',
                        objectFit: 'cover',
                        display: 'block'
                      }} 
                    />
                  )}
                </Box>
              )}
              
              {/* Post stats */}
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="caption" color="text.secondary">
                  {post.likeCount || 0} likes
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ·
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {post.commentCount || 0} comments
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ·
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {post.shareCount || 0} shares
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 1 }} />
              
              {/* Post actions */}
              <Box display="flex" justifyContent="space-around" sx={{ py: 0.5 }}>
                <Button 
                  startIcon={<Heart size={18} />}
                  onClick={async () => await handleLikePost(post.id)}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 600, 
                    color: post.isLiked ? theme.palette.error.main : 'inherit',
                    flex: 1,
                    justifyContent: 'flex-start',
                    px: 1.5,
                    minWidth: 0,
                    '&:hover': {
                      backgroundColor: 'transparent',
                    }
                  }}
                >
                  Like
                </Button>
                <Button 
                  startIcon={<MessageSquare size={18} />}
                  onClick={() => handleCommentClick(post.id)}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 600, 
                    flex: 1,
                    justifyContent: 'flex-start',
                    px: 1.5,
                    minWidth: 0,
                    '&:hover': {
                      backgroundColor: 'transparent',
                    }
                  }}
                >
                  Comment
                </Button>
                <Button 
                  startIcon={<Bookmark size={18} />}
                  onClick={async () => await handleBookmarkPost(post.id)}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 600, 
                    color: post.isBookmarked ? theme.palette.primary.main : 'inherit',
                    flex: 1,
                    justifyContent: 'flex-start',
                    px: 1.5,
                    minWidth: 0,
                    '&:hover': {
                      backgroundColor: 'transparent',
                    }
                  }}
                >
                  Bookmark
                </Button>
                <Button 
                  startIcon={<ShareIcon size={18} />}
                  onClick={() => handleSharePost(post.id)}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 600, 
                    flex: 1,
                    justifyContent: 'flex-start',
                    px: 1.5,
                    minWidth: 0,
                    '&:hover': {
                      backgroundColor: 'transparent',
                    }
                  }}
                >
                  Share
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <Layout>
      <Head>
        <title>Social Feed - TalkCart</title>
        <meta name="description" content="Connect with friends and discover trending content" />
      </Head>
      
      {/* Mobile Header - Hidden on desktop */}
      <Box 
        sx={{
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          bgcolor: 'primary.main',
          color: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              bgcolor: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
              fontWeight: 'bold',
            }}
          >
            T
          </Box>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
            TalkCart
          </Typography>
        </Box>
        <IconButton 
          sx={{
            color: 'white',
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.3)'
            }
          }}
          onClick={() => setCreatePostOpen(true)}
        >
          <Plus size={20} />
        </IconButton>
      </Box>
      
      <Container maxWidth="lg" sx={{ py: { xs: 1, sm: 2 } }}>
        <Grid container spacing={{ xs: 1, sm: 2 }}>
          {/* Left Sidebar - Hidden on mobile */}
          <Grid item xs={12} md={3} sx={{ display: { xs: 'none', md: 'block' }, order: { xs: 3, md: 1 } }}>
            <Paper 
              sx={{ 
                p: 2, 
                borderRadius: 3, 
                mb: 2,
                position: 'sticky',
                top: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                <Box 
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: theme.palette.primary.main,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    cursor: 'pointer'
                  }}
                  onClick={handleProfileNavigation}
                >
                  {user?.displayName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ fontWeight: 600, cursor: 'pointer' }}
                    onClick={handleProfileNavigation}
                  >
                    {user?.displayName || user?.username || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    @{user?.username || 'username'}
                  </Typography>
                </Box>
                <IconButton 
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: theme.palette.primary.main,
                    color: 'white',
                    '&:hover': {
                      bgcolor: theme.palette.primary.dark,
                    }
                  }}
                  onClick={() => setCreatePostOpen(true)}
                >
                  <Plus size={20} />
                </IconButton>
              </Box>
              
              <Box display="flex" justifyContent="space-around" textAlign="center" mt={2} flexWrap="wrap" gap={1}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>{userStats.postCount}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Posts</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>{userStats.followerCount}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Followers</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>{userStats.followingCount}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Following</Typography>
                </Box>
              </Box>
            </Paper>
            
            <Paper 
              sx={{ 
                p: 2, 
                borderRadius: 3, 
                position: 'sticky',
                top: 150,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              <WhoToFollow />
            </Paper>
          </Grid>

          {/* Main feed area */}
          <Grid item xs={12} md={6} order={{ xs: 1, md: 2 }}>
            
            {/* Feed tabs */}
            <Paper 
              sx={{ 
                borderRadius: 3, 
                mb: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                overflow: 'hidden'
              }}
            >
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{
                  minHeight: 48,
                  '& .MuiTabs-indicator': {
                    height: 3,
                    bgcolor: theme.palette.primary.main
                  },
                  '& .MuiTab-root': {
                    minHeight: 48,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: theme.palette.text.secondary,
                    '&.Mui-selected': {
                      color: theme.palette.primary.main
                    }
                  }
                }}
              >
                <Tab icon={<Home size={18} />} iconPosition="start" label="For You" {...a11yProps(0)} />
                <Tab icon={<Users size={18} />} iconPosition="start" label="Following" {...a11yProps(1)} />
                <Tab icon={<Clock size={18} />} iconPosition="start" label="Recent" {...a11yProps(2)} />
                <Tab icon={<Bookmark size={18} />} iconPosition="start" label="Bookmarks" {...a11yProps(3)} />
              </Tabs>
            </Paper>

            {/* Feed content */}
              <Box>
                {loading && feedItems.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : error ? (
                  <Paper 
                    sx={{ 
                      p: 4, 
                      textAlign: 'center', 
                      borderRadius: 3,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <AlertCircle size={56} color={theme.palette.error.main} style={{ marginBottom: 16 }} />
                    <Typography color="error" variant="h6" sx={{ mb: 2 }}>
                      {error}
                    </Typography>
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      startIcon={<RefreshCw size={18} />}
                      sx={{ mt: 2, borderRadius: 2, px: 4 }}
                      onClick={handleRefresh}
                    >
                      Try Again
                    </Button>
                  </Paper>
                ) : displayFeedItems.length === 0 ? (
                  <Paper 
                    sx={{ 
                      p: 4, 
                      textAlign: 'center', 
                      borderRadius: 3,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      border: '1px solid rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                      No posts found
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                      Be the first to post something!
                    </Typography>
                    <Button 
                      variant="contained" 
                      size="large"
                      startIcon={<Plus size={20} />}
                      onClick={() => setCreatePostOpen(true)}
                      sx={{ borderRadius: 3, px: 4, py: 1.5 }}
                    >
                      Create Your First Post
                    </Button>
                  </Paper>
                ) : (
                  <Box>
                    {displayFeedItems.map((item) => (
                      <Box key={item.id}>
                        {renderFeedItem(item)}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
          </Grid>

          {/* Right Sidebar - Hidden on mobile */}
          <Grid item xs={12} md={3} sx={{ display: { xs: 'none', md: 'block' }, order: { xs: 2, md: 3 } }}>
            <Paper 
              sx={{ 
                p: 2, 
                borderRadius: 3, 
                mb: 2,
                position: 'sticky',
                top: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Trending Products
              </Typography>
              <TrendingProducts />
            </Paper>
            
            <Paper 
              sx={{ 
                p: 2, 
                borderRadius: 3, 
                position: 'sticky',
                top: 300,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              <Typography variant="body2" color="text.secondary" align="center">
                © 2023 TalkCart. All rights reserved.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <CreatePostDialog 
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        linkPostId={linkPostId || undefined}
        onPostCreated={() => {
          // Refresh posts after creating a new one
          typedFetchPosts({ reset: true });
          refreshFeed(); // Also refresh the ad-blended feed
          
          // Additionally, dispatch the events to ensure all components update
          try {
            // Dispatch refresh event to ensure ad-blended feed is updated
            const refreshEvent = new CustomEvent('posts:refresh', { detail: { feedType: currentFeedType } });
            window.dispatchEvent(refreshEvent);
          } catch (e) {
            console.error('Error dispatching refresh event:', e);
          }
        }}
      />

      {/* Floating action button for mobile */}
      <Box sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        display: { xs: 'block', md: 'none' },
        zIndex: 1000,
      }}>
        <IconButton
          onClick={() => setCreatePostOpen(true)}
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: theme.palette.primary.main,
            color: 'white',
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            border: `3px solid ${theme.palette.background.paper}`,
            '&:hover': {
              bgcolor: theme.palette.primary.dark,
              transform: 'scale(1.05)',
            },
          }}
        >
          <Plus size={28} />
        </IconButton>
      </Box>
      
      {/* Share Dialog */}
      <ShareDialog 
        open={shareDialogOpen} 
        onClose={() => setShareDialogOpen(false)} 
        post={selectedPost} 
      />
    </Layout>
  );
};

// Icons used in the component
const MoreHorizontal = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="1"></circle>
    <circle cx="19" cy="12" r="1"></circle>
    <circle cx="5" cy="12" r="1"></circle>
  </svg>
);

export default SocialPage;