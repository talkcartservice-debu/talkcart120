import React, { useState } from 'react';
import { Box, Container, useMediaQuery, useTheme } from '@mui/material';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { VideoFeedProvider } from '@/components/video';

interface AppLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disableGutters?: boolean;
  requireAuth?: boolean;
  showNavigation?: boolean;
  showSidebar?: boolean;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  maxWidth = 'lg',
  disableGutters = false,
  requireAuth = false,
  showNavigation = true,
  showSidebar = true,
  sidebarOpen: externalSidebarOpen,
  onSidebarToggle: externalOnSidebarToggle,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);  // Start with sidebar closed on all devices
  
  // Use external state if provided, otherwise use internal state
  const sidebarOpen = externalSidebarOpen !== undefined ? externalSidebarOpen : internalSidebarOpen;
  const handleSidebarToggle = externalOnSidebarToggle || (() => setInternalSidebarOpen(!internalSidebarOpen));

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    router.replace('/auth/login');
    return <LoadingSpinner fullScreen message="Redirecting to login..." />;
  }



  const handleSidebarClose = () => {
    if (externalOnSidebarToggle) {
      externalOnSidebarToggle();
    } else {
      setInternalSidebarOpen(false);
    }
  };

  // Don't show sidebar on auth pages
  // Show sidebar on mobile/tablet, and on desktop only when open
  const isAuthPage = router.pathname?.startsWith('/auth') || false;
  const shouldShowSidebar = showSidebar && showNavigation && !isAuthPage && isAuthenticated && (isMobile || isTablet || (isDesktop && sidebarOpen));
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
          open={sidebarOpen}
          onClose={handleSidebarClose}
          variant={isMobile ? 'temporary' : 'temporary'}  // Use temporary for mobile and desktop to allow toggling
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
          marginLeft: sidebarOpen ? `${sidebarWidth}px` : 0,
          marginTop: shouldShowTopBar ? '64px' : 0,
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          // Special handling for social page to allow full height scrolling
          ...(router.pathname === '/social' && {
            py: 0,
            px: 0,
            minHeight: 'calc(100vh - 64px)',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            // Adjust for mobile header on small screens
            '@media (max-width: 960px)': {
              minHeight: 'calc(100vh - 64px - 60px)',
              height: 'calc(100vh - 64px - 60px)',
            }
          })
        }}
      >
        <VideoFeedProvider>
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
        </VideoFeedProvider>
      </Box>
    </Box>
  );
};

export default AppLayout;