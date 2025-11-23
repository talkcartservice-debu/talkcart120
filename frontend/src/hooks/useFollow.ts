import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { User } from '@/types';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

export interface UseFollowOptions {
  userId: string;
  initialFollowState?: boolean;
  onFollowChange?: (isFollowing: boolean, followerCount?: number) => void;
  showToast?: boolean;
  context?: 'profile' | 'post' | 'comment' | 'video' | 'stream' | 'marketplace';
}

export interface UseFollowReturn {
  isFollowing: boolean;
  isLoading: boolean;
  followerCount: number;
  toggleFollow: () => void;
  follow: () => void;
  unfollow: () => void;
  canFollow: boolean;
}

/**
 * Centralized hook for follow/unfollow functionality
 * Provides consistent behavior across all components
 */
export const useFollow = ({
  userId,
  initialFollowState = false,
  onFollowChange,
  showToast = true,
  context = 'profile'
}: UseFollowOptions): UseFollowReturn => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  // Safely access WebSocket context (it might not be available in all environments)
  let sendMessage: ((data: any) => void) | undefined;
  let subscribe: ((eventType: string, callback: (data: any) => void) => () => void) | undefined;
  
  try {
    const webSocket = useWebSocket();
    // Use a generic send method - we'll create a wrapper
    sendMessage = (data: any) => {
      if (webSocket.socket) {
        webSocket.socket.emit('follow_update', data);
      }
    };
    // For subscription, we'll need to implement a simple event system
    subscribe = (eventType: string, callback: (data: any) => void) => {
      if (webSocket.socket) {
        webSocket.socket.on(eventType, callback);
        return () => webSocket.socket?.off(eventType, callback);
      }
      return () => {};
    };
  } catch (error) {
    // WebSocket context not available, continue without real-time features
    console.warn('WebSocket context not available, follow functionality will work without real-time updates');
  }
  
  const [isFollowing, setIsFollowing] = useState(initialFollowState);
  const [followerCount, setFollowerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Check if current user can follow this user
  const canFollow = isAuthenticated && currentUser?.id !== userId && userId;

  // Subscribe to real-time follow updates
  useEffect(() => {
    if (!userId || !subscribe) return;

    const unsubscribe = subscribe('follow_update', (data: any) => {
      const { userId: followerId, targetUserId, action, followerCount: newFollowerCount } = data;
      
      // Update if this is about the user we're tracking
      if (targetUserId === userId) {
        // Update follower count
        if (newFollowerCount !== undefined) {
          setFollowerCount(newFollowerCount);
        }
        
        // Update follow state if current user is the one who followed/unfollowed
        if (followerId === currentUser?.id) {
          const newFollowState = action === 'follow';
          setIsFollowing(newFollowState);
          
          // Call callback
          if (onFollowChange) {
            onFollowChange(newFollowState, newFollowerCount);
          }
        }
      }
    });

    return unsubscribe;
  }, [userId, currentUser?.id, subscribe, onFollowChange]);

  // Optimistic update helper
  const updateOptimistically = useCallback((newFollowState: boolean) => {
    setIsFollowing(newFollowState);
    setFollowerCount(prev => newFollowState ? prev + 1 : Math.max(0, prev - 1));
  }, []);

  // Revert optimistic update helper
  const revertOptimisticUpdate = useCallback((originalState: boolean, originalCount: number) => {
    setIsFollowing(originalState);
    setFollowerCount(originalCount);
  }, []);

  // Invalidate relevant queries
  const invalidateQueries = useCallback(() => {
    // Invalidate user-specific queries
    queryClient.invalidateQueries({ queryKey: ['user', userId] });
    queryClient.invalidateQueries({ queryKey: ['user-followers', userId] });
    queryClient.invalidateQueries({ queryKey: ['user-following', userId] });
    
    // Invalidate current user's following list
    if (currentUser?.id) {
      queryClient.invalidateQueries({ queryKey: ['user-following', currentUser.id] });
      queryClient.invalidateQueries({ queryKey: ['user', currentUser.id] });
    }
    
    // Invalidate context-specific queries
    switch (context) {
      case 'post':
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        break;
      case 'video':
        queryClient.invalidateQueries({ queryKey: ['videos'] });
        break;
      case 'stream':
        queryClient.invalidateQueries({ queryKey: ['streams'] });
        break;
      case 'marketplace':
        queryClient.invalidateQueries({ queryKey: ['marketplace'] });
        break;
    }
  }, [userId, currentUser?.id, context, queryClient]);

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (): Promise<{ data?: { followerCount?: number } }> => {
      const result = await api.users.follow(userId);
      return result as { data?: { followerCount?: number } };
    },
    onMutate: () => {
      if (!canFollow) return;
      
      setIsLoading(true);
      const originalState = isFollowing;
      const originalCount = followerCount;
      
      // Optimistic update
      updateOptimistically(true);
      
      return { originalState, originalCount };
    },
    onSuccess: (data: { data?: { followerCount?: number } }, variables, context) => {
      setIsLoading(false);
      
      // Update follower count from server response if available
      if (data?.data?.followerCount !== undefined) {
        setFollowerCount(data.data.followerCount);
      }
      
      if (showToast) {
        toast.success('Successfully followed user!');
      }
      
      // Send WebSocket message for real-time updates
      if (sendMessage) {
        sendMessage({
          type: 'follow_update',
          data: {
            userId: currentUser?.id,
            targetUserId: userId,
            action: 'follow',
            followerCount: data?.data?.followerCount
          },
          timestamp: Date.now()
        });
      }
      
      // Call callback
      if (onFollowChange) {
        onFollowChange(true, data?.data?.followerCount || followerCount);
      }
      
      // Invalidate queries
      invalidateQueries();
    },
    onError: (error, variables, context) => {
      setIsLoading(false);
      
      // Revert optimistic update
      if (context) {
        revertOptimisticUpdate(context.originalState, context.originalCount);
      }
      
      console.error('Error following user:', error);
      if (showToast) {
        toast.error('Failed to follow user. Please try again.');
      }
    }
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async (): Promise<{ data?: { followerCount?: number } }> => {
      const result = await api.users.unfollow(userId);
      return result as { data?: { followerCount?: number } };
    },
    onMutate: () => {
      if (!canFollow) return;
      
      setIsLoading(true);
      const originalState = isFollowing;
      const originalCount = followerCount;
      
      // Optimistic update
      updateOptimistically(false);
      
      return { originalState, originalCount };
    },
    onSuccess: (data: { data?: { followerCount?: number } }, variables, context) => {
      setIsLoading(false);
      
      // Update follower count from server response if available
      if (data?.data?.followerCount !== undefined) {
        setFollowerCount(data.data.followerCount);
      }
      
      if (showToast) {
        toast.success('Successfully unfollowed user!');
      }
      
      // Send WebSocket message for real-time updates
      if (sendMessage) {
        sendMessage({
          type: 'follow_update',
          data: {
            userId: currentUser?.id,
            targetUserId: userId,
            action: 'unfollow',
            followerCount: data?.data?.followerCount
          },
          timestamp: Date.now()
        });
      }
      
      // Call callback
      if (onFollowChange) {
        onFollowChange(false, data?.data?.followerCount || followerCount);
      }
      
      // Invalidate queries
      invalidateQueries();
    },
    onError: (error, variables, context) => {
      setIsLoading(false);
      
      // Revert optimistic update
      if (context) {
        revertOptimisticUpdate(context.originalState, context.originalCount);
      }
      
      console.error('Error unfollowing user:', error);
      if (showToast) {
        toast.error('Failed to unfollow user. Please try again.');
      }
    }
  });

  // Follow function
  const follow = useCallback(() => {
    if (!canFollow) {
      if (showToast) {
        toast.error('Please log in to follow users');
      }
      return;
    }
    
    if (!isFollowing && !followMutation.isPending) {
      followMutation.mutate();
    }
  }, [canFollow, isFollowing, followMutation, showToast]);

  // Unfollow function
  const unfollow = useCallback(() => {
    if (!canFollow) return;
    
    if (isFollowing && !unfollowMutation.isPending) {
      unfollowMutation.mutate();
    }
  }, [canFollow, isFollowing, unfollowMutation]);

  // Toggle follow function
  const toggleFollow = useCallback(() => {
    if (!canFollow) {
      if (showToast) {
        toast.error('Please log in to follow users');
      }
      return;
    }
    
    if (isFollowing) {
      unfollow();
    } else {
      follow();
    }
  }, [canFollow, isFollowing, follow, unfollow, showToast]);

  return {
    isFollowing,
    isLoading: isLoading || followMutation.isPending || unfollowMutation.isPending,
    followerCount,
    toggleFollow,
    follow,
    unfollow,
    canFollow: canFollow as boolean
  };
};