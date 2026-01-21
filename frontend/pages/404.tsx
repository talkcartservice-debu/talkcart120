import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Paper,
  useTheme
} from '@mui/material';
import { Home, ArrowBack } from '@mui/icons-material';

const Custom404: NextPage = () => {
  const theme = useTheme();

  return (
    <>
      <Head>
        <title>Page Not Found | Vetora</title>
      </Head>
      
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          <Paper 
            elevation={6} 
            sx={{ 
              p: 4, 
              borderRadius: 2,
              textAlign: 'center',
              background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="h1" 
                component="h1" 
                sx={{ 
                  fontSize: '6rem', 
                  fontWeight: 900,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2,
                }}
              >
                404
              </Typography>
              
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                Page Not Found
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<Home />}
                component={Link}
                href="/"
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: 'none',
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
                  '&:hover': {
                    boxShadow: `0 6px 16px ${theme.palette.primary.main}60`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Go to Homepage
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                startIcon={<ArrowBack />}
                onClick={() => window.history.back()}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: 'none',
                  borderColor: theme.palette.divider,
                  '&:hover': {
                    borderColor: theme.palette.text.primary,
                  },
                }}
              >
                Go Back
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default Custom404;