import React, { useState } from 'react';
import Head from 'next/head';
import { 
  Box, 
  Typography, 
  Container,
} from '@mui/material';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';

// Step 2: Add basic hooks
const SocialStep2Page: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Layout>
      <Head>
        <title>Social Step 2 - TalkCart</title>
        <meta name="description" content="Step 2 of social feed with hooks" />
      </Head>
      
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Social Feed - Step 2
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            User: {user ? user.displayName || user.username : 'Not logged in'}
          </Typography>
          <Typography variant="body1">
            Active Tab: {activeTab}
          </Typography>
        </Box>
      </Container>
    </Layout>
  );
};

export default SocialStep2Page;