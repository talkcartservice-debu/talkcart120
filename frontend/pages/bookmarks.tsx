import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  useTheme,
  alpha,
  Grid,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import { 
  Bookmark, 
  Grid as GridIcon, 
  List, 
  Filter,
  Sliders,
  Trash2,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PostCard from '@/components/social/new/PostCard';
// VirtualizedPostList component not available, using PostCard instead
import { Post } from '@/types/social';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

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
      id={`bookmarks-tabpanel-${index}`}
      aria-labelledby={`bookmarks-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `bookmarks-tab-${index}`,
    'aria-controls': `bookmarks-tabpanel-${index}`,
  };
}

const BookmarksPage: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const { user } = useAuth();
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bookmarked posts
  useEffect(() => {
    const fetchBookmarkedPosts = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        const response: any = await api.posts.getBookmarkedPosts(user.id, { limit: 50 });
        
        if (response && (response as any).success) {
          setBookmarkedPosts((response as any).data?.posts || (response as any).posts || []);
        } else {
          throw new Error((response as any)?.message || 'Failed to fetch bookmarked posts');
        }
      } catch (err: any) {
        console.error('Error fetching bookmarked posts:', err);
        setError(err.message || 'Failed to fetch bookmarked posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarkedPosts();
  }, [user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleBookmarkPost = async (postId: string) => {
    try {
      // Call API to unbookmark the post
      const response = await api.posts.bookmark(postId);
      
      if (response && (response as any).success) {
        // Remove the post from the bookmarked posts list
        setBookmarkedPosts(prev => prev.filter(post => post.id !== postId));
      } else {
        throw new Error((response as any)?.message || 'Failed to remove bookmark');
      }
    } catch (err: any) {
      console.error('Error removing bookmark:', err);
      // Show error message to user
      alert(err.message || 'Failed to remove bookmark. Please try again.');
    }
  };

  // Format large numbers (e.g., 1.2K, 3.4M)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="error" sx={{ mb: 2 }}>
              Error
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {error}
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </Card>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bookmark size={24} color={theme.palette.primary.main} fill={theme.palette.primary.main} />
            <Typography variant="h4" fontWeight={700}>
              Bookmarks
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              size="small"
              sx={{ 
                bgcolor: viewMode === 'grid' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                color: viewMode === 'grid' ? 'primary.main' : 'text.secondary'
              }}
              onClick={() => setViewMode('grid')}
            >
              <GridIcon size={20} />
            </IconButton>
            <IconButton 
              size="small"
              sx={{ 
                bgcolor: viewMode === 'list' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                color: viewMode === 'list' ? 'primary.main' : 'text.secondary'
              }}
              onClick={() => setViewMode('list')}
            >
              <List size={20} />
            </IconButton>
          </Box>
        </Box>
        
        {/* Stats */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>
                  {bookmarkedPosts.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Saved Posts
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>
                  3
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Collections
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>
                  2
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tags
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        
        {/* Content Tabs */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 0 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              variant="fullWidth"
              sx={{
                '& .MuiTabs-indicator': {
                  bgcolor: 'primary.main',
                  height: 3
                }
              }}
            >
              <Tab label="All Bookmarks" {...a11yProps(0)} />
              <Tab label="Collections" {...a11yProps(1)} />
              <Tab label="Tags" {...a11yProps(2)} />
            </Tabs>
            
            <TabPanel value={activeTab} index={0}>
              {viewMode === 'grid' ? (
                <Grid container spacing={3} sx={{ p: 3 }}>
                  {bookmarkedPosts.map((post) => (
                    <Grid item xs={12} sm={6} md={4} key={post.id}>
                      <Card 
                        sx={{ 
                          borderRadius: 2, 
                          height: '100%', 
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`
                          },
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => window.open(`/post/${post.id}`, '_blank')}
                      >
                        {post.media && post.media.length > 0 && post.media[0] && (
                          <Box 
                            sx={{ 
                              height: 200, 
                              bgcolor: alpha(theme.palette.grey[300], 0.3),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {post.media[0]?.resource_type === 'image' ? (
                              <Bookmark size={40} color={theme.palette.text.secondary} />
                            ) : (
                              <Bookmark size={40} color={theme.palette.text.secondary} />
                            )}
                          </Box>
                        )}
                        <CardContent sx={{ p: 2 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              mb: 1,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {post.content}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Bookmark size={16} color={theme.palette.primary.main} fill={theme.palette.primary.main} />
                              <Typography variant="caption" fontWeight={600}>
                                Saved
                              </Typography>
                            </Box>
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookmarkPost(post.id);
                              }}
                            >
                              <Trash2 size={16} color={theme.palette.error.main} />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {bookmarkedPosts.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        onBookmark={handleBookmarkPost}
                        onLike={() => {}}
                        onComment={() => {}}
                        onShare={() => {}}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  {[
                    { name: 'NFT Art', count: 12, color: 'primary' },
                    { name: 'Web3', count: 8, color: 'secondary' },
                    { name: 'Tutorials', count: 5, color: 'info' },
                  ].map((collection, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card 
                        sx={{ 
                          borderRadius: 2, 
                          height: 150,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          cursor: 'pointer',
                          '&:hover': {
                            borderColor: `${collection.color}.main`,
                            bgcolor: alpha(theme.palette[collection.color as 'primary'].main, 0.05)
                          }
                        }}
                        onClick={() => window.open(`/collection/${collection.name.toLowerCase().replace(' ', '-')}`, '_blank')}
                      >
                        <Bookmark size={32} color={theme.palette[collection.color as 'primary'].main} fill={theme.palette[collection.color as 'primary'].main} />
                        <Typography variant="h6" fontWeight={600} sx={{ mt: 1, mb: 0.5 }}>
                          {collection.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {collection.count} items
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {[
                    { tag: '#NFT', count: 12 },
                    { tag: '#Crypto', count: 8 },
                    { tag: '#Web3', count: 15 },
                    { tag: '#DigitalArt', count: 7 },
                    { tag: '#Blockchain', count: 5 },
                    { tag: '#Metaverse', count: 9 },
                  ].map((tag, index) => (
                    <Chip
                      key={index}
                      label={`${tag.tag} (${tag.count})`}
                      size="medium"
                      onClick={() => window.open(`/hashtag/${tag.tag.substring(1)}`, '_blank')}
                      sx={{ 
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        fontWeight: 500,
                        px: 2,
                        py: 1,
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2)
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </TabPanel>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

export default BookmarksPage;