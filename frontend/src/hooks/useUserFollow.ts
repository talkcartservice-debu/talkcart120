import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

interface UseUserFollowProps {
  initialFollowing: boolean;
  userId: string;
  onFollowUpdate?: (following: boolean) => void;
}

interface UseUserFollowReturn {
  following: boolean;
  isFollowPending: boolean;
  handleFollow: (event: React.MouseEvent) => Promise<void>;
}

export const useUserFollow = ({
  initialFollowing,
  userId,
  onFollowUpdate,
}: UseUserFollowProps): UseUserFollowReturn => {
  const [following, setFollowing] = useState(initialFollowing);
  const [isFollowPending, setIsFollowPending] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleFollow = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (isFollowPending) return;
    
    // Check authentication
    if (!isAuthenticated) {
      toast.error('Please log in to follow users');
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    
    setIsFollowPending(true);
    
    // Store original value for rollback
    const originalFollowing = following;
    
    // Optimistic update
    const newFollowing = !following;
    setFollowing(newFollowing);
    onFollowUpdate?.(newFollowing);
    
    try {
      let response;
      if (newFollowing) {
        // Follow the user
        response = await api.users.follow(userId);
      } else {
        // Unfollow the user
        response = await api.users.unfollow(userId);
      }
      
      if ((response as { success: boolean }).success) {
        // Update with server response to ensure consistency
        setFollowing((response as { data?: { following?: boolean } }).data?.following ?? newFollowing);
        onFollowUpdate?.((response as { data?: { following?: boolean } }).data?.following ?? newFollowing);
        
        // Show success message
        const action = newFollowing ? 'followed' : 'unfollowed';
        toast.success(`User ${action}!`, {
          duration: 2000,
          icon: newFollowing ? '👤' : '👋',
        });
      } else {
        throw new Error((response as { message?: string }).message || 'Failed to update follow status');
      }
    } catch (error: any) {
      // Handle expired session explicitly to avoid noisy runtime overlays
      if (error?.name === 'SessionExpiredError') {
        // Revert optimistic update
        setFollowing(originalFollowing);
        onFollowUpdate?.(originalFollowing);
        
        toast.error('Session expired. Please login again.');
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        } catch {}
        router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      } else {
        console.error('Follow error:', error);
        // Revert optimistic update on error
        setFollowing(originalFollowing);
        onFollowUpdate?.(originalFollowing);
        toast.error('Failed to update follow status. Please try again.');
      }
    } finally {
      setIsFollowPending(false);
    }
  }, [following, isFollowPending, isAuthenticated, userId, router, onFollowUpdate]);

  return {
    following,
    isFollowPending,
    handleFollow,
  };
};