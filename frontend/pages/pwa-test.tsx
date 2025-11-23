import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import Layout from '@/components/layout/Layout';
import PWAInstallButton from '@/components/common/PWAInstallButton';

const PwaTestPage: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            PWA Test Page
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Test the Progressive Web App installation functionality
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <PWAInstallButton />
          </Box>
          
          <Typography variant="body1" sx={{ mb: 2 }}>
            If the button above doesn't appear, your browser may not support PWA installation 
            or the app is already installed.
          </Typography>
          
          <Typography variant="body1">
            On mobile devices, you should see an "Install App" button that allows you to 
            add this application to your home screen.
          </Typography>
        </Box>
      </Container>
    </Layout>
  );
};

export default PwaTestPage;