import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import Layout from '@/components/layout/Layout';
import TrendingProducts from '@/components/social/new/TrendingProducts';
import WhoToFollow from '@/components/social/new/WhoToFollow';

const TestLayoutPage: React.FC = () => {
  const theme = useTheme();

  return (
    <Layout>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Left sidebar - Trending Products */}
        <Box sx={{ 
          width: 320,
          flexShrink: 0,
          borderRight: `1px solid ${theme.palette.divider}`,
          p: 2,
          display: { xs: 'none', lg: 'block' }
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Left Sidebar (Trending Products)
          </Typography>
          <TrendingProducts />
        </Box>

        {/* Main content area */}
        <Box sx={{ 
          flex: 1, 
          p: 3,
          backgroundColor: theme.palette.background.default
        }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Main Content Area
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This is the main content area where posts would be displayed.
          </Typography>
        </Box>

        {/* Right sidebar - Who to Follow */}
        <Box sx={{ 
          width: 320,
          flexShrink: 0,
          borderLeft: `1px solid ${theme.palette.divider}`,
          p: 2,
          display: { xs: 'none', lg: 'block' }
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Right Sidebar (Who to Follow)
          </Typography>
          <WhoToFollow />
        </Box>
      </Box>
    </Layout>
  );
};

export default TestLayoutPage;