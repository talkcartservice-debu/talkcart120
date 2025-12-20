import React, { useState, useEffect } from 'react';
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
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  Divider,
  Alert,
  CircularProgress,
  useTheme as useMuiTheme,
  alpha,
  Stack,
  Chip,
  Avatar,
  Fade,
  Zoom,
  useMediaQuery,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Fingerprint,
  Login as LoginIcon,
  ArrowForward,
  AccountCircle,
  Lock,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { checkBiometricSupport, authenticateBiometric } from '@/lib/biometric';
import { setAuthTokens } from '@/lib/auth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import PWAInstallButton from '@/components/common/PWAInstallButton'; // Replace the hook import

// Left panel feature card removed

export default function LoginPage() {
  const router = useRouter();
  const theme = useMuiTheme();
  const { login, isLoading, isAuthenticated } = useAuth();
  // Remove the usePWAInstall hook since we're using the component

  // Respect user prefers-reduced-motion
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Prevent multiple rapid clicks
      const now = Date.now();
      const lastClick = (window as any).lastLoginRedirectClick || 0;
      if (now - lastClick < 1000) {
        // Ignore clicks within 1 second
        return;
      }
      (window as any).lastLoginRedirectClick = now;
      router.push('/social').catch((error) => {
        // Handle navigation errors gracefully
        console.error('Navigation to social failed:', error);
      });
    }
  }, [isAuthenticated, router]);

  // Initialize expired banner from query param and watch route changes
  useEffect(() => {
    // Show banner if ?expired is present and truthy
    const expiredParam = router?.query?.expired;
    const shouldShow = Boolean(expiredParam) && String(expiredParam) !== '0' && String(expiredParam).toLowerCase() !== 'false';
    setShowExpiredNotice(shouldShow);
  }, [router?.query?.expired]);

  // Check biometric availability
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const support = await checkBiometricSupport();
        setBiometricAvailable(support.isSupported && support.isPlatformAuthenticatorAvailable);
      } catch (error) {
        console.log('Biometric check failed:', error);
      }
    };
    checkBiometric();
  }, []);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError(''); // Clear error when user types
  };

  const fillTestCredentials = (email: string, password: string) => {
    setFormData({ email, password });
    setError('');
  };

  const removeExpiredFromUrl = () => {
    if (typeof window === 'undefined') return;
    const { pathname, query } = router;
    if ('expired' in (query || {})) {
      const { expired, ...rest } = query as Record<string, any>;
      router.replace({ pathname, query: { ...rest } }, undefined, { shallow: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('Attempting login with:', { email: formData.email, password: '[HIDDEN]' });
      const success = await login({ email: formData.email, password: formData.password, rememberMe });

      console.log('Login result:', success);

      if (success) {
        toast.success('Welcome back to TalkCart!');
        console.log('Login successful, redirecting...');
        // Clear expired banner and remove query param upon successful login
        setShowExpiredNotice(false);
        removeExpiredFromUrl();

        // Add a small delay to show the success message before redirect
        setTimeout(() => {
          // Prevent multiple rapid clicks
          const now = Date.now();
          const lastClick = (window as any).lastLoginSocialRedirectClick || 0;
          if (now - lastClick < 1000) {
            // Ignore clicks within 1 second
            return;
          }
          (window as any).lastLoginSocialRedirectClick = now;
          router.push('/social').catch((error) => {
            // Handle navigation errors gracefully
            console.error('Navigation to social failed:', error);
          });
        }, 1000);
        return;
      } else {
        console.log('Login failed: success was false');
        setError('Invalid email or password');
      }
    } catch (error: any) {
      console.error('Login error:', error);

      // Always use generic error message for authentication failures
      // This prevents user enumeration and provides consistent UX
      let errorMessage = 'Invalid email or password';

      // Only provide specific error messages for non-authentication issues
      if (error?.message) {
        const msg = error.message.toLowerCase();
        if (msg.includes('network') || msg.includes('timeout') || msg.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (msg.includes('server error') || msg.includes('internal server')) {
          errorMessage = 'Server error. Please try again later.';
        }
        // For all authentication-related errors, keep the generic message
      }

      console.log('Setting error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricAvailable) return;

    setBiometricLoading(true);
    setError('');

    try {
      const result = await authenticateBiometric();

      if (result.success && result.accessToken && result.refreshToken) {
        // Store tokens
        setAuthTokens(result.accessToken, result.refreshToken);

        // Update auth context
        toast.success('Biometric login successful!');

        // Redirect to social feed
        // Prevent multiple rapid clicks
        const now = Date.now();
        const lastClick = (window as any).lastBiometricLoginRedirectClick || 0;
        if (now - lastClick < 1000) {
          // Ignore clicks within 1 second
          return;
        }
        (window as any).lastBiometricLoginRedirectClick = now;
        router.push('/social').catch((error) => {
          // Handle navigation errors gracefully
          console.error('Navigation to social failed:', error);
        });
      } else {
        setError(result.error || 'Biometric authentication failed');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      setError('Biometric authentication is not available');
    } finally {
      setBiometricLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Sign In - TalkCart</title>
        <meta name="description" content="Sign in to your TalkCart account" />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          position: 'relative',
          bgcolor: 'background.default',
          backgroundImage: `
            radial-gradient(circle at 10% 90%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 40%), 
            radial-gradient(circle at 90% 10%, ${alpha(theme.palette.secondary.main, 0.15)} 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.light, 0.08)} 0%, transparent 70%)
          `,
          overflow: 'hidden',
        }}
      >
        {/* Decorative Elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -100,
            left: -100,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.3)}, ${alpha(theme.palette.primary.main, 0.1)})`,
            filter: 'blur(60px)',
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -150,
            right: -150,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.light, 0.3)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
            filter: 'blur(80px)',
            zIndex: 0,
          }}
        />

        {/* Right Side - Login Form */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2, sm: 3 },
            position: 'relative',
            zIndex: 1,
            overflow: 'auto',
            maxHeight: '100vh',
          }}
        >
          {/* Subtle animated gradient blobs behind card */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 0,
              overflow: 'hidden'
            }}
          >
            {/* md-only background elements inspired by left panel */}
            <Box
              sx={{
                display: { xs: 'none', md: 'block', lg: 'none' },
                position: 'absolute',
                top: '6%',
                left: '6%',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(4px)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              }}
            />
            <Box
              sx={{
                display: { xs: 'none', md: 'block', lg: 'none' },
                position: 'absolute',
                top: '14%',
                right: '10%',
                width: 56,
                height: 56,
                borderRadius: 2,
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(4px)',
                transform: 'rotate(8deg)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              }}
            />
            <Box
              sx={{
                display: { xs: 'none', md: 'block', lg: 'none' },
                position: 'absolute',
                top: '9%',
                right: '24%',
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: alpha(theme.palette.error.main, 0.9),
                boxShadow: '0 2px 6px rgba(211,47,47,0.25)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '15%',
                left: '10%',
                width: 220,
                height: 220,
                borderRadius: '50%',
                filter: 'blur(60px)',
                opacity: 0.35,
                background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.5)} 0%, transparent 70%)`,
                animation: prefersReducedMotion ? 'none' : 'float1 12s ease-in-out infinite',
                '@keyframes float1': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-12px)' },
                },
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: '10%',
                right: '8%',
                width: 260,
                height: 260,
                borderRadius: '50%',
                filter: 'blur(70px)',
                opacity: 0.3,
                background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.45)} 0%, transparent 70%)`,
                animation: prefersReducedMotion ? 'none' : 'float2 14s ease-in-out infinite',
                '@keyframes float2': {
                  '0%, 100%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(10px)' },
                },
              }}
            />
          </Box>
          <Fade in={true} timeout={800}>
            <Container maxWidth="sm" sx={{ transform: 'scale(0.9)', transformOrigin: 'center center' }}>
              <Card
                elevation={8}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  bgcolor: alpha(theme.palette.background.paper, 0.9),
                  backdropFilter: 'blur(20px)',
                  maxWidth: 480,
                  mx: 'auto',
                  my: 1.5,
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05)',
                  transition: 'transform 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                  },
                  position: 'relative',
                  // Subtle gradient border effect
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    padding: '1px',
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.5)}, ${alpha(theme.palette.secondary.main, 0.5)})`,
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    pointerEvents: 'none',
                  },
                }}
              >
                {/* Decorative Top Bar */}
                <Box
                  sx={{
                    height: 6,
                    width: '100%',
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                  }}
                />

                <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
                  {/* Header */}
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        mx: 'auto',
                        mb: 1.2,
                        bgcolor: 'transparent',
                        border: `2px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                        color: theme.palette.primary.main,
                        boxShadow: '0 6px 18px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <LoginIcon sx={{ fontSize: 30 }} />
                    </Avatar>
                    <Typography variant="h4" component="h1" gutterBottom fontWeight={900} sx={{ letterSpacing: -0.3 }}>
                      Sign in to TalkCart
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                      Welcome back — let’s get you to your feed
                    </Typography>
                    
                    {/* PWA Install Button - Only show on mobile devices when installable */}
                    <PWAInstallButton />
                  </Box>

                  {/* Session expired banner */}
                  {showExpiredNotice && (
                    <Zoom in={true}>
                      <Alert
                        severity="warning"
                        variant="outlined"
                        onClose={() => { setShowExpiredNotice(false); removeExpiredFromUrl(); }}
                        sx={{
                          mb: 2,
                          py: 0.5,
                          borderRadius: 1.5,
                          fontSize: '0.8rem',
                          boxShadow: '0 3px 8px rgba(237, 108, 2, 0.15)'
                        }}
                      >
                        Your session expired, please log in again.
                      </Alert>
                    </Zoom>
                  )}

                  {/* Error Alert */}
                  {error && (
                    <Zoom in={!!error}>
                      <Alert
                        severity="error"
                        variant="outlined"
                        sx={{
                          mb: 2,
                          py: 0.5,
                          borderRadius: 1.5,
                          fontSize: '0.8rem',
                          boxShadow: '0 3px 8px rgba(211, 47, 47, 0.15)'
                        }}
                      >
                        {error}
                      </Alert>
                    </Zoom>
                  )}



                  {/* Form */}
                  <form onSubmit={handleSubmit}>
                    <Stack spacing={2.5}>
                      {/* Identifier Field (Email or Username) */}
                      <TextField
                        fullWidth
                        label="Email or Username"
                        placeholder="your@email.com or username"
                        autoComplete="username"
                        helperText="You can sign in with either email or username"
                        value={formData.email}
                        onChange={handleInputChange('email')}
                        variant="outlined"
                        size="small"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AccountCircle color="primary" sx={{ fontSize: 20 }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: alpha(theme.palette.background.paper, 0.6),
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.background.paper, 0.8),
                            },
                            '&.Mui-focused': {
                              backgroundColor: alpha(theme.palette.background.paper, 1),
                              boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: '0.9rem',
                          },
                        }}
                      />

                      {/* Password Field */}
                      <TextField
                        fullWidth
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={handleInputChange('password')}
                        variant="outlined"
                        size="small"
                        error={Boolean(error)}
                        helperText={
                          error ? 'Check caps lock and try your email or username' : undefined
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock color="primary" sx={{ fontSize: 20 }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                size="small"
                                sx={{ color: theme.palette.primary.main }}
                              >
                                {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: alpha(theme.palette.background.paper, 0.6),
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.background.paper, 0.8),
                            },
                            '&.Mui-focused': {
                              backgroundColor: alpha(theme.palette.background.paper, 1),
                              boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: '0.9rem',
                          },
                        }}
                      />

                      {/* Remember Me and Forgot Password */}
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 0.5
                      }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              color="primary"
                              size="small"
                              sx={{
                                '&.Mui-checked': {
                                  color: theme.palette.primary.main
                                }
                              }}
                            />
                          }
                          label={
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                              Remember me
                            </Typography>
                          }
                        />
                        <Link href="/auth/forgot-password" style={{ textDecoration: 'none' }}>
                          <Typography
                            variant="caption"
                            color="primary"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              transition: 'all 0.2s',
                              '&:hover': {
                                color: theme.palette.primary.dark,
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            Forgot password?
                          </Typography>
                        </Link>
                      </Box>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="medium"
                        disabled={isSubmitting}
                        endIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <ArrowForward sx={{ fontSize: 18 }} />}
                        sx={{
                          mt: 1.5,
                          py: 1.2,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          letterSpacing: 0.2,
                          background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                          backgroundSize: '200% 100%',
                          boxShadow: `0 10px 24px ${alpha(theme.palette.primary.main, 0.35)}`,
                          transition: 'all 0.35s ease',
                          '&:hover': {
                            boxShadow: `0 14px 28px ${alpha(theme.palette.primary.main, 0.45)}`,
                            transform: 'translateY(-2px)',
                            backgroundPosition: '100% 0',
                          },
                        }}
                      >
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                      </Button>

                      {/* Social Sign-in */}
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mt: 1 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          size="medium"
                          onClick={async (e) => {
                            e.preventDefault();
                            try {
                              // Load Google Identity Services
                              console.log('Checking if Google Identity Services is loaded:', !!window.google);
                              // @ts-ignore
                              if (!window.google) {
                                console.log('Loading Google Identity Services script');
                                await new Promise<void>((resolve, reject) => {
                                  const s = document.createElement('script');
                                  s.src = 'https://accounts.google.com/gsi/client';
                                  s.async = true;
                                  s.defer = true;
                                  s.onload = () => {
                                    console.log('Google Identity Services script loaded successfully');
                                    resolve();
                                  };
                                  s.onerror = () => {
                                    console.error('Failed to load Google Identity Services script');
                                    reject(new Error('Failed to load Google script'));
                                  };
                                  document.head.appendChild(s);
                                });
                              } else {
                                console.log('Google Identity Services already loaded');
                              }
                              // @ts-ignore
                              console.log('Initializing Google OAuth with client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
                              window.google.accounts.id.initialize({
                                client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string,
                                callback: async (response: any) => {
                                  try {
                                    console.log('Google OAuth callback received:', response);
                                    const idToken = response?.credential;
                                    console.log('ID Token:', idToken ? `${idToken.substring(0, 20)}...` : 'NONE');
                                    if (!idToken) throw new Error('No id_token');
                                    const res = await api.auth.oauthGoogle(idToken);
                                    console.log('Backend response:', res);
                                    if (res?.success) {
                                      setAuthTokens(res.accessToken, res.refreshToken);
                                      toast.success('Signed in with Google');
                                      router.push('/social');
                                    } else {
                                      throw new Error(res?.message || 'Google sign-in failed');
                                    }
                                  } catch (err: any) {
                                    console.error('Google OAuth error:', err);
                                    toast.error(err.message || 'Google sign-in failed');
                                  }
                                },
                              });
                              // @ts-ignore
                              window.google.accounts.id.prompt();
                            } catch (err: any) {
                              toast.error(err.message || 'Google sign-in failed');
                            }
                          }}
                          startIcon={<Box sx={{ width: 18, height: 18, borderRadius: '3px', bgcolor: '#fff', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }} />}
                          sx={{
                            py: 1,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            borderColor: alpha(theme.palette.text.primary, 0.2),
                            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
                          }}
                        >
                          Continue with Google
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          size="medium"
                          onClick={async (e) => {
                            e.preventDefault();
                            try {
                              // Load Apple JS if needed
                              if (!document.getElementById('apple-signin-js')) {
                                await new Promise<void>((resolve, reject) => {
                                  const s = document.createElement('script');
                                  s.id = 'apple-signin-js';
                                  s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
                                  s.onload = () => resolve();
                                  s.onerror = () => reject(new Error('Failed to load Apple script'));
                                  document.head.appendChild(s);
                                });
                              }
                              // @ts-ignore
                              if (!window.AppleID) throw new Error('AppleID not available');
                              // @ts-ignore
                              window.AppleID.auth.init({
                                clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
                                scope: 'name email',
                                redirectURI: window.location.origin,
                                usePopup: true,
                              });
                              // @ts-ignore
                              const result = await window.AppleID.auth.signIn();
                              const identityToken = result?.authorization?.id_token;
                              if (!identityToken) throw new Error('No identityToken');
                              const res = await api.auth.oauthApple(identityToken);
                              if (res?.success) {
                                setAuthTokens(res.accessToken, res.refreshToken);
                                toast.success('Signed in with Apple');
                                router.push('/social');
                              } else {
                                throw new Error(res?.message || 'Apple sign-in failed');
                              }
                            } catch (err: any) {
                              toast.error(err.message || 'Apple sign-in failed');
                            }
                          }}
                          startIcon={<Box sx={{ width: 18, height: 18, borderRadius: '3px', bgcolor: '#000' }} />}
                          sx={{
                            py: 1,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            borderColor: alpha(theme.palette.text.primary, 0.2),
                            '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.04) },
                          }}
                        >
                          Continue with Apple
                        </Button>
                      </Stack>

                      {/* Biometric Authentication */}
                      {biometricAvailable && (
                        <>
                          <Divider sx={{ my: 2 }}>
                            <Chip
                              label="or"
                              size="small"
                              sx={{
                                px: 0.8,
                                height: 20,
                                fontSize: '0.7rem',
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                fontWeight: 600
                              }}
                            />
                          </Divider>

                          <Button
                            fullWidth
                            variant="outlined"
                            size="medium"
                            disabled={biometricLoading || isSubmitting}
                            onClick={handleBiometricLogin}
                            startIcon={biometricLoading ? <CircularProgress size={16} /> : <Fingerprint sx={{ fontSize: 18 }} />}
                            sx={{
                              py: 1,
                              borderRadius: 2,
                              textTransform: 'none',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              borderWidth: 1.5,
                              borderColor: theme.palette.success.main,
                              color: theme.palette.success.main,
                              transition: 'all 0.3s',
                              '&:hover': {
                                borderColor: theme.palette.success.dark,
                                bgcolor: alpha(theme.palette.success.main, 0.08),
                                transform: 'translateY(-2px)',
                              },
                            }}
                          >
                            {biometricLoading ? 'Authenticating...' : 'Sign in with Biometrics'}
                          </Button>
                        </>
                      )}

                      {/* Divider */}
                      <Divider sx={{ my: 2 }}>
                        <Chip
                          label="New to TalkCart?"
                          size="small"
                          sx={{
                            px: 0.8,
                            height: 20,
                            fontSize: '0.7rem',
                            backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                            color: theme.palette.secondary.main,
                            fontWeight: 600
                          }}
                        />
                      </Divider>

                      {/* Sign Up Link */}
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          Don&apos;t have an account?{' '}
                          <Link href="/auth/register" style={{ textDecoration: 'none' }}>
                            <Box
                              component="span"
                              sx={{
                                color: theme.palette.secondary.main,
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                transition: 'all 0.2s',
                                '&:hover': {
                                  color: theme.palette.secondary.dark,
                                  textDecoration: 'underline',
                                },
                              }}
                            >
                              Create account
                            </Box>
                          </Link>
                        </Typography>
                      </Box>
                    </Stack>
                  </form>
                </CardContent>
              </Card>
            </Container>
          </Fade>
        </Box>
      </Box>
    </>
  );
}