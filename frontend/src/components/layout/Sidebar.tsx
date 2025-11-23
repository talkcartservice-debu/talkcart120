import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import {
  Drawer,
  List,
  Box,
  Typography,
  Divider,
  Avatar,
  Stack,
  useTheme,
  alpha,
  Collapse,
  IconButton,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  MessageCircle,
  ShoppingCart,
  Video,
  Sparkles,
  User,
  Wallet,
  ChevronDown,
  ChevronRight,
  Plus,
  Star,
  Crown,
  Globe,
  Settings,
  Package,
  ShoppingBag,
  LogOut,
  TrendingUp,
  Users,
  Bookmark,
  Store,
  CreditCard,
  Headset,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import useMessages from '@/hooks/useMessages';
import NavigationItem from './NavigationItem';
import UserAvatar from '../common/UserAvatar';
import { CreatePostDialog } from '../social/new'; // Use index file

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant?: 'permanent' | 'persistent' | 'temporary';
  width?: number;
}

interface NavigationSection {
  title: string;
  items: NavigationItemData[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  premium?: boolean;
}

interface NavigationItemData {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
  comingSoon?: boolean;
  requireAuth?: boolean;
  tooltip?: string;
  premium?: boolean;
  new?: boolean;
  onClick?: () => void; // Add onClick handler
}

export const SidebarComponent: React.FC<SidebarProps> = ({
  open,
  onClose,
  variant = 'temporary',
  width = 280,
}) => {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  // const { totalUnread } = useMessages(); // Commented out as this property doesn't exist
  const theme = useTheme();

  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Main': true,
    'Features': true,
    'Marketplace': true,
    'AI Features': true,
  });

  // State for create post dialog
  const [createPostOpen, setCreatePostOpen] = useState(false);

  // Toggle section expansion
  const toggleSection = useCallback((sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  }, []);

  // Handle navigation with useCallback to prevent unnecessary re-renders
  const handleNavigation = useCallback((path: string) => {
    // If user is not authenticated, redirect to login page
    if (!isAuthenticated) {
      router.push('/auth/login');
    } else {
      router.push(path);
    }

    if (variant === 'temporary') {
      onClose();
    }
  }, [isAuthenticated, router, variant, onClose]);

  // Handle logout with useCallback to prevent unnecessary re-renders
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      onClose();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout, onClose, router]);

  // Enhanced navigation sections with more pages
  const navigationSections = useMemo((): NavigationSection[] => {
    // Check if user is a vendor
    const isVendor = isAuthenticated && user?.role === 'vendor';

    // Create marketplace section items based on user role
    const marketplaceItems: NavigationItemData[] = isVendor ? [
      {
        label: 'My Store Dashboard',
        path: '/marketplace/vendor-dashboard',
        icon: <Store size={20} />,
        tooltip: 'Manage your store dashboard',
        requireAuth: true,
      },
      {
        label: 'My Orders',
        path: '/marketplace/dashboard?tab=0',
        icon: <Package size={20} />,
        tooltip: 'View your orders',
        requireAuth: true,
      },
      {
        label: 'Vendor Store',
        path: '/marketplace/vendor-payment-settings',
        icon: <ShoppingBag size={20} />,
        tooltip: 'Manage your vendor store',
        requireAuth: true,
      }
    ] : [
      // Non-vendor specific items
      {
        label: 'My Orders',
        path: '/marketplace/dashboard?tab=0',
        icon: <Package size={20} />,
        tooltip: 'View your orders',
        requireAuth: true,
      },
      {
        label: 'My Dashboard',
        path: '/marketplace/my-dashboard',
        icon: <ShoppingBag size={20} />,
        tooltip: 'Manage your marketplace',
        requireAuth: true,
      },
      {
        label: 'My Products',
        path: '/marketplace/dashboard?tab=1',
        icon: <Star size={20} />,
        tooltip: 'Your listed products',
        requireAuth: true,
      },
      {
        label: 'Payment History',
        path: '/marketplace/dashboard?tab=2',
        icon: <CreditCard size={20} />,
        tooltip: 'View your payment history',
        requireAuth: true,
      },
      {
        label: 'Register Your Store',
        path: '/marketplace/vendor-store-registration',
        icon: <Store size={20} />,
        tooltip: 'Register your store to start selling',
        requireAuth: true,
        new: true,
      }
    ];

    const sections: NavigationSection[] = [
      {
        title: 'Main',
        defaultExpanded: true,
        items: [
          {
            label: 'Social Feed',
            path: '/social',
            icon: <Globe size={20} />,
            tooltip: 'View your social feed',
            badge: 'Hot',
          },
          {
            label: 'Create Post',
            path: '#',
            icon: <Plus size={20} />,
            tooltip: 'Create a new post',
            requireAuth: true,
            onClick: () => setCreatePostOpen(true), // Add onClick handler
            new: true,
          },
          {
            label: 'Messages',
            path: '/messages',
            icon: <MessageCircle size={20} />,
            tooltip: 'Private messages & conversations',
          },
          {
            label: 'Trending',
            path: '/trending',
            icon: <TrendingUp size={20} />,
            tooltip: 'See what\'s trending',
            new: true,
          },
          {
            label: 'Who to Follow',
            path: '/suggestions',
            icon: <Users size={20} />,
            tooltip: 'Find people to follow',
          },
        ],
      },
      {
        title: 'Features',
        defaultExpanded: true,
        items: [
          {
            label: 'Marketplace',
            path: '/marketplace',
            icon: <ShoppingCart size={16} />, // Reduced from 20 to 16
            tooltip: 'NFT Marketplace & Digital Assets',
            badge: 'Hot',
          },
          {
            label: 'Wallet',
            path: '/wallet',
            icon: <Wallet size={20} />,
            tooltip: 'Manage your wallet',
            requireAuth: true,
          },
          {
            label: 'Bookmarks',
            path: '/bookmarks',
            icon: <Bookmark size={20} />,
            tooltip: 'Your saved posts',
            requireAuth: true,
          },
        ],
      },
      {
        title: 'Marketplace',
        defaultExpanded: true,
        items: marketplaceItems,
      }
    ];

    return sections;
  }, [isAuthenticated, user?.role]);

  // Handle focus management when sidebar closes
  useEffect(() => {
    if (!open && variant === 'temporary') {
      // Move focus back to the main content when sidebar closes
      const mainContent = document.querySelector('main');
      if (mainContent) {
        (mainContent as HTMLElement).focus();
      }
    }
  }, [open, variant]);

  // User stats for premium users
  const userStats = {
    followers: 1234,
    following: 567,
    posts: 89,
    nfts: 12,
  };

  const sidebarContent = (
    <Box sx={{ width, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Enhanced Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <Sparkles size={28} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                TalkCart
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                Web3 Social Platform
              </Typography>
            </Box>
          </Stack>
          <IconButton aria-label="Settings" onClick={() => handleNavigation('/settings')} size="small">
            <Settings size={18} />
          </IconButton>
        </Stack>
      </Box>

      {/* Enhanced User Profile Section */}
      {isAuthenticated && user && (
        <Box 
          sx={{ 
            p: 3, 
            borderBottom: `1px solid ${theme.palette.divider}`,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: alpha(theme.palette.action.hover, 0.3)
            }
          }}
          onClick={() => handleNavigation('/profile')}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <UserAvatar
              src={user.avatar}
              alt={user.displayName || user.username}
              size={48}
              isVerified={user.isVerified}
              sx={{
                border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={600} noWrap>
                  {user.displayName || user.username}
                </Typography>
                {user.isVerified && (
                  <Tooltip title="Verified User">
                    <Box 
                      component="span" 
                      sx={{ 
                        width: 14, 
                        height: 14, 
                        bgcolor: 'primary.main', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}
                    >
                      <Box component="span" sx={{ color: 'white', fontSize: '0.5rem', fontWeight: 'bold' }}>✓</Box>
                    </Box>
                  </Tooltip>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" noWrap>
                @{user.username}
              </Typography>
            </Box>
          </Stack>
          
          {/* User stats */}
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
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
          </Stack>
        </Box>
      )}

      {/* Enhanced Navigation Sections */}
      <Box sx={{ flexGrow: 1, py: 1, overflowY: 'auto' }}>
        {navigationSections.map((section, sectionIndex) => {
          const isExpanded = expandedSections[section.title] ?? section.defaultExpanded ?? true;

          return (
            <Box key={section.title} sx={{ px: 2, mb: 2 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  px: 2,
                  py: 1,
                  mb: 1,
                  cursor: section.collapsible ? 'pointer' : 'default',
                  borderRadius: 1,
                  '&:hover': section.collapsible ? {
                    bgcolor: alpha(theme.palette.action.hover, 0.5),
                  } : {},
                }}
                onClick={section.collapsible ? () => toggleSection(section.title) : undefined}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography
                    variant="overline"
                    sx={{
                      fontWeight: 700,
                      color: 'text.primary',
                      fontSize: '0.75rem',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {section.title}
                  </Typography>
                  {section.premium && (
                    <Crown size={14} color={theme.palette.warning.main} />
                  )}
                </Stack>
                {section.collapsible && (
                  <IconButton size="small" sx={{ p: 0.5 }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </IconButton>
                )}
              </Stack>

              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <List sx={{ py: 0 }}>
                  {section.items.map((item) => {
                    // Skip auth-required items if not authenticated
                    if (item.requireAuth && !isAuthenticated) {
                      return null;
                    }

                    return (
                      <NavigationItem
                        key={item.path}
                        label={item.label}
                        path={item.path}
                        icon={item.icon}
                        badge={item.badge}
                        comingSoon={item.comingSoon}
                        tooltip={item.tooltip}
                        premium={item.premium}
                        new={item.new}
                        onClick={item.onClick} // Add onClick handler
                      />
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      {/* Bottom section with Logout */}
      {isAuthenticated && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <NavigationItem
              label="Logout"
              path="#"
              icon={<LogOut size={20} />}
              tooltip="Sign out of your account"
              onClick={handleLogout}
            />
          </Box>
        </>
      )}

      {/* Enhanced Login prompt for non-authenticated users */}
      {!isAuthenticated && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Card
              elevation={0}
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                borderRadius: 2,
                mb: 2,
              }}
            >
              <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                  Join TalkCart Today
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Connect, trade, and explore Web3
                </Typography>
                <Stack spacing={1}>
                  <NavigationItem
                    label="Sign Up"
                    path="/auth/register"
                    icon={<Plus size={20} />}
                    tooltip="Create new account"
                  />
                  <NavigationItem
                    label="Login"
                    path="/auth/login"
                    icon={<User size={20} />}
                    tooltip="Sign in to your account"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <>
      <Drawer
        variant={variant}
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{
          width: open ? width : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
            backgroundImage: 'none',
          },
        }}
        ModalProps={{
          keepMounted: true,
          disablePortal: false,
          hideBackdrop: false,
          // Prevent aria-hidden conflicts when focus is retained
          disableEnforceFocus: true,
          disableRestoreFocus: false,
          slotProps: {
            backdrop: { inert: true }
          }
        }}
        PaperProps={{
          // Ensure proper accessibility attributes
          role: "dialog",
          "aria-modal": variant === 'temporary' ? "true" : undefined,
          // Make drawer content programmatically focusable
          tabIndex: -1
        }}
      >
        {sidebarContent}
      </Drawer>
      {/* Create Post Dialog */}
      {isAuthenticated && (
        <CreatePostDialog
          open={createPostOpen}
          onClose={() => setCreatePostOpen(false)}
          onPostCreated={() => {
            setCreatePostOpen(false);
            // Optionally refresh the feed if we're on the social page
            if (router.pathname === '/social-new') {
              window.dispatchEvent(new CustomEvent('posts:refresh'));
            }
          }}
        />
      )}
    </>
  );
};

export const Sidebar = memo(SidebarComponent);

export default Sidebar;