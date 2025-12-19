import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { api } from '@/lib/api';
import UserAvatar from '@/components/common/UserAvatar';
import FollowButton from '@/components/common/FollowButton';
import { ProfileUser } from '@/types';

interface Follower {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  bio?: string;
  followedAt: string;
  isFollowing?: boolean;
}

interface FollowersListProps {
  userId: string;
  limit?: number;
}

const FollowersList: React.FC<FollowersListProps> = ({ userId, limit = 20 }) => {
  const theme = useTheme();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchRelationshipData = async (followers: Follower[]): Promise<Follower[]> => {
    try {
      // Fetch relationship data for all followers
      const relationshipPromises = followers.map(async (follower) => {
        try {
          const relationshipRes = await api.users.getRelationship(follower.id);
          if (relationshipRes.success) {
            return {
              ...follower,
              isFollowing: relationshipRes.data.isFollowing || false
            };
          }
          return follower;
        } catch (err) {
          console.error(`Error fetching relationship for ${follower.id}:`, err);
          return follower;
        }
      });
      
      const followersWithRelationship = await Promise.all(relationshipPromises);
      return followersWithRelationship;
    } catch (err) {
      console.error('Error fetching relationship data:', err);
      return followers;
    }
  };

  const fetchFollowers = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.users.getFollowers(userId, limit, (pageNum - 1) * limit);
      
      if (response.success) {
        let newFollowers = response.data.items || [];
        
        // Fetch relationship data for each follower
        newFollowers = await fetchRelationshipData(newFollowers);
        
        if (reset) {
          setFollowers(newFollowers);
        } else {
          setFollowers(prev => [...prev, ...newFollowers]);
        }
        
        setHasMore(newFollowers.length === limit);
      } else {
        throw new Error(response.message || 'Failed to fetch followers');
      }
    } catch (err: any) {
      console.error('Error fetching followers:', err);
      setError(err.message || 'Failed to fetch followers');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    fetchFollowers(1, true);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFollowers(nextPage);
  };

  useEffect(() => {
    fetchFollowers(1, true);
  }, [userId]);

  if (loading && followers.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={handleRefresh}
            startIcon={<RefreshIcon />}
          >
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (followers.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No followers yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <List disablePadding>
        {followers.map((follower, index) => (
          <React.Fragment key={follower.id}>
            <ListItem 
              sx={{ 
                py: 1.5,
                px: 2,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.03)
                }
              }}
            >
              <ListItemAvatar>
                <UserAvatar
                  src={follower.avatar}
                  alt={follower.displayName}
                  size="medium"
                  isVerified={follower.isVerified}
                />
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => window.location.href = `/profile/${follower.username}`}
                    >
                      {follower.displayName}
                    </Typography>
                    {follower.isVerified && (
                      <Box 
                        component="span" 
                        sx={{ 
                          width: 16, 
                          height: 16, 
                          bgcolor: 'primary.main', 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}
                      >
                        <Box component="span" sx={{ color: 'white', fontSize: '0.6rem', fontWeight: 'bold' }}>✓</Box>
                      </Box>
                    )}
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: '0.8rem' }}
                    >
                      @{follower.username}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {follower.followerCount?.toLocaleString()} followers
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {follower.followingCount?.toLocaleString()} following
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              
              <ListItemSecondaryAction>
                <FollowButton
                  user={{
                    id: follower.id,
                    username: follower.username,
                    displayName: follower.displayName,
                    isFollowing: follower.isFollowing || false
                  }}
                  variant="button"
                  size="small"
                  onFollowChange={(isFollowing) => {
                    // Update the follower's isFollowing status in state
                    setFollowers(prev => prev.map(f => 
                      f.id === follower.id ? { ...f, isFollowing } : f
                    ));
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            {index < followers.length - 1 && (
              <Divider variant="middle" component="li" />
            )}
          </React.Fragment>
        ))}
      </List>
      
      {hasMore && (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Load More'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default FollowersList;