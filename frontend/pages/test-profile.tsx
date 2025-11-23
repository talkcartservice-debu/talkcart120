import React from 'react';
import { useRouter } from 'next/router';
import { Container, Typography, Box } from '@mui/material';
import ModernProfilePage from './profile/modern';

export default function TestProfilePage() {
  const router = useRouter();
  const { username } = router.query;

  // For testing purposes, we'll use 'mirror' as the default username
  const testUsername = username || 'mirror';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Profile Page Test
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Testing profile page with username: {testUsername}
      </Typography>
      
      <Box sx={{ minHeight: '500px' }}>
        <ModernProfilePage />
      </Box>
    </Container>
  );
}

// Add getStaticPaths to fix prerendering errors
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  };
}
