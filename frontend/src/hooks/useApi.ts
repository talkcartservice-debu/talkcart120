import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { User, ApiResponse } from '@/types';
import toast from 'react-hot-toast';

// Query keys for consistent cache management
export const queryKeys = {
  // Auth
  auth: {
    me: ['auth', 'me'] as const,
    profile: ['auth', 'profile'] as const,
  },
  // Users
  users: {
    all: (params?: any) => ['users', 'all', params] as const,
    byId: (id: string) => ['users', 'byId', id] as const,
    byUsername: (username: string) => ['users', 'byUsername', username] as const,
    followers: (id: string, params?: any) => ['users', 'followers', id, params] as const,
    following: (id: string, params?: any) => ['users', 'following', id, params] as const,
    search: (query: string, params?: any) => ['users', 'search', query, params] as const,
  },
  // Posts
  posts: {
    all: (params?: any) => ['posts', 'all', params] as const,
    byId: (id: string) => ['posts', 'byId', id] as const,
    byUser: (userId: string) => ['posts', 'byUser', userId] as const,
    byUsername: (username: string) => ['posts', 'byUsername', username] as const,
    public: (params?: any) => ['posts', 'public', params] as const,
    bookmarks: (userId: string, params?: any) => ['posts', 'bookmarks', userId, params] as const,
    trending: (params?: any) => ['posts', 'trending', params] as const,
  },
  // Comments
  comments: {
    byPostId: (postId: string, params?: any) => ['comments', 'byPostId', postId, params] as const,
  },
  // Messages
  messages: {
    conversations: (params?: any) => ['messages', 'conversations', params] as const,
    messages: (conversationId: string, params?: any) => ['messages', 'messages', conversationId, params] as const,
  },
  // Marketplace
  marketplace: {
    products: (params?: any) => ['marketplace', 'products', params] as const,
    productById: (id: string) => ['marketplace', 'products', id] as const,
    categories: ['marketplace', 'categories'] as const,
    cart: ['marketplace', 'cart'] as const,
    wishlists: ['marketplace', 'wishlists'] as const,
  },
  // Streams
  streams: {
    all: (params?: any) => ['streams', 'all', params] as const,
    byId: (id: string) => ['streams', 'byId', id] as const,
    live: (params?: any) => ['streams', 'live', params] as const,
    trending: (params?: any) => ['streams', 'trending', params] as const,
    following: (params?: any) => ['streams', 'following', params] as const,
  },
  // DAO
  dao: {
    all: (params?: any) => ['dao', 'all', params] as const,
    byId: (id: string) => ['dao', 'byId', id] as const,
    proposals: (params?: any) => ['dao', 'proposals', params] as const,
    proposalById: (id: string) => ['dao', 'proposals', id] as const,
  },
  // NFTs
  nfts: {
    all: (params?: any) => ['nfts', 'all', params] as const,
    byId: (id: string) => ['nfts', 'byId', id] as const,
    byUser: (userId: string) => ['nfts', 'byUser', userId] as const,
    byUsername: (username: string) => ['nfts', 'byUsername', username] as const,
  },
} as const;

// Auth hooks
export const useAuthProfile = () => {
  return useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: async () => {
      const response = await api.auth.getProfile();
      return response.data;
    },
  });
};

// User hooks
export const useUsers = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.users.all(params),
    queryFn: async () => {
      const response: any = await api.users.getAll(params);
      return response.data;
    },
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.byId(id),
    queryFn: async () => {
      const response: any = await api.users.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useUserByUsername = (username: string) => {
  return useQuery({
    queryKey: queryKeys.users.byUsername(username),
    queryFn: async () => {
      const response: any = await api.users.getByUsername(username);
      return response.data;
    },
    enabled: !!username,
  });
};

export const useFollowUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const response: any = await api.users.follow(userId);
      return response.data;
    },
    onSuccess: (data, userId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users.byId(userId) });
      queryClient.invalidateQueries({ queryKey: ['users', 'followers'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'following'] });
      toast.success('User followed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to follow user');
    },
  });
};

