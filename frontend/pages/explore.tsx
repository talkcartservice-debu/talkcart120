import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { Box, Container, Typography, Paper, useTheme, Grid, TextField, InputAdornment, CircularProgress } from '@mui/material';
import { Globe, TrendingUp, Clock, ThumbsUp, Search } from 'lucide-react';
import WhoToFollow from '@/components/social/new/WhoToFollow';
import { useRouter } from 'next/router';
import useDebounce from '@/hooks/useDebounce';
import PostCard from '@/components/social/new/PostCard';
// Removed VideoFeedProvider as PostCard doesn't need it
import api from '@/lib/api';
import { Post } from '@/types/social';

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

/**
 * Explore page - Shows public content that everyone can see
 * No authentication required
 */
const ExplorePage: NextPage = () => {
  const theme = useTheme();
  const router = useRouter();

  // Debounced search persisted in URL/localStorage
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebounce(searchInput, 300);

  useEffect(() => {
    const fromUrl = typeof router.query.q === 'string' ? router.query.q : '';
    const fromStorage = typeof window !== 'undefined' ? window.localStorage.getItem('explore:q') || '' : '';
    const initial = fromUrl || fromStorage;
    if (initial) setSearchInput(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem('explore:q', searchQuery || ''); } catch {}
    }
    const q = { ...router.query } as Record<string, any>;
    if (searchQuery) q.q = searchQuery; else delete q.q;
    router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleSignUp = () => {
    router.push('/auth/register');
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  return (
    <>
      <Head>
        <title>Explore Public Posts - TalkCart</title>
        <meta 
          name="description" 
          content="Discover amazing public content from the TalkCart community. See what people are sharing and talking about." 
        />
        <meta name="keywords" content="social media, public posts, community, discover, trending" />
        <meta property="og:title" content="Explore Public Posts - TalkCart" />
        <meta property="og:description" content="Discover amazing public content from the TalkCart community." />
        <meta property="og:type" content="website" />
      </Head>

      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
            borderRadius: 0,
            py: 4,
            mb: 3,
            borderBottom: `1px solid ${theme.palette.divider}`
          }}
        >
          <Container maxWidth="md">
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Globe size={32} color={theme.palette.primary.main} />
              <Typography variant="h3" fontWeight={700}>
                Explore
              </Typography>
            </Box>
            
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Discover Public Content from Our Community
            </Typography>
            
            <Typography variant="body1" color="text.secondary">
              Browse through public posts, trending content, and popular discussions. 
              No account required - just explore and discover amazing content!
            </Typography>
          </Container>
        </Paper>

        {/* Main Content */}
        <Container maxWidth="xl" sx={{ pb: 4 }}>
          <Grid container spacing={4}>
            {/* Main Feed - Increased width */}
            <Grid item xs={12} md={9}>
              {/* Public Feed with different sorting options */}
              <Box mb={4}>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Clock size={20} />
                  Recent Posts
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search public posts..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={18} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <RecentPostsSection query={searchQuery} />
              </Box>

              <Box mb={4}>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp size={20} />
                  Trending Now
                </Typography>
                <TrendingPostsSection />
              </Box>

              <Box mb={4}>
                <Typography variant="h5" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ThumbsUp size={20} />
                  Most Popular
                </Typography>
                <PopularPostsSection query={searchQuery} />
              </Box>
            </Grid>

            {/* Sidebar - Reduced width */}
            <Grid item xs={12} md={3}>
              <Box sx={{ position: 'sticky', top: 20 }}>
                <WhoToFollow limit={5} />
              </Box>
            </Grid>
          </Grid>

          {/* Call to Action */}
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2
            }}
          >
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Want to Join the Conversation?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Create your free account to start posting, commenting, and connecting with others.
            </Typography>
            <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
              <button
                onClick={handleSignUp}
                style={{
                  background: theme.palette.primary.main,
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = theme.palette.primary.dark;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = theme.palette.primary.main;
                }}
              >
                Create Account
              </button>
              <button
                onClick={handleLogin}
                style={{
                  background: 'transparent',
                  color: theme.palette.primary.main,
                  border: `2px solid ${theme.palette.primary.main}`,
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = theme.palette.primary.main;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = theme.palette.primary.main;
                }}
              >
                Sign In
              </button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
};

