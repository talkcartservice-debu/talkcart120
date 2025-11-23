import React, { useState } from 'react';
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

  // Mock trending posts
  const mockPosts: Post[] = [
    {
      id: '1',
      type: 'image',
      content: 'Incredible NFT artwork just dropped! This piece is absolutely stunning. #NFT #DigitalArt #Crypto',
      author: {
        username: 'digital_creator',
        displayName: 'Digital Creator',
        avatar: '',
        isVerified: true,
        id: '1',
      },
      media: [
        {
          resource_type: 'image',
          secure_url: '',
        }
      ],
      createdAt: new Date().toISOString(),
      likes: 2450,
      comments: 320,
      shares: 180,
      views: 12000,
      isLiked: false,
      isBookmarked: false,
    },
    {
      id: '2',
      type: 'video',
      content: 'The future of decentralized social media is here! Web3 is changing everything. #Web3 #SocialMedia #Blockchain',
      author: {
        username: 'web3_pioneer',
        displayName: 'Web3 Pioneer',
        avatar: '',
        isVerified: true,
        id: '2',
      },
      media: [
        {
          resource_type: 'video',
          secure_url: '',
          thumbnail_url: '',
        }
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      likes: 1890,
      comments: 240,
      shares: 120,
      views: 8900,
      isLiked: true,
      isBookmarked: false,
    },
    {
      id: '3',
      type: 'image',
      content: 'Behind the scenes of my latest NFT collection creation process. #Art #Process #NFT',
      author: {
        username: 'artistic_vision',
        displayName: 'Artistic Vision',
        avatar: '',
        isVerified: false,
        id: '3',
      },
      media: [
        {
          resource_type: 'image',
          secure_url: '',
        }
      ],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      likes: 3560,
      comments: 420,
      shares: 280,
      views: 21000,
      isLiked: false,
      isBookmarked: true,
    },
    {
      id: '4',
      type: 'video',
      content: 'Exploring the metaverse with friends! The future is here. #Metaverse #Web3 #VirtualReality',
      author: {
        username: 'metaverse_explorer',
        displayName: 'Metaverse Explorer',
        avatar: '',
        isVerified: true,
        id: '4',
      },
      media: [
        {
          resource_type: 'video',
          secure_url: '',
          thumbnail_url: '',
        }
      ],
      createdAt: new Date(Date.now() - 10800000).toISOString(),
      likes: 5670,
      comments: 650,
      shares: 420,
      views: 34000,
      isLiked: false,
      isBookmarked: false,
    },
  ];

  const timeRanges = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Year', value: 'year' },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp size={24} color={theme.palette.primary.main} />
            <Typography variant="h4" fontWeight={700}>
              Trending
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {timeRanges.map((range) => (
              <Chip
                key={range.value}
                label={range.label}
                size="small"
                onClick={() => setTimeRange(range.value as any)}
                sx={{ 
                  height: 28, 
                  fontSize: '0.8rem',
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
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.05)
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Heart size={18} color={theme.palette.error.main} fill={theme.palette.error.main} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Likes
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  24.5K
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                bgcolor: alpha(theme.palette.info.main, 0.05)
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <MessageSquare size={18} color={theme.palette.info.main} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Comments
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  3.2K
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                bgcolor: alpha(theme.palette.warning.main, 0.05)
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Share size={18} color={theme.palette.warning.main} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Shares
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  1.8K
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card 
              sx={{ 
                borderRadius: 2, 
                height: '100%',
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                bgcolor: alpha(theme.palette.success.main, 0.05)
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Eye size={18} color={theme.palette.success.main} />
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    Views
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700}>
                  125K
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
              variant="fullWidth"
              sx={{
                '& .MuiTabs-indicator': {
                  bgcolor: 'primary.main',
                  height: 3
                }
              }}
            >
              <Tab label="Posts" {...a11yProps(0)} />
              <Tab label="Users" {...a11yProps(1)} />
              <Tab label="Hashtags" {...a11yProps(2)} />
            </Tabs>
            
            <TabPanel value={activeTab} index={0}>
              <Box sx={{ p: 2 }}>
                {mockPosts.map((post) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onBookmark={handleBookmarkPost}
                  />
                ))}
              </Box>
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item}>
                      <Card 
                        sx={{ 
                          borderRadius: 2, 
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          p: 3,
                          textAlign: 'center',
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`
                          },
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => window.open(`/profile/username${item}`, '_blank')}
                      >
                        <Box 
                          sx={{ 
                            width: 64, 
                            height: 64, 
                            borderRadius: '50%',
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2
                          }}
                        >
                          <Users size={24} color={theme.palette.primary.main} />
                        </Box>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                          User {item}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          @{'username' + item}
                        </Typography>
                        <Chip 
                          label={`${Math.floor(Math.random() * 10000) + 1} followers`} 
                          size="small" 
                          sx={{ 
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: 'primary.main',
                            fontWeight: 600
                          }} 
                        />
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </TabPanel>
            
            <TabPanel value={activeTab} index={2}>
              <Box sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  {[
                    { tag: 'NFT', posts: 125000 },
                    { tag: 'Crypto', posts: 89000 },
                    { tag: 'Web3', posts: 67000 },
                    { tag: 'DigitalArt', posts: 45000 },
                    { tag: 'Blockchain', posts: 38000 },
                    { tag: 'Metaverse', posts: 32000 },
                    { tag: 'DeFi', posts: 28000 },
                    { tag: 'DAO', posts: 21000 },
                  ].map((hashtag, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
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
                        onClick={() => window.open(`/hashtag/${hashtag.tag}`, '_blank')}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <HashIcon size={16} color={theme.palette.primary.main} />
                            <Typography variant="subtitle1" fontWeight={600}>
                              #{hashtag.tag}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatNumber(hashtag.posts)} posts
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </TabPanel>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

export default TrendingPage;

// Add getStaticPaths to fix prerendering errors
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  };
}
