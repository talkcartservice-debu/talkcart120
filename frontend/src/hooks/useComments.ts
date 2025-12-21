import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api_final';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from './useSocket';
import toast from 'react-hot-toast';

export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    createdAt?: string;
    isFollowing?: boolean;
    isVerified?: boolean;
  };
  createdAt: string;
  updatedAt?: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
  replyCount?: number;
  level?: number;
  isEdited?: boolean;
  editHistory?: Array<{
    content: string;
    editedAt: string;
  }>;
  parent?: string;
  postId: string;
}

export interface CommentsResponse {
  success: boolean;
  data: {
    comments: Comment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface UseCommentsOptions {
  postId: string;
  enabled?: boolean;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'popular';
  realTimeUpdates?: boolean;
}

export const useComments = (options: UseCommentsOptions) => {
  const { postId, enabled = true, limit = 20, sortBy = 'newest', realTimeUpdates = true } = options;
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);

  // Socket connection for real-time updates
  const { socket, isConnected } = useSocket({
    enabled: enabled && realTimeUpdates
  });

  // Validate postId as a Mongo ObjectId (24 hex chars)
  const isValidPostId = typeof postId === 'string' && /^[0-9a-fA-F]{24}$/.test(postId.trim());

  // Fetch comments with pagination
  const {
    data: commentsData,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['comments', postId, sortBy],
    queryFn: async ({ pageParam = 1 }) => {
      if (!isValidPostId) {
        throw new Error('Invalid post ID');
      }
      try {
        return await api.comments.getByPostId(postId, {
          page: pageParam as number,
          limit,
          sortBy,
        });
      } catch (err: any) {
        // Enhance error message with more context
        const errorMessage = err?.message || 'Failed to load comments';
        throw new Error(`Comments loading failed: ${errorMessage}`);
      }
    },
    getNextPageParam: (lastPage: any) => {
      const { pagination } = lastPage.data;
      return pagination.page < pagination.pages ? pagination.page + 1 : undefined;
    },
    enabled: enabled && isValidPostId,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    initialPageParam: 1,
    retry: 1, // Retry once on failure
  });

  // Flatten paginated comments
  const comments = commentsData?.pages.flatMap((page: any) => page.data.comments) || [];
  const totalComments = (commentsData?.pages[0] as any)?.data?.pagination?.total || 0;