const RecentPostsSection: React.FC<{ query?: string }> = ({ query }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch recent posts using the API
        const response: any = await api.posts.getAll({ 
          feedType: 'recent',
          limit: 10,
          search: query
        });
        
        if (response?.success && response?.data?.posts) {
          // Transform the posts to match the Post interface
          const transformedPosts: Post[] = response.data.posts.map((post: any) => ({
            id: post.id || post._id,
            _id: post._id,
            type: post.type || 'text',
            content: post.content,
            author: {
              id: post.author?.id || post.author?._id,
              _id: post.author?._id,
              username: post.author?.username,
              displayName: post.author?.displayName,
              name: post.author?.displayName || post.author?.username,
              avatar: post.author?.avatar,
              isVerified: post.author?.isVerified,
              bio: post.author?.bio,
              role: post.author?.role,
              followerCount: post.author?.followerCount,
              location: post.author?.location,
            },
            authorId: post.authorId || post.author?._id,
            media: post.media,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            likes: parseNumericValue(post.likeCount || post.likes || 0),
            comments: parseNumericValue(post.commentCount || post.comments || 0),
            shares: parseNumericValue(post.shareCount || post.shares || 0),
            views: parseNumericValue(post.views || 0),
            likeCount: parseNumericValue(post.likeCount || post.likes || 0),
            commentCount: parseNumericValue(post.commentCount || post.comments || 0),
            shareCount: parseNumericValue(post.shareCount || post.shares || 0),
            bookmarkCount: parseNumericValue(post.bookmarkCount || 0),
            isLiked: post.isLiked || false,
            isBookmarked: post.isBookmarked || false,
            isShared: post.isShared || false,
            hashtags: post.hashtags,
            mentions: post.mentions,
            location: post.location,
            privacy: post.privacy,
            isActive: post.isActive !== undefined ? post.isActive : true,
          }));
          
          setPosts(transformedPosts);
        } else {
          setError(response?.message || response?.error || 'Failed to load recent posts');
        }
      } catch (err: any) {
        console.error('Error fetching recent posts:', err);
        setError(err?.message || 'Failed to load recent posts');
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [query]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {posts.map((post) => (
        <Box key={post.id}>
          <PostCard post={post} />
        </Box>
      ))}
    </Box>
  );
};

const PopularPostsSection: React.FC<{ query?: string }> = ({ query }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch popular posts using the API
        const response: any = await api.posts.getAll({ 
          feedType: 'popular',
          limit: 6,
          search: query
        });
        
        if (response?.success && response?.data?.posts) {
          // Transform the posts to match the Post interface
          const transformedPosts: Post[] = response.data.posts.map((post: any) => ({
            id: post.id || post._id,
            _id: post._id,
            type: post.type || 'text',
            content: post.content,
            author: {
              id: post.author?.id || post.author?._id,
              _id: post.author?._id,
              username: post.author?.username,
              displayName: post.author?.displayName,
              name: post.author?.displayName || post.author?.username,
              avatar: post.author?.avatar,
              isVerified: post.author?.isVerified,
              bio: post.author?.bio,
              role: post.author?.role,
              followerCount: post.author?.followerCount,
              location: post.author?.location,
            },
            authorId: post.authorId || post.author?._id,
            media: post.media,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            likes: parseNumericValue(post.likeCount || post.likes || 0),
            comments: parseNumericValue(post.commentCount || post.comments || 0),
            shares: parseNumericValue(post.shareCount || post.shares || 0),
            views: parseNumericValue(post.views || 0),
            likeCount: parseNumericValue(post.likeCount || post.likes || 0),
            commentCount: parseNumericValue(post.commentCount || post.comments || 0),
            shareCount: parseNumericValue(post.shareCount || post.shares || 0),
            bookmarkCount: parseNumericValue(post.bookmarkCount || 0),
            isLiked: post.isLiked || false,
            isBookmarked: post.isBookmarked || false,
            isShared: post.isShared || false,
            hashtags: post.hashtags,
            mentions: post.mentions,
            location: post.location,
            privacy: post.privacy,
            isActive: post.isActive !== undefined ? post.isActive : true,
          }));
          
          setPosts(transformedPosts);
        } else {
          setError(response?.message || response?.error || 'Failed to load popular posts');
        }
      } catch (err: any) {
        console.error('Error fetching popular posts:', err);
        setError(err?.message || 'Failed to load popular posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [query]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {posts.map((post) => (
        <Box key={post.id}>
          <PostCard post={post} />
        </Box>
      ))}
    </Box>
  );
};

