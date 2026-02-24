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

  // Cleanup Google Sign-In state on unmount
  useEffect(() => {
    return () => {
      // Reset Google Sign-In state when component unmounts
      (window as any).lastGoogleSignInClick = 0;
    };
  }, []);

  // Initialize Google Sign-In button
  useEffect(() => {
    let isMounted = true;
    
    const initializeGoogleSignIn = async (retries = 2) => {
      try {
        // Load Google Identity Services
        console.log('Checking if Google Identity Services is loaded:', !!(window as any).google);
        if (!(window as any).google) {
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
            s.onerror = (err) => {
              console.error('Failed to load Google Identity Services script:', err);
              reject(new Error('NETWORK_ERROR'));
            };
            document.head.appendChild(s);
          });
        }

        // Only proceed if component is still mounted
        if (!isMounted) return;

        console.log('Initializing Google OAuth with client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

        // Initialize Google Sign-In
        (window as any).google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string,
          callback: async (response: any) => {
            try {
              console.log('Google OAuth callback received:', response);
              const idToken = response?.credential;
              console.log('ID Token:', idToken ? `${idToken.substring(0, 20)}...` : 'NONE');
              if (!idToken) throw new Error('No id_token');
              
              // Prevent multiple rapid clicks
              const now = Date.now();
              const lastClick = (window as any).lastGoogleSignInClick || 0;
              if (now - lastClick < 1000) {
                // Ignore clicks within 1 second
                return;
              }
              (window as any).lastGoogleSignInClick = now;
              
              const res = await api.auth.oauthGoogle(idToken);
              console.log('Backend response:', res);
              if (res?.success) {
                setAuthTokens(res.accessToken, res.refreshToken);
                toast.success('Signed in with Google');
                router.push('/social');
              } else {
                // Handle specific error cases with detailed messages
                let errorMessage = res?.message || 'Google sign-in failed';
                
                // Handle audience mismatch specifically
                if (res?.message?.includes('audience mismatch') || res?.debug?.receivedAud) {
                  console.error('Audience mismatch details:', res.debug);
                  errorMessage = 'Google authentication configuration issue. Please contact support.';
                } else if (res?.status === 400) {
                  errorMessage = res?.message || 'Invalid Google token. Please try again.';
                } else if (res?.status === 401) {
                  errorMessage = res?.message || 'Authentication failed. Please try again.';
                } else if (res?.status === 504) {
                  errorMessage = 'Google verification service timeout. Please check your connection and try again.';
                } else if (res?.status >= 500) {
                  errorMessage = 'Server error during Google authentication. Please try again later.';
                } else if (res?.error === 'NETWORK_ERROR') {
                  errorMessage = 'Network error. Please check your connection and try again.';
                } else if (res?.error === 'TIMEOUT') {
                  errorMessage = 'Request timeout. Please check your connection and try again.';
                }
                
                throw new Error(errorMessage);
              }
            } catch (err: any) {
              console.error('Google OAuth error:', err);
              toast.error(err.message || 'Google sign-in failed');
            }
          },
        });

        // Render the Google Sign-In button
        // Use requestAnimationFrame to defer rendering and reduce INP
        requestAnimationFrame(() => {
          if (!isMounted) return;
          
          const googleButtonContainer = document.getElementById('google-signin-button');
          if (googleButtonContainer) {
            (window as any).google.accounts.id.renderButton(
              googleButtonContainer,
              { 
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: googleButtonContainer.offsetWidth || 200
              }
            );
          } else {
            console.warn('Google Sign-In button container not found');
          }
        });
      } catch (err: any) {
        if (err.message === 'NETWORK_ERROR' && retries > 0) {
          console.log(`Retrying Google script load... (${retries} retries left)`);
          // Wait 2 seconds before retrying
          await new Promise(r => setTimeout(r, 2000));
          return initializeGoogleSignIn(retries - 1);
        }
        
        console.error('Google sign-in initialization error:', err);
        // Only show toast if it's a terminal error and not just a silent fail
        if (err.message === 'NETWORK_ERROR') {
          toast.error('Network error loading Google Sign-In. Please check your connection or ad-blocker.');
        } else {
          toast.error(err.message || 'Failed to initialize Google Sign-In');
        }
      }
    };

    // Initialize Google Sign-In when component mounts
    if (typeof window !== 'undefined') {
      // Add a small delay to reduce INP impact
      const timer = setTimeout(() => {
        if (isMounted) {
          initializeGoogleSignIn();
        }
      }, 50);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
    
    // Add explicit return for TypeScript
    return () => {
      isMounted = false;
    };
  }, [router]);

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
        toast.success('Welcome back to Vetora!');
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
        <title>Sign In - Vetora</title>
        <meta name="description" content="Sign in to your Vetora account" />
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
          <Container maxWidth="sm" sx={{ transform: 'scale(0.95)', transformOrigin: 'center center' }}>
            {/* Expired Session Notice */}
            <Fade in={showExpiredNotice}>
              <Box sx={{ mb: 2 }}>
                <Alert
                  severity="info"
                  variant="filled"
                  onClose={() => setShowExpiredNotice(false)}
                  sx={{
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    '& .MuiAlert-message': { fontWeight: 500 }
                  }}
                >
                  Your session has expired. Please sign in again to continue.
                </Alert>
              </Box>
            </Fade>

            <Card
              elevation={10}
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                bgcolor: alpha(theme.palette.background.paper, 0.85),
                backdropFilter: 'blur(20px)',
                maxWidth: 460,
                mx: 'auto',
                boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }
              }}
            >
              <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <Zoom in={true} style={{ transitionDelay: '100ms' }}>
                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        mx: 'auto',
                        mb: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      }}
                    >
                      <LoginIcon sx={{ fontSize: 32 }} />
                    </Avatar>
                  </Zoom>
                  <Typography variant="h4" component="h1" gutterBottom fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
                    Welcome back
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sign in to your account to continue
                  </Typography>
                </Box>

                {/* Error Alert */}
                {error && (
                  <Fade in={!!error}>
                    <Alert
                      severity="error"
                      sx={{
                        mb: 3,
                        borderRadius: 2,
                        '& .MuiAlert-message': { width: '100%' }
                      }}
                    >
                      {error}
                    </Alert>
                  </Fade>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                  <Stack spacing={2.5}>
                    <TextField
                      fullWidth
                      label="Email or Username"
                      variant="outlined"
                      autoComplete="username"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AccountCircle color="action" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                    />

                    <TextField
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      variant="outlined"
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleInputChange('password')}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="action" fontSize="small" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              size="small"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                        }
                        label={<Typography variant="body2">Remember me</Typography>}
                      />
                      <Link href="/auth/forgot-password" style={{ textDecoration: 'none' }}>
                        <Typography variant="body2" color="primary" fontWeight={600} sx={{ '&:hover': { textDecoration: 'underline' } }}>
                          Forgot password?
                        </Typography>
                      </Link>
                    </Box>

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={isSubmitting}
                      endIcon={!isSubmitting && <ArrowForward />}
                      sx={{
                        py: 1.5,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 700,
                        boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                        }
                      }}
                    >
                      {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                    </Button>
                  </Stack>
                </form>

                {/* Biometric Login */}
                {biometricAvailable && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={handleBiometricLogin}
                      disabled={biometricLoading}
                      startIcon={!biometricLoading && <Fingerprint />}
                      sx={{
                        py: 1.5,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderWidth: 2,
                        '&:hover': { borderWidth: 2 }
                      }}
                    >
                      {biometricLoading ? <CircularProgress size={24} /> : 'Sign in with Biometrics'}
                    </Button>
                  </Box>
                )}

                {/* Divider */}
                <Divider sx={{ my: 4 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                    OR
                  </Typography>
                </Divider>

                {/* Social Logins */}
                <Stack spacing={2}>
                  <Box id="google-signin-button" sx={{ minHeight: 40, width: '100%', display: 'flex', justifyContent: 'center' }} />
                  
                  {/* PWA Install Button removed from here, replaced by PWAInstallButton in footer or header if needed */}
                </Stack>

                {/* Footer Links */}
                <Box sx={{ mt: 5, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/register" style={{ textDecoration: 'none' }}>
                      <Typography component="span" variant="body2" color="primary" fontWeight={700} sx={{ '&:hover': { textDecoration: 'underline' } }}>
                        Create an account
                      </Typography>
                    </Link>
                  </Typography>
                </Box>
                
                {/* PWA Install Button integrated here */}
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <PWAInstallButton />
                </Box>
              </CardContent>
            </Card>
          </Container>
        </Box>
      </Box>
    </>
  );
}
