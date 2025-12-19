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
import { VideoFeedProvider } from '@/components/video/VideoFeedManager';
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
import { CreatePostDialog } from '@/components/social/new/CreatePostDialog';
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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [userStats, setUserStats] = useState({
    postCount: 0,
    followerCount: 0,
    followingCount: 0
  });
  
  // Use the real posts hook to fetch posts from the database
  const { posts, loading, error, fetchPosts, likePost, bookmarkPost } = usePosts({
    feedType: 'for-you',
    limit: 20
  });

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
    
    // Refresh posts with the appropriate feed type
    switch (newValue) {
      case 0: // For You
        typedFetchPosts({ feedType: 'for-you', reset: true });
        break;
      case 1: // Following
        typedFetchPosts({ feedType: 'following', reset: true });
        break;
      case 2: // Recent
        typedFetchPosts({ feedType: 'recent', reset: true });
        break;
      case 3: // Bookmarks
        typedFetchPosts({ feedType: 'bookmarks', reset: true });
        break;
      default:
        typedFetchPosts({ feedType: 'for-you', reset: true });
    }
  };

  const handleRefresh = () => {
    typedFetchPosts({ reset: true });
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
    // Find the post in the posts array
    const post = posts.find(p => p.id === postId || p._id === postId);
    if (post) {
      setSelectedPost(post);
      setShareDialogOpen(true);
    }
  };

  // Render a single post
  const renderPost = (post: any) => {
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
  };

  return (
    <Layout>
      <Head>
        <title>Social Feed - TalkCart</title>
        <meta name="description" content="Connect with friends and discover trending content" />
      </Head>
      
      <Container maxWidth="lg" sx={{ py: 2 }}>
        <Grid container spacing={2}>
          {/* Left Sidebar - Hidden on mobile */}
          <Grid item xs={12} md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
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
              
              <Box display="flex" justifyContent="space-around" textAlign="center" mt={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{userStats.postCount}</Typography>
                  <Typography variant="body2" color="text.secondary">Posts</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{userStats.followerCount}</Typography>
                  <Typography variant="body2" color="text.secondary">Followers</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{userStats.followingCount}</Typography>
                  <Typography variant="body2" color="text.secondary">Following</Typography>
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
              <TrendingProducts />
            </Paper>
            
            <Paper 
              sx={{ 
                mt: 2,
                p: 2, 
                borderRadius: 3, 
                position: 'sticky',
                top: 250,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              <WhoToFollow />
            </Paper>
          </Grid>

          {/* Main feed area */}
          <Grid item xs={12} md={6}>
            {/* Create post button for mobile */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
              <Button 
                variant="contained" 
                fullWidth
                startIcon={<Plus size={20} />}
                onClick={() => setCreatePostOpen(true)}
                sx={{ 
                  py: 1.5, 
                  borderRadius: 3, 
                  textTransform: 'none', 
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                Create Post
              </Button>
            </Box>
            
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
            <VideoFeedProvider
              initialSettings={{
                enabled: true,
                threshold: 0.6,
                pauseOnScroll: true,
                muteByDefault: true,
                preloadStrategy: 'metadata',
                maxConcurrentVideos: 1,
                scrollPauseDelay: 150,
                viewTrackingThreshold: 2,
                autoplayOnlyOnWifi: false,
                respectReducedMotion: true,
              }}
              showControls={false}
              showStats={false}
            >
              <Box>
                {loading && posts.length === 0 ? (
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
                ) : posts.length === 0 ? (
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
                    {posts.map((post) => (
                      <Box key={post.id}>
                        {renderPost(post)}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </VideoFeedProvider>
          </Grid>

          {/* Right Sidebar - Hidden on mobile */}
          <Grid item xs={12} md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
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
        onPostCreated={() => {
          // Refresh posts after creating a new one
          typedFetchPosts({ reset: true });
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