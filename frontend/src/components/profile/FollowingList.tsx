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

interface Following {
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

interface FollowingListProps {
  userId: string;
  limit?: number;
}

const FollowingList: React.FC<FollowingListProps> = ({ userId, limit = 20 }) => {
  const theme = useTheme();
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchRelationshipData = async (following: Following[]): Promise<Following[]> => {
    try {
      // Fetch relationship data for all following
      const relationshipPromises = following.map(async (follow) => {
        try {
          const relationshipRes = await api.users.getRelationship(follow.id);
          if (relationshipRes.success) {
            return {
              ...follow,
              isFollowing: relationshipRes.data.isFollowing || false
            };
          }
          return follow;
        } catch (err) {
          console.error(`Error fetching relationship for ${follow.id}:`, err);
          return follow;
        }
      });
      
      const followingWithRelationship = await Promise.all(relationshipPromises);
      return followingWithRelationship;
    } catch (err) {
      console.error('Error fetching relationship data:', err);
      return following;
    }
  };

  const fetchFollowing = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.users.getFollowing(userId, limit, (pageNum - 1) * limit);
      
      if (response.success) {
        let newFollowing = response.data?.data?.following || response.data?.data?.items || response.data?.following || response.data?.items || [];
        
        // Fetch relationship data for each following
        newFollowing = await fetchRelationshipData(newFollowing);
        
        if (reset) {
          setFollowing(newFollowing);
        } else {
          setFollowing(prev => [...prev, ...newFollowing]);
        }
        
        setHasMore(newFollowing.length === limit);
      } else {
        throw new Error(response.message || response.error || 'Failed to fetch following');
      }
    } catch (err: any) {
      console.error('Error fetching following:', err);
      setError(err.message || 'Failed to fetch following');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    fetchFollowing(1, true);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFollowing(nextPage);
  };

  useEffect(() => {
    if (userId) {
      fetchFollowing(1, true);
    }
  }, [userId]);

  if (loading && following.length === 0) {
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

  if (following.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          Not following anyone yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <List disablePadding>
        {following.map((follow, index) => (
          <React.Fragment key={follow.id}>
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
                  src={follow.avatar}
                  alt={follow.displayName}
                  size="medium"
                  isVerified={follow.isVerified}
                />
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => window.location.href = `/profile/${follow.username}`}
                    >
                      {follow.displayName}
                    </Typography>
                    {follow.isVerified && (
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
                      @{follow.username}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {follow.followerCount?.toLocaleString()} followers
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {follow.followingCount?.toLocaleString()} following
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              
              <ListItemSecondaryAction>
                <FollowButton
                  user={{
                    id: follow.id,
                    username: follow.username,
                    displayName: follow.displayName,
                    isFollowing: follow.isFollowing || false
                  }}
                  variant="button"
                  size="small"
                  onFollowChange={(isFollowing) => {
                    // Update the follow's isFollowing status in state
                    setFollowing(prev => prev.map(f => 
                      f.id === follow.id ? { ...f, isFollowing } : f
                    ));
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            {index < following.length - 1 && (
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

export default FollowingList;