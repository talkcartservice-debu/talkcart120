import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

interface UseShareInteractionsProps {
  initialShareCount: number;
  postId: string;
  onShareUpdate?: (count: number) => void;
}

interface UseShareInteractionsReturn {
  shareCount: number;
  isSharePending: boolean;
  handleShare: (event: React.MouseEvent, platform?: string) => Promise<void>;
  handleShareWithFollowers: (message?: string) => Promise<void>;
  handleShareWithUsers: (userIds: string[], message?: string) => Promise<void>;
}

export const useShareInteractions = ({
  initialShareCount,
  postId,
  onShareUpdate,
}: UseShareInteractionsProps): UseShareInteractionsReturn => {
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [isSharePending, setIsSharePending] = useState(false);
  
  const { isAuthenticated, user } = useAuth();
  const { joinPost, leavePost, onPostShareUpdate } = useWebSocket();
  const router = useRouter();
  
  // Use ref to avoid stale closure issues
  const shareCountRef = useRef(shareCount);
  shareCountRef.current = shareCount;

  // Join post room for real-time updates
  useEffect(() => {
    if (postId) {
      joinPost(postId);
      
      return () => {
        leavePost(postId);
      };
    }
    
    // Explicitly return undefined for the case when postId is not defined
    return undefined;
  }, [postId, joinPost, leavePost]);

  // Listen for real-time share updates
  useEffect(() => {
    const unsubscribe = onPostShareUpdate((data) => {
      if (data.postId === postId) {
        // Update share count from real-time data
        setShareCount(data.shareCount);
        onShareUpdate?.(data.shareCount);
        
        // Show notification for other users' shares
        const currentUserId = user?.id;
        if (data.userId !== currentUserId) {
          toast.success(`Post shared by another user!`, {
            duration: 2000,
            icon: '🔄',
          });
        }
      }
    });

    return unsubscribe;
  }, [postId, onPostShareUpdate, user, onShareUpdate]);

  // Sync with initial values when they change
  useEffect(() => {
    setShareCount(initialShareCount);
  }, [initialShareCount]);

  const handleShare = useCallback(async (event: React.MouseEvent, platform: string = 'internal') => {
    event.stopPropagation();
    
    if (isSharePending) return;
    
    // Check authentication
    if (!isAuthenticated) {
      toast.error('Please log in to share posts');
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    
    setIsSharePending(true);
    
    // Store original value for rollback using ref to avoid stale closure
    const originalCount = shareCountRef.current;
    
    // Optimistic update
    const newShareCount = originalCount + 1;
    setShareCount(newShareCount);
    onShareUpdate?.(newShareCount);
    
    try {
      const response = await api.posts.share(postId, platform);
      
      if ((response as { success: boolean }).success) {
        // Update with server response to ensure consistency
        setShareCount((response as { data: { shareCount: number } }).data.shareCount);
        onShareUpdate?.((response as { data: { shareCount: number } }).data.shareCount);
        
        // Show success message
        toast.success('Post shared successfully!', {
          duration: 2000,
          icon: '🔄',
        });

        // If sharing to external platform, provide additional feedback
        if (platform !== 'internal') {
          toast.success(`Shared to ${platform}!`, {
            duration: 3000,
            icon: '📤',
          });
        }
      } else {
        throw new Error((response as { message?: string }).message || 'Failed to share post');
      }
    } catch (error) {
      console.error('Share error:', error);
      
      // Revert optimistic update on error
      setShareCount(originalCount);
      onShareUpdate?.(originalCount);
      
      toast.error('Failed to share post. Please try again.');
    } finally {
      setIsSharePending(false);
    }
  }, [isSharePending, isAuthenticated, postId, router, onShareUpdate]);

  const handleShareWithFollowers = useCallback(async (message: string = '') => {
    if (isSharePending) return;
    
    // Check authentication
    if (!isAuthenticated) {
      toast.error('Please log in to share posts');
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    
    setIsSharePending(true);
    
    try {
      const response = await api.posts.shareWithFollowers(postId, message);
      
      if ((response as { success: boolean }).success) {
        toast.success('Post shared with your followers!', {
          duration: 3000,
          icon: '👥',
        });
      } else {
        throw new Error((response as { message?: string }).message || 'Failed to share with followers');
      }
    } catch (error) {
      console.error('Share with followers error:', error);
      toast.error('Failed to share with followers. Please try again.');
    } finally {
      setIsSharePending(false);
    }
  }, [isSharePending, isAuthenticated, postId, router]);

  const handleShareWithUsers = useCallback(async (userIds: string[], message: string = '') => {
    if (isSharePending) return;
    
    // Check authentication
    if (!isAuthenticated) {
      toast.error('Please log in to share posts');
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    
    if (!userIds || userIds.length === 0) {
      toast.error('Please select users to share with');
      return;
    }
    
    setIsSharePending(true);
    
    try {
      const response = await api.posts.shareWithUsers(postId, userIds, message);
      
      if ((response as { success: boolean }).success) {
        toast.success(`Post shared with ${userIds.length} user${userIds.length > 1 ? 's' : ''}!`, {
          duration: 3000,
          icon: '📤',
        });
      } else {
        throw new Error((response as { message?: string }).message || 'Failed to share with users');
      }
    } catch (error) {
      console.error('Share with users error:', error);
      toast.error('Failed to share with users. Please try again.');
    } finally {
      setIsSharePending(false);
    }
  }, [isSharePending, isAuthenticated, postId, router]);

  return {
    shareCount,
    isSharePending,
    handleShare,
    handleShareWithFollowers,
    handleShareWithUsers,
  };
};