  // Real-time socket event handlers
  useEffect(() => {
    if (!socket || !isConnected || !realTimeUpdates) return;

    // Join the post room for targeted updates (server expects an object { postId })
    socket.emit('join-post', { postId });

    const handleNewComment = (data: { comment: Comment; postId: string }) => {
      if (data.postId !== postId) return;

      queryClient.setQueryData(['comments', postId, sortBy], (oldData: any) => {
        if (!oldData) return oldData;

        // Normalize potential parent id shapes from backend
        const parentRaw: any = (data.comment as any).parent;
        const parentId: string | null = parentRaw
          ? (typeof parentRaw === 'string'
            ? parentRaw
            : parentRaw?.toString?.() || parentRaw?.id || null)
          : null;

        // Insert reply into the correct parent, or prepend as top-level if no parent
        const insertReply = (comments: Comment[]): Comment[] => {
          return comments.map((c) => {
            if (parentId && c.id === parentId) {
              return {
                ...c,
                replies: [data.comment, ...(c.replies || [])],
                replyCount: (c.replyCount || 0) + 1,
              } as Comment;
            }
            if (c.replies && c.replies.length > 0) {
              return {
                ...c,
                replies: insertReply(c.replies),
              };
            }
            return c;
          });
        };

        const newPages = oldData.pages.map((page: any, idx: number) => {
          if (idx !== 0) return page; // only modify first page for top-level prepend

          if (!parentId) {
            // New top-level comment → prepend to first page
            return {
              ...page,
              data: {
                ...page.data,
                comments: [data.comment, ...page.data.comments],
                pagination: {
                  ...page.data.pagination,
                  total: page.data.pagination.total + 1,
                },
              },
            };
          }

          // Reply → insert under parent across the page
          return {
            ...page,
            data: {
              ...page.data,
              comments: insertReply(page.data.comments),
            },
          };
        });

        return {
          ...oldData,
          pages: newPages,
        };
      });

      // Show toast notification for new comments from others
      if (data.comment.author.id !== user?.id) {
        toast.success(`${data.comment.author.displayName} commented`, {
          duration: 3000,
          icon: '💬',
        });
      }
    };

    const handleCommentUpdated = (data: {
      commentId: string;
      likes: number;
      isLiked: boolean;
      action: 'like' | 'unlike' | 'edit';
      content?: string;
    }) => {
      queryClient.setQueryData(['comments', postId, sortBy], (oldData: any) => {
        if (!oldData) return oldData;

        const updateComment = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === data.commentId) {
              const updatedComment = {
                ...comment,
                likes: data.likes,
                isLiked: data.isLiked,
              };

              if (data.action === 'edit' && data.content) {
                updatedComment.content = data.content;
                updatedComment.isEdited = true;
                updatedComment.updatedAt = new Date().toISOString();
              }

              return updatedComment;
            }

            if (comment.replies) {
              return {
                ...comment,
                replies: updateComment(comment.replies),
              };
            }

            return comment;
          });
        };

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          data: {
            ...page.data,
            comments: updateComment(page.data.comments),
          },
        }));

        return {
          ...oldData,
          pages: newPages,
        };
      });
    };

    const handleCommentDeleted = (data: { commentId: string; postId: string }) => {
      if (data.postId === postId) {
        queryClient.setQueryData(['comments', postId, sortBy], (oldData: any) => {
          if (!oldData) return oldData;

          const removeComment = (comments: Comment[]): Comment[] => {
            return comments.filter(comment => {
              if (comment.id === data.commentId) {
                return false;
              }

              if (comment.replies) {
                comment.replies = removeComment(comment.replies);
              }

              return true;
            });
          };

          const newPages = oldData.pages.map((page: any) => ({
            ...page,
            data: {
              ...page.data,
              comments: removeComment(page.data.comments),
              pagination: {
                ...page.data.pagination,
                total: Math.max(0, page.data.pagination.total - 1),
              },
            },
          }));

          return {
            ...oldData,
            pages: newPages,
          };
        });
      }
    };

    socket.on('new-comment', handleNewComment);
    socket.on('comment-updated', handleCommentUpdated);
    socket.on('comment-deleted', handleCommentDeleted);

    return () => {
      socket.off('new-comment', handleNewComment);
      socket.off('comment-updated', handleCommentUpdated);
      socket.off('comment-deleted', handleCommentDeleted);
      // Leave the post room when cleaning up
      socket.emit('leave-post', { postId });
    };
  }, [socket, isConnected, postId, sortBy, queryClient, user?.id, realTimeUpdates]);

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: string }) => {
      // Allow anonymous commenting; server will attribute to anonymous user
      return api.comments.create({ postId, ...data });
    },
    onMutate: async (variables) => {
      // Optimistic update
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        content: variables.content,
        author: {
          id: user?.id || '',
          username: user?.username || '',
          displayName: user?.displayName || '',
          avatar: user?.avatar,
          isVerified: user?.isVerified || false,
        },
        createdAt: new Date().toISOString(),
        likes: 0,
        isLiked: false,
        replies: [],
        replyCount: 0,
        level: variables.parentId ? 1 : 0,
        parent: variables.parentId,
        postId,
      };

      setOptimisticComments(prev => [optimisticComment, ...prev]);
      return { optimisticComment };
    },
    onSuccess: (data, variables, context) => {
      // Remove optimistic comment
      setOptimisticComments(prev =>
        prev.filter(c => c.id !== context?.optimisticComment.id)
      );

      // The real-time update will handle adding the actual comment
      toast.success('Comment posted successfully!', { icon: '✅' });
    },
    onError: (error: any, variables, context) => {
      // Remove optimistic comment on error
      setOptimisticComments(prev =>
        prev.filter(c => c.id !== context?.optimisticComment.id)
      );

      if (error?.name === 'SessionExpiredError') {
        toast.error('Session expired. Please login to comment.');
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        } catch { }
        if (typeof window !== 'undefined') {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          try { window.location.assign(`/auth/login?next=${next}`); } catch { }
        }
      } else {
        toast.error(error.message || 'Failed to post comment');
      }
    },
  });

  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: async ({ commentId, isLiked }: { commentId: string; isLiked: boolean }) => {
      if (!isAuthenticated) {
        throw new Error('Please log in to like comments');
      }
      if (commentId.startsWith('temp-') || !/^[0-9a-fA-F]{24}$/.test(commentId)) {
        throw new Error('Comment is being posted');
      }
      return isLiked ? api.comments.unlike(commentId) : api.comments.like(commentId);
    },
    onMutate: async ({ commentId, isLiked }) => {
      // Optimistic update
      queryClient.setQueryData(['comments', postId, sortBy], (oldData: any) => {
        if (!oldData) return oldData;

        const updateComment = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likes: isLiked ? comment.likes - 1 : comment.likes + 1,
                isLiked: !isLiked,
              };
            }

            if (comment.replies) {
              return {
                ...comment,
                replies: updateComment(comment.replies),
              };
            }

            return comment;
          });
        };

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          data: {
            ...page.data,
            comments: updateComment(page.data.comments),
          },
        }));

        return {
          ...oldData,
          pages: newPages,
        };
      });
    },
    onSuccess: (data, { isLiked }) => {
      toast.success(isLiked ? 'Comment unliked' : 'Comment liked!', {
        icon: isLiked ? '💔' : '❤️',
        duration: 1500,
      });
    },
    onError: (error: any, { commentId, isLiked }) => {
      // Revert optimistic update
      queryClient.setQueryData(['comments', postId, sortBy], (oldData: any) => {
        if (!oldData) return oldData;

        const revertComment = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likes: isLiked ? comment.likes + 1 : comment.likes - 1,
                isLiked: isLiked,
              };
            }

            if (comment.replies) {
              return {
                ...comment,
                replies: revertComment(comment.replies),
              };
            }

            return comment;
          });
        };

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          data: {
            ...page.data,
            comments: revertComment(page.data.comments),
          },
        }));

        return {
          ...oldData,
          pages: newPages,
        };
      });

      if (error?.name === 'SessionExpiredError') {
        toast.error('Session expired. Please login to like comments.');
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        } catch { }
        if (typeof window !== 'undefined') {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          try { window.location.assign(`/auth/login?next=${next}`); } catch { }
        }
      } else {
        toast.error(error.message || 'Failed to update comment like');
      }
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!isAuthenticated) {
        throw new Error('Please log in to delete comments');
      }
      if (commentId.startsWith('temp-') || !/^[0-9a-fA-F]{24}$/.test(commentId)) {
        throw new Error('Comment is being posted');
      }
      return api.comments.delete(commentId);
    },
    onSuccess: () => {
      toast.success('Comment deleted successfully', { icon: '🗑️' });
    },
    onError: (error: any) => {
      if (error?.name === 'SessionExpiredError') {
        toast.error('Session expired. Please login to delete comments.');
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        } catch { }
        if (typeof window !== 'undefined') {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          try { window.location.assign(`/auth/login?next=${next}`); } catch { }
        }
      } else {
        toast.error(error.message || 'Failed to delete comment');
      }
    },
  });

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      if (!isAuthenticated) {
        throw new Error('Please log in to edit comments');
      }
      if (commentId.startsWith('temp-') || !/^[0-9a-fA-F]{24}$/.test(commentId)) {
        throw new Error('Comment is being posted');
      }
      return api.comments.edit(commentId, content);
    },
    onSuccess: () => {
      toast.success('Comment updated successfully', { icon: '✏️' });
    },
    onError: (error: any) => {
      if (error?.name === 'SessionExpiredError') {
        toast.error('Session expired. Please login to edit comments.');
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        } catch { }
        if (typeof window !== 'undefined') {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          try { window.location.assign(`/auth/login?next=${next}`); } catch { }
        }
      } else {
        toast.error(error.message || 'Failed to update comment');
      }
    },
  });

  // Report comment mutation
  const reportCommentMutation = useMutation({
    mutationFn: async ({ commentId, reason, description }: {
      commentId: string;
      reason: string;
      description?: string;
    }) => {
      if (!isAuthenticated) {
        throw new Error('Please log in to report comments');
      }
      return api.comments.report(commentId, reason, description);
    },
    onSuccess: () => {
      toast.success('Comment reported successfully', { icon: '🚨' });
    },
    onError: (error: any) => {
      if (error?.name === 'SessionExpiredError') {
        toast.error('Session expired. Please login to report comments.');
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        } catch { }
        if (typeof window !== 'undefined') {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          try { window.location.assign(`/auth/login?next=${next}`); } catch { }
        }
      } else {
        toast.error(error.message || 'Failed to report comment');
      }
    },
  });

  // Helper functions
  const createComment = useCallback((content: string, parentId?: string) => {
    createCommentMutation.mutate({ content, parentId });
  }, [createCommentMutation]);

  const likeComment = useCallback((commentId: string, isLiked: boolean) => {
    likeCommentMutation.mutate({ commentId, isLiked });
  }, [likeCommentMutation]);

  const deleteComment = useCallback((commentId: string) => {
    deleteCommentMutation.mutate(commentId);
  }, [deleteCommentMutation]);

  const editComment = useCallback((commentId: string, content: string) => {
    editCommentMutation.mutate({ commentId, content });
  }, [editCommentMutation]);

  const reportComment = useCallback((commentId: string, reason: string, description?: string) => {
    reportCommentMutation.mutate({ commentId, reason, description });
  }, [reportCommentMutation]);

  // Load full replies for a specific comment by fetching its thread
  const loadReplies = useCallback(async (parentCommentId: string, depth?: number) => {
    try {
      const res: any = await api.comments.getThread(parentCommentId, { maxDepth: depth ?? 5 });
      const thread = res?.data?.thread || res?.thread || res?.data;
      if (!thread) return;

      queryClient.setQueryData(['comments', postId, sortBy], (oldData: any) => {
        if (!oldData) return oldData;

        const mergeReplies = (comments: Comment[]): Comment[] => {
          return comments.map((c) => {
            if (c.id === parentCommentId) {
              const incoming: Comment[] = Array.isArray(thread.replies) ? thread.replies : [];
              // Merge by id to avoid duplicates, prefer incoming fields
              const mergedMap = new Map<string, Comment>();
              for (const r of c.replies || []) mergedMap.set(r.id, r);
              for (const r of incoming) mergedMap.set(r.id, { ...(mergedMap.get(r.id) || {} as any), ...r });
              const merged = Array.from(mergedMap.values());
              return {
                ...c,
                replies: merged,
                replyCount: Math.max(c.replyCount || 0, merged.length),
              } as Comment;
            }
            if (c.replies?.length) {
              return { ...c, replies: mergeReplies(c.replies) };
            }
            return c;
          });
        };

        const newPages = oldData.pages.map((page: any) => ({
          ...page,
          data: {
            ...page.data,
            comments: mergeReplies(page.data.comments),
          },
        }));

        return { ...oldData, pages: newPages };
      });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load replies');
    }
  }, [postId, sortBy, queryClient]);

  const loadMoreComments = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Combine real comments with optimistic comments
  const allComments = [...optimisticComments, ...comments];

  return {
    // Data
    comments: allComments,
    totalComments,
    hasNextPage,

    // Loading states
    isLoading,
    isFetchingNextPage,
    isCreating: createCommentMutation.isPending,
    isLiking: likeCommentMutation.isPending,
    isDeleting: deleteCommentMutation.isPending,
    isEditing: editCommentMutation.isPending,
    isReporting: reportCommentMutation.isPending,

    // Error states
    error,
    createError: createCommentMutation.error,
    likeError: likeCommentMutation.error,
    deleteError: deleteCommentMutation.error,
    editError: editCommentMutation.error,
    reportError: reportCommentMutation.error,

    // Actions
    createComment,
    likeComment,
    deleteComment,
    editComment,
    reportComment,
    loadMoreComments,
    loadReplies,
    refetch,

    // Real-time status
    isConnected,
    realTimeEnabled: realTimeUpdates,
  };
};

export default useComments;