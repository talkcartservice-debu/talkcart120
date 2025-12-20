import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, ProfileUser } from '@/types';
import { useCustomTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SettingsExportImport } from '@/components/common/SettingsExportImport';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { InteractionSettings } from '@/components/settings/InteractionSettings';
import LogoutConfirmDialog from '@/components/auth/LogoutConfirmDialog';
import {
  Container,
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  Tabs,
  Tab,
  TextField,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  CircularProgress,
  Paper,
  useTheme as useMuiTheme,
  useMediaQuery,
  Snackbar,
  Tooltip,
  Badge,
  Skeleton,
  LinearProgress,
} from '@mui/material';
import {
  User as UserIcon,
  Shield,
  Bell,
  Palette,
  Globe,
  Wallet,
  Key,
  Eye,
  EyeOff,
  Edit,
  Save,
  Camera,
  Trash2,
  ExternalLink,
  LogOut,
  Lock,
  Mail,
  Smartphone,
  Moon,
  Sun,
  AlertTriangle,
  X,
  Check,
  Copy,
  RefreshCw,
  Download,
  Upload,
  Settings,
  HelpCircle,
  Languages,
  Accessibility,
} from 'lucide-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { syncSettings } from '@/services/settingsSync';

export default function SettingsPage() {
  const { user, isLoading, isAuthenticated, logout, updateProfile } = useAuth();
  const { profile, loading: profileLoading, updateProfile: updateProfileContext } = useProfile();
  const router = useRouter();
  const { themeMode, actualTheme, fontSize, reducedMotion, highContrast, setThemeMode, setFontSize, setReducedMotion, setHighContrast } = useCustomTheme();
  const { language, setLanguage, t } = useLanguage();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  // State hooks
  const [activeTab, setActiveTab] = useState(0);
  const [editingProfile, setEditingProfile] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [dataExportProgress, setDataExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    username: '',
    email: '',
    bio: '',
    location: '',
    website: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    social: true,
    marketplace: false,
    dao: true,
    mentions: true,
    follows: true,
    likes: true,
    comments: true,
  });

  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showWallet: false,
    showActivity: true,
    allowTagging: true,
    showOnlineStatus: true,
    profileVisibility: 'public',
    activityVisibility: 'followers',
  });

  const [themeSettings, setThemeSettings] = useState({
    theme: themeMode,
    reducedMotion: reducedMotion,
    highContrast: highContrast,
    fontSize: fontSize,
    language: language,
  });

  const [walletSettings, setWalletSettings] = useState({
    showBalance: true,
    autoConnect: true,
    defaultNetwork: 'ethereum',
    gasPreference: 'standard',
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    loginNotifications: true,
    sessionTimeout: 30, // minutes
    recentDevices: [],
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Prevent multiple rapid redirects
      const now = Date.now();
      const lastRedirect = (window as any).lastSettingsRedirectClick || 0;
      if (now - lastRedirect < 1000) {
        // Ignore redirects within 1 second
        return;
      }
      (window as any).lastSettingsRedirectClick = now;
      
      router.replace('/auth/login').catch((error) => {
        // Handle navigation errors gracefully
        console.error('Navigation to login failed:', error);
      });
    }
  }, [isLoading, isAuthenticated, router]);

  // Sync contexts with settings state
  useEffect(() => {
    setThemeSettings(prev => ({
      ...prev,
      theme: themeMode,
      fontSize: fontSize,
      language: language,
      reducedMotion: reducedMotion,
      highContrast: highContrast,
    }));
  }, [themeMode, fontSize, language, reducedMotion, highContrast]);

  // Load settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      if (isAuthenticated && user) {
        try {
          const response: any = await api.auth.getSettings();
          const settings = response.data || {};

          if (settings.notifications) {
            setNotifications(prev => ({ ...prev, ...settings.notifications }));
          }
          if (settings.privacy) {
            setPrivacy(prev => ({ ...prev, ...settings.privacy }));
          }
          if (settings.theme) {
            setThemeSettings(prev => ({ ...prev, ...settings.theme }));
          }
          if (settings.wallet) {
            setWalletSettings(prev => ({ ...prev, ...settings.wallet }));
          }
          if (settings.security) {
            setSecuritySettings(prev => ({ ...prev, ...settings.security }));
          }
        } catch (error: any) {
          // Only log meaningful errors, not connection failures during development
          if (error?.code !== 'ECONNREFUSED' && error?.response?.status !== 404) {
            console.warn('Failed to load settings:', error?.message || error);
          }
          // Don't show error toast for settings load failure during development
        }
      }
    };

    loadSettings();
  }, [isAuthenticated, user]);

  // Function to update form data when user profile changes
  const updateFormFromUser = useCallback((updatedUser: User) => {
    if (updatedUser) {
      setProfileForm({
        displayName: updatedUser.displayName || '',
        username: updatedUser.username || '',
        email: updatedUser.email || '',
        bio: updatedUser.bio || '',
        location: updatedUser.location || '',
        website: updatedUser.website || '',
      });

      // Initialize notification settings from user data if available
      if ((updatedUser as any).settings?.notifications) {
        setNotifications(prev => ({
          ...prev,
          ...((updatedUser as any).settings?.notifications || {}),
        }));
      }

      // Initialize privacy settings
      if ((updatedUser as any).settings?.privacy) {
        setPrivacy(prev => ({
          ...prev,
          ...((updatedUser as any).settings?.privacy || {}),
        }));
      }
    }
  }, []);

  // Initialize form with user data
  useEffect(() => {
    // Use profile from ProfileContext if available, otherwise fallback to user from AuthContext
    const currentUser = profile || user;
    if (currentUser) {
      updateFormFromUser(currentUser);
    }
  }, [profile, user, updateFormFromUser]);

  // Listen for user profile updates
  useEffect(() => {
    const handleUserUpdate = (event: CustomEvent<{ user: User }>) => {
      if (event.detail && event.detail.user) {
        updateFormFromUser(event.detail.user);
      }
    };

    // Add event listener for profile updates
    window.addEventListener('user-profile-updated', handleUserUpdate as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('user-profile-updated', handleUserUpdate as EventListener);
    };
  }, [updateFormFromUser]);

  // Initialize form with user data (continued)
  useEffect(() => {
    if (user) {
      // Initialize theme settings
      if ((user as any).settings?.theme) {
        setThemeSettings(prev => ({
          ...prev,
          ...((user as any).settings.theme || {}),
        }));
      }

      // Initialize wallet settings
      if ((user as any).settings?.wallet) {
        setWalletSettings(prev => ({
          ...prev,
          ...((user as any).settings.wallet || {}),
        }));
      }

      // Initialize security settings
      if ((user as any).settings?.security) {
        setSecuritySettings(prev => ({
          ...prev,
          ...((user as any).settings.security || {}),
        }));
      }
    }
  }, [user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number | string) => {
    // Ensure newValue is always a number to avoid hydration mismatches
    const tabValue = typeof newValue === 'string' ? parseInt(newValue, 10) : newValue;
    // Ensure the tab value is valid and within range
    const validTabValue = isNaN(tabValue) ? 0 : Math.max(0, Math.min(6, tabValue));
    setActiveTab(validTabValue);
  };

  const handleProfileFormChange = (field: string, value: string) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePasswordFormChange = (field: string, value: string) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTogglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleNotificationChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setNotifications(prev => ({
      ...prev,
      [setting]: event.target.checked,
    }));
  };

  const handlePrivacyChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrivacy(prev => ({
      ...prev,
      [setting]: event.target.checked,
    }));
  };

  const handleThemeChange = (themeValue: string) => {
    const newThemeMode = themeValue as 'light' | 'dark' | 'system';
    setThemeMode(newThemeMode);
    setThemeSettings(prev => ({
      ...prev,
      theme: newThemeMode,
    }));
  };

  const handleFontSizeChange = (size: string) => {
    const newFontSize = size as 'small' | 'medium' | 'large';
    setFontSize(newFontSize);
    setThemeSettings(prev => ({
      ...prev,
      fontSize: newFontSize,
    }));
  };

  const handleLanguageChange = (lang: string) => {
    const newLanguage = lang as 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja' | 'ko' | 'ar';
    setLanguage(newLanguage);
    setThemeSettings(prev => ({
      ...prev,
      language: newLanguage,
    }));
    
    // Also sync to backend
    syncSettings.language({ ...themeSettings, language: newLanguage }, { retryOnFailure: true });
  };

  const handleWalletSettingChange = (setting: string, value: any) => {
    setWalletSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true);

      // Validate form
      if (!profileForm.displayName.trim()) {
        toast.error('Display name is required');
        setIsUpdating(false);
        return;
      }

      if (!profileForm.username.trim()) {
        toast.error('Username is required');
        setIsUpdating(false);
        return;
      }

      // Validate username format (letters, numbers, underscores only)
      const usernameRegex = /^[a-z0-9_]+$/;
      if (!usernameRegex.test(profileForm.username)) {
        toast.error('Username can only contain lowercase letters, numbers, and underscores');
        setIsUpdating(false);
        return;
      }

      // Create profile update data
      const profileData = {
        displayName: profileForm.displayName,
        username: profileForm.username,
        bio: profileForm.bio,
        location: profileForm.location,
        website: profileForm.website,
      };

      // Update profile through ProfileContext which will sync with AuthContext
      const success = await updateProfileContext(profileData);

      if (success) {
        toast.success('Profile updated successfully');
        setEditingProfile(false);
      } else {
        toast.error('Failed to update profile on the server');
      }
    } catch (error) {
      handleApiError(error, 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePassword = async () => {
    try {
      setIsUpdating(true);

      // Validate password form
      if (!passwordForm.currentPassword) {
        toast.error('Current password is required');
        setIsUpdating(false);
        return;
      }

      if (!passwordForm.newPassword) {
        toast.error('New password is required');
        setIsUpdating(false);
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('Passwords do not match');
        setIsUpdating(false);
        return;
      }

      if (passwordForm.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters');
        setIsUpdating(false);
        return;
      }

      // Password strength validation (optional but recommended)
      const hasUppercase = /[A-Z]/.test(passwordForm.newPassword);
      const hasLowercase = /[a-z]/.test(passwordForm.newPassword);
      const hasNumber = /\d/.test(passwordForm.newPassword);
      const hasSpecialChar = /[@$!%*?&]/.test(passwordForm.newPassword);

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
        // Show warning but allow password change
        toast('For better security, consider using uppercase, lowercase, numbers, and special characters');
      }

      try {
        // Call the API to update the password
        await api.auth.changePassword(passwordForm.currentPassword, passwordForm.newPassword);

        toast.success('Password updated successfully');
        setShowPasswordDialog(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } catch (apiError) {
        handleApiError(apiError, 'Failed to update password');
      }
    } catch (error) {
      handleApiError(error, 'Failed to update password');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveSettings = async (settingType: string) => {
    try {
      setIsUpdating(true);

      // Prepare settings data based on the type
      let settingsData = {};

      switch (settingType) {
        case 'Notification':
          settingsData = notifications;
          break;
        case 'Privacy':
          settingsData = privacy;
          break;
        case 'Appearance':
          settingsData = themeSettings;
          break;
        case 'Wallet':
          settingsData = walletSettings;
          break;
        case 'Security':
          settingsData = securitySettings;
          break;
        default:
          settingsData = {};
      }

      try {
        // Call the API to update the settings
        const response: any = await api.auth.updateSettings(settingType, settingsData);
        
        // Update local state with the server response
        if (response.data) {
          switch (settingType) {
            case 'Notification':
              setNotifications(response.data.notifications || settingsData);
              break;
            case 'Privacy':
              setPrivacy(response.data.privacy || settingsData);
              break;
            case 'Appearance':
              setThemeSettings(response.data.theme || settingsData);
              break;
            case 'Wallet':
              setWalletSettings(response.data.wallet || settingsData);
              break;
            case 'Security':
              setSecuritySettings(response.data.security || settingsData);
              break;
          }
        }

        toast.success(`${settingType} settings saved successfully`);
      } catch (apiError) {
        handleApiError(apiError, `Failed to save ${settingType} settings`);
      }
    } catch (error) {
      handleApiError(error, `Failed to save ${settingType} settings`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsUpdating(true);

      // Validate password
      if (!deletePassword.trim()) {
        toast.error('Password is required to delete account');
        setIsUpdating(false);
        return;
      }

      try {
        // Call the API to delete the account
        await api.auth.deleteAccount(deletePassword);

        setShowDeleteConfirm(false);
        setDeletePassword('');
        toast.success('Account deleted successfully');

        // Log the user out and redirect to login page
        logout();
        router.replace('/auth/login');
      } catch (apiError) {
        handleApiError(apiError, 'Failed to delete account');
      }
    } catch (error) {
      handleApiError(error, 'Failed to delete account');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout(); // Don't show toast, we'll handle it here
      setShowLogoutConfirm(false);
      toast.success('Logged out successfully');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      setDataExportProgress(0);

      try {
        // Call the API to export the data
        const response: any = await api.auth.exportData();

        // Create and trigger download
        const exportData = (response as any).data?.data || (response as any).data;
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `talkcart-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('Data exported successfully');
        setShowExportDialog(false);
        setIsExporting(false);
      } catch (apiError) {
        handleApiError(apiError, 'Failed to export data');
        setIsExporting(false);
      }
    } catch (error) {
      handleApiError(error, 'Failed to export data');
      setIsExporting(false);
    }
  };

  const handleAvatarUploadSuccess = async (avatarUrl: string) => {
    try {
      // Update profile with new avatar through ProfileContext
      const success = await updateProfileContext({ avatar: avatarUrl });

      if (success) {
        toast.success('Profile picture updated successfully');
      } else {
        toast.error('Failed to update profile picture on the server');
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      handleApiError(error, 'Failed to update profile picture');
    }
  };

  // Handle API errors gracefully
  const handleApiError = (error: any, defaultMessage: string) => {
    console.error(`API Error: ${defaultMessage}`, error);
    let errorMessage = defaultMessage;

    if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    toast.error(errorMessage);
    return false;
  };

  // Early returns for loading and authentication
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null; // Will be redirected by useEffect
  }

  return (
    <>
      <Head>
        <title>Account Settings | TalkCart</title>
        <meta name="description" content="Manage your TalkCart account settings and preferences." />
      </Head>

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Box mb={4}>
          <Typography 
            variant="h4" 
            component="h1" 
            fontWeight={700} 
            gutterBottom
            sx={{
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' }
            }}
          >
            Account Settings
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Manage your profile, privacy, and application preferences
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 2, md: 3 } }}>
          {/* Settings Navigation */}
          <Box sx={{ width: { xs: '100%', md: 240 } }}>
            <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
              <Tabs
                orientation={isMobile ? "horizontal" : "vertical"}
                value={activeTab}
                onChange={handleTabChange}
                variant={isMobile ? "scrollable" : "standard"}
                scrollButtons={isMobile ? "auto" : undefined}
                allowScrollButtonsMobile
                sx={{
                  borderRight: isMobile ? 0 : 1,
                  borderBottom: isMobile ? 1 : 0,
                  borderColor: 'divider',
                  '& .MuiTab-root': {
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    py: { xs: 1.5, sm: 2 },
                    minHeight: { xs: 48, sm: 56 },
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    px: { xs: 1, sm: 2 },
                  },
                }}
              >
                <Tab
                  value={0}
                  icon={<UserIcon size={18} />}
                  label="Profile"
                  iconPosition="start"
                />
                <Tab
                  value={1}
                  icon={<Lock size={18} />}
                  label="Security"
                  iconPosition="start"
                />
                <Tab
                  value={2}
                  icon={<Bell size={18} />}
                  label="Interactions"
                  iconPosition="start"
                />
                <Tab
                  value={3}
                  icon={<Eye size={18} />}
                  label="Privacy"
                  iconPosition="start"
                />
                <Tab
                  value={4}
                  icon={<Palette size={18} />}
                  label="Appearance"
                  iconPosition="start"
                />
                <Tab
                  value={5}
                  icon={<Wallet size={18} />}
                  label="Wallet"
                  iconPosition="start"
                />
                <Tab
                  value={6}
                  icon={<Download size={18} />}
                  label="Data"
                  iconPosition="start"
                />
              </Tabs>
            </Paper>

            <Box sx={{ mt: { xs: 2, md: 3 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row', md: 'column' }, gap: 2 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Trash2 size={18} />}
                onClick={() => setShowDeleteConfirm(true)}
                fullWidth
                size={isMobile ? "small" : "medium"}
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              >
                Delete Account
              </Button>

              <Button
                variant="outlined"
                startIcon={<LogOut size={18} />}
                onClick={handleLogoutClick}
                fullWidth
                size={isMobile ? "small" : "medium"}
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              >
                Logout
              </Button>
            </Box>
          </Box>

          {/* Settings Content */}
          <Box sx={{ flex: 1 }}>
            <Paper elevation={0} variant="outlined" sx={{ borderRadius: 2, p: 3 }}>
              {/* Profile Tab */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Profile Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Update your personal information and how others see you on the platform.
                  </Typography>

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, md: 3 } }}>
                    {/* Profile Picture */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: { xs: 2, md: 3 },
                      flexDirection: { xs: 'column', sm: 'row' },
                      textAlign: { xs: 'center', sm: 'left' }
                    }}>
                      <ProfilePictureUpload
                        user={user ? {
                          ...user,
                          displayName: user.displayName || '',
                          isVerified: user.isVerified || false,
                          cover: undefined
                        } as any : null}
                        onUploadSuccess={handleAvatarUploadSuccess}
                        size={isMobile ? 80 : 100}
                        showUploadButton={true}
                        allowRemove={true}
                      />

                      <Box sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <Typography 
                          variant="subtitle1" 
                          fontWeight={600}
                          sx={{ 
                            fontSize: { xs: '1.1rem', sm: '1.25rem' },
                            wordBreak: 'break-word'
                          }}
                        >
                          {user?.displayName || 'User'}
                          {user?.isVerified && (
                            <Chip
                              label="Verified"
                              size="small"
                              color="success"
                              sx={{ 
                                ml: { xs: 0, sm: 1 },
                                mt: { xs: 1, sm: 0 },
                                display: { xs: 'block', sm: 'inline-flex' },
                                fontSize: { xs: '0.65rem', sm: '0.75rem' }
                              }}
                              icon={<Shield size={12} />}
                            />
                          )}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ 
                            mt: 0.5,
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                          }}
                        >
                          @{user?.username || 'username'}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            display: 'block', 
                            mt: { xs: 1, sm: 1 },
                            fontSize: { xs: '0.7rem', sm: '0.75rem' }
                          }}
                        >
                          Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Profile Form */}
                    <TextField
                      label="Display Name"
                      value={profileForm.displayName}
                      onChange={(e) => handleProfileFormChange('displayName', e.target.value)}
                      fullWidth
                      required
                      disabled={!editingProfile}
                      helperText="Your name as displayed to other users"
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        '& .MuiInputBase-root': {
                          fontSize: { xs: '0.9rem', sm: '1rem' }
                        },
                        '& .MuiFormLabel-root': {
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        },
                        '& .MuiFormHelperText-root': {
                          fontSize: { xs: '0.75rem', sm: '0.75rem' }
                        }
                      }}
                    />
                    
                    <TextField
                      label="Username"
                      value={profileForm.username}
                      onChange={(e) => handleProfileFormChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      fullWidth
                      required
                      disabled={!editingProfile}
                      helperText="Your unique username (letters, numbers, and underscores only)"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">@</InputAdornment>,
                      }}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        '& .MuiInputBase-root': {
                          fontSize: { xs: '0.9rem', sm: '1rem' }
                        },
                        '& .MuiFormLabel-root': {
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        },
                        '& .MuiFormHelperText-root': {
                          fontSize: { xs: '0.75rem', sm: '0.75rem' }
                        }
                      }}
                    />
                    <TextField
                      label="Email"
                      value={profileForm.email}
                      onChange={(e) => handleProfileFormChange('email', e.target.value)}
                      fullWidth
                      disabled
                      helperText="Contact support to change your email address"
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        '& .MuiInputBase-root': {
                          fontSize: { xs: '0.9rem', sm: '1rem' }
                        },
                        '& .MuiFormLabel-root': {
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        },
                        '& .MuiFormHelperText-root': {
                          fontSize: { xs: '0.75rem', sm: '0.75rem' }
                        }
                      }}
                    />
                    
                    <TextField
                      label="Bio"
                      value={profileForm.bio}
                      onChange={(e) => handleProfileFormChange('bio', e.target.value)}
                      fullWidth
                      multiline
                      rows={3}
                      disabled={!editingProfile}
                      helperText={`${profileForm.bio.length}/500 characters`}
                      inputProps={{ maxLength: 500 }}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        '& .MuiInputBase-root': {
                          fontSize: { xs: '0.9rem', sm: '1rem' }
                        },
                        '& .MuiFormLabel-root': {
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        },
                        '& .MuiFormHelperText-root': {
                          fontSize: { xs: '0.75rem', sm: '0.75rem' }
                        }
                      }}
                    />
                    
                    <TextField
                      label="Location"
                      value={profileForm.location}
                      onChange={(e) => handleProfileFormChange('location', e.target.value)}
                      fullWidth
                      disabled={!editingProfile}
                      helperText="Where are you based? (optional)"
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        '& .MuiInputBase-root': {
                          fontSize: { xs: '0.9rem', sm: '1rem' }
                        },
                        '& .MuiFormLabel-root': {
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        },
                        '& .MuiFormHelperText-root': {
                          fontSize: { xs: '0.75rem', sm: '0.75rem' }
                        }
                      }}
                    />
                    
                    <TextField
                      label="Website"
                      value={profileForm.website}
                      onChange={(e) => handleProfileFormChange('website', e.target.value)}
                      fullWidth
                      disabled={!editingProfile}
                      helperText="Your personal or business website (optional)"
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        '& .MuiInputBase-root': {
                          fontSize: { xs: '0.9rem', sm: '1rem' }
                        },
                        '& .MuiFormLabel-root': {
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        },
                        '& .MuiFormHelperText-root': {
                          fontSize: { xs: '0.75rem', sm: '0.75rem' }
                        }
                      }}
                    />

                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: { xs: 'center', sm: 'flex-end' }, 
                      mt: { xs: 2, sm: 2 }, 
                      gap: { xs: 1, sm: 2 },
                      flexDirection: { xs: 'column', sm: 'row' }
                    }}>
                      {editingProfile ? (
                        <>
                          <Button
                            variant="outlined"
                            onClick={() => setEditingProfile(false)}
                            disabled={isUpdating}
                            size={isMobile ? "small" : "medium"}
                            fullWidth={isMobile}
                            sx={{
                              order: { xs: 2, sm: 1 },
                              fontSize: { xs: '0.875rem', sm: '1rem' }
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            onClick={handleSaveProfile}
                            disabled={isUpdating}
                            startIcon={isUpdating ? <CircularProgress size={16} /> : <Save size={16} />}
                            size={isMobile ? "small" : "medium"}
                            fullWidth={isMobile}
                            sx={{
                              order: { xs: 1, sm: 2 },
                              fontSize: { xs: '0.875rem', sm: '1rem' }
                            }}
                          >
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="contained"
                          startIcon={<Edit size={16} />}
                          onClick={() => setEditingProfile(true)}
                          size={isMobile ? "small" : "medium"}
                          fullWidth={isMobile}
                          sx={{
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                          }}
                        >
                          Edit Profile
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Security Tab */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Security Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Manage your password and account security settings.
                  </Typography>

                  <Divider sx={{ my: 3 }} />

                  <List>
                    <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                      <ListItemIcon>
                        <Lock size={24} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Password"
                        secondary={`Last changed: ${(user as any)?.passwordLastChanged ? new Date((user as any).passwordLastChanged).toLocaleDateString() : 'Never'}`}
                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                      />
                      <Button
                        variant="outlined"
                        onClick={() => setShowPasswordDialog(true)}
                        size={isMobile ? "small" : "medium"}
                        sx={{
                          minWidth: { xs: 80, sm: 'auto' },
                          px: { xs: 1, sm: 2 },
                          alignSelf: { xs: 'flex-end', sm: 'auto' }
                        }}
                      >
                        Change
                      </Button>
                    </ListItem>

                    <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                      <ListItemIcon>
                        <Shield size={24} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Two-Factor Authentication"
                        secondary={securitySettings.twoFactorEnabled ? "Enabled - Using Authenticator App" : "Disabled - Add an extra layer of security to your account"}
                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                      />
                      <Button
                        variant="outlined"
                        color={securitySettings.twoFactorEnabled ? "error" : "primary"}
                        onClick={() => setSecuritySettings(prev => ({
                          ...prev,
                          twoFactorEnabled: !prev.twoFactorEnabled
                        }))}
                        size={isMobile ? "small" : "medium"}
                        sx={{
                          minWidth: { xs: 80, sm: 'auto' },
                          px: { xs: 1, sm: 2 },
                          alignSelf: { xs: 'flex-end', sm: 'auto' }
                        }}
                      >
                        {securitySettings.twoFactorEnabled ? "Disable" : "Enable"}
                      </Button>
                    </ListItem>

                    <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                      <ListItemIcon>
                        <Smartphone size={24} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Connected Devices"
                        secondary="Manage devices that are logged into your account"
                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                      />
                      <Button
                        variant="outlined"
                        size={isMobile ? "small" : "medium"}
                        sx={{
                          minWidth: { xs: 80, sm: 'auto' },
                          px: { xs: 1, sm: 2 },
                          alignSelf: { xs: 'flex-end', sm: 'auto' }
                        }}
                      >
                        Manage
                      </Button>
                    </ListItem>

                    <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                      <ListItemIcon>
                        <Bell size={24} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Login Notifications"
                        secondary="Get notified when someone logs into your account"
                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                      />
                      <Switch
                        checked={securitySettings.loginNotifications}
                        onChange={() => setSecuritySettings(prev => ({
                          ...prev,
                          loginNotifications: !prev.loginNotifications
                        }))}
                        sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
                      />
                    </ListItem>

                    <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                      <ListItemIcon>
                        <RefreshCw size={24} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Session Timeout"
                        secondary="Automatically log out after period of inactivity"
                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
                        <TextField
                          select
                          value={securitySettings.sessionTimeout}
                          onChange={(e) => setSecuritySettings(prev => ({
                            ...prev,
                            sessionTimeout: Number(e.target.value)
                          }))}
                          size="small"
                          sx={{ width: 120 }}
                          SelectProps={{
                            native: true,
                          }}
                        >
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={120}>2 hours</option>
                          <option value={240}>4 hours</option>
                          <option value={720}>12 hours</option>
                          <option value={1440}>24 hours</option>
                        </TextField>
                      </Box>
                    </ListItem>
                  </List>

                  <Alert severity="info" sx={{ mt: 3 }}>
                    <Typography variant="body2">
                      Keep your account secure by using a strong password and enabling two-factor authentication.
                    </Typography>
                  </Alert>

                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: { xs: 'center', sm: 'flex-end' }, 
                    mt: { xs: 2, sm: 3 },
                    width: '100%'
                  }}>
                    <Button
                      variant="contained"
                      onClick={() => handleSaveSettings('Security')}
                      disabled={isUpdating}
                      startIcon={isUpdating ? <CircularProgress size={16} /> : <Save size={16} />}
                      size={isMobile ? "small" : "medium"}
                      fullWidth={isMobile}
                      sx={{
                        maxWidth: { xs: '100%', sm: 300 },
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      {isUpdating ? 'Saving...' : 'Save Security Settings'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Interaction Settings Tab */}
              {activeTab === 2 && (
                <InteractionSettings />
              )}

              {/* Privacy Tab */}
              {activeTab === 3 && (
                <PrivacySettings />
              )}

              {/* Appearance Tab */}
              {activeTab === 4 && (
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Appearance Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Customize how TalkCart looks and feels.
                  </Typography>


                  <SettingsExportImport />



                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {t('settings.theme')}
                  </Typography>

                  <Box sx={{ 
                    display: 'flex', 
                    gap: { xs: 1, sm: 2 }, 
                    mb: 4,
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    justifyContent: { xs: 'center', sm: 'flex-start' }
                  }}>
                    <Paper
                      elevation={0}
                      variant="outlined"
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: 2,
                        textAlign: 'center',
                        cursor: 'pointer',
                        borderColor: themeSettings.theme === 'light' ? 'primary.main' : 'divider',
                        borderWidth: themeSettings.theme === 'light' ? 2 : 1,
                        width: { xs: '30%', sm: 'auto' },
                        minWidth: { xs: 80, sm: 'auto' },
                        flex: { xs: '1 1 auto', sm: '0 0 auto' }
                      }}
                      onClick={() => handleThemeChange('light')}
                    >
                      <Sun size={isMobile ? 24 : 32} color={actualTheme === 'dark' ? '#fff' : '#000'} />
                      <Typography variant="body2" sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Light
                      </Typography>
                    </Paper>

                    <Paper
                      elevation={0}
                      variant="outlined"
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: 2,
                        textAlign: 'center',
                        cursor: 'pointer',
                        borderColor: themeSettings.theme === 'dark' ? 'primary.main' : 'divider',
                        borderWidth: themeSettings.theme === 'dark' ? 2 : 1,
                        width: { xs: '30%', sm: 'auto' },
                        minWidth: { xs: 80, sm: 'auto' },
                        flex: { xs: '1 1 auto', sm: '0 0 auto' }
                      }}
                      onClick={() => handleThemeChange('dark')}
                    >
                      <Moon size={isMobile ? 24 : 32} color={actualTheme === 'dark' ? '#fff' : '#000'} />
                      <Typography variant="body2" sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Dark
                      </Typography>
                    </Paper>

                    <Paper
                      elevation={0}
                      variant="outlined"
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: 2,
                        textAlign: 'center',
                        cursor: 'pointer',
                        borderColor: themeSettings.theme === 'system' ? 'primary.main' : 'divider',
                        borderWidth: themeSettings.theme === 'system' ? 2 : 1,
                        width: { xs: '30%', sm: 'auto' },
                        minWidth: { xs: 80, sm: 'auto' },
                        flex: { xs: '1 1 auto', sm: '0 0 auto' }
                      }}
                      onClick={() => handleThemeChange('system')}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Sun size={isMobile ? 24 : 32} color={actualTheme === 'dark' ? '#fff' : '#000'} style={{ marginRight: -8 }} />
                        <Moon size={isMobile ? 24 : 32} color={actualTheme === 'dark' ? '#fff' : '#000'} />
                      </Box>
                      <Typography variant="body2" sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        System
                      </Typography>
                    </Paper>
                  </Box>

                  <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 4, mb: 2 }}>
                    {t('settings.fontSize')}
                  </Typography>

                  <Box sx={{ 
                    display: 'flex', 
                    gap: { xs: 1, sm: 2 }, 
                    mb: 4,
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                  }}>
                    <Button
                      variant={themeSettings.fontSize === 'small' ? 'contained' : 'outlined'}
                      onClick={() => handleFontSizeChange('small')}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        minWidth: { xs: 70, sm: 'auto' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        flex: { xs: '1 1 auto', sm: '0 0 auto' }
                      }}
                    >
                      Small
                    </Button>
                    <Button
                      variant={themeSettings.fontSize === 'medium' ? 'contained' : 'outlined'}
                      onClick={() => handleFontSizeChange('medium')}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        minWidth: { xs: 70, sm: 'auto' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        flex: { xs: '1 1 auto', sm: '0 0 auto' }
                      }}
                    >
                      Medium
                    </Button>
                    <Button
                      variant={themeSettings.fontSize === 'large' ? 'contained' : 'outlined'}
                      onClick={() => handleFontSizeChange('large')}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        minWidth: { xs: 70, sm: 'auto' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        flex: { xs: '1 1 auto', sm: '0 0 auto' }
                      }}
                    >
                      Large
                    </Button>
                  </Box>

                  <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 4, mb: 2 }}>
                    {t('settings.language')}
                  </Typography>

                  <Box sx={{ 
                    display: 'flex', 
                    gap: { xs: 1, sm: 2 }, 
                    mb: 4, 
                    flexWrap: 'wrap',
                    justifyContent: { xs: 'center', sm: 'flex-start' }
                  }}>
                    <Button
                      variant={themeSettings.language === 'en' ? 'contained' : 'outlined'}
                      onClick={() => handleLanguageChange('en')}
                      startIcon={<Languages size={16} />}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        minWidth: { xs: 80, sm: 'auto' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        flex: { xs: '1 1 auto', sm: '0 0 auto' }
                      }}
                    >
                      English
                    </Button>
                    <Button
                      variant={themeSettings.language === 'es' ? 'contained' : 'outlined'}
                      onClick={() => handleLanguageChange('es')}
                      startIcon={<Languages size={16} />}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        minWidth: { xs: 80, sm: 'auto' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        flex: { xs: '1 1 auto', sm: '0 0 auto' }
                      }}
                    >
                      Español
                    </Button>
                    <Button
                      variant={themeSettings.language === 'fr' ? 'contained' : 'outlined'}
                      onClick={() => handleLanguageChange('fr')}
                      startIcon={<Languages size={16} />}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        minWidth: { xs: 80, sm: 'auto' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        flex: { xs: '1 1 auto', sm: '0 0 auto' }
                      }}
                    >
                      Français
                    </Button>
                    <Button
                      variant={themeSettings.language === 'de' ? 'contained' : 'outlined'}
                      onClick={() => handleLanguageChange('de')}
                      startIcon={<Languages size={16} />}
                      size={isMobile ? "small" : "medium"}
                      sx={{
                        minWidth: { xs: 80, sm: 'auto' },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        flex: { xs: '1 1 auto', sm: '0 0 auto' }
                      }}
                    >
                      Deutsch
                    </Button>
                  </Box>

                  <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 4, mb: 2 }}>
                    Accessibility
                  </Typography>

                  <List>
                    <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                      <ListItemIcon>
                        <Accessibility size={24} />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('settings.reducedMotion')}
                        secondary={t('settings.reducedMotion.description')}
                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                      />
                      <Switch
                        checked={themeSettings.reducedMotion}
                        onChange={(e) => {
                          const newValue = e.target.checked;
                          setReducedMotion(newValue);
                          setThemeSettings(prev => ({ ...prev, reducedMotion: newValue }));
                        }}
                        sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
                      />
                    </ListItem>

                    <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                      <ListItemIcon>
                        <Eye size={24} />
                      </ListItemIcon>
                      <ListItemText
                        primary={t('settings.highContrast')}
                        secondary={t('settings.highContrast.description')}
                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                      />
                      <Switch
                        checked={themeSettings.highContrast}
                        onChange={(e) => {
                          const newValue = e.target.checked;
                          setHighContrast(newValue);
                          setThemeSettings(prev => ({ ...prev, highContrast: newValue }));
                        }}
                        sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
                      />
                    </ListItem>
                  </List>

                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: { xs: 'center', sm: 'flex-end' }, 
                    mt: { xs: 2, sm: 3 },
                    width: '100%'
                  }}>
                    <Button
                      variant="contained"
                      onClick={() => handleSaveSettings('Appearance')}
                      disabled={isUpdating}
                      startIcon={isUpdating ? <CircularProgress size={16} /> : <Save size={16} />}
                      size={isMobile ? "small" : "medium"}
                      fullWidth={isMobile}
                      sx={{
                        maxWidth: { xs: '100%', sm: 300 }
                      }}
                    >
                      {isUpdating ? 'Saving...' : 'Save Appearance Settings'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Wallet Tab */}
              {activeTab === 5 && (
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Wallet Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Manage your connected wallets and blockchain preferences.
                  </Typography>

                  <Divider sx={{ my: 3 }} />

                  <Box mb={3}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Connected Wallet
                    </Typography>
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 0 }, textAlign: { xs: 'center', sm: 'left' } }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                              MetaMask
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                              0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4
                              <IconButton size="small" onClick={() => {
                                navigator.clipboard.writeText('0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4');
                                toast.success('Wallet address copied to clipboard');
                              }}>
                                <Copy size={14} />
                              </IconButton>
                            </Typography>
                          </Box>
                          <Chip label="Connected" color="success" size="small" sx={{ alignSelf: { xs: 'center', sm: 'auto' } }} />
                        </Box>
                      </CardContent>
                    </Card>

                    <Box 
                      display="flex" 
                      gap={{ xs: 1, sm: 2 }}
                      sx={{
                        flexDirection: { xs: 'column', sm: 'row' },
                        width: { xs: '100%', sm: 'auto' }
                      }}
                    >
                      <Button 
                        variant="outlined" 
                        startIcon={<ExternalLink size={16} />}
                        size={isMobile ? "small" : "medium"}
                        fullWidth={isMobile}
                        sx={{
                          justifyContent: { xs: 'center', sm: 'flex-start' },
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        View on Etherscan
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="error" 
                        startIcon={<Trash2 size={16} />}
                        size={isMobile ? "small" : "medium"}
                        fullWidth={isMobile}
                        sx={{
                          justifyContent: { xs: 'center', sm: 'flex-start' },
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        Disconnect Wallet
                      </Button>
                    </Box>
                  </Box>

                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Wallet Preferences
                  </Typography>

                  <List>
                    <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                      <ListItemText
                        primary="Show Wallet Balance"
                        secondary="Display your wallet balance on your profile"
                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                      />
                      <Switch
                        checked={walletSettings.showBalance}
                        onChange={() => handleWalletSettingChange('showBalance', !walletSettings.showBalance)}
                        sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
                      />
                    </ListItem>

                    <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                      <ListItemText
                        primary="Auto-Connect"
                        secondary="Automatically connect wallet on login"
                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                      />
                      <Switch
                        checked={walletSettings.autoConnect}
                        onChange={() => handleWalletSettingChange('autoConnect', !walletSettings.autoConnect)}
                        sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
                      />
                    </ListItem>

                    <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                      <ListItemText
                        primary="Default Network"
                        secondary="Choose your preferred blockchain network"
                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                      />
                      <Box sx={{ minWidth: 120, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
                        <TextField
                          select
                          value={walletSettings.defaultNetwork}
                          onChange={(e) => handleWalletSettingChange('defaultNetwork', e.target.value)}
                          size="small"
                          SelectProps={{
                            native: true,
                          }}
                        >
                          <option value="ethereum">Ethereum</option>
                          <option value="polygon">Polygon</option>
                          <option value="solana">Solana</option>
                          <option value="binance">Binance Smart Chain</option>
                        </TextField>
                      </Box>
                    </ListItem>

                    <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                      <ListItemText
                        primary="Gas Preference"
                        secondary="Set your default gas price preference"
                        sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
                      />
                      <Box sx={{ minWidth: 120, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
                        <TextField
                          select
                          value={walletSettings.gasPreference}
                          onChange={(e) => handleWalletSettingChange('gasPreference', e.target.value)}
                          size="small"
                          SelectProps={{
                            native: true,
                          }}
                        >
                          <option value="low">Low (Slower)</option>
                          <option value="standard">Standard</option>
                          <option value="fast">Fast</option>
                          <option value="rapid">Rapid (Expensive)</option>
                        </TextField>
                      </Box>
                    </ListItem>
                  </List>

                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: { xs: 'center', sm: 'flex-end' }, 
                    mt: { xs: 2, sm: 3 },
                    width: '100%'
                  }}>
                    <Button
                      variant="contained"
                      onClick={() => handleSaveSettings('Wallet')}
                      disabled={isUpdating}
                      startIcon={isUpdating ? <CircularProgress size={16} /> : <Save size={16} />}
                      size={isMobile ? "small" : "medium"}
                      fullWidth={isMobile}
                      sx={{
                        maxWidth: { xs: '100%', sm: 300 },
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      {isUpdating ? 'Saving...' : 'Save Wallet Settings'}
                    </Button>
                  </Box>
                </Box>
              )}



              {/* Data Tab */}
              {activeTab === 6 && (
                <Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Data & Privacy
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Manage your data and download your information.
                  </Typography>

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ mb: 4 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Your Data
                    </Typography>
                    <Typography variant="body2" paragraph>
                      You can download a copy of your data or delete your account permanently.
                    </Typography>

                    <Box 
                      sx={{ 
                        display: 'flex', 
                        gap: { xs: 1, sm: 2 }, 
                        mt: 2,
                        flexDirection: { xs: 'column', sm: 'row' }
                      }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<Download size={16} />}
                        onClick={() => setShowExportDialog(true)}
                        size={isMobile ? "small" : "medium"}
                        fullWidth={isMobile}
                        sx={{
                          justifyContent: { xs: 'center', sm: 'flex-start' },
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        Export Data
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Trash2 size={16} />}
                        onClick={() => setShowDeleteConfirm(true)}
                        size={isMobile ? "small" : "medium"}
                        fullWidth={isMobile}
                        sx={{
                          justifyContent: { xs: 'center', sm: 'flex-start' },
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        Delete Account
                      </Button>
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Privacy Policy
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Read our privacy policy to understand how we handle your data.
                    </Typography>

                    <Button
                      variant="text"
                      startIcon={<ExternalLink size={16} />}
                      component="a"
                      href="/privacy-policy"
                      target="_blank"
                      sx={{
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      View Privacy Policy
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      </Container>

      {/* Password Change Dialog */}
      <Dialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        disableEnforceFocus  // Prevents focus trapping issues
        hideBackdrop={false}  // Ensure backdrop is properly handled
        PaperProps={{
          sx: { 
            height: isMobile ? '100vh' : 'auto', 
            maxHeight: isMobile ? '100vh' : '90vh',
            margin: isMobile ? 0 : undefined,
            borderRadius: isMobile ? 0 : undefined
          }
        }}
      >
        <DialogTitle 
          sx={{
            pb: isMobile ? 1 : 2,
            pt: isMobile ? 1 : 2,
            fontSize: { xs: '1.25rem', sm: '1.5rem' }
          }}
        >
          Change Password
          <IconButton
            aria-label="close"
            onClick={() => setShowPasswordDialog(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <X size={isMobile ? 16 : 18} />
          </IconButton>
        </DialogTitle>
        <DialogContent 
          dividers
          sx={{
            px: isMobile ? 1.5 : 3,
            py: isMobile ? 1 : 2
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 3 }, py: { xs: 0.5, sm: 1 } }}>
            <TextField
              label="Current Password"
              type={showPassword.current ? 'text' : 'password'}
              value={passwordForm.currentPassword}
              onChange={(e) => handlePasswordFormChange('currentPassword', e.target.value)}
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => handleTogglePasswordVisibility('current')}
                      edge="end"
                      size={isMobile ? "small" : "medium"}
                    >
                      {showPassword.current ? <EyeOff size={isMobile ? 16 : 18} /> : <Eye size={isMobile ? 16 : 18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.9rem', sm: '1rem' }
                },
                '& .MuiFormLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                },
                '& .MuiFormHelperText-root': {
                  fontSize: { xs: '0.75rem', sm: '0.75rem' }
                }
              }}
            />

            <TextField
              label="New Password"
              type={showPassword.new ? 'text' : 'password'}
              value={passwordForm.newPassword}
              onChange={(e) => handlePasswordFormChange('newPassword', e.target.value)}
              fullWidth
              required
              helperText="Password must be at least 8 characters"
              size={isMobile ? "small" : "medium"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => handleTogglePasswordVisibility('new')}
                      edge="end"
                      size={isMobile ? "small" : "medium"}
                    >
                      {showPassword.new ? <EyeOff size={isMobile ? 16 : 18} /> : <Eye size={isMobile ? 16 : 18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.9rem', sm: '1rem' }
                },
                '& .MuiFormLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                },
                '& .MuiFormHelperText-root': {
                  fontSize: { xs: '0.75rem', sm: '0.75rem' }
                }
              }}
            />

            <TextField
              label="Confirm New Password"
              type={showPassword.confirm ? 'text' : 'password'}
              value={passwordForm.confirmPassword}
              onChange={(e) => handlePasswordFormChange('confirmPassword', e.target.value)}
              fullWidth
              required
              error={passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword !== ''}
              helperText={
                passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword !== ''
                  ? 'Passwords do not match'
                  : ' '
              }
              size={isMobile ? "small" : "medium"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => handleTogglePasswordVisibility('confirm')}
                      edge="end"
                      size={isMobile ? "small" : "medium"}
                    >
                      {showPassword.confirm ? <EyeOff size={isMobile ? 16 : 18} /> : <Eye size={isMobile ? 16 : 18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.9rem', sm: '1rem' }
                },
                '& .MuiFormLabel-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                },
                '& .MuiFormHelperText-root': {
                  fontSize: { xs: '0.75rem', sm: '0.75rem' }
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions 
          sx={{
            px: isMobile ? 1.5 : 3,
            py: isMobile ? 1 : 2,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}
        >
          <Button 
            onClick={() => setShowPasswordDialog(false)}
            size={isMobile ? "small" : "medium"}
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePassword}
            disabled={isUpdating || !passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
            startIcon={isUpdating ? <CircularProgress size={isMobile ? 14 : 16} /> : null}
            size={isMobile ? "small" : "medium"}
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            {isUpdating ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletePassword('');
        }}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus  // Prevents focus trapping issues
        hideBackdrop={false}  // Ensure backdrop is properly handled
      >
        <DialogTitle sx={{ color: 'error.main', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Delete Account
          <IconButton
            aria-label="close"
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeletePassword('');
            }}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AlertTriangle size={24} color={muiTheme.palette.error.main} />
              <Typography variant="h6" color="error.main" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                This action cannot be undone
              </Typography>
            </Box>

            <Typography variant="body1" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              When you delete your account:
            </Typography>

            <List dense>
              <ListItem>
                <ListItemIcon>
                  <X size={18} color={muiTheme.palette.error.main} />
                </ListItemIcon>
                <ListItemText primary="Your profile and personal data will be permanently deleted" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <X size={18} color={muiTheme.palette.error.main} />
                </ListItemIcon>
                <ListItemText primary="You will lose access to all your content and purchases" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <X size={18} color={muiTheme.palette.error.main} />
                </ListItemIcon>
                <ListItemText primary="Your username will be released and may be claimed by others" />
              </ListItem>
            </List>

            <Typography variant="body2" sx={{ mt: 2, fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
              To confirm, please type &quot;DELETE&quot; in the field below:
            </Typography>

            <TextField
              fullWidth
              type="password"
              label="Enter your password to confirm"
              placeholder="Your current password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              size="small"
              required
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                },
                '& .MuiFormLabel-root': {
                  fontSize: { xs: '0.75rem', sm: '1rem' }
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions 
          sx={{
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}
        >
          <Button 
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeletePassword('');
            }}
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteAccount}
            disabled={isUpdating || !deletePassword.trim()}
            startIcon={isUpdating ? <CircularProgress size={16} /> : null}
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            {isUpdating ? 'Deleting...' : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Data Export Dialog */}
      <Dialog
        open={showExportDialog}
        onClose={() => !isExporting && setShowExportDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Export Your Data
          <IconButton
            aria-label="close"
            onClick={() => !isExporting && setShowExportDialog(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
            disabled={isExporting}
          >
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
            <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              We&apos;ll prepare a download with all your account data, including:
            </Typography>

            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Check size={18} color={muiTheme.palette.primary.main} />
                </ListItemIcon>
                <ListItemText primary="Profile information" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Check size={18} color={muiTheme.palette.primary.main} />
                </ListItemIcon>
                <ListItemText primary="Activity history" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Check size={18} color={muiTheme.palette.primary.main} />
                </ListItemIcon>
                <ListItemText primary="Content you&apos;ve created" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Check size={18} color={muiTheme.palette.primary.main} />
                </ListItemIcon>
                <ListItemText primary="Account settings" />
              </ListItem>
            </List>

            {isExporting && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <Typography variant="body2" gutterBottom sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
                  Preparing your data... {dataExportProgress}%
                </Typography>
                <LinearProgress variant="determinate" value={dataExportProgress} />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions 
          sx={{
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}
        >
          <Button
            onClick={() => setShowExportDialog(false)}
            disabled={isExporting}
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleExportData}
            disabled={isExporting}
            startIcon={isExporting ? <CircularProgress size={16} /> : <Download size={16} />}
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            {isExporting ? 'Preparing...' : 'Export Data'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
        title="Confirm Logout"
        message="Are you sure you want to log out of your account?"
        showWarning={true}
        warningMessage="Any unsaved changes in your settings will be lost. You'll need to sign in again to access your account."
      />
    </>
  );
}
