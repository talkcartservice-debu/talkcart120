import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import UserPosts from '@/components/profile/UserPosts';

export default function TestUserPostsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        User Posts Component Test
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Testing UserPosts component with username: mirror
      </Typography>
      
      <Box sx={{ minHeight: '500px' }}>
        <UserPosts username="mirror" isOwnProfile={false} />
      </Box>
    </Container>
  );
}