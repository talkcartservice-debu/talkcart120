import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Container,
  Paper,
  Button
} from '@mui/material';
import { LogIn, UserPlus } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthGuard component that requires users to be authenticated
 * to access protected content. Redirects to login if not authenticated.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Don't redirect during loading
    if (isLoading) return;

    // If user is authenticated, check if we need to redirect to social feed
    if (isAuthenticated && user) {
      const currentPath = router.pathname;
      const publicPages = ['/', '/auth/login', '/auth/register', '/auth/forgot-password'];
      
      // If user is on a public page, redirect to social feed immediately
      if (publicPages.includes(currentPath)) {
        console.log('AuthGuard: Redirecting authenticated user to social feed');
        setIsRedirecting(true);
        router.replace('/social'); // Use replace instead of push to avoid back button issues
        return;
      }
      
      // Otherwise, they're already on a protected page, no need to redirect
      return;
    }

    // If user is not authenticated, handle redirection
    if (!isAuthenticated && !user) {
      const authPages = ['/auth/login', '/auth/register', '/auth/forgot-password'];
      const publicPages = ['/', '/auth/login', '/auth/register', '/auth/forgot-password'];
      const currentPath = router.pathname;
      
      // Only redirect if not already on a public page
      if (!publicPages.includes(currentPath)) {
        console.log('AuthGuard: Redirecting unauthenticated user to home page');
        
        // Store the current path for redirect after login
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        
        // Redirect to home page instead of login - this ensures new users see the home page
        setIsRedirecting(true);
        router.replace('/'); // Use replace instead of push
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  // Show loading spinner while checking authentication or redirecting
  if (isLoading || isRedirecting) {
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
            {isRedirecting ? 'Redirecting...' : 'Checking authentication...'}
          </Typography>
        </Box>
      </Box>
    );
  }

  // If not authenticated, show login prompt or custom fallback
  if (!isAuthenticated || !user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Only show redirecting message if we're actually on a protected page
    const currentPath = router.pathname;
    const publicPages = ['/', '/auth/login', '/auth/register', '/auth/forgot-password'];
    
    if (!publicPages.includes(currentPath)) {
      // Show a loading state while redirecting from protected page
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
              Redirecting to home page...
            </Typography>
          </Box>
        </Box>
      );
    }
    
    // For public pages, don't show loading - let the page render normally
    return null;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
};

export default AuthGuard;