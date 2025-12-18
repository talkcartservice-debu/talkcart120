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
import PostCard from '@/components/social/new/PostCard';

// Step 4: Add PostCard component
const SocialStep4Page: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  
  // Use the enhanced usePosts hook
  const { posts, loading, error } = usePostsEnhanced();

  return (
    <Layout>
      <Head>
        <title>Social Step 4 - TalkCart</title>
        <meta name="description" content="Step 4 of social feed with PostCard" />
      </Head>
      
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Social Feed - Step 4
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
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Posts ({posts.length}):
            </Typography>
            
            {posts.map((post) => (
              <Box key={post.id} sx={{ mb: 2 }}>
                <PostCard 
                  post={post} 
                  onBookmark={() => console.log('Bookmark', post.id)}
                  onLike={() => console.log('Like', post.id)}
                  onShare={() => console.log('Share', post.id)}
                  onComment={() => console.log('Comment', post.id)}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </Layout>
  );
};

export default SocialStep4Page;