export const useUnfollowUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const response: any = await api.users.unfollow(userId);
      return response.data;
    },
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.byId(userId) });
      queryClient.invalidateQueries({ queryKey: ['users', 'followers'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'following'] });
      toast.success('User unfollowed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unfollow user');
    },
  });
};

// Post hooks
export const usePosts = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.posts.all(params),
    queryFn: async () => {
      const response: any = await api.posts.getAll(params);
      return response.data;
    },
  });
};

export const usePublicPosts = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.posts.public(params),
    queryFn: async () => {
      const response: any = await api.posts.getPublicPosts(params);
      return response.data;
    },
  });
};

export const usePost = (id: string) => {
  return useQuery({
    queryKey: queryKeys.posts.byId(id),
    queryFn: async () => {
      const response: any = await api.posts.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useUserPosts = (username: string) => {
  return useQuery({
    queryKey: queryKeys.posts.byUsername(username),
    queryFn: async () => {
      try {
        const response: any = await api.posts.getUserPosts(username);
        if (response?.success && response?.data) {
          return response.data;
        } else if (response?.success && response?.posts) {
          // Handle older API response format
          return response;
        } else {
          // Handle error response properly
          const errorMessage = response?.message || response?.error || 'Failed to fetch user posts';
          throw new Error(errorMessage);
        }
      } catch (err: any) {
        // Re-throw HttpError so it can be handled by React Query
        if (err.name === 'HttpError') {
          throw err;
        } else {
          throw new Error(err.message || 'Failed to fetch user posts');
        }
      }
    },
    enabled: !!username,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (postData: any) => {
      const response: any = await api.posts.create(postData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create post');
    },
  });
};

export const useLikePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (postId: string) => {
      const response: any = await api.posts.like(postId);
      return response.data;
    },
    onSuccess: (data, postId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.byId(postId) });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to like post');
    },
  });
};

export const useUnlikePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (postId: string) => {
      const response: any = await api.posts.unlike(postId);
      return response.data;
    },
    onSuccess: (data, postId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.byId(postId) });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unlike post');
    },
  });
};

// Comment hooks
export const useComments = (postId: string, params?: any) => {
  return useQuery({
    queryKey: queryKeys.comments.byPostId(postId, params),
    queryFn: async () => {
      const response: any = await api.comments.getByPostId(postId, params);
      return response.data;
    },
    enabled: !!postId,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, content, parentId }: { postId: string; content: string; parentId?: string }) => {
      const response: any = await api.comments.create({ postId, content, parentId });
      return response.data;
    },
    onSuccess: (data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byPostId(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.byId(postId) });
      toast.success('Comment added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });
};

// Media upload hooks
export const useUploadMedia = () => {
  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'avatar' | 'cover' | 'post' }) => {
      const response: any = await api.media.upload(file, type);
      return response.data;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload media');
    },
  });
};

export const useUploadMultipleMedia = () => {
  return useMutation({
    mutationFn: async ({ files, type }: { files: File[]; type: 'post' }) => {
      const response: any = await api.media.uploadMultiple(files, type);
      return response.data;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload media');
    },
  });
};

// Marketplace hooks
export const useProducts = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.marketplace.products(params),
    queryFn: async () => {
      const response: any = await api.marketplace.getProducts(params);
      return response.data;
    },
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: queryKeys.marketplace.productById(id),
    queryFn: async () => {
      const response: any = await api.marketplace.getProductById(id);
      return response.data;
    },
    enabled: !!id,
  });
};

// Stream hooks
export const useStreams = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.streams.all(params),
    queryFn: async () => {
      const response: any = await api.streams.getAll(params);
      return response.data;
    },
  });
};

export const useLiveStreams = (params?: any) => {
  return useQuery({
    queryKey: queryKeys.streams.live(params),
    queryFn: async () => {
      const response: any = await api.streams.getLive(params);
      return response.data;
    },
  });
};

export const useStream = (id: string) => {
  return useQuery({
    queryKey: queryKeys.streams.byId(id),
    queryFn: async () => {
      const response: any = await api.streams.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
};