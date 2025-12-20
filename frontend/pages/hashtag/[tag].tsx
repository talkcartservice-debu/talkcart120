import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import { Hash as HashIcon, TrendingUp, Calendar } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PublicFeed from '@/components/feed/PublicFeed';
import { api } from '@/lib/api';
import { formatNumber } from '@/utils/format';

interface HashtagData {
  tag: string;
  postCount: number;
  trendingScore: number;
  firstUsed: Date;
  relatedHashtags: string[];
}

const HashtagPage = () => {
  const router = useRouter();
  const theme = useTheme();
  const { tag } = router.query;
  
  const [hashtagData, setHashtagData] = useState<HashtagData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tag) {
      fetchHashtagData();
    }
  }, [tag]);

  const fetchHashtagData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch hashtag data from backend
      const response: any = await api.posts.getAll({
        hashtag: tag as string,
        limit: 30,
        page: 1
      });
      
      if (response?.success) {
        setHashtagData({
          tag: tag as string,
          postCount: response.data?.pagination?.total || 0,
          trendingScore: response.data?.trendingScore || 0,
          firstUsed: response.data?.firstUsed || new Date(),
          relatedHashtags: response.data?.relatedHashtags || []
        });
      } else {
        setError('Failed to load hashtag data');
      }
    } catch (err: any) {
      console.error('Error fetching hashtag data:', err);
      setError(err.message || 'Failed to load hashtag data');
    } finally {
      setLoading(false);
    }
  };

  if (!tag) {
    return (
      <AppLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="warning">Invalid hashtag</Alert>
        </Container>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Container>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head>
        <title>#{tag} | TalkCart</title>
        <meta name="description" content={`Posts tagged with #${tag}`} />
      </Head>

      <Box sx={{ bgcolor: 'background.paper', py: 4 }}>
        <Container maxWidth="md">
          <Card sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <HashIcon size={32} color={theme.palette.primary.main} />
                <Typography variant="h4" component="h1" fontWeight={700}>
                  #{tag}
                </Typography>
              </Box>

              {hashtagData && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2 }}>
                      <Typography variant="h5" fontWeight={700}>
                        {formatNumber(hashtagData.postCount)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Posts
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.1), borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <TrendingUp size={20} color={theme.palette.secondary.main} />
                        <Typography variant="h5" fontWeight={700}>
                          {hashtagData.trendingScore.toFixed(1)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Trending Score
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Calendar size={20} color={theme.palette.info.main} />
                        <Typography variant="h5" fontWeight={700}>
                          {new Date(hashtagData.firstUsed).getFullYear()}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        First Used
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}

              {hashtagData?.relatedHashtags && hashtagData.relatedHashtags.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    Related Hashtags
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {hashtagData.relatedHashtags.slice(0, 10).map((relatedTag) => (
                      <Chip
                        key={relatedTag}
                        label={`#${relatedTag}`}
                        onClick={() => router.push(`/hashtag/${relatedTag}`)}
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.2)
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Posts with this hashtag */}
      <Container maxWidth="md">
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
          Recent Posts
        </Typography>
        <PublicFeed 
          maxPosts={20}
          contentFilter="all"
          sortBy="recent"
        />
      </Container>
    </AppLayout>
  );
};

export default HashtagPage;