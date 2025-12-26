import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Stack,
  useTheme,
  alpha,
  TextField,
  InputAdornment,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Popover,
  List,
  ListItem,
  Paper,
  ClickAwayListener,
  useMediaQuery,
  CircularProgress,
  Button,
  Chip,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Bell,
  Search,
  User,
  Moon,
  Sun,
  Wallet,
  MessageSquare,
  X as CloseIcon,
  TrendingUp,
  History,
  Hash as HashtagIcon,
  Settings,
  ShoppingBag,
  Package,
  ShoppingCart,
  Globe,
  LogOut,
  Award,
  Zap,
  Sparkles,
  Home,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeToggle } from '@/hooks/useThemeToggle';
import { useSearch } from '@/hooks/useSearch';
import { useNotifications } from '@/hooks/useNotifications';
import { useMessageUnreadCount } from '@/hooks/useMessageUnreadCount';
import { useCart } from '@/hooks/useCart';
import UserAvatar from '../common/UserAvatar';
import WalletButton from '@/components/wallet/WalletButton';
import { CreatePostDialog } from '@/components/social/new';

interface TopBarProps {
  onMenuClick: () => void;
  showMenuButton?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuClick,
  showMenuButton = true,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const theme = useTheme();
  const router = useRouter();
  const { toggleTheme } = useThemeToggle();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('xs'));
  const { cart } = useCart();

  // Use our custom search hook
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    suggestions: apiSuggestions,
    loading: searchLoading,
    showSuggestions,
    setShowSuggestions,
    search,
    saveToRecent
  } = useSearch({
    debounceMs: 300,
    autoSearch: false
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);

  // State for user menu
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const userMenuOpen = Boolean(userMenuAnchor);

  // Settings menu state removed

  // Use notifications hook
  const {
    notifications,
    unreadCount: unreadNotifications,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    loading
  } = useNotifications();

  // Use message unread count hook
  const { totalUnread: unreadMessages } = useMessageUnreadCount();

  // State for notifications popover
  const [notificationsAnchor, setNotificationsAnchor] = useState<null | HTMLElement>(null);
  const notificationsOpen = Boolean(notificationsAnchor);
  
  // State and functions for bottom navigation
  const [bottomNavValue, setBottomNavValue] = useState(0);
  
  const getBottomNavigationValue = () => {
    if (router.pathname === '/social') return 0; // Home
    if (router.pathname.includes('/marketplace') && router.pathname.includes('/cart')) return 1; // Cart
    if (router.pathname.includes('/messages')) return 2; // Messages
    if (router.pathname.includes('/notifications')) return 3; // Notifications
    return 0; // Default to home
  };
  
  const handleBottomNavigationChange = (event: React.SyntheticEvent, newValue: number) => {
    setBottomNavValue(newValue);
  };

  // Handle click away from search suggestions
  const handleClickAway = () => {
    setShowSuggestions(false);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (searchQuery.trim()) {
      // Save to recent searches (only if authenticated)
      if (isAuthenticated) {
        saveToRecent(searchQuery);
      }

      // Navigate to search page
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
      setMobileSearchOpen(false);
    }
  };

  // Handle search suggestion click
  const handleSuggestionClick = (suggestion: any) => {
    if (suggestion.type === 'user') {
      // Extract username from metadata if available, otherwise from text
      let username;
      if (suggestion.metadata?.username) {
        // Remove @ prefix if present
        username = suggestion.metadata.username.replace('@', '');
      } else {
        // For backward compatibility, try to extract from text
        username = suggestion.text.replace('@', '');
      }
      router.push(`/profile/${username}`);
    } else if (suggestion.type === 'hashtag') {
      const hashtag = suggestion.text.replace('#', '').replace('Trending: ', '');
      router.push(`/hashtag/${hashtag}`);
    } else if (suggestion.type === 'recent') {
      setSearchQuery(suggestion.text);
      router.push(`/search?q=${encodeURIComponent(suggestion.text)}`);
    } else {
      // For content type
      const query = suggestion.text.replace('Posts about "', '').replace('"', '');
      setSearchQuery(query);
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
    setShowSuggestions(false);
  };

  // Map API suggestions to UI format with icons
  const searchSuggestions = apiSuggestions.map(suggestion => {
    let icon;
    let displayText = suggestion.text;
    let secondaryText = '';

    switch (suggestion.type) {
      case 'user':
        // For user suggestions, show avatar if available, otherwise user icon
        if (suggestion.metadata?.avatar) {
          icon = (
            <Avatar
              src={suggestion.metadata.avatar}
              sx={{ width: 24, height: 24 }}
            >
              {(suggestion.metadata.displayName || suggestion.text).charAt(0).toUpperCase()}
            </Avatar>
          );
        } else {
          icon = <User size={16} />;
        }
        // Show username as secondary text
        if (suggestion.metadata?.username) {
          secondaryText = `@${suggestion.metadata.username}`;
        }
        break;
      case 'hashtag':
        icon = <HashtagIcon size={16} />;
        break;
      case 'content':
        icon = <Search size={16} />;
        break;
      case 'recent':
        icon = <History size={16} />;
        break;
      default:
        icon = <Search size={16} />;
    }

    return {
      ...suggestion,
      icon,
      displayText,
      secondaryText
    };
  });

  // Handle user menu
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      handleUserMenuClose();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Settings menu handlers removed

  // Handle notifications
  const handleNotificationsOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    setNotificationsAnchor(event.currentTarget);

    // Refresh notifications when opening
    fetchNotifications();
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchor(null);
    // Return focus to the notification button when closing
    const notificationButton = document.querySelector('[aria-label="Notifications"]');
    if (notificationButton) {
      (notificationButton as HTMLElement).focus();
    }
  };

  // Handle notification click
  const handleNotificationClick = (notificationId: string, url?: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Mark as read
    markAsRead(notificationId);

    // Navigate if URL is provided
    if (url) {
      router.push(url);
    }

    // Close notifications
    handleNotificationsClose();
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    markAllAsRead();
  };

  // Handle login click
  const handleLoginClick = () => {
    router.push('/auth/login');
  };

  // Toggle mobile search
  const handleToggleMobileSearch = () => {
    setMobileSearchOpen(prev => !prev);
    // Focus on the search input when opening mobile search
    if (!mobileSearchOpen) {
      setTimeout(() => {
        if (mobileSearchInputRef.current) {
          mobileSearchInputRef.current.focus();
        }
      }, 100);
    }
  };

  return (
    <>
      {/* Top AppBar - Menu and Search */}
      <AppBar
        position="fixed"
        sx={{
          bgcolor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          zIndex: theme.zIndex.drawer + 1,
          pb: isMobile ? '60px' : 0, // Add padding at bottom when mobile bottom nav is visible
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          {/* Left Section - Menu and Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
           {showMenuButton && (
             <IconButton
               edge="start"
               color="inherit"
               aria-label="menu"
               onClick={onMenuClick}
               sx={{ mr: 1 }}
             >
               <MenuIcon />
             </IconButton>
           )}
          
            
            {/* Logo */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              onClick={() => router.push('/')}
            >
              <Box
                component="img"
                src="/talkcart.logo.png"
                alt="TalkCart Logo"
                sx={{
                  height: 45,
                  width: 45,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  mr: 1,
                  display: { xs: 'none', sm: 'block' }
                }}
              />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                TalkCart
              </Typography>
            </Box>
            
            {/* Removed AI Demo Link */}
          </Box>

          {/* Mobile Search Bar */}
          {mobileSearchOpen && (
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{
                display: { xs: 'flex', md: 'none' },
                flexGrow: 1,
                position: 'relative',
                width: '100%',
                mx: 'auto',
                maxWidth: '100%'
              }}
            >
              <TextField
                id="mobile-search-input"
                placeholder="Search TalkCart..."
                size="small"
                fullWidth
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Don't immediately show suggestions - let the useSearch hook handle it
                }}
                onFocus={() => {
                  setShowSuggestions(true);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {searchLoading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Search size={18} />
                      )}
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={handleToggleMobileSearch}
                      >
                        <CloseIcon size={18} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  }
                }}
              />

              {/* Mobile Search Suggestions */}
              {showSuggestions && (
                <Paper
                  elevation={4}
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    mt: 0.5,
                    zIndex: 1000,
                    maxHeight: 300,
                    overflow: 'auto',
                    borderRadius: 1,
                  }}
                >
                  <List dense>
                    {searchLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : searchSuggestions.length > 0 ? (
                      searchSuggestions.map((suggestion) => (
                        <ListItem
                          key={suggestion.id}
                          component="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          sx={{
                            py: 1,
                            px: 2,
                            cursor: 'pointer',
                            border: 'none',
                            background: 'transparent',
                            width: '100%',
                            textAlign: 'left',
                            '&:hover': {
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                            }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {suggestion.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={suggestion.displayText || suggestion.text}
                            secondary={suggestion.secondaryText}
                            primaryTypographyProps={{
                              variant: 'body2',
                              noWrap: true
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                              noWrap: true,
                              color: 'text.secondary'
                            }}
                          />
                        </ListItem>
                      ))
                    ) : (
                      <ListItem sx={{ py: 1, px: 2 }}>
                        <ListItemText
                          primary="No results found"
                          primaryTypographyProps={{
                            variant: 'body2',
                            align: 'center',
                            color: 'text.secondary'
                          }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              )}
            </Box>
          )}

          {/* Top Action Icons - Wallet, User, Login */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: { xs: 'auto', md: '200px' }, justifyContent: 'space-between', width: '100%' }}>
            {/* Mobile Search Bar - appears between menu and user avatar when search icon is clicked */}
            {!mobileSearchOpen && (
              <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', flexGrow: 1, mx: 1 }}>
                <IconButton
                  color="inherit"
                  size="small"
                  sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }}
                  onClick={handleToggleMobileSearch}
                >
                  <Search size={20} />
                </IconButton>
              </Box>
            )}
            
            {/* Mobile Search Bar - expanded view */}
            {mobileSearchOpen && (
              <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', flexGrow: 1, mx: 1 }}>
                <TextField
                  placeholder="Search TalkCart..."
                  size="small"
                  fullWidth
                  value={searchQuery}
                  inputRef={mobileSearchInputRef}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Don't immediately show suggestions - let the useSearch hook handle it
                  }}
                  onFocus={() => {
                    setShowSuggestions(true);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {searchLoading ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Search size={18} />
                        )}
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={handleToggleMobileSearch}
                        >
                          <CloseIcon size={18} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    borderRadius: 1,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                    }
                  }}
                />
              </Box>
            )}
                        
            {/* Desktop Navigation Text - Home, Cart, Messages, Notifications */}
            {isAuthenticated && (
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
                {/* Home */}
                <Button
                  onClick={() => router.push('/social')}
                  size="small"
                  sx={{
                    color: router.pathname === '/social' ? theme.palette.primary.main : 'inherit',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    minWidth: 'auto',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: theme.palette.primary.main,
                    }
                  }}
                >
                  Home
                </Button>
                            
                {/* Cart */}
                <Box position="relative">
                  <Button
                    onClick={() => router.push('/marketplace/cart')}
                    size="small"
                    sx={{
                      color: 'inherit',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      minWidth: 'auto',
                      '&:hover': {
                        backgroundColor: 'transparent',
                        color: theme.palette.primary.main,
                      }
                    }}
                  >
                    Cart
                  </Button>
                  {cart && cart.totalItems > 0 && (
                    <Badge 
                      badgeContent={cart.totalItems} 
                      color="error"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        transform: 'scale(0.7)',
                      }}
                    >
                      <span />
                    </Badge>
                  )}
                </Box>
                            
                {/* Messages */}
                <Box position="relative">
                  <Button
                    onClick={() => router.push('/messages')}
                    size="small"
                    sx={{
                      color: 'inherit',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      minWidth: 'auto',
                      '&:hover': {
                        backgroundColor: 'transparent',
                        color: theme.palette.primary.main,
                      }
                    }}
                  >
                    Messages
                  </Button>
                  {unreadMessages > 0 && (
                    <Badge 
                      badgeContent={unreadMessages} 
                      color="error"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        transform: 'scale(0.7)',
                      }}
                    >
                      <span />
                    </Badge>
                  )}
                </Box>
                            
                {/* Notifications */}
                <Box position="relative">
                  <Button
                    onClick={handleNotificationsOpen}
                    size="small"
                    sx={{
                      color: 'inherit',
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      minWidth: 'auto',
                      '&:hover': {
                        backgroundColor: 'transparent',
                        color: theme.palette.primary.main,
                      }
                    }}
                  >
                    Notifications
                  </Button>
                  {unreadNotifications > 0 && (
                    <Badge 
                      badgeContent={unreadNotifications} 
                      color="error"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        transform: 'scale(0.7)',
                      }}
                    >
                      <span />
                    </Badge>
                  )}
                </Box>
                            
                {/* Marketplace (Shopping) */}
                <Button
                  onClick={() => router.push('/marketplace')}
                  size="small"
                  sx={{
                    color: 'inherit',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    minWidth: 'auto',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: theme.palette.primary.main,
                    }
                  }}
                >
                  Marketplace
                </Button>
              </Box>
            )}
                        
                        
            {/* Desktop Search Bar with Suggestions - positioned between notifications and wallet button */}
            <ClickAwayListener onClickAway={handleClickAway}>
              <Box
                component="form"
                onSubmit={handleSearch}
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  maxWidth: 500,
                  position: 'relative'
                }}
                ref={searchRef}
              >
                <TextField
                  placeholder="Search TalkCart..."
                  size="small"
                  fullWidth
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Don't immediately show suggestions - let the useSearch hook handle it
                  }}
                  onFocus={() => {
                    setShowSuggestions(true);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {searchLoading ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <Search size={18} />
                        )}
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery ? (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => setSearchQuery('')}
                        >
                          <CloseIcon size={16} />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                  sx={{
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      padding: '4px 10px',
                      '& input': {
                        fontSize: '0.9rem',
                        padding: '6px 0',
                      }
                    }
                  }}
                />

                {/* Search Suggestions Dropdown */}
                {showSuggestions && (
                  <Paper
                    elevation={4}
                    sx={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      mt: 0.5,
                      zIndex: 1000,
                      maxHeight: 350,
                      overflow: 'auto',
                      borderRadius: 1,
                    }}
                  >
                    <List dense>
                      {searchLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : searchSuggestions.length > 0 ? (
                        searchSuggestions.map((suggestion) => (
                          <ListItem
                            key={suggestion.id}
                            component="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            sx={{
                              py: 1,
                              px: 2,
                              cursor: 'pointer',
                              border: 'none',
                              background: 'transparent',
                              width: '100%',
                              textAlign: 'left',
                              '&:hover': {
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {suggestion.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={suggestion.displayText || suggestion.text}
                              secondary={suggestion.secondaryText}
                              primaryTypographyProps={{
                                variant: 'body2',
                                noWrap: true
                              }}
                              secondaryTypographyProps={{
                                variant: 'caption',
                                noWrap: true,
                                color: 'text.secondary'
                              }}
                            />
                          </ListItem>
                        ))
                      ) : (
                        <ListItem sx={{ py: 1, px: 2 }}>
                          <ListItemText
                            primary="No results found"
                            primaryTypographyProps={{
                              variant: 'body2',
                              align: 'center',
                              color: 'text.secondary'
                            }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Paper>
                )}
              </Box>
            </ClickAwayListener>
            
            {isAuthenticated ? (
              <>
                {/* Wallet Button and User Avatar - no space between them */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <WalletButton />
                  </Box>

                  {/* User Avatar - On the right corner */}
                  <Tooltip title="Profile">
                    <IconButton
                      onClick={handleUserMenuOpen}
                      size="small"
                      aria-controls={userMenuOpen ? 'account-menu' : undefined}
                      aria-haspopup="true"
                      aria-expanded={userMenuOpen ? 'true' : undefined}
                    >
                      <UserAvatar
                        src={user?.avatar}
                        alt={user?.displayName || 'User'}
                        size={32}
                        isVerified={user?.isVerified}
                        sx={{
                          border: `2px solid ${theme.palette.primary.main}`
                        }}
                      />
                    </IconButton>
                  </Tooltip>
                </Box>
              </>
            ) : (
              <Button
                color="primary"
                onClick={handleLoginClick}
                variant="contained"
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  minWidth: 'auto',
                  px: 2
                }}
              >
                Login
              </Button>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Bottom Navigation for Mobile - Home, Cart, Messages, Notifications, Create */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            top: 'auto',
            bottom: 0,
            bgcolor: theme.palette.background.paper,
            color: theme.palette.text.primary,
            boxShadow: '0 -1px 3px rgba(0,0,0,0.1)',
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar sx={{ minHeight: '60px', display: 'flex', justifyContent: 'space-around', px: 0 }}>
            <BottomNavigation
              showLabels
              value={getBottomNavigationValue()}
              onChange={handleBottomNavigationChange}
              sx={{
                width: '100%',
                bgcolor: 'transparent',
                boxShadow: 'none',
              }}
            >
              {/* Home */}
              <BottomNavigationAction
                label="Home"
                icon={<Home size={20} />}
                onClick={() => {
                  if (isAuthenticated) {
                    router.push('/social');
                  } else {
                    router.push('/auth/login');
                  }
                }}
                sx={{
                  color: router.pathname === '/social' ? theme.palette.primary.main : 'inherit',
                }}
              />

              {/* Cart */}
              <BottomNavigationAction
                label="Cart"
                icon={
                  <Box position="relative">
                    <ShoppingCart size={20} />
                    {cart && cart.totalItems > 0 && (
                      <Badge 
                        badgeContent={cart.totalItems} 
                        color="error"
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          transform: 'scale(0.7)',
                        }}
                      >
                        <span />
                      </Badge>
                    )}
                  </Box>
                }
                onClick={() => {
                  if (isAuthenticated) {
                    router.push('/marketplace/cart');
                  } else {
                    router.push('/auth/login');
                  }
                }}
                sx={{
                  color: router.pathname.includes('/marketplace') && router.pathname.includes('/cart') ? theme.palette.primary.main : 'inherit',
                }}
              />

              {/* Messages */}
              <BottomNavigationAction
                label="Messages"
                icon={
                  <Box position="relative">
                    <MessageSquare size={20} />
                    {unreadMessages > 0 && (
                      <Badge 
                        badgeContent={unreadMessages} 
                        color="error"
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          transform: 'scale(0.7)',
                        }}
                      >
                        <span />
                      </Badge>
                    )}
                  </Box>
                }
                onClick={() => {
                  if (isAuthenticated) {
                    router.push('/messages');
                  } else {
                    router.push('/auth/login');
                  }
                }}
                sx={{
                  color: router.pathname.includes('/messages') ? theme.palette.primary.main : 'inherit',
                }}
              />

              {/* Notifications */}
              <BottomNavigationAction
                label="Notifications"
                icon={
                  <Box position="relative">
                    <Bell size={20} />
                    {unreadNotifications > 0 && (
                      <Badge 
                        badgeContent={unreadNotifications} 
                        color="error"
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          transform: 'scale(0.7)',
                        }}
                      >
                        <span />
                      </Badge>
                    )}
                  </Box>
                }
                onClick={handleNotificationsOpen}
                sx={{
                  color: router.pathname.includes('/notifications') ? theme.palette.primary.main : 'inherit',
                }}
              />

              {/* Create */}
              <BottomNavigationAction
                label="Create"
                icon={<Plus size={20} />}
                onClick={() => {
                  if (isAuthenticated) {
                    setCreatePostOpen(true);
                  } else {
                    router.push('/auth/login');
                  }
                }}
                sx={{
                  color: 'inherit',
                }}
              />
            </BottomNavigation>
          </Toolbar>
        </AppBar>
      )}

      {/* Desktop - Right aligned action icons */}
      {!isMobile && (
        <Box
          sx={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            zIndex: theme.zIndex.drawer + 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {isAuthenticated && (
            <>
              {/* Home */}
              <Tooltip title="Home">
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => {
                    if (isAuthenticated) {
                      router.push('/social');
                    } else {
                      router.push('/auth/login');
                    }
                  }}
                  sx={{
                    bgcolor: theme.palette.background.paper,
                    boxShadow: 1,
                    '&:hover': {
                      bgcolor: theme.palette.action.hover,
                    },
                    color: router.pathname === '/social' ? theme.palette.primary.main : 'inherit',
                  }}
                >
                  <Home size={20} />
                </IconButton>
              </Tooltip>

              {/* Cart */}
              <Tooltip title="Cart">
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => {
                    if (isAuthenticated) {
                      router.push('/marketplace/cart');
                    } else {
                      router.push('/auth/login');
                    }
                  }}
                  sx={{
                    bgcolor: theme.palette.background.paper,
                    boxShadow: 1,
                    '&:hover': {
                      bgcolor: theme.palette.action.hover,
                    },
                    position: 'relative',
                    color: router.pathname.includes('/marketplace') && router.pathname.includes('/cart') ? theme.palette.primary.main : 'inherit',
                  }}
                >
                  <ShoppingCart size={20} />
                  {cart && cart.totalItems > 0 && (
                    <Badge 
                      badgeContent={cart.totalItems} 
                      color="error"
                      sx={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                      }}
                    >
                      <span />
                    </Badge>
                  )}
                </IconButton>
              </Tooltip>

              {/* Messages */}
              <Tooltip title="Messages">
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => {
                    if (isAuthenticated) {
                      router.push('/messages');
                    } else {
                      router.push('/auth/login');
                    }
                  }}
                  sx={{
                    bgcolor: theme.palette.background.paper,
                    boxShadow: 1,
                    '&:hover': {
                      bgcolor: theme.palette.action.hover,
                    },
                    position: 'relative',
                    color: router.pathname.includes('/messages') ? theme.palette.primary.main : 'inherit',
                  }}
                >
                  <MessageSquare size={20} />
                  {unreadMessages > 0 && (
                    <Badge 
                      badgeContent={unreadMessages} 
                      color="error"
                      sx={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                      }}
                    >
                      <span />
                    </Badge>
                  )}
                </IconButton>
              </Tooltip>

              {/* Notifications */}
              <Tooltip title="Notifications">
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleNotificationsOpen}
                  sx={{
                    bgcolor: theme.palette.background.paper,
                    boxShadow: 1,
                    '&:hover': {
                      bgcolor: theme.palette.action.hover,
                    },
                    position: 'relative',
                    color: router.pathname.includes('/notifications') ? theme.palette.primary.main : 'inherit',
                  }}
                >
                  <Bell size={20} />
                  {unreadNotifications > 0 && (
                    <Badge 
                      badgeContent={unreadNotifications} 
                      color="error"
                      sx={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                      }}
                    >
                      <span />
                    </Badge>
                  )}
                </IconButton>
              </Tooltip>

              {/* Create */}
              <Tooltip title="Create Post">
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={() => {
                    if (isAuthenticated) {
                      setCreatePostOpen(true);
                    } else {
                      router.push('/auth/login');
                    }
                  }}
                  sx={{
                    bgcolor: theme.palette.background.paper,
                    boxShadow: 1,
                    '&:hover': {
                      bgcolor: theme.palette.action.hover,
                    },
                  }}
                >
                  <Plus size={20} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      )}

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor && userMenuAnchor.isConnected ? userMenuAnchor : null}
        id="account-menu"
        open={Boolean(userMenuOpen && userMenuAnchor && userMenuAnchor.isConnected)}
        onClose={handleUserMenuClose}
        onClick={handleUserMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
            width: 280,
            borderRadius: 2,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {isAuthenticated && user && (
          <Box sx={{ px: 2, py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <UserAvatar
                src={user?.avatar}
                alt={user?.displayName || 'User'}
                size={40}
                isVerified={user?.isVerified}
              />
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {user.displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  @{user.username}
                </Typography>
              </Box>
            </Box>
            
            {/* User stats */}
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700}>
                  {user.followerCount || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Followers
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700}>
                  {user.followingCount || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Following
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight={700}>
                  {user.postCount || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Posts
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        <Divider />

        <MenuItem onClick={() => {
          if (isAuthenticated) {
            router.push('/profile');
          } else {
            router.push('/auth/login');
          }
        }}>
          <ListItemText primary="Profile" />
        </MenuItem>

        <MenuItem onClick={() => {
          if (isAuthenticated) {
            router.push('/wallet');
          } else {
            router.push('/auth/login');
          }
        }}>
          <ListItemText primary="Wallet" />
        </MenuItem>

        {/* Marketplace */}
        <MenuItem onClick={() => {
          if (isAuthenticated) {
            router.push('/marketplace');
          } else {
            router.push('/auth/login');
          }
        }}>
          <ListItemText primary="Marketplace" />
        </MenuItem>

        {/* My Orders */}
        <MenuItem onClick={() => {
          if (isAuthenticated) {
            router.push('/marketplace/dashboard?tab=0');
          } else {
            router.push('/auth/login');
          }
        }}>
          <ListItemText primary="My Orders" />
        </MenuItem>

        {/* Settings */}
        <MenuItem onClick={() => {
          if (isAuthenticated) {
            router.push('/settings');
          } else {
            router.push('/auth/login');
          }
        }}>
          <ListItemText primary="Settings" />
        </MenuItem>

        {/* Logout option */}
        <MenuItem onClick={handleLogout}>
          <ListItemText primary="Logout" />
        </MenuItem>
      </Menu>

      {/* Settings Menu removed */}

      {/* Notifications Popover */}
      <Popover
        open={Boolean(notificationsOpen && notificationsAnchor && notificationsAnchor.isConnected)}
        anchorEl={notificationsAnchor && notificationsAnchor.isConnected ? notificationsAnchor : null}
        onClose={handleNotificationsClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 400,
            borderRadius: 2,
            p: 1,
          }
        }}
        disableAutoFocus={false}
        disableEnforceFocus={false}
        disableRestoreFocus={false}
      >
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            Notifications
          </Typography>
          {Array.isArray(notifications) && notifications.length > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllAsRead}
              sx={{ textTransform: 'none' }}
            >
              Mark all as read
            </Button>
          )}
        </Box>
        <Divider sx={{ mb: 1 }} />

        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : !Array.isArray(notifications) ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          notifications.map((notification) => {
            // Format relative time
            const timeAgo = (date: string) => {
              const now = new Date();
              const notifDate = new Date(date);
              const diffMs = now.getTime() - notifDate.getTime();
              const diffSec = Math.floor(diffMs / 1000);
              const diffMin = Math.floor(diffSec / 60);
              const diffHour = Math.floor(diffMin / 60);
              const diffDay = Math.floor(diffHour / 24);

              if (diffSec < 60) return 'just now';
              if (diffMin < 60) return `${diffMin} min ago`;
              if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
              if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
              return notifDate.toLocaleDateString();
            };

            // Get notification URL
            const getNotificationUrl = () => {
              if (!notification.data) return undefined;

              if (notification.data.postId) {
                return `/post/${notification.data.postId}`;
              }

              if (notification.data.userId) {
                return `/profile/${notification.data.userId}`;
              }

              return notification.data.url || undefined;
            };

            return (
              <Box
                key={notification.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  mb: 1,
                  cursor: 'pointer',
                  bgcolor: notification.isRead ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
                  '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.1) }
                }}
                onClick={() => handleNotificationClick(notification.id, getNotificationUrl() || undefined)}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Avatar
                    src={notification.sender?.avatar}
                    sx={{
                      mr: 1.5,
                      width: 40,
                      height: 40,
                      bgcolor: !notification.sender ? theme.palette.primary.main : undefined
                    }}
                  >
                    {!notification.sender && (
                      <Bell size={20} />
                    )}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2">
                      {notification.sender && (
                        <Typography component="span" fontWeight={600}>
                          {notification.sender.displayName}
                        </Typography>
                      )}{' '}
                      {notification.content}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {timeAgo(notification.createdAt)}
                      </Typography>
                      {!notification.isRead && (
                        <Chip 
                          label="New" 
                          size="small" 
                          color="primary" 
                          sx={{ height: 16, fontSize: '0.6rem' }} 
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>
            );
          })
        )}

        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Typography
            variant="body2"
            color="primary"
            sx={{
              cursor: 'pointer',
              fontWeight: 500,
              '&:hover': { textDecoration: 'underline' }
            }}
            onClick={() => {
              handleNotificationsClose();
              router.push('/notifications');
            }}
          >
            View All Notifications
          </Typography>
        </Box>
      </Popover>

      {/* Create Post Dialog */}
      {isAuthenticated && (
        <CreatePostDialog
          open={createPostOpen}
          onClose={() => setCreatePostOpen(false)}
          onPostCreated={() => {
            setCreatePostOpen(false);
            // Optionally refresh the feed if we're on the social page
            if (router.pathname === '/social') {
              window.dispatchEvent(new CustomEvent('posts:refresh'));
            }
          }}
        />
      )}
    </>
  );
};

export default TopBar;