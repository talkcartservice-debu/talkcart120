import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Box, 
  Typography, 
  Container,
  CircularProgress,
} from '@mui/material';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { usePostsEnhanced } from '@/hooks/usePostsEnhanced';

// Step 3: Add usePostsEnhanced hook
const SocialStep3Page: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  
  // Use the enhanced usePosts hook
  const { posts, loading, error } = usePostsEnhanced();

  return (
    <Layout>
      <Head>
        <title>Social Step 3 - TalkCart</title>
        <meta name="description" content="Step 3 of social feed with usePostsEnhanced" />
      </Head>
      
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Social Feed - Step 3
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            User: {user ? user.displayName || user.username : 'Not logged in'}
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Active Tab: {activeTab}
          </Typography>
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading posts...</Typography>
            </Box>
          )}
          
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              Error: {error}
            </Typography>
          )}
          
          <Typography variant="body1">
            Posts loaded: {posts.length}
          </Typography>
        </Box>
      </Container>
    </Layout>
  );
};

export default SocialStep3Page;