import React, { useState, useEffect } from 'react';
import {
  Box,
  useTheme,
  useMediaQuery,
  Toolbar,
  Fade,
  LinearProgress,
} from '@mui/material';
import { useRouter } from 'next/router';
import Header from './Header';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import { useAdminGuard } from '../../services/useAdminGuard';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Admin authentication guard
  const { loading: authLoading, allowed, error } = useAdminGuard();

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  // Show loading state
  if (loading || authLoading) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          zIndex: 9999,
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 'bold',
              mx: 'auto',
              mb: 2,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
                '50%': {
                  transform: 'scale(1.1)',
                  opacity: 0.8,
                },
                '100%': {
                  transform: 'scale(1)',
                  opacity: 1,
                },
              },
            }}
          >
            TC
          </Box>
          <Box sx={{ fontSize: '1.5rem', fontWeight: 600, mb: 1 }}>
            TalkCart Super Admin
          </Box>
          <Box sx={{ fontSize: '1rem', opacity: 0.9 }}>
            Loading your dashboard...
          </Box>
        </Box>
        <LinearProgress
          sx={{
            width: 200,
            height: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'white',
            },
          }}
        />
      </Box>
    );
  }

  // Redirect to signin if not authenticated
  if (!allowed && !authLoading) {
    router.push('/signin');
    return null;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Header */}
      <Header onMenuClick={handleDrawerToggle} title={title} />

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { md: DRAWER_WIDTH },
          flexShrink: { md: 0 },
        }}
      >
        {/* Mobile drawer */}
        <Sidebar
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerClose}
        />
        
        {/* Desktop drawer */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Sidebar
            variant="permanent"
            open={true}
            onClose={() => {}}
          />
        </Box>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Toolbar /> {/* Spacer for fixed header */}
        
        <Fade in={!loading} timeout={500}>
          <Box
            sx={{
              p: { xs: 2, sm: 3, md: 4 },
              maxWidth: '100%',
              overflow: 'hidden',
            }}
          >
            {children}
          </Box>
        </Fade>
      </Box>

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: theme.zIndex.drawer - 1,
          }}
          onClick={handleDrawerClose}
        />
      )}
    </Box>
  );
};

export default Layout;
