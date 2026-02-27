import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Box, Container, CircularProgress, Typography } from '@mui/material';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Only redirect after auth context is ready
    if (!loading) {
      if (isAuthenticated) {
        router.push('/social');
      } else {
        router.push('/auth/login');
      }
    }
  }, [loading, isAuthenticated, router]);

  // Show loading state while determining auth status
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          Loading Vetora...
        </Typography>
      </Container>
    </Box>
  );
}
