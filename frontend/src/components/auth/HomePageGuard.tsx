import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

interface HomePageGuardProps {
  children: React.ReactNode;
}

/**
 * HomePageGuard component that ensures only new users (not authenticated)
 * can access the home page. Redirects authenticated users to the social feed.
 */
export const HomePageGuard: React.FC<HomePageGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect during loading
    if (isLoading) return;

    // If user is authenticated, redirect to social feed
    if (isAuthenticated) {
      console.log('HomePageGuard: Redirecting authenticated user to social feed');
      router.push('/social');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="background.default"
      >
        <Box textAlign="center">
          <CircularProgress size={60} thickness={4} />
          <Typography 
            variant="h6" 
            sx={{ mt: 2, color: 'text.secondary' }}
          >
            Checking authentication...
          </Typography>
        </Box>
      </Box>
    );
  }

  // If authenticated and still on this page, show loading while redirecting
  if (isAuthenticated) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="background.default"
      >
        <Box textAlign="center">
          <CircularProgress size={60} thickness={4} />
          <Typography 
            variant="h6" 
            sx={{ mt: 2, color: 'text.secondary' }}
          >
            Redirecting to social feed...
          </Typography>
        </Box>
      </Box>
    );
  }

  // User is not authenticated, allow access to home page
  return <>{children}</>;
};

export default HomePageGuard;