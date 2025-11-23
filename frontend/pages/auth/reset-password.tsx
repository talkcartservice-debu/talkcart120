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
  Alert,
  CircularProgress,
  useTheme as useMuiTheme,
  alpha,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  ArrowForward,
  CheckCircle,
  Security,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const theme = useMuiTheme();
  const { token } = router.query;
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Password strength calculation
  const calculatePasswordStrength = (password: string) => {
    if (!password) return { score: 0, text: 'Enter password', color: 'error' };
    
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    score += checks.length ? 20 : 0;
    score += checks.uppercase ? 20 : 0;
    score += checks.lowercase ? 20 : 0;
    score += checks.numbers ? 20 : 0;
    score += checks.special ? 20 : 0;

    let text = 'Very Weak';
    let color = 'error';
    
    if (score >= 80) {
      text = 'Very Strong';
      color = 'success';
    } else if (score >= 60) {
      text = 'Strong';
      color = 'info';
    } else if (score >= 40) {
      text = 'Good';
      color = 'warning';
    } else if (score >= 20) {
      text = 'Weak';
      color = 'error';
    }

    return { score, text, color };
  };

  const passwordStrength = calculatePasswordStrength(formData.newPassword);

  // Validate token on load
  useEffect(() => {
    if (token) {
      // You could add token validation here
      setTokenValid(true);
    } else {
      setTokenValid(false);
    }
  }, [token]);

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Both password fields are required');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSuccess(true);
        toast.success('Password reset successfully!');
        setTimeout(() => {
          // Prevent multiple rapid clicks
          const now = Date.now();
          const lastClick = (window as any).lastResetPasswordLoginClick || 0;
          if (now - lastClick < 1000) {
            // Ignore clicks within 1 second
            return;
          }
          (window as any).lastResetPasswordLoginClick = now;
          
          router.push('/auth/login').catch((error) => {
            // Handle navigation errors gracefully
            console.error('Navigation to login failed:', error);
          });
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while checking token
  if (tokenValid === null) {
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
        <CircularProgress />
      </Box>
    );
  }

  // Invalid token
  if (!tokenValid || !token) {
    return (
      <>
        <Head>
          <title>Invalid Reset Link - TalkCart</title>
        </Head>

        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            bgcolor: 'background.default',
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
                textAlign: 'center',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Invalid Reset Link
                  </Typography>
                  <Typography variant="body2">
                    This password reset link is invalid or has expired. Please request a new one.
                  </Typography>
                </Alert>

                <Link href="/auth/forgot-password" style={{ textDecoration: 'none' }}>
                  <Button variant="contained" size="large" fullWidth>
                    Request New Reset Link
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </Container>
        </Box>
      </>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <>
        <Head>
          <title>Password Reset Successful - TalkCart</title>
        </Head>

        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            bgcolor: 'background.default',
            backgroundImage: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.success.main, 0.08)} 0%, transparent 50%)`,
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
                  Password Reset Successful
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Your password has been updated
                </Typography>
              </Box>

              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  You can now log in with your new password. Redirecting to login page...
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  endIcon={<ArrowForward />}
                  onClick={() => {
                    // Prevent multiple rapid clicks
                    const now = Date.now();
                    const lastClick = (window as any).lastResetPasswordSuccessLoginClick || 0;
                    if (now - lastClick < 1000) {
                      // Ignore clicks within 1 second
                      return;
                    }
                    (window as any).lastResetPasswordSuccessLoginClick = now;
                    
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
                  Continue to Login
                </Button>
              </CardContent>
            </Card>
          </Container>
        </Box>
      </>
    );
  }

  // Reset form
  return (
    <>
      <Head>
        <title>Reset Your Password - TalkCart</title>
        <meta name="description" content="Create a new password for your TalkCart account" />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          bgcolor: 'background.default',
          backgroundImage: `radial-gradient(circle at 30% 70%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 50%), radial-gradient(circle at 70% 30%, ${alpha(theme.palette.secondary.main, 0.08)} 0%, transparent 50%)`,
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
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    mb: 3,
                  }}
                >
                  <Security sx={{ fontSize: 40 }} />
                </Box>
                <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
                  Reset Password
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Enter your new password below
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
                  {/* New Password Field */}
                  <TextField
                    fullWidth
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={handleInputChange('newPassword')}
                    placeholder="Enter your new password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      },
                    }}
                  />

                  {/* Password Strength Indicator */}
                  {formData.newPassword && (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Password Strength
                        </Typography>
                        <Typography
                          variant="body2"
                          color={`${passwordStrength.color}.main`}
                          fontWeight={600}
                        >
                          {passwordStrength.text}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={passwordStrength.score}
                        color={passwordStrength.color as any}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: alpha(theme.palette.grey[300], 0.3),
                        }}
                      />
                    </Box>
                  )}

                  {/* Confirm Password Field */}
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    placeholder="Confirm your new password"
                    error={Boolean(formData.confirmPassword && formData.newPassword !== formData.confirmPassword)}
                    helperText={
                      formData.confirmPassword && formData.newPassword !== formData.confirmPassword
                        ? 'Passwords do not match'
                        : ''
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
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
                    endIcon={isSubmitting ? <CircularProgress size={20} /> : <ArrowForward />}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                    }}
                  >
                    {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                  </Button>

                  {/* Back to Login */}
                  <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Link href="/auth/login" style={{ textDecoration: 'none' }}>
                      <Typography
                        variant="body2"
                        color="primary"
                        sx={{
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        Back to Login
                      </Typography>
                    </Link>
                  </Box>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}