const TrendingPostsSection: React.FC = () => {
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch trending posts using the API
        const response: any = await api.posts.getTrending({ limit: 30 }); // Fetch more to ensure we have enough after filtering
        
        if (response?.success && response?.data?.posts) {
          // Transform the posts to match the Post interface
          const transformedPosts: Post[] = response.data.posts.map((post: any) => ({
            id: post.id || post._id,
            _id: post._id,
            type: post.type || 'text',
            content: post.content,
            author: {
              id: post.author?.id || post.author?._id,
              _id: post.author?._id,
              username: post.author?.username,
              displayName: post.author?.displayName,
              name: post.author?.displayName || post.author?.username,
              avatar: post.author?.avatar,
              isVerified: post.author?.isVerified,
              bio: post.author?.bio,
              role: post.author?.role,
              followerCount: post.author?.followerCount,
              location: post.author?.location,
            },
            authorId: post.authorId || post.author?._id,
            media: post.media,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            likes: parseNumericValue(post.likeCount || post.likes || 0),
            comments: parseNumericValue(post.commentCount || post.comments || 0),
            shares: parseNumericValue(post.shareCount || post.shares || 0),
            views: parseNumericValue(post.views || 0),
            likeCount: parseNumericValue(post.likeCount || post.likes || 0),
            commentCount: parseNumericValue(post.commentCount || post.comments || 0),
            shareCount: parseNumericValue(post.shareCount || post.shares || 0),
            bookmarkCount: parseNumericValue(post.bookmarkCount || 0),
            isLiked: post.isLiked || false,
            isBookmarked: post.isBookmarked || false,
            isShared: post.isShared || false,
            hashtags: post.hashtags,
            mentions: post.mentions,
            location: post.location,
            privacy: post.privacy,
            isActive: post.isActive !== undefined ? post.isActive : true,
          }));
          
          // Filter posts based on criteria: 200+ likes, 20+ comments, 10+ shares
          const filteredPosts = transformedPosts.filter(post => {
            const likeCount = parseNumericValue(post.likeCount || post.likes || 0);
            const commentCount = parseNumericValue(post.commentCount || post.comments || 0);
            const shareCount = parseNumericValue(post.shareCount || post.shares || 0);
            
            return likeCount >= 200 && commentCount >= 20 && shareCount >= 10;
          });
          
          // Limit to 10 posts after filtering
          setTrendingPosts(filteredPosts.slice(0, 10));
        } else {
          setError(response?.message || response?.error || 'Failed to load trending posts');
        }
      } catch (err: any) {
        console.error('Error fetching trending posts:', err);
        setError(err?.message || 'Failed to load trending posts');
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingPosts();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  // Show message if no posts meet the criteria
  if (trendingPosts.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No trending posts meet the criteria (200+ likes, 20+ comments, 10+ shares)
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {trendingPosts.map((post) => (
        <Box key={post.id}>
          <PostCard post={post} />
        </Box>
      ))}
    </Box>
  );
};

export default ExplorePage;