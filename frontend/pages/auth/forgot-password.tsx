import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  InputAdornment,
  Alert,
  CircularProgress,
  useTheme as useMuiTheme,
  alpha,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  Email,
  ArrowForward,
  ArrowLeft,
  CheckCircle,
  Security,
  SendRounded,
} from '@mui/icons-material';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const theme = useMuiTheme();
  
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Call the backend API to send reset email
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        setError(data.message || 'Failed to send reset email. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <>
        <Head>
          <title>Check Your Email - Vetora</title>
        </Head>

        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            bgcolor: 'background.default',
            backgroundImage: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.success.main, 0.08)} 0%, transparent 50%)`,
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
            }}
          >
            <Container maxWidth="sm">
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(20px)',
                  maxWidth: 500,
                  mx: 'auto',
                }}
              >
                {/* Success Header */}
                <Box
                  sx={{
                    background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
                    color: 'white',
                    p: 4,
                    textAlign: 'center',
                    borderRadius: '12px 12px 0 0',
                  }}
                >
                  <CheckCircle sx={{ fontSize: 64, mb: 2 }} />
                  <Typography variant="h4" fontWeight={700} gutterBottom>
                    Check Your Email
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Password reset link sent successfully
                  </Typography>
                </Box>

                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={3}>
                    <Typography variant="body1" color="text.secondary" textAlign="center">
                      We&apos;ve sent a password reset link to{' '}
                      <Typography component="span" fontWeight={600} color="primary">
                        {email}
                      </Typography>
                    </Typography>

                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      <Typography variant="body2">
                        <strong>Next steps:</strong>
                        <br />
                        1. Check your email inbox
                        <br />
                        2. Click the reset link (valid for 24 hours)
                        <br />
                        3. Create your new password
                      </Typography>
                    </Alert>

                    <Alert severity="warning" icon={<Security />} sx={{ borderRadius: 2 }}>
                      <Typography variant="body2">
                        Don&apos;t see the email? Check your spam folder or{' '}
                        <Typography
                          component="span"
                          color="primary"
                          fontWeight={600}
                          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          onClick={() => setIsSubmitted(false)}
                        >
                          try again
                        </Typography>
                      </Typography>
                    </Alert>

                    {/* Action Buttons */}
                    <Stack spacing={2}>
                      <Button
                        variant="outlined"
                        fullWidth
                        size="large"
                        startIcon={<ArrowLeft />}
                        onClick={() => setIsSubmitted(false)}
                        sx={{
                          py: 1.5,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: '1rem',
                        }}
                      >
                        Send Another Email
                      </Button>

                      <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        endIcon={<ArrowForward />}
                        onClick={() => {
                          // Prevent multiple rapid clicks
                          const now = Date.now();
                          const lastClick = (window as any).lastForgotPasswordLoginClick || 0;
                          if (now - lastClick < 1000) {
                            // Ignore clicks within 1 second
                            return;
                          }
                          (window as any).lastForgotPasswordLoginClick = now;
                          
                          router.push('/auth/login').catch((error) => {
                            // Handle navigation errors gracefully
                            console.error('Navigation to login failed:', error);
                          });
                        }}
                        sx={{
                          py: 1.5,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        Back to Login
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Container>
          </Box>
        </Box>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Reset Password - Vetora</title>
        <meta name="description" content="Reset your Vetora password" />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          bgcolor: 'background.default',
          backgroundImage: `radial-gradient(circle at 30% 70%, ${alpha(theme.palette.warning.main, 0.08)} 0%, transparent 50%), radial-gradient(circle at 70% 30%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 50%)`,
        }}
      >
        {/* Left Side - Reset Form */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
          }}
        >
          <Container maxWidth="sm">
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(20px)',
                maxWidth: 500,
                mx: 'auto',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.warning.main, 0.1),
                      color: theme.palette.warning.main,
                      mb: 3,
                    }}
                  >
                    <Security sx={{ fontSize: 40 }} />
                  </Box>
                  <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
                    Reset Password
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Enter your email to receive a password reset link
                  </Typography>
                </Box>

                {/* Error Alert */}
                {error && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    {/* Email Field */}
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      placeholder="Enter your email address"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={isSubmitting}
                      endIcon={isSubmitting ? <CircularProgress size={20} /> : <SendRounded />}
                      sx={{
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                        '&:hover': {
                          background: `linear-gradient(135deg, ${theme.palette.warning.dark} 0%, ${alpha(theme.palette.warning.dark, 0.9)} 100%)`,
                        },
                      }}
                    >
                      {isSubmitting ? 'Sending Reset Link...' : 'Send Reset Link'}
                    </Button>

                    {/* Divider */}
                    <Divider sx={{ my: 2 }}>
                      <Chip label="Remember your password?" size="small" />
                    </Divider>

                    {/* Navigation Links */}
                    <Stack spacing={2}>
                      <Link href="/auth/login" style={{ textDecoration: 'none' }}>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<ArrowLeft />}
                          sx={{
                            py: 1.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontSize: '1rem',
                          }}
                        >
                          Back to Login
                        </Button>
                      </Link>

                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Don&apos;t have an account?{' '}
                          <Link href="/auth/register" style={{ textDecoration: 'none' }}>
                            <Typography
                              component="span"
                              color="primary"
                              fontWeight={600}
                              sx={{
                                '&:hover': {
                                  textDecoration: 'underline',
                                },
                              }}
                            >
                              Sign up here
                            </Typography>
                          </Link>
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          </Container>
        </Box>

        {/* Right Side - Security Information */}
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            p: 4,
            background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.error.main} 100%)`,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 500, mx: 'auto' }}>
            <Typography variant="h2" component="h2" gutterBottom fontWeight={800}>
              Security First
            </Typography>
            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, lineHeight: 1.6 }}>
              We take your account security seriously. Here&apos;s how we protect you.
            </Typography>

            <Stack spacing={3}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha('#ffffff', 0.1),
                  border: `1px solid ${alpha('#ffffff', 0.2)}`,
                }}
              >
                <CheckCircle sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Secure Reset Links
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Password reset links expire after 24 hours and can only be used once
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha('#ffffff', 0.1),
                  border: `1px solid ${alpha('#ffffff', 0.2)}`,
                }}
              >
                <Security sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Email Verification
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Reset links are only sent to verified email addresses on your account
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha('#ffffff', 0.1),
                  border: `1px solid ${alpha('#ffffff', 0.2)}`,
                }}
              >
                <Email sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Instant Notifications
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    You&apos;ll be notified immediately of any password reset attempts
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>
    </>
  );
}