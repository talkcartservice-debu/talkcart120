import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  Box, 
  Typography, 
  Container,
  CircularProgress,
} from '@mui/material';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';

const SocialTestPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <Layout>
      <Head>
        <title>Social Test - TalkCart</title>
        <meta name="description" content="Testing social feed functionality" />
      </Head>
      
      <Container maxWidth="lg">
        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Social Test Page
          </Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                User: {user ? user.displayName || user.username : 'Not logged in'}
              </Typography>
              <Typography variant="body1">
                This is a test page to verify the social route works correctly.
              </Typography>
            </Box>
          )}
        </Box>
      </Container>
    </Layout>
  );
};

export default SocialTestPage;