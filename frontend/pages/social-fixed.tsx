import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

// Simplified version of usePostsEnhanced hook to avoid heavy dependencies
const useSimplifiedPosts = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setPosts([
        {
          id: '1',
          content: 'Welcome to the social feed!',
          author: {
            id: '1',
            username: 'talkcart',
            displayName: 'TalkCart User',
          },
          createdAt: new Date().toISOString(),
          likeCount: 5,
          commentCount: 2,
          shareCount: 1,
          isLiked: false,
          isBookmarked: false,
        }
      ]);
    } catch (err) {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const likePost = useCallback((postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, isLiked: !post.isLiked, likeCount: post.isLiked ? post.likeCount - 1 : post.likeCount + 1 } : post
    ));
  }, []);

  const bookmarkPost = useCallback((postId: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, isBookmarked: !post.isBookmarked } : post
    ));
  }, []);

  return {
    posts,
    loading,
    error,
    likePost,
    bookmarkPost,
    fetchPosts,
  };
};

function TabPanel(props: any) {
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

const SocialFixedPage: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  
  const { posts, loading, error, likePost, bookmarkPost, fetchPosts } = useSimplifiedPosts();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    fetchPosts();
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

  return (
    <Layout>
      <Head>
        <title>Social Feed - TalkCart</title>
        <meta name="description" content="Connect with friends and discover trending content" />
      </Head>
      
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        height: { xs: 'auto', md: 'calc(100vh - 64px)' },
        overflow: 'hidden',
      }}>
        {/* Main feed area */}
        <Box sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          p: { xs: 1, md: 2 }
        }}>
          {/* Feed tabs */}
          <Box sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
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

          {/* Feed content */}
          <Box sx={{
            flex: 1,
            overflowY: 'auto',
            p: { xs: 1, md: 2 },
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              {loading && posts.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={28} />
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
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Box sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            bgcolor: theme.palette.primary.main,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold'
                          }}>
                            {post.author.displayName.charAt(0)}
                          </Box>
                          <Box>
                            <Typography variant="subtitle2">{post.author.displayName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              @{post.author.username}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {post.content}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2}>
                          <IconButton 
                            size="small" 
                            onClick={() => likePost(post.id)}
                            color={post.isLiked ? "error" : "default"}
                          >
                            <Heart size={16} />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              {post.likeCount}
                            </Typography>
                          </IconButton>
                          <IconButton size="small">
                            <MessageCircle size={16} />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              {post.commentCount}
                            </Typography>
                          </IconButton>
                          <IconButton size="small">
                            <Share2 size={16} />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                              {post.shareCount}
                            </Typography>
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => bookmarkPost(post.id)}
                            color={post.isBookmarked ? "primary" : "default"}
                          >
                            <Bookmark size={16} />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Bottom navigation for mobile */}
      <Box sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'space-around',
        alignItems: 'center',
        p: 1.5,
        bgcolor: alpha(theme.palette.background.paper, 0.9),
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
      }}>
        <IconButton>
          <Home size={24} />
        </IconButton>
        <IconButton>
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
        <IconButton>
          <Bookmark size={24} />
        </IconButton>
        <IconButton onClick={handleProfileNavigation}>
          <User size={24} />
        </IconButton>
      </Box>

      {/* Adjust for bottom navigation on mobile */}
      <Box sx={{ height: { xs: 60, md: 0 } }} />
    </Layout>
  );
};

// Icons used in the component
const Heart = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
const MessageCircle = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>;
const Share2 = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>;

export default SocialFixedPage;