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
  LinearProgress,
  useMediaQuery,
  Avatar,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Badge,
  ArrowForward,
  CheckCircle,
  PersonAddAlt1,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail, isValidPassword, isValidUsername } from '@/utils/validation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { debounce } from 'lodash';

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => {
  const theme = useMuiTheme();
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: alpha('#ffffff', 0.1),
        border: `1px solid ${alpha('#ffffff', 0.2)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          bgcolor: alpha('#ffffff', 0.15),
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box
        sx={{
          p: 1,
          borderRadius: 1.5,
          bgcolor: alpha('#ffffff', 0.2),
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
};

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const getPasswordStrength = () => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthLabel = () => {
    const strength = getPasswordStrength();
    if (strength <= 1) return 'Very Weak';
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Fair';
    if (strength <= 4) return 'Good';
    return 'Strong';
  };

  const getPasswordStrengthColor = () => {
    const strength = getPasswordStrength();
    if (strength <= 1) return 'error';
    if (strength <= 2) return 'warning';
    if (strength <= 3) return 'info';
    if (strength <= 4) return 'primary';
    return 'success';
  };

  if (!password) return null;

  const strength = getPasswordStrength();
  const progress = (strength / 5) * 100;
  const color = getPasswordStrengthColor();

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          color={color}
          sx={{ flex: 1, height: 6, borderRadius: 3 }}
        />
        <Typography variant="caption" color={`${color}.main`}>
          {getPasswordStrengthLabel()}
        </Typography>
      </Box>
    </Box>
  );
};

export default function RegisterPage() {
  const router = useRouter();
  const theme = useMuiTheme();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { register, isLoading, isAuthenticated, setAuthTokens } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    displayName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Prevent multiple rapid clicks
      const now = Date.now();
      const lastClick = (window as any).lastRegisterRedirectClick || 0;
      if (now - lastClick < 1000) {
        // Ignore clicks within 1 second
        return;
      }
      (window as any).lastRegisterRedirectClick = now;
      router.push('/social-new').catch((error) => {
        // Handle navigation errors gracefully
        console.error('Navigation to social failed:', error);
      });
    }
  }, [isAuthenticated, router]);
  
  // Check username availability with debounce
  const checkUsernameAvailability = debounce(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    try {
      setIsCheckingUsername(true);
      const response = await api.users.checkUsernameAvailability(username);
      setUsernameAvailable(response.available);
      
      if (!response.available) {
        setValidationErrors(prev => ({
          ...prev,
          username: [response.message || 'Username is already taken']
        }));
      } else {
        // Clear username validation errors if it's available
        if (validationErrors.username) {
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.username;
            return newErrors;
          });
        }
      }
    } catch (error) {
      console.error('Error checking username availability:', error);
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  }, 500);
  
  // Check username when it changes
  useEffect(() => {
    if (formData.username && formData.username.length >= 3) {
      checkUsernameAvailability(formData.username);
    } else {
      setUsernameAvailable(null);
    }
    
    return () => {
      checkUsernameAvailability.cancel();
    };
  }, [formData.username, checkUsernameAvailability]);

  const validateForm = () => {
    const errors: Record<string, string[]> = {};

    // Email validation
    if (!isValidEmail(formData.email)) {
      errors.email = ['Please enter a valid email address'];
    }

    // Username validation - match backend requirements
    if (!formData.username.trim()) {
      errors.username = ['Username is required'];
    } else if (formData.username.length < 3) {
      errors.username = ['Username must be at least 3 characters'];
    } else if (formData.username.length > 30) {
      errors.username = ['Username cannot exceed 30 characters'];
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = ['Username can only contain letters, numbers, and underscores'];
    } else if (usernameAvailable === false) {
      errors.username = ['This username is already taken. Please choose another one.'];
    }

    // Password validation - match backend requirements
    if (!formData.password) {
      errors.password = ['Password is required'];
    } else if (formData.password.length < 6) {
      errors.password = ['Password must be at least 6 characters'];
    } else {
      // Additional frontend password strength checks
      const passwordValidation = isValidPassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors;
      }
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = ['Passwords do not match'];
    }

    // Display name validation
    if (!formData.displayName.trim()) {
      errors.displayName = ['Display name is required'];
    } else if (formData.displayName.length > 50) {
      errors.displayName = ['Display name cannot exceed 50 characters'];
    }

    // Terms agreement
    if (!agreeToTerms) {
      errors.terms = ['You must agree to the terms and conditions'];
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError(''); // Clear general error
    
    // Clear validation errors for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Check username availability one more time before submitting
    if (usernameAvailable === false) {
      setValidationErrors(prev => ({
        ...prev,
        username: ['This username is already taken. Please choose another one.']
      }));
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const success = await register({
        email: formData.email,
        password: formData.password,
        username: formData.username,
        displayName: formData.displayName,
      });
      
      if (success) {
        toast.success('Welcome to TalkCart! Your account has been created.');
        // Redirect to social feed
        // Prevent multiple rapid clicks
        const now = Date.now();
        const lastClick = (window as any).lastRegisterSocialRedirectClick || 0;
        if (now - lastClick < 1000) {
          // Ignore clicks within 1 second
          return;
        }
        (window as any).lastRegisterSocialRedirectClick = now;
        router.push('/social-new').catch((error) => {
          // Handle navigation errors gracefully
          console.error('Navigation to social failed:', error);
        });
        return;
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Try to extract a more specific error message
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.message) {
        // If the error has a message property, use it
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        // If the error is a string, use it directly
        errorMessage = error;
      }
      
      // Check for browser extension interference
      if (errorMessage.toLowerCase().includes('browser extension') || 
          errorMessage.toLowerCase().includes('invalid request format')) {
        setError('Browser extension interference detected. Please try one of these solutions:\n\n' +
                '• Use an incognito/private browser window\n' +
                '• Temporarily disable password managers (LastPass, 1Password, etc.)\n' +
                '• Disable form-filling browser extensions\n' +
                '• Try a different browser');
      }
      // Check for common registration issues
      else if (errorMessage.toLowerCase().includes('username') && errorMessage.toLowerCase().includes('exists')) {
        setValidationErrors(prev => ({
          ...prev,
          username: ['This username is already taken. Please choose another one.']
        }));
        setUsernameAvailable(false);
      } else if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('exists')) {
        setValidationErrors(prev => ({
          ...prev,
          email: ['This email is already registered. Please use another email or try logging in.']
        }));
      } else {
        // Set the general error message
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
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
        <title>Create Account - TalkCart</title>
        <meta name="description" content="Create your TalkCart account" />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          position: 'relative',
          backgroundImage: `
            radial-gradient(circle at 10% 90%, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 40%), 
            radial-gradient(circle at 90% 10%, ${alpha(theme.palette.secondary.main, 0.15)} 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.light, 0.08)} 0%, transparent 70%)
          `,
          overflow: 'hidden',
        }}
      >
        {/* Background gradient blobs */}
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

        {/* Left removed: align with Login page simplified layout */}

        {/* Right Side - Registration Form */}
        <Box
          sx={{
            flex: '0 1 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2, sm: 3 },
            position: 'relative',
            zIndex: 1,
          }}
>          {/* Subtle animated gradient blobs behind card */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 0,
              overflow: 'hidden'
            }}
          >
            {/* md-only background elements inspired by login */}
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
                    <PersonAddAlt1 sx={{ fontSize: 30 }} />
                  </Avatar>
                  <Typography variant="h4" component="h1" gutterBottom fontWeight={900} sx={{ letterSpacing: -0.3 }}>
                    Create your TalkCart account
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                    Welcome — let’s get you started
                  </Typography>
                </Box>

                {/* Error Alert */}
                {error && (
                  <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                    <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
                      {error}
                    </Typography>
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
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      error={!!validationErrors.email}
                      helperText={validationErrors.email?.[0]}
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

                    {/* Username Field */}
                    <TextField
                      fullWidth
                      label="Username"
                      autoComplete="username"
                      value={formData.username}
                      onChange={handleInputChange('username')}
                      error={!!validationErrors.username}
                      helperText={
                        validationErrors.username?.[0] || 
                        (isCheckingUsername ? 'Checking username availability...' : 
                         usernameAvailable === true ? 'Username is available!' : 
                         usernameAvailable === false ? 'Username is already taken' : 
                         'This will be your unique identifier')
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Person color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            {isCheckingUsername && <CircularProgress size={20} />}
                            {!isCheckingUsername && usernameAvailable === true && (
                              <CheckCircle color="success" />
                            )}
                            {!isCheckingUsername && usernameAvailable === false && (
                              <span style={{ color: theme.palette.error.main }}>✗</span>
                            )}
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />

                    {/* Display Name Field */}
                    <TextField
                      fullWidth
                      label="Display Name"
                      value={formData.displayName}
                      onChange={handleInputChange('displayName')}
                      error={!!validationErrors.displayName}
                      helperText={validationErrors.displayName?.[0] || 'This is how others will see your name'}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Badge color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />

                    {/* Password Field */}
                    <Box>
                      <TextField
                        fullWidth
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleInputChange('password')}
                        error={!!validationErrors.password}
                        helperText={validationErrors.password?.[0]}
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
                      <PasswordStrengthIndicator password={formData.password} />
                    </Box>

                    {/* Confirm Password Field */}
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange('confirmPassword')}
                      error={!!validationErrors.confirmPassword}
                      helperText={validationErrors.confirmPassword?.[0]}
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

                    {/* Terms and Conditions */}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={agreeToTerms}
                          onChange={(e) => setAgreeToTerms(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          I agree to the{' '}
                          <Link href="/terms" style={{ color: theme.palette.primary.main, textDecoration: 'none' }}>
                            <Typography component="span" color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                              Terms of Service
                            </Typography>
                          </Link>
                          {' '}and{' '}
                          <Link href="/privacy" style={{ color: theme.palette.primary.main, textDecoration: 'none' }}>
                            <Typography component="span" color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                              Privacy Policy
                            </Typography>
                          </Link>
                        </Typography>
                      }
                      sx={{
                        alignItems: 'flex-start',
                        '& .MuiFormControlLabel-label': {
                          pt: 0.5,
                        },
                      }}
                    />
                    {validationErrors.terms && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {validationErrors.terms[0]}
                      </Alert>
                    )}

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
                      {isSubmitting ? 'Signing up...' : 'Sign Up'}
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
                            // @ts-ignore
                            if (!window.google) {
                              await new Promise<void>((resolve, reject) => {
                                const s = document.createElement('script');
                                s.src = 'https://accounts.google.com/gsi/client';
                                s.async = true;
                                s.defer = true;
                                s.onload = () => resolve();
                                s.onerror = () => reject(new Error('Failed to load Google script'));
                                document.head.appendChild(s);
                              });
                            }
                            // @ts-ignore
                            window.google.accounts.id.initialize({
                              client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID as string,
                              callback: async (response: any) => {
                                try {
                                  const idToken = response?.credential;
                                  if (!idToken) throw new Error('No id_token');
                                  const res = await api.auth.oauthGoogle(idToken);
                                  if (res?.success) {
                                    setAuthTokens(res.accessToken, res.refreshToken);
                                    toast.success('Signed in with Google');
                                    router.push('/social-new');
                                  } else {
                                    throw new Error(res?.message || 'Google sign-in failed');
                                  }
                                } catch (err: any) {
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
                              router.push('/social-new');
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

                    {/* Divider */}
                    <Divider sx={{ my: 2 }}>
                      <Chip 
                        label="Already have an account?" 
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

                    {/* Sign In caption link */}
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Already have an account?{' '}
                        <Link href="/auth/login" style={{ textDecoration: 'none' }}>
                          <Typography
                            component="span"
                            variant="caption"
                            color="secondary"
                            fontWeight={700}
                            sx={{
                              fontSize: '0.8rem',
                              transition: 'all 0.2s',
                              '&:hover': {
                                color: theme.palette.secondary.dark,
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            Sign in
                          </Typography>
                        </Link>
                      </Typography>
                    </Box>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          </Container>
        </Box>
      </Box>
    </>
  );
}