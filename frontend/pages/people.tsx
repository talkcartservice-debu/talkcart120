import React, { useState, useEffect, useMemo } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Paper,
  useTheme,
  alpha
} from '@mui/material';
import { Search, Users, TrendingUp, UserPlus } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import WhoToFollow from '@/components/social/new/WhoToFollow';
import useDebounce from '@/hooks/useDebounce';
import { useRouter } from 'next/router';

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
      id={`people-tabpanel-${index}`}
      aria-labelledby={`people-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PeoplePage: NextPage = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebounce(searchInput, 300);
  const peopleKey = useMemo(() => 'people:q', []);

  // initialize from URL or localStorage
  useEffect(() => {
    const fromUrl = typeof router.query.q === 'string' ? router.query.q : '';
    const fromStorage = typeof window !== 'undefined' ? window.localStorage.getItem(peopleKey) || '' : '';
    const initial = fromUrl || fromStorage;
    if (initial) setSearchInput(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peopleKey]);

  // persist to URL + localStorage when debounced value changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(peopleKey, searchQuery || ''); } catch {}
    }
    const q: Record<string, any> = { ...router.query };
    if (searchQuery) q.q = searchQuery; else delete q.q;
    router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Layout>
      <Head>
        <title>Discover People - TalkCart</title>
        <meta name="description" content="Discover and connect with amazing people on TalkCart. Find new friends, follow interesting users, and expand your network." />
      </Head>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
            borderRadius: 2,
            p: 4,
            mb: 4,
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Users size={32} color={theme.palette.primary.main} />
            <Typography variant="h3" fontWeight={700}>
              Discover People
            </Typography>
          </Box>
          
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Connect with Amazing People in Our Community
          </Typography>
          
          <Typography variant="body1" color="text.secondary">
            Find new friends, follow interesting users, and expand your network. 
            Discover people based on your interests and activity.
          </Typography>
        </Paper>

        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid item xs={12} lg={8}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 0 }}>
                {/* Search Bar */}
                <Box sx={{ p: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <TextField
                    fullWidth
                    placeholder="Search for people..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={20} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Box>

                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange}
                    sx={{ px: 3 }}
                  >
                    <Tab 
                      icon={<UserPlus size={18} />} 
                      label="Suggested" 
                      iconPosition="start"
                    />
                    <Tab 
                      icon={<TrendingUp size={18} />} 
                      label="Popular" 
                      iconPosition="start"
                    />
                    <Tab 
                      icon={<Users size={18} />} 
                      label="New Users" 
                      iconPosition="start"
                    />
                  </Tabs>
                </Box>

                {/* Tab Panels */}
                <TabPanel value={tabValue} index={0}>
                  <Box sx={{ px: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      People You Might Know
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Based on your activity and interests
                    </Typography>
                    <WhoToFollow 
                      limit={10} 
                      showHeader={false}
                      compact={false}
                      query={searchQuery}
                    />
                  </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <Box sx={{ px: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Popular Users
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Most followed and active users
                    </Typography>
                    <WhoToFollow 
                      limit={10} 
                      showHeader={false}
                      compact={false}
                      query={searchQuery}
                    />
                  </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <Box sx={{ px: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      New to TalkCart
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Welcome new community members
                    </Typography>
                    <WhoToFollow 
                      limit={10} 
                      showHeader={false}
                      compact={false}
                      query={searchQuery}
                    />
                  </Box>
                </TabPanel>
              </CardContent>
            </Card>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} lg={4}>
            <Box sx={{ position: 'sticky', top: 20 }}>
              {/* Quick Stats */}
              <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Community Stats
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Total Users
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        12,543
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Active Today
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        1,234
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        New This Week
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        89
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Tips for Connecting
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      • Follow users whose content interests you
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Engage with posts through likes and comments
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Share quality content to attract followers
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Be respectful and positive in interactions
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default PeoplePage;

// Add getStaticPaths to fix prerendering errors
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  };
}
