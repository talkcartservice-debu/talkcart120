import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Fab, 
  useTheme, 
  alpha,
  CircularProgress,
  IconButton,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import Skeleton from '@mui/material/Skeleton';
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
  Search,
} from 'lucide-react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { CreatePostDialog } from '@/components/social/new/CreatePostDialog';
import WhoToFollow from '@/components/social/new/WhoToFollow';
import TrendingProducts from '@/components/social/new/TrendingProducts';
import PostCard from '@/components/social/new/PostCard';

import toast from 'react-hot-toast';
import { usePostsEnhanced } from '@/hooks/usePostsEnhanced';
import { Post } from '@/types/social';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`feed-tabpanel-${index}`}
      aria-labelledby={`feed-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `feed-tab-${index}`,
    'aria-controls': `feed-tabpanel-${index}`,
  };
}

const SocialNewPage: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  
  // Initialize usePostsEnhanced with the appropriate feed type based on active tab
  const getFeedType = (tabIndex: number) => {
    switch (tabIndex) {
      case 0: return 'for-you';
      case 1: return 'following';
      case 2: return 'recent';
      case 3: return 'bookmarks';
      default: return 'for-you';
    }
  };
  
  // Local scrolling state
  const [sentinelRef, setSentinelRef] = useState<HTMLDivElement | null>(null);
  const [lastLoadAt, setLastLoadAt] = useState<number>(0);

  // Use the enhanced usePosts hook
  const { posts, loading, error, page, hasMore, fetchPosts, loadMore, fetchBookmarkedPosts, likePost, bookmarkPost, sharePost } = usePostsEnhanced();
  
  // Handle tab change and fetch posts for the new feed type
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const feedType = getFeedType(newValue);
    
    // Handle bookmarked posts specially
    if (feedType === 'bookmarks' && user?.id) {
      fetchBookmarkedPosts(user.id);
    } else {
      fetchPosts({ feedType });
    }
  };
  
  // Enhanced post creation handler
  const handlePostCreated = (createdPost?: Post) => {
    // Refresh the current feed to show the newly created post
    const feedType = getFeedType(activeTab);
    if (feedType === 'bookmarks' && user?.id) {
      fetchBookmarkedPosts(user.id);
    } else {
      fetchPosts({ feedType });
    }
    // Additionally, if we got the created post, prepend it optimistically
    if (createdPost) {
      // Dispatch window event already handled by usePosts, but keep local safety if needed
      try {
        const event = new CustomEvent('posts:new', { detail: { post: createdPost } });
        window.dispatchEvent(event);
      } catch {}
    }
    
    // Show success message
    toast.success('Post created successfully!');
  };
  
  // Handle post interactions
  const handleBookmarkPost = (postId: string) => {
    bookmarkPost(postId);
  };

  const handleCommentPost = (postId: string) => {
    // Navigate to the post detail page with focus on comments
    router.push(`/post/${postId}?focus=comments`).catch((err) => {
      console.error('Failed to navigate to post:', err);
      toast.error('Failed to open post. Please try again.');
    });
  };
  
  // Handle refresh for current feed
  const handleRefresh = () => {
    const feedType = getFeedType(activeTab);
    if (feedType === 'bookmarks' && user?.id) {
      fetchBookmarkedPosts(user.id);
    } else {
      fetchPosts({ feedType, page: 1, reset: true });
    }
  };

  // IntersectionObserver-based infinite scroll
  useEffect(() => {
    if (!sentinelRef) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting && hasMore && !loading) {
        const now = Date.now();
        if (now - lastLoadAt > 600) { // debounce interval (ms)
          setLastLoadAt(now);
          loadMore();
        }
      }
    }, { root: null, rootMargin: '200px', threshold: 0 });
    observer.observe(sentinelRef);
    return () => observer.disconnect();
  }, [sentinelRef, hasMore, loading, loadMore, lastLoadAt]);
  
  // Refetch when user identity changes (avoid duplicate initial fetch)
  useEffect(() => {
    if (!user?.id) return;
    handleRefresh();
  }, [user?.id]);
  
  // Add real-time post creation listener
  useEffect(() => {
    // Listen for posts:new window event to refresh current feed
    const onLocalNewPost = (e: Event) => {
      const currentFeedType = getFeedType(activeTab);
      // Refresh all main feeds to ensure visibility
      if (currentFeedType === 'for-you' || currentFeedType === 'following' || currentFeedType === 'recent') {
        fetchPosts({ feedType: currentFeedType });
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('posts:new', onLocalNewPost as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('posts:new', onLocalNewPost as EventListener);
      }
    };
  }, [activeTab]);
  
  // Navigation handlers with error handling
  const handleNavigation = (path: string) => {
    router.push(path).catch((err) => {
      console.error(`Failed to navigate to ${path}:`, err);
      // Fallback to showing an alert if navigation fails
      alert(`Unable to navigate to ${path}. Please try again.`);
    });
  };
  
  // Handle profile navigation with proper user context
  const handleProfileNavigation = () => {
    if (!user) {
      // If user is not authenticated, redirect to login
      handleNavigation('/auth/login?redirect=/profile');
      return;
    }
    
    // If user has a username, go to their profile page
    if (user.username) {
      handleNavigation(`/profile/${user.username}`);
    } else {
      // Fallback to generic profile page
      handleNavigation('/profile');
    }
  };
  
  return (
    <Layout>
      <Head>
        <title>New Social Feed - TalkCart</title>
        <meta name="description" content="Connect with friends and discover trending content with enhanced performance" />
      </Head>
      
      {/* Main content area - Enhanced TikTok-style feed with vibrant design */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        height: { xs: 'auto', md: 'calc(100vh - 64px)' },
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
      }}>
        {/* Left sidebar - Contains Trending Products */}
        <Box sx={{
          width: { md: 320 },
          display: { xs: 'none', md: 'block' },
          borderRight: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          overflowY: 'auto',
          p: 2,
          background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
          backdropFilter: 'blur(10px)'
        }}>
          <Box sx={{ mt: 3 }}>
            <TrendingProducts />
          </Box>
        </Box>
        
        {/* Main feed area - Enhanced with vibrant design and better spacing */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          maxWidth: { md: 'calc(100% - 900px)' }, // Adjusted for both sidebars (320px each)
          p: { xs: 0, md: 2 }
        }}>
          {/* Top navigation for mobile - Enhanced design */}
          <Box sx={{
            display: { xs: 'flex', md: 'none' },
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2.5,
            borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            bgcolor: `linear-gradient(90deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            backdropFilter: 'blur(10px)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  bgcolor: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  T
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={800} sx={{
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                TalkCart
              </Typography>
            </Box>
            <Fab
              size="small"
              onClick={() => setCreatePostOpen(true)}
              sx={{
                bgcolor: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: 'white',
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  bgcolor: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              <Plus size={20} />
            </Fab>
          </Box>

          {/* Feed tabs - Redesigned sticky pill-style with icons */}
          <Box sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: { xs: 'none', md: 'block' },
            bgcolor: alpha(theme.palette.background.paper, 0.85),
            backdropFilter: 'blur(8px)',
            mx: 2,
            pt: 2,
            pb: 1
          }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              allowScrollButtonsMobile
              scrollButtons="auto"
              sx={{
                minHeight: 0,
                '& .MuiTabs-flexContainer': {
                  gap: 1
                },
                '& .MuiTabs-indicator': {
                  display: 'none'
                },
                '& .MuiTab-root': {
                  minHeight: 0,
                  height: 40,
                  px: 2,
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  color: theme.palette.text.primary,
                  transition: 'all .2s ease',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.12)
                  },
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                    color: theme.palette.primary.main
                  },
                  '& .MuiTab-iconWrapper': {
                    marginRight: 8
                  }
                }
              }}
            >
              <Tab icon={<Home size={16} />} iconPosition="start" label="For You" {...a11yProps(0)} />
              <Tab icon={<Users size={16} />} iconPosition="start" label="Following" {...a11yProps(1)} />
              <Tab icon={<Clock size={16} />} iconPosition="start" label="Recent" {...a11yProps(2)} />
              <Tab icon={<Bookmark size={16} />} iconPosition="start" label="Bookmarks" {...a11yProps(3)} />
            </Tabs>
          </Box>

          {/* Feed content - Enhanced TikTok-style vertical scroll */}
          <Box sx={{
            flex: 1,
            overflowY: 'auto',
            p: { xs: 1, md: 2 },
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: alpha(theme.palette.divider, 0.1),
              borderRadius: 3
            },
            '&::-webkit-scrollbar-thumb': {
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              borderRadius: 3,
              '&:hover': {
                background: alpha(theme.palette.primary.main, 0.8)
              }
            }
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              {loading && posts.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 600 }}>
                  {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Skeleton variant="circular" width={36} height={36} />
                          <Box>
                            <Skeleton variant="text" width={120} height={16} />
                            <Skeleton variant="text" width={80} height={12} />
                          </Box>
                        </Box>
                        <Skeleton variant="text" height={18} sx={{ mb: 1 }} />
                        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1, mb: 1 }} />
                        <Box display="flex" alignItems="center" gap={1}>
                          <Skeleton variant="circular" width={24} height={24} />
                          <Skeleton variant="text" width={24} height={14} />
                          <Skeleton variant="circular" width={24} height={24} />
                          <Skeleton variant="text" width={24} height={14} />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : error ? (
                <Box sx={{ textAlign: 'center', my: 8, width: '100%', maxWidth: 600 }}>
                  <AlertCircle size={56} color={theme.palette.error.main} style={{ marginBottom: 20 }} />
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
                </Box>
              ) : posts.length === 0 ? (
                <Box sx={{ textAlign: 'center', my: 8, width: '100%', maxWidth: 600 }}>
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
                </Box>
              ) : (
                posts.map((post) => (
                  <Box key={post.id} sx={{ width: '100%', maxWidth: 600 }}>
                    <PostCard
                      post={post}
                      onBookmark={handleBookmarkPost}
                      onLike={likePost}
                      onShare={(_post) => sharePost(_post.id)}
                      onComment={handleCommentPost}
                    />
                  </Box>
                ))
              )}
              <Box ref={setSentinelRef} sx={{ height: 1 }} />
              {loading && posts.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3, width: '100%', maxWidth: 600 }}>
                  <CircularProgress size={28} />
                </Box>
              )}
            </Box>
          </Box>
        </Box>
        
        {/* Right sidebar - Enhanced marketplace and trending features - Now with Quick Post */}
        <Box sx={{
          width: { md: 320 },
          display: { xs: 'none', md: 'block' },
          borderLeft: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          overflowY: 'auto',
          p: 2,
          background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
          backdropFilter: 'blur(10px)',
          flexShrink: 0, // Prevent sidebar from shrinking
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: alpha(theme.palette.primary.main, 0.3),
            borderRadius: 2
          }
        }}>
          {/* Navigation - Moved to right sidebar */}
          <Card variant="outlined" sx={{
            borderRadius: 4,
            boxShadow: `0 8px 32px ${alpha(theme.palette.secondary.main, 0.1)}`,
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
            backdropFilter: 'blur(10px)',
            mt: 3
          }}>
            <CardContent sx={{ pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 2,
                  background: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}>
                    🧭
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={800} sx={{
                  background: `linear-gradient(45deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontSize: '1.1rem'
                }}>
                  Navigation
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ShoppingCart size={14} />}
                  onClick={() => handleNavigation('/marketplace')}
                  sx={{
                    justifyContent: 'flex-start',
                    borderRadius: 3,
                    fontSize: '0.9rem',
                    py: 1,
                    fontWeight: 600,
                    textTransform: 'none',
                    border: `2px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                    color: theme.palette.warning.main,
                    '&:hover': {
                      borderColor: theme.palette.warning.main,
                      bgcolor: alpha(theme.palette.warning.main, 0.05),
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Marketplace
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<User size={18} />}
                  onClick={handleProfileNavigation}
                  sx={{
                    justifyContent: 'flex-start',
                    borderRadius: 3,
                    fontSize: '0.9rem',
                    py: 1,
                    fontWeight: 600,
                    textTransform: 'none',
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    color: theme.palette.primary.main,
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Profile
                </Button>
                {/* Create Post Button */}
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Plus size={18} />}
                  onClick={() => setCreatePostOpen(true)}
                  sx={{
                    justifyContent: 'flex-start',
                    borderRadius: 3,
                    fontSize: '0.9rem',
                    py: 1,
                    fontWeight: 600,
                    textTransform: 'none',
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    color: 'white',
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                      boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Create Post
                </Button>
              </Box>
            </CardContent>
          </Card>
          {/* Quick Actions - Desktop version of bottom navigation */}
          <Box sx={{ mt: 3 }}>
            <WhoToFollow limit={5} />
          </Box>
        </Box>
      </Box>
      
      {/* Bottom navigation for mobile - Enhanced vibrant TikTok-style */}
      <Box sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'space-around',
        alignItems: 'center',
        p: 1.5,
        bgcolor: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
        borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        backdropFilter: 'blur(20px)',
        zIndex: 1000,
        boxShadow: `0 -4px 20px ${alpha(theme.palette.primary.main, 0.1)}`
      }}>
        <IconButton
          sx={{
            borderRadius: 3,
            p: 1.5,
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              transform: 'scale(1.1)'
            }
          }}
        >
          <Home size={24} />
        </IconButton>
        <IconButton
          sx={{
            borderRadius: 3,
            p: 1.5,
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              transform: 'scale(1.1)'
            }
          }}
        >
          <Compass size={24} />
        </IconButton>
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <IconButton
            onClick={() => setCreatePostOpen(true)}
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              color: 'white',
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              border: `3px solid ${theme.palette.background.paper}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                transform: 'scale(1.1)',
                boxShadow: `0 8px 30px ${alpha(theme.palette.primary.main, 0.6)}`
              },
              '&:active': {
                transform: 'scale(0.95)'
              }
            }}
          >
            <Plus size={28} />
          </IconButton>
          <Box
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: theme.palette.secondary.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${theme.palette.background.paper}`,
              boxShadow: `0 2px 8px ${alpha(theme.palette.secondary.main, 0.3)}`
            }}
          >
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.7rem' }}>
              +
            </Typography>
          </Box>
        </Box>
        <IconButton
          sx={{
            borderRadius: 3,
            p: 1.5,
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.info.main, 0.1),
              transform: 'scale(1.1)'
            }
          }}
        >
          <Compass size={24} />
        </IconButton>
        <IconButton
          sx={{
            borderRadius: 3,
            p: 1.5,
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: alpha(theme.palette.success.main, 0.1),
              transform: 'scale(1.1)'
            }
          }}
        >
          <User size={24} />
        </IconButton>
      </Box>

      {/* Adjust for bottom navigation on mobile */}
      <Box sx={{ height: { xs: 60, md: 0 } }} />

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </Layout>
  );
};

export default SocialNewPage;
