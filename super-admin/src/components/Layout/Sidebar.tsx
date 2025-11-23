import React from 'react';
import { useRouter } from 'next/router';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Avatar,
  Divider,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Inventory as ProductsIcon,
  ShoppingCart as OrdersIcon,
  Category as CategoriesIcon,
  People as UsersIcon,
  Store as VendorsIcon,
  Image as MediaIcon,
  Payment as PaymentsIcon,
  AccountBalance as PayoutsIcon,
  Gavel as DisputesIcon,
  Refresh as RefundsIcon,
  Settings as SettingsIcon,
  TrendingUp,
  Notifications,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { gradients } from '../../theme';

const DRAWER_WIDTH = 280;

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  color?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/',
    color: 'primary',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <AnalyticsIcon />,
    path: '/analytics',
    badge: 'Live',
    color: 'success',
  },
  {
    id: 'products',
    label: 'Products',
    icon: <ProductsIcon />,
    path: '/products',
    color: 'info',
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: <OrdersIcon />,
    path: '/orders',
    badge: 'New',
    color: 'warning',
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: <CategoriesIcon />,
    path: '/categories',
    color: 'secondary',
  },
  {
    id: 'users',
    label: 'Users',
    icon: <UsersIcon />,
    path: '/users',
    color: 'primary',
  },
  {
    id: 'vendors',
    label: 'Vendors',
    icon: <VendorsIcon />,
    path: '/vendors',
    color: 'info',
  },
  {
    id: 'chat',
    label: 'Chat Management',
    icon: <ChatIcon />,
    path: '/chat',
    color: 'success',
  },
  {
    id: 'media',
    label: 'Media',
    icon: <MediaIcon />,
    path: '/media',
    color: 'secondary',
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: <PaymentsIcon />,
    path: '/payments',
    color: 'success',
  },
  {
    id: 'payouts',
    label: 'Payouts',
    icon: <PayoutsIcon />,
    path: '/payouts',
    color: 'warning',
  },
  {
    id: 'disputes',
    label: 'Disputes',
    icon: <DisputesIcon />,
    path: '/disputes',
    badge: '3',
    color: 'error',
  },
  {
    id: 'refunds',
    label: 'Refunds',
    icon: <RefundsIcon />,
    path: '/refunds',
    color: 'info',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings',
    color: 'default',
  },
  {
    id: 'commission',
    label: 'Commission Report',
    icon: <TrendingUp />,
    path: '/commission',
    color: 'success',
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'persistent' | 'temporary';
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, variant = 'permanent' }) => {
  const router = useRouter();
  const theme = useTheme();

  const handleNavigation = (path: string) => {
    router.push(path);
    if (variant === 'temporary') {
      onClose();
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          background: gradients.primary,
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Avatar
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2,
            bgcolor: 'rgba(255, 255, 255, 0.2)',
            fontSize: '1.5rem',
            fontWeight: 'bold',
          }}
        >
          TC
        </Avatar>
        <Typography variant="h6" fontWeight={700}>
          TalkCart
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Super Admin
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mb: 2,
          }}
        >
          <Chip
            icon={<TrendingUp />}
            label="Live"
            size="small"
            color="success"
            variant="outlined"
          />
          <Chip
            icon={<Notifications />}
            label="3"
            size="small"
            color="error"
            variant="outlined"
          />
        </Box>
      </Box>

      <Divider />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ px: 2, py: 1 }}>
          {navigationItems.map((item) => {
            const active = isActive(item.path);
            return (
              <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    backgroundColor: active
                      ? alpha(theme.palette.primary.main, 0.1)
                      : 'transparent',
                    color: active
                      ? theme.palette.primary.main
                      : theme.palette.text.primary,
                    '&:hover': {
                      backgroundColor: active
                        ? alpha(theme.palette.primary.main, 0.15)
                        : alpha(theme.palette.action.hover, 0.08),
                      transform: 'translateX(4px)',
                    },
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    '&::before': active
                      ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 3,
                          height: '60%',
                          backgroundColor: theme.palette.primary.main,
                          borderRadius: '0 2px 2px 0',
                        }
                      : {},
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: 'inherit',
                      minWidth: 40,
                      '& .MuiSvgIcon-root': {
                        fontSize: '1.25rem',
                      },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: active ? 600 : 500,
                    }}
                  />
                  {item.badge && (
                    <Chip
                      label={item.badge}
                      size="small"
                      color={item.color as any}
                      sx={{
                        height: 20,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: 'center', display: 'block' }}
        >
          TalkCart Admin v1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          border: 'none',
          boxShadow: '4px 0 20px rgba(0, 0, 0, 0.08)',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
export { DRAWER_WIDTH };
