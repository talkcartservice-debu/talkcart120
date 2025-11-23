import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Skeleton,
  useTheme,
  alpha,
  List as MuiList,
  CircularProgress,
} from '@mui/material';
import { 
  Search, 
  Compass, 
  TrendingUp, 
  Hash, 
  Users, 
  Video, 
  Image as ImageIcon, 
  ShoppingCart,
  Zap,
  Globe,
  Music,
  BookOpen,
  Award,
  Star,
  Heart,
  MessageCircle,
  Share2,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useStreams } from '@/hooks/useStreaming';
import useMarketplace from '@/hooks/useMarketplace';
import useRotatingProducts from '@/hooks/useRotatingProducts';
import api from '@/lib/api';
import PostCard from '@/components/social/new/PostCard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface TrendingTopic {
  name: string;
  count: number;
}

interface SuggestedPerson {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  followers: number;
}

interface Post {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
  media: Array<{
    secure_url?: string;
    url: string;
    public_id: string;
    resource_type: string;
  }>;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  isLiked: boolean;
  isBookmarked: boolean;
  hashtags: string[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: Array<{
    secure_url?: string;
    url: string;
    public_id: string;
  } | string>;
  category: string;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
  isNFT: boolean;
  featured?: boolean;
  tags: string[];
  stock: number;
  rating: number;
  reviewCount: number;
  sales: number;
  views: number;
  availability: string;
  createdAt: string;
  discount?: number;
  freeShipping?: boolean;
  fastDelivery?: boolean;
  prime?: boolean;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`explore-tabpanel-${index}`}
      aria-labelledby={`explore-tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `explore-tab-${index}`,
    'aria-controls': `explore-tabpanel-${index}`,
  };
}

const ExplorePage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { posts, loading: postsLoading, error: postsError } = usePosts();
  const { data: streamsData, isLoading: streamsLoading, error: streamsError } = useStreams();
  const { products, loading: productsLoading, error: productsError } = useMarketplace();
  const { products: rotatingProducts, loading: rotatingLoading, error: rotatingError } = useRotatingProducts(2, 10000);
  
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle search (kept for other resources)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search logic here
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Fetch trending topics and products
  useEffect(() => {
    const fetchTrendingData = async () => {
      setLoadingTrending(true);
      try {
        // Fetch trending hashtags
        const hashtagsResponse: any = await api.get('/posts/trending/hashtags?limit=8');
        if (hashtagsResponse?.success && hashtagsResponse?.data?.hashtags) {
          const topics = hashtagsResponse.data.hashtags.map((hashtag: any) => ({
            name: hashtag.hashtag,
            count: hashtag.count
          }));
          setTrendingTopics(topics);
        }
        
        // Fetch random marketplace products
        const productsResponse: any = await api.marketplace.getRandomProducts(3);
        if (productsResponse?.success && productsResponse?.data?.products) {
          setTrendingProducts(productsResponse.data.products);
        }
      } catch (error) {
        console.error('Error fetching trending data:', error);
      } finally {
        setLoadingTrending(false);
      }
    };
    
    fetchTrendingData();
  }, []);
  
  // Suggested people
  const suggestedPeople = [
    {
      id: 'user1',
      username: 'cryptoexpert',
      displayName: 'Crypto Expert',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      isVerified: true,
      followers: 12500,
    },
    {
      id: 'user2',
      username: 'nftcreator',
      displayName: 'NFT Creator',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      isVerified: true,
      followers: 8700,
    },
    {
      id: 'user3',
      username: 'web3dev',
      displayName: 'Web3 Developer',
      avatar: 'https://randomuser.me/api/portraits/men/68.jpg',
      isVerified: false,
      followers: 6300,
    },
    {
      id: 'user4',
      username: 'metaverseartist',
      displayName: 'Metaverse Artist',
      avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
      isVerified: true,
      followers: 4200,
    },
  ];
  
  // Categories
  const categories = [
    { name: 'NFTs', icon: <ImageIcon size={24} />, color: theme.palette.primary.main },
    { name: 'Crypto', icon: <Zap size={24} />, color: theme.palette.warning.main },
    { name: 'Gaming', icon: <Video size={24} />, color: theme.palette.success.main },
    { name: 'Social', icon: <Globe size={24} />, color: theme.palette.info.main },
    { name: 'Music', icon: <Music size={24} />, color: theme.palette.error.main },
    { name: 'Art', icon: <BookOpen size={24} />, color: theme.palette.secondary.main },
    { name: 'Collectibles', icon: <Award size={24} />, color: '#9c27b0' },
    { name: 'Premium', icon: <Star size={24} />, color: '#ff9800' },
  ];
  
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Explore
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Discover trending content, creators, and communities in the Web3 space
          </Typography>
          
          {/* Search Bar */}
          <Box 
            component="form" 
            onSubmit={handleSearch}
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mt: 3,
              mb: 2,
            }}
          >
            <TextField
              fullWidth
              placeholder="Search for content, people, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
              }}
              variant="outlined"
              size="medium"
            />
          </Box>
        </Box>
        
        {/* Categories */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2}>
            {categories.map((category, index) => (
              <Grid item xs={6} sm={4} md={3} lg={1.5} key={index}>
                <Card 
                  sx={{ 
                    textAlign: 'center', 
                    p: 2, 
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      color: category.color,
                      mb: 1,
                      display: 'flex',
                      justifyContent: 'center'
                    }}
                  >
                    {category.icon}
                  </Box>
                  <Typography variant="body2" fontWeight={600}>
                    {category.name}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
        
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="For You" {...a11yProps(0)} />
            <Tab label="Trending" {...a11yProps(1)} />
            <Tab label="People" {...a11yProps(2)} />
            <Tab label="Tags" {...a11yProps(3)} />
            <Tab label="Streams" {...a11yProps(4)} />
            <Tab label="Marketplace" {...a11yProps(5)} />
          </Tabs>
        </Box>
        
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={4}>
            {/* Main Content */}
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Marketplace Highlights
                </Typography>
                
                <Grid container spacing={3}>
                  {productsLoading ? (
                    [1, 2, 3].map((item) => (
                      <Grid item xs={12} sm={6} md={4} key={item}>
                        <Card sx={{ borderRadius: 2 }}>
                          <Skeleton variant="rectangular" height={160} />
                          <CardContent>
                            <Skeleton variant="text" width="80%" />
                            <Skeleton variant="text" width="60%" />
                            <Skeleton variant="text" width="40%" sx={{ mt: 1 }} />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))
                  ) : (
                    products.slice(0, 3).map((product) => (
                      <Grid item xs={12} sm={6} md={4} key={product.id}>
                        <Card 
                          sx={{ 
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease-in-out',
                            '&:hover': {
                              transform: 'translateY(-5px)',
                              boxShadow: 3,
                            }
                          }}
                          onClick={() => window.location.href = `/marketplace/${product.id}`}
                        >
                          <CardMedia
                            component="img"
                            height="160"
                            image={
                              Array.isArray(product.images) && product.images.length > 0
                                ? typeof product.images[0] === 'string'
                                  ? product.images[0]
                                  : (product.images[0] as any).secure_url || (product.images[0] as any).url
                                : '/placeholder-product.jpg'
                            }
                            alt={product.name}
                            sx={{ objectFit: 'cover' }}
                          />
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {product.name}
                            </Typography>
                            {product.vendor && (
                              <Typography variant="body2" color="text.secondary" noWrap>
                                by {product.vendor.displayName}
                              </Typography>
                            )}
                            <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                              {product.currency === 'ETH' 
                                ? `${product.price} ETH` 
                                : `$${product.price.toFixed(2)}`}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))
                  )}
                </Grid>
              </Box>
            </Grid>
            
            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              <Box sx={{ position: 'sticky', top: 80 }}>
                {/* Trending Topics */}
                <Card sx={{ mb: 4, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Trending Topics
                    </Typography>
                    {loadingTrending ? (
                      <Box>
                        {[1, 2, 3, 4, 5].map((item) => (
                          <Box 
                            key={item}
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              py: 1,
                            }}
                          >
                            <Skeleton variant="text" width="60%" />
                            <Skeleton variant="text" width="20%" />
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <MuiList>
                        {trendingTopics.map((topic, index) => (
                          <Box 
                            key={topic.name}
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              py: 1,
                              borderBottom: index < trendingTopics.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ mr: 2, fontWeight: 600 }}
                              >
                                #{index + 1}
                              </Typography>
                              <Typography variant="body1" fontWeight={500}>
                                #{topic.name}
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {topic.count.toLocaleString()} posts
                            </Typography>
                          </Box>
                        ))}
                      </MuiList>
                    )}
                  </CardContent>
                </Card>
                
                {/* Trending Products Carousel */}
                <Card sx={{ mb: 4, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Trending Products
                    </Typography>
                    {rotatingLoading ? (
                      <Box>
                        {[1, 2].map((item) => (
                          <Box 
                            key={item}
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              py: 1,
                            }}
                          >
                            <Skeleton variant="rectangular" width={60} height={60} sx={{ mr: 2 }} />
                            <Box>
                              <Skeleton variant="text" width="80%" />
                              <Skeleton variant="text" width="60%" />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ) : rotatingError ? (
                      <Typography color="error" variant="body2">
                        Failed to load trending products
                      </Typography>
                    ) : (
                      <MuiList>
                        {rotatingProducts.slice(0, 2).map((product, index) => (
                          <Box 
                            key={product.id}
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              py: 1,
                              borderBottom: index < Math.min(rotatingProducts.length, 2) - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                            }}
                          >
                            <CardMedia
                              component="img"
                              image={
                                Array.isArray(product.images) && product.images.length > 0
                                  ? typeof product.images[0] === 'string'
                                    ? product.images[0]
                                    : (product.images[0] as any).secure_url || (product.images[0] as any).url
                                  : '/placeholder-product.jpg'
                              }
                              alt={product.name}
                              sx={{ 
                                width: 60, 
                                height: 60, 
                                borderRadius: 1,
                                objectFit: 'cover',
                                mr: 2
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={500} noWrap>
                                {product.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                by {product.vendor.displayName}
                              </Typography>
                              <Typography variant="body2" color="primary" fontWeight={600}>
                                {product.currency === 'ETH' 
                                  ? `${product.price} ETH` 
                                  : `$${product.price.toFixed(2)}`}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </MuiList>
                    )}
                  </CardContent>
                </Card>
                
                {/* Suggested People */}
                <Card sx={{ mb: 4, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      Suggested People
                    </Typography>
                    {suggestedPeople.map((person, index) => (
                      <Box 
                        key={person.id}
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          py: 1.5,
                          borderBottom: index < suggestedPeople.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar src={person.avatar} />
                          <Box sx={{ ml: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body1" fontWeight={600}>
                                {person.displayName}
                              </Typography>
                              {person.isVerified && (
                                <Chip 
                                  label="Verified" 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                  sx={{ ml: 1, height: 20, fontSize: '0.625rem' }}
                                />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              @{person.username}
                            </Typography>
                          </Box>
                        </Box>
                        <Button 
                          variant="outlined" 
                          size="small"
                          sx={{ borderRadius: 2 }}
                        >
                          Follow
                        </Button>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp size={20} />
              Trending Posts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Discover the most popular content right now
            </Typography>
          </Box>
          
          {/* Trending Posts Content */}
          <TrendingPostsSection />
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            People to Follow
          </Typography>
          
          {/* People search implementation */}
        </TabPanel>
        
        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Popular Tags
          </Typography>
          
          {/* Tags implementation */}
        </TabPanel>
        
        <TabPanel value={activeTab} index={4}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Live Streams
          </Typography>
          
          {/* Streams implementation */}
        </TabPanel>
        
        <TabPanel value={activeTab} index={5}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Marketplace
          </Typography>
          
          {/* Marketplace implementation */}
        </TabPanel>
      </Container>
    </Layout>
  );
};

const TrendingPostsSection: React.FC = () => {
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch trending posts using the API
        const response: any = await api.posts.getTrending({ limit: 30 }); // Fetch more to ensure we have enough after filtering
        
        if (response?.success && response?.data?.posts) {
          // Filter posts based on criteria: 200+ likes, 20+ comments, 10+ shares
          const filteredPosts = response.data.posts.filter((post: any) => 
            (post.likeCount || post.likes || 0) >= 200 && 
            (post.commentCount || post.comments || 0) >= 20 && 
            (post.shareCount || post.shares || 0) >= 10
          );
          
          // Limit to 20 posts after filtering
          setTrendingPosts(filteredPosts.slice(0, 20));
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
      <Card sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button 
          variant="outlined" 
          sx={{ mt: 2 }}
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Card>
    );
  }

  // Show message if no posts meet the criteria
  if (trendingPosts.length === 0) {
    return (
      <Card sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No trending posts meet the criteria (200+ likes, 20+ comments, 10+ shares)
        </Typography>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      {trendingPosts.map((post) => (
        <Grid item xs={12} key={post.id}>
          <PostCard post={post as any} />
        </Grid>
      ))}
    </Grid>
  );
};

export default ExplorePage;