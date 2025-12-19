import React, { useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Box,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Verified as VerifiedIcon,
  Refresh as RefreshIcon,
  Group as UsersIcon,
  TrendingUp
} from '@mui/icons-material';
import { useUserSuggestions, UserSuggestion } from '@/hooks/useUserSuggestions';
import { useRouter } from 'next/router';
import UserAvatar from '@/components/common/UserAvatar';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface WhoToFollowProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  query?: string;
}

const WhoToFollow: React.FC<WhoToFollowProps> = ({
  limit = 5, // Always suggest 5 people
  showHeader = true,
  compact = false,
  query = ''
}) => {
  const theme = useTheme();
  const router = useRouter();
  const { suggestions, loading, error, followUser, refreshSuggestions } = useUserSuggestions({ limit, search: query });
  const { socket, isConnected } = useWebSocket();

  // Apply simple client-side filtering by displayName/username when query provided
  const normalizedQuery = (query || '').trim().toLowerCase();
  const visibleSuggestions = normalizedQuery
    ? suggestions.filter((s) =>
      (s.displayName || '').toLowerCase().includes(normalizedQuery) ||
      (s.username || '').toLowerCase().includes(normalizedQuery)
    )
    : suggestions;

  // Listen for real-time follow events to update the UI immediately
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleFollowUpdate = (data: any) => {
      // Refresh suggestions when a follow event occurs
      refreshSuggestions();
    };

    // Listen for both server-emitted events and client-emitted events
    socket.on('user:followers-update', handleFollowUpdate);
    socket.on('user:following-update', handleFollowUpdate);
    socket.on('follow_update', handleFollowUpdate);

    return () => {
      socket.off('user:followers-update', handleFollowUpdate);
      socket.off('user:following-update', handleFollowUpdate);
      socket.off('follow_update', handleFollowUpdate);
    };
  }, [socket, isConnected, refreshSuggestions]);

  const handleFollowUser = async (user: UserSuggestion) => {
    const result = await followUser(user.id);
    if (result.success) {
      // Optionally show success message
      console.log(`Successfully followed ${user.displayName}`);
    } else {
      // Optionally show error message
      console.error(`Failed to follow ${user.displayName}:`, result.error);
    }
  };

  const handleViewProfile = (username: string) => {
    router.push(`/profile/${username}`);
  };

  if (error) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <CardContent><Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            variant="outlined"
            onClick={refreshSuggestions}
            startIcon={<RefreshIcon />}
            fullWidth
            sx={{ borderRadius: 2 }}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ 
      borderRadius: 2, 
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)', // Reduced shadow
      border: '1px solid rgba(0, 0, 0, 0.05)'
    }}>
      <CardContent sx={{ pb: 0.5, pt: 1 }}> {/* Reduced padding */}
        {showHeader && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <UsersIcon sx={{ marginRight: 1, fontSize: 18 }} /> {/* Reduced icon size */}
                <Typography variant="h6" component="h2" fontWeight={700} sx={{ fontSize: '1rem' }}> {/* Reduced font size */}
                  Who to Follow
                </Typography>
              </Box>
              <Tooltip title="Refresh suggestions">
                <IconButton
                  size="small"
                  onClick={refreshSuggestions}
                  disabled={loading}
                  sx={{ 
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1)
                    },
                    width: 28, // Reduced button size
                    height: 28
                  }}
                >
                  <RefreshIcon sx={{ fontSize: 16 }} /> {/* Reduced icon size */}
                </IconButton>
              </Tooltip>
            </Box>
            <Divider sx={{ mb: 0.5 }} />
          </>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <CircularProgress size={20} /> {/* Reduced spinner size */}
          </Box>
        ) : visibleSuggestions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1, fontSize: '0.8rem' }}>
            {normalizedQuery ? `No results for '${normalizedQuery}'` : 'No suggestions available'}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}> {/* Reduced gap */}
            {visibleSuggestions.map((user, index) => (
              <Box key={user.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1.5, '&:hover': { bgcolor: alpha(theme.palette.divider, 0.3) } }}>
                  {/* Avatar */}
                  <UserAvatar
                    src={user.avatar}
                    alt={user.displayName}
                    size={36} // Reduced avatar size
                    isVerified={user.isVerified}
                    onClick={() => handleViewProfile(user.username)}
                  />

                  {/* User Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                      <Typography
                        variant="body1"
                        component="span"
                        sx={{
                          fontWeight: 700,
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                          fontSize: '0.85rem' // Reduced font size
                        }}
                        onClick={() => handleViewProfile(user.username)}
                      >
                        {user.displayName}
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
                      {user.isOnline && (
                        <Tooltip title="Online">
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: 'success.main',
                              ml: 0.5,
                              border: `2px solid ${theme.palette.background.paper}`,
                              boxShadow: '0 0 0 2px success.main'
                            }}
                          />
                        </Tooltip>
                      )}
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.25, fontSize: '0.75rem' }} // Reduced font size
                    >
                      @{user.username}
                    </Typography>

                    {/* Follower count and mutual followers */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}> {/* Reduced font size */}
                        {user.followerCount?.toLocaleString() || 0} followers
                      </Typography>
                      {user.mutualFollowers && user.mutualFollowers > 0 && (
                        <Chip 
                          label={`${user.mutualFollowers} mutual`} 
                          size="small" 
                          variant="outlined" 
                          sx={{ 
                            height: 16, 
                            fontSize: '0.6rem',
                            borderRadius: 0.5,
                            borderColor: alpha(theme.palette.primary.main, 0.3),
                            color: theme.palette.primary.main,
                            '& .MuiChip-label': {
                              px: 0.5
                            }
                          }} 
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Follow Button */}
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleFollowUser(user)}
                    sx={{ 
                      borderRadius: 1.5, 
                      textTransform: 'none', 
                      fontWeight: 600,
                      minWidth: 0,
                      px: 1,
                      py: 0.25,
                      fontSize: '0.75rem', // Reduced font size
                      height: 24 // Set fixed height
                    }}
                  >
                    Follow
                  </Button>
                </Box>

                {/* Divider except for last item */}
                {index < visibleSuggestions.length - 1 && (
                  <Divider sx={{ my: 0.25 }} />
                )}
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default WhoToFollow;