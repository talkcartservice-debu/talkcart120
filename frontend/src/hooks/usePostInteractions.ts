import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

interface UsePostInteractionsProps {
  initialLiked: boolean;
  initialLikeCount: number;
  initialShareCount: number;
  postId: string;
  onLikeUpdate?: (liked: boolean, count: number) => void;
  onShareUpdate?: (count: number) => void;
}

interface UsePostInteractionsReturn {
  liked: boolean;
  likeCount: number;
  shareCount: number;
  isLikePending: boolean;
  isSharePending: boolean;
  handleLike: (event: React.MouseEvent) => Promise<void>;
  handleComment: (event: React.MouseEvent) => void;
  handleShare: (event: React.MouseEvent) => Promise<void>;
}

export const usePostInteractions = ({
  initialLiked,
  initialLikeCount,
  initialShareCount,
  postId,
  onLikeUpdate,
  onShareUpdate,
}: UsePostInteractionsProps): UsePostInteractionsReturn => {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [isLikePending, setIsLikePending] = useState(false);
  const [isSharePending, setIsSharePending] = useState(false);
  
  const { isAuthenticated, user } = useAuth();
  const { joinPost, leavePost, onPostLikeUpdate, onPostShareUpdate } = useWebSocket();
  const router = useRouter();

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

  // Listen for real-time like updates
  useEffect(() => {
    const unsubscribe = onPostLikeUpdate((data) => {
      if (data.postId === postId) {
        // Only update if the like action was from another user
        const currentUserId = user?.id || user?._id;
        if (data.userId !== currentUserId) {
          setLikeCount(data.likeCount);
          // Don't update the liked state for other users' actions
          // Each user maintains their own like state
        }
      }
    });

    return unsubscribe;
  }, [postId, onPostLikeUpdate, user]);

  // Listen for real-time share updates
  useEffect(() => {
    const unsubscribe = onPostShareUpdate((data) => {
      if (data.postId === postId) {
        // Update share count from real-time data
        setShareCount(data.shareCount);
        onShareUpdate?.(data.shareCount);
        
        // Show notification for other users' shares
        const currentUserId = user?.id || user?._id;
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
    setLiked(initialLiked);
    setLikeCount(initialLikeCount);
    setShareCount(initialShareCount);
  }, [initialLiked, initialLikeCount, initialShareCount]);

  const handleLike = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (isLikePending) return;
    
    // Check authentication
    if (!isAuthenticated) {
      toast.error('Please log in to like posts');
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    
    setIsLikePending(true);
    
    // Store original values for rollback
    const originalLiked = liked;
    const originalCount = likeCount;
    
    // Optimistic update
    const newLiked = !liked;
    const newLikeCount = newLiked ? likeCount + 1 : likeCount - 1;
    
    setLiked(newLiked);
    setLikeCount(newLikeCount);
    
    // Notify parent component
    onLikeUpdate?.(newLiked, newLikeCount);
    
    try {
      const response: any = await api.posts.like(postId);
      
      if (response.success) {
        // Update with server response to ensure consistency
        setLiked(response.data.isLiked);
        setLikeCount(response.data.likeCount);
        onLikeUpdate?.(response.data.isLiked, response.data.likeCount);
        
        // Show success message
        const action = response.data.action === 'like' ? 'liked' : 'unliked';
        toast.success(`Post ${action}!`, {
          duration: 2000,
          icon: response.data.action === 'like' ? '❤️' : '💔',
        });
      } else {
        throw new Error(response.message || 'Failed to update like status');
      }
    } catch (error: any) {
      // Handle expired session explicitly to avoid noisy runtime overlays
      if (error?.name === 'SessionExpiredError') {
        // Revert optimistic update
        setLiked(originalLiked);
        setLikeCount(originalCount);
        onLikeUpdate?.(originalLiked, originalCount);
        
        toast.error('Session expired. Please login again.');
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        } catch {}
        router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      } else {
        console.error('Like error:', error);
        // Revert optimistic update on error
        setLiked(originalLiked);
        setLikeCount(originalCount);
        onLikeUpdate?.(originalLiked, originalCount);
        toast.error('Failed to update like status. Please try again.');
      }
    } finally {
      setIsLikePending(false);
    }
  }, [liked, likeCount, isLikePending, isAuthenticated, postId, router, onLikeUpdate]);

  const handleComment = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    router.push(`/post/${postId}?focus=comments`);
  }, [postId, router]);

  const handleShare = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (isSharePending) return;
    
    // Check authentication
    if (!isAuthenticated) {
      toast.error('Please log in to share posts');
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    
    setIsSharePending(true);
    
    // Store original value for rollback
    const originalCount = shareCount;
    
    // Optimistic update
    const newShareCount = shareCount + 1;
    setShareCount(newShareCount);
    onShareUpdate?.(newShareCount);
    
    try {
      const response: any = await api.posts.share(postId);
      
      if (response.success) {
        // Update with server response to ensure consistency
        setShareCount(response.data.shareCount);
        onShareUpdate?.(response.data.shareCount);
        
        // Show success message
        toast.success('Post shared successfully!', {
          duration: 2000,
          icon: '🔄',
        });

        // Also copy link to clipboard for convenience
        const postUrl = `${window.location.origin}/post/${postId}`;
        navigator.clipboard.writeText(postUrl).then(() => {
          toast.success('Post link copied to clipboard!', {
            duration: 2000,
            icon: '📋',
          });
        }).catch(() => {
          // Ignore clipboard errors
        });
      } else {
        throw new Error(response.message || 'Failed to share post');
      }
    } catch (error: any) {
      if (error?.name === 'SessionExpiredError') {
        // Revert optimistic update
        setShareCount(originalCount);
        onShareUpdate?.(originalCount);
        toast.error('Session expired. Please login again.');
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        } catch {}
        router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      } else {
        console.error('Share error:', error);
        // Revert optimistic update on error
        setShareCount(originalCount);
        onShareUpdate?.(originalCount);
        toast.error('Failed to share post. Please try again.');
      }
    } finally {
      setIsSharePending(false);
    }
  }, [shareCount, isSharePending, isAuthenticated, postId, router, onShareUpdate]);

  return {
    liked,
    likeCount,
    shareCount,
    isLikePending,
    isSharePending,
    handleLike,
    handleComment,
    handleShare,
  };
};