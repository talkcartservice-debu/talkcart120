import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  useTheme,
  alpha,
  IconButton,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
} from '@mui/material';
import { 
  TrendingUp, 
  Heart, 
  MessageSquare, 
  Share, 
  Eye,
  Users,
  Clock,
  Filter,
  Sliders,
  Hash as HashIcon,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import PostCard from '@/components/social/new/PostCard';
import { Post } from '@/types/social';
import { API_URL } from '@/config';

interface TrendingHashtag {
  hashtag: string;
  count: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  score: number;
}

import api from '@/lib/api';
import { getTrendingHashtags } from '@/services/postsApi';
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
      id={`trending-tabpanel-${index}`}
      aria-labelledby={`trending-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `trending-tab-${index}`,
    'aria-controls': `trending-tabpanel-${index}`,
  };
}

const TrendingPage: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [posts, setPosts] = useState<Post[]>([]);
  const [hashtagData, setHashtagData] = useState<TrendingHashtag[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHashtags, setLoadingHashtags] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hashtagError, setHashtagError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendingData = async () => {
      try {
        // Fetch trending posts
        setLoading(true);
        setError(null);
        
        const postsResponse = await api.posts.getTrending({
          limit: 10,
          timeRange,
        });
        
        if (postsResponse.success && postsResponse.data?.posts) {
          setPosts(postsResponse.data.posts);
        } else {
          setPosts([]);
        }
      } catch (err: any) {
        console.error('Error fetching trending posts:', err);
        setError(err.message || 'Failed to fetch trending posts');
        // Fallback to empty array
        setPosts([]);
      } finally {
        setLoading(false);
      }
      
      try {
        // Fetch trending hashtags
        setLoadingHashtags(true);
        setHashtagError(null);
        
        // Try the dedicated hashtags endpoint
        const hashtagsResponse = await getTrendingHashtags(10);
        
        if (hashtagsResponse) {
          setHashtagData(hashtagsResponse);
        } else {
          setHashtagData([]);
        }
      } catch (err: any) {
        console.error('Error fetching trending hashtags:', err);
        setHashtagError(err.message || 'Failed to fetch trending hashtags');
        // Fallback to empty array
        setHashtagData([]);
      } finally {
        setLoadingHashtags(false);
      }
      
      try {
        // Fetch suggested users
        setLoadingUsers(true);
        setUserError(null);
        
        // Use fetch to get suggested users from the suggestions endpoint
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        
        const response = await fetch(`${API_URL}/users/suggestions?limit=6`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });
        
        const data = await response.json();
        
        if (data.success && data.data?.suggestions) {
          setSuggestedUsers(data.data.suggestions);
        } else {
          setSuggestedUsers([]);
        }
      } catch (err: any) {
        console.error('Error fetching suggested users:', err);
        setUserError(err.message || 'Failed to fetch suggested users');
        // Fallback to empty array
        setSuggestedUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchTrendingData();
  }, [timeRange]);

  const timeRanges = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleTimeRangeChange = (newTimeRange: 'today' | 'week' | 'month' | 'year') => {
    setTimeRange(newTimeRange);
  };

  const handleBookmarkPost = (postId: string) => {
    console.log('Bookmark post:', postId);
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

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 2, px: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp size={24} color={theme.palette.primary.main} />
            <Typography variant="h5" fontWeight={700}>
              Trending
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {timeRanges.map((range) => (
              <Chip
                key={range.value}
                label={range.label}
                size="small"
                onClick={() => handleTimeRangeChange(range.value as any)}
                sx={{ 
                  height: 28, 
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  bgcolor: timeRange === range.value 
                    ? alpha(theme.palette.primary.main, 0.1) 
                    : 'transparent',
                  color: timeRange === range.value 
                    ? 'primary.main' 
                    : 'text.secondary',
                  '&:hover': {
                    bgcolor: timeRange === range.value 
                      ? alpha(theme.palette.primary.main, 0.2) 
                      : alpha(theme.palette.grey[300], 0.3)
                  }
                }}
              />
            ))}
          </Box>
        </Box>
        
        {/* Stats Cards */}
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.05)
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Heart size={14} color={theme.palette.error.main} fill={theme.palette.error.main} />
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    Likes
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700}>
                  {formatNumber(posts.reduce((sum, post) => sum + (post.likes || 0), 0))}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                bgcolor: alpha(theme.palette.info.main, 0.05)
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <MessageSquare size={14} color={theme.palette.info.main} />
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    Comments
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700}>
                  {formatNumber(posts.reduce((sum, post) => sum + (post.comments || 0), 0))}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                bgcolor: alpha(theme.palette.warning.main, 0.05)
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Share size={14} color={theme.palette.warning.main} />
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    Shares
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700}>
                  {formatNumber(posts.reduce((sum, post) => sum + (post.shares || 0), 0))}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                bgcolor: alpha(theme.palette.success.main, 0.05)
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Eye size={14} color={theme.palette.success.main} />
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    Views
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700}>
                  {formatNumber(posts.reduce((sum, post) => sum + (post.views || 0), 0))}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Content Tabs */}
        <Card sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 0 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTabs-indicator': {
                  bgcolor: 'primary.main',
                  height: 3
                },
                '& .MuiTab-root': {
                  fontSize: '0.875rem',
                  minWidth: '100px',
                }
              }}
            >
              <Tab label="Posts" {...a11yProps(0)} />
              <Tab label="Users" {...a11yProps(1)} />
              <Tab label="Hashtags" {...a11yProps(2)} />
            </Tabs>
            
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ p: 1 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : error ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <Typography color="error">Error loading trending posts: {error}</Typography>
                  </Box>
                ) : posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onBookmark={handleBookmarkPost}
                    />
                  ))
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <Typography>No trending posts found.</Typography>
                  </Box>
                )}
              </Box>
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 1 }}>
                {loadingUsers ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : userError ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <Typography color="error">Error loading suggested users: {userError}</Typography>
                  </Box>
                ) : suggestedUsers.length > 0 ? (
                  <Grid container spacing={2}>
                    {suggestedUsers.map((user, index) => (
                      <Grid item xs={6} sm={4} md={3} key={user.id || index}>
                        <Card 
                          sx={{ 
                            borderRadius: 2, 
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            p: 1.5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`
                            },
                            transition: 'all 0.3s ease'
                          }}
                          onClick={() => window.open(`/profile/${user.username}`, '_blank')}
                        >
                          <Box 
                            sx={{ 
                              width: 48, 
                              height: 48, 
                              borderRadius: '50%',
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: 1
                            }}
                          >
                            <Users size={18} color={theme.palette.primary.main} />
                          </Box>
                          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                            {user.displayName || user.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, wordBreak: 'break-all' }}>
                            @{user.username}
                          </Typography>
                          <Chip 
                            label={`${user.followerCount || 0} followers`} 
                            size="small" 
                            sx={{ 
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: 'primary.main',
                              fontWeight: 600,
                              fontSize: '0.7rem'
                            }} 
                          />
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <Typography>No suggested users found.</Typography>
                  </Box>
                )}
              </Box>
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 1 }}>
                {loadingHashtags ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : hashtagError ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <Typography color="error">Error loading trending hashtags: {hashtagError}</Typography>
                  </Box>
                ) : hashtagData.length > 0 ? (
                  <Grid container spacing={1.5}>
                    {hashtagData.map((hashtag, index) => (
                      <Grid item xs={6} sm={4} md={3} key={index}>
                        <Card 
                          sx={{ 
                            borderRadius: 2, 
                            height: '100%',
                            cursor: 'pointer',
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: alpha(theme.palette.primary.main, 0.05)
                            }
                          }}
                          onClick={() => window.open(`/hashtag/${hashtag.hashtag}`, '_blank')}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                              <HashIcon size={14} color={theme.palette.primary.main} />
                              <Typography variant="body2" fontWeight={600}>
                                #{hashtag.hashtag}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {formatNumber(hashtag.count)} posts
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                    <Typography>No trending hashtags found.</Typography>
                  </Box>
                )}
              </Box>
            </TabPanel>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

export default TrendingPage;

