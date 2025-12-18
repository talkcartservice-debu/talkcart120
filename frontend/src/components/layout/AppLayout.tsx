import React, { useState } from 'react';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  requireAuth?: boolean;
  showNavigation?: boolean;
  showSidebar?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  maxWidth = 'lg',
  disableGutters = false,
  requireAuth = false,
  showNavigation = true,
  showSidebar = true,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    router.replace('/auth/login');
    return <LoadingSpinner fullScreen message="Redirecting to login..." />;
  }

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  // Don't show sidebar on auth pages
  const isAuthPage = router.pathname?.startsWith('/auth') || false;
  const shouldShowSidebar = showSidebar && showNavigation && !isAuthPage && isAuthenticated;
  const shouldShowTopBar = showNavigation && !isAuthPage;

  const sidebarWidth = 280;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Bar */}
      {shouldShowTopBar && (
        <TopBar
          onMenuClick={handleSidebarToggle}
          showMenuButton={showSidebar && showNavigation && !isAuthPage && isAuthenticated}
        />
      )}

      {/* Sidebar */}
      {shouldShowSidebar && (
        <Sidebar
          open={sidebarOpen && (isMobile || isTablet)}
          onClose={handleSidebarClose}
          variant={isMobile ? 'temporary' : 'persistent'}
          width={sidebarWidth}
        />
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '120vh',
          marginLeft: 0,
          marginTop: shouldShowTopBar ? '64px' : 0,
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          // Special handling for social page to allow full height scrolling
          ...(router.pathname === '/social' && {
            py: 0,
            px: 0,
            minHeight: '120vh',
          })
        }}
      >
        {router.pathname === '/social' ? (
          // For social page, render children directly without Container
          children
        ) : (
          // For other pages, use Container as before
          <Container
            maxWidth={maxWidth}
            disableGutters={disableGutters}
            sx={{
              py: showNavigation ? 3 : 0,
              px: disableGutters ? 0 : { xs: 2, sm: 3 },
              minHeight: shouldShowTopBar ? 'calc(100vh - 64px)' : '100vh',
            }}
          >
            {children}
          </Container>
        )}
      </Box>
    </Box>
  );
};

export default AppLayout;