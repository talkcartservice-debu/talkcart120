import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Box,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { gradients } from '../../theme';
import { AdminApi } from '../../services/api';

interface HeaderProps {
  onMenuClick: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, title }) => {
  const theme = useTheme();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeConversations, setActiveConversations] = useState(0);

  // Fetch active conversations count
  useEffect(() => {
    const fetchChatAnalytics = async () => {
      try {
        const res = await AdminApi.getChatAnalytics();
        if (res?.success && res.data) {
          setActiveConversations(res.data.active_conversations || 0);
        }
      } catch (error) {
        console.error('Failed to fetch chat analytics:', error);
        // Don't show error to user since this is a background task
        // Just silently fail and try again later
      }
    };

    fetchChatAnalytics();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchChatAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    // Clear auth tokens
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    router.push('/signin');
    handleProfileMenuClose();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getPageTitle = () => {
    if (title) return title;
    
    const path = router.pathname;
    const titleMap: Record<string, string> = {
      '/': 'Dashboard',
      '/analytics': 'Analytics',
      '/products': 'Products',
      '/orders': 'Orders',
      '/categories': 'Categories',
      '/users': 'Users',
      '/vendors': 'Vendors',
      '/media': 'Media',
      '/payments': 'Payments',
      '/payouts': 'Payouts',
      '/disputes': 'Disputes',
      '/refunds': 'Refunds',
      '/settings': 'Settings',
    };
    
    return titleMap[path] || 'Vetora Admin';
  };

  const notifications = [
    { id: 1, title: 'New order received', time: '2 min ago', type: 'order' },
    { id: 2, title: 'Product approval needed', time: '5 min ago', type: 'product' },
    { id: 3, title: 'Dispute opened', time: '10 min ago', type: 'dispute' },
  ];

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        color: theme.palette.text.primary,
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ px: 3 }}>
        {/* Menu Button */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMenuClick}
          sx={{
            mr: 2,
            display: { md: 'none' },
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            },
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* Page Title */}
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontWeight: 700,
              background: gradients.primary,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block',
            }}
          >
            {getPageTitle()}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: -0.5 }}>
            Manage your marketplace with ease
          </Typography>
        </Box>

        {/* Status Indicators */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
          <Chip
            label="Live"
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label="Online"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Search */}
          <Tooltip title="Search">
            <IconButton
              color="inherit"
              sx={{
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>

          {/* Fullscreen */}
          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton
              color="inherit"
              onClick={toggleFullscreen}
              sx={{
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>

          {/* Chat */}
          <Tooltip title="Chat Management">
            <IconButton
              color="inherit"
              onClick={() => router.push('/chat')}
              sx={{
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <Badge badgeContent={activeConversations} color="error" max={99}>
                <ChatIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              color="inherit"
              onClick={handleNotificationOpen}
              sx={{
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <Badge badgeContent={notifications.length} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Profile */}
          <Tooltip title="Profile">
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{
                ml: 1,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: gradients.primary,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                A
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 200,
              borderRadius: 2,
              boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.12)',
            },
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Admin User
            </Typography>
            <Typography variant="body2" color="text.secondary">
              admin@vetora.com
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleProfileMenuClose}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleProfileMenuClose}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleNotificationClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 300,
              maxWidth: 400,
              borderRadius: 2,
              boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.12)',
            },
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Notifications
            </Typography>
          </Box>
          <Divider />
          {notifications.map((notification) => (
            <MenuItem key={notification.id} onClick={handleNotificationClose}>
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {notification.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notification.time}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
