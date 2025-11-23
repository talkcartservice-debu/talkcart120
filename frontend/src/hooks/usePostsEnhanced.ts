import { useState, useEffect, useCallback } from 'react';
import { enhancedPostsApi } from '@/lib/api-enhanced';
import { Post } from '@/types/social';

interface UsePostsEnhancedReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  loadMore: () => void;
  hasMore: boolean;
  page: number;
  fetchPosts: (options: { feedType?: string; page?: number; reset?: boolean }) => void;
  fetchBookmarkedPosts: (userId: string) => void;
  likePost: (postId: string) => void;
  bookmarkPost: (postId: string) => void;
  sharePost: (postId: string) => void;
}

interface UsePostsEnhancedOptions {
  feedType?: 'for-you' | 'following' | 'recent' | 'trending';
  limit?: number;
  authorId?: string;
  hashtag?: string;
  search?: string;
}

interface FetchPostsOptions {
  feedType?: string;
  page?: number;
  reset?: boolean;
}

export const usePostsEnhanced = (options: UsePostsEnhancedOptions = {}): UsePostsEnhancedReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [refreshFlag, setRefreshFlag] = useState<number>(0);
  
  const {
    feedType = 'for-you',
    limit = 20,
    authorId,
    hashtag,
    search
  } = options;
  
  const processPosts = (postsData: any[]): Post[] => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 processPosts called with:', postsData);
    }
    
    const result = postsData.map((post: any) => {
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Processing post:', post);
      }
      
      // Log the raw post data
      console.log('Raw post data:', post);
      
      // Ensure media array exists and is properly structured
      const media = Array.isArray(post.media) ? post.media.map((mediaItem: any) => {
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('Processing media item:', mediaItem);
        }
        
        // Handle case where mediaItem might be a string URL instead of an object
        if (typeof mediaItem === 'string') {
          console.log('Media item is string, converting to object');
          return {
            url: mediaItem,
            secure_url: mediaItem,
            resource_type: mediaItem.match(/\.(mp4|mov|webm|ogg|avi)$/i) ? 'video' : 'image',
            id: mediaItem
          };
        }
        
        // Ensure proper media structure
        const processedMediaItem = {
          ...mediaItem,
          id: mediaItem.id || mediaItem._id || mediaItem.public_id || mediaItem.url || mediaItem.secure_url,
          secure_url: mediaItem.secure_url || mediaItem.url,
          resource_type: mediaItem.resource_type || ((mediaItem.url || mediaItem.secure_url)?.match(/\.(mp4|mov|webm|ogg|avi)$/i) ? 'video' : 'image'),
          url: mediaItem.url || mediaItem.secure_url,
        };
        
        // Additional fix for localhost URLs that might be missing extensions
        if (processedMediaItem.url && processedMediaItem.url.includes('localhost:') && !processedMediaItem.url.includes('.')) {
          // Try to determine if it's a video or image based on context
          if (processedMediaItem.resource_type === 'video' || processedMediaItem.url.includes('video')) {
            processedMediaItem.url += '.mp4';
            processedMediaItem.secure_url = processedMediaItem.url;
          } else {
            processedMediaItem.url += '.png';
            processedMediaItem.secure_url = processedMediaItem.url;
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Processed media item:', processedMediaItem);
        }
        
        return processedMediaItem;
      }) : [];
      
      // Log the processed media
      console.log('Processed media:', media);
      
      // Ensure author object exists
      const author = post.author ? {
        ...post.author,
        id: post.author.id || post.author._id,
        name: post.author.name || post.author.displayName || post.author.username,
      } : null;
      
      // Log the author
      console.log('Processed author:', author);
      
      // Ensure post has an id
      const id = post.id || post._id;
      
      // Log the id
      console.log('Post id:', id);
      
      // Determine post type based on content and media
      let type: 'text' | 'image' | 'video' = 'text';
      if (media && media.length > 0) {
        const firstMedia = media[0];
        if (firstMedia && firstMedia.resource_type) {
          if (firstMedia.resource_type === 'video') {
            type = 'video';
          } else if (firstMedia.resource_type === 'image') {
            type = 'image';
          }
        }
      }
      
      const processedPost = {
        ...post,
        id,
        type,
        author,
        media,
        likeCount: post.likeCount || post.likes || 0,
        commentCount: post.commentCount || post.comments || 0,
        shareCount: post.shareCount || post.shares || 0,
        bookmarkCount: post.bookmarkCount || post.bookmarks || 0,
        isLiked: post.isLiked || false,
        isBookmarked: post.isBookmarked || false,
        isShared: post.isShared || false,
        createdAt: post.createdAt || post.created_at,
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Processed post:', processedPost);
      }
      
      return processedPost;
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ processPosts result:', result);
    }
    
    return result;
  };
  
  const fetchPosts = useCallback(async (options: FetchPostsOptions = {}) => {
    const { feedType: currentFeedType = feedType, page: pageNum = 1, reset = false } = options;
    
    if (loading) return;
    
    setLoading(true);
    if (reset) {
      setPosts([]);
    }
    setError(null);
    
    // Retry mechanism
    let retries = 0;
    const maxRetries = 2;
    
    while (retries <= maxRetries) {
      try {
        console.log(`Fetching enhanced posts - Page: ${pageNum}, Feed: ${currentFeedType}${retries > 0 ? ` (retry ${retries})` : ''}`);
        
        // Build query parameters
        const queryParams: any = {
          feedType: currentFeedType,
          limit: limit.toString(),
          page: pageNum.toString()
        };
        
        if (authorId) queryParams.authorId = authorId;
        if (hashtag) queryParams.hashtag = hashtag;
        if (search) queryParams.search = search;
        
        // Use the enhanced API service
        const response: any = await enhancedPostsApi.getEnhancedPosts(queryParams);
        
        if (response && response.success) {
          // Process posts to ensure proper structure
          const processedPosts = processPosts(response.data?.posts || response.posts || []);
          
          if (reset || pageNum === 1) {
            // Replace posts
            if (process.env.NODE_ENV === 'development') {
              console.log('📋 Setting posts (reset):', processedPosts);
            }
            setPosts(processedPosts);
          } else {
            // Append new posts to existing ones
            if (process.env.NODE_ENV === 'development') {
              console.log('📋 Appending posts:', processedPosts);
            }
            setPosts(prev => [...prev, ...processedPosts]);
          }
          
          // Update pagination info
          if (response.data?.pagination) {
            setHasMore(pageNum < response.data.pagination.pages);
          } else if (response.pagination) {
            setHasMore(pageNum < response.pagination.pages);
          } else {
            setHasMore(processedPosts.length === limit);
          }
          
          setPage(pageNum);
          
          console.log(`Successfully fetched ${processedPosts.length} posts`);
          break; // Success, exit retry loop
        } else {
          throw new Error(response?.message || 'Failed to fetch posts');
        }
      } catch (err: any) {
        retries++;
        console.error(`Error fetching posts (attempt ${retries}):`, err);
        
        // If we've exhausted retries or it's a non-retryable error, handle it
        if (retries > maxRetries || (err.message && (err.message.includes('400') || err.message.includes('401') || err.message.includes('403') || err.message.includes('404')))) {
          let errorMessage = err.message || 'Failed to fetch posts. Please try again.';
          
          // Handle specific timeout errors
          if (err.message && (err.message.includes('timeout') || err.message.includes('408'))) {
            errorMessage = 'Request timed out. Please check your internet connection and try again.';
          }
          
          setError(errorMessage);
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (retries <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    }
    
    setLoading(false);
  }, [feedType, authorId, hashtag, search, limit, loading]);

  const fetchBookmarkedPosts = useCallback(async (userId: string) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    // Retry mechanism
    let retries = 0;
    const maxRetries = 2;
    
    while (retries <= maxRetries) {
      try {
        console.log(`Fetching bookmarked posts for user: ${userId}${retries > 0 ? ` (retry ${retries})` : ''}`);
        
        // Use the enhanced API service
        const response: any = await enhancedPostsApi.getBookmarkedPosts(userId, { limit, page: 1 });
        
        if (response && response.success) {
          // Process posts to ensure proper structure
          const processedPosts = processPosts(response.data?.posts || response.posts || []);
          
          // Replace posts with bookmarked posts
          setPosts(processedPosts);
          
          // Update pagination info
          if (response.data?.pagination) {
            setHasMore(1 < response.data.pagination.pages);
          } else if (response.pagination) {
            setHasMore(1 < response.pagination.pages);
          } else {
            setHasMore(processedPosts.length === limit);
          }
          
          setPage(1);
          
          console.log(`Successfully fetched ${processedPosts.length} bookmarked posts`);
          break; // Success, exit retry loop
        } else {
          throw new Error(response?.message || 'Failed to fetch bookmarked posts');
        }
      } catch (err: any) {
        retries++;
        console.error(`Error fetching bookmarked posts (attempt ${retries}):`, err);
        
        // If we've exhausted retries or it's a non-retryable error, handle it
        if (retries > maxRetries || (err.message && (err.message.includes('400') || err.message.includes('401') || err.message.includes('403') || err.message.includes('404')))) {
          let errorMessage = err.message || 'Failed to fetch bookmarked posts. Please try again.';
          
          // Handle specific timeout errors
          if (err.message && (err.message.includes('timeout') || err.message.includes('408'))) {
            errorMessage = 'Request timed out. Please check your internet connection and try again.';
          }
          
          setError(errorMessage);
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (retries <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }
    }
    
    setLoading(false);
  }, [limit, loading]);

  // Enhanced post interaction functions using the new endpoints
  const likePost = useCallback(async (postId: string) => {
    console.log(`Like post: ${postId}`);
    try {
      const response = await enhancedPostsApi.likeEnhancedPost(postId);
      if (response && response.success) {
        // Update the UI with the new like count
        setPosts(prev => prev.map(post => 
          post.id === postId ? { 
            ...post, 
            isLiked: response.data.action === 'like',
            likeCount: response.data.likeCount
          } : post
        ));
      }
    } catch (error: any) {
      console.error('Error liking post:', error);
      // Show error message
      if (typeof window !== 'undefined') {
        const toast = (await import('react-hot-toast')).default;
        toast.error(error.message || 'Failed to like post. Please try again.');
      }
    }
  }, []);

  const bookmarkPost = useCallback(async (postId: string) => {
    console.log(`Bookmark post: ${postId}`);
    try {
      const response = await enhancedPostsApi.bookmarkEnhancedPost(postId);
      if (response && response.success) {
        // Update the UI with the new bookmark status
        setPosts(prev => prev.map(post => 
          post.id === postId ? { 
            ...post, 
            isBookmarked: response.data.isBookmarked
          } : post
        ));
      }
    } catch (error: any) {
      console.error('Error bookmarking post:', error);
      // Show error message
      if (typeof window !== 'undefined') {
        const toast = (await import('react-hot-toast')).default;
        toast.error(error.message || 'Failed to bookmark post. Please try again.');
      }
    }
  }, []);

  const sharePost = useCallback(async (postId: string) => {
    console.log(`Share post: ${postId}`);
    try {
      const response = await enhancedPostsApi.shareEnhancedPost(postId, 'internal');
      if (response && response.success) {
        // Update the UI with the new share count
        setPosts(prev => prev.map(post => 
          post.id === postId ? { 
            ...post, 
            shareCount: response.data.shareCount,
            isShared: true
          } : post
        ));
        
        // Show success message
        if (typeof window !== 'undefined') {
          const toast = (await import('react-hot-toast')).default;
          toast.success('Post shared successfully!');
        }
      }
    } catch (error: any) {
      console.error('Error sharing post:', error);
      // Show error message
      if (typeof window !== 'undefined') {
        const toast = (await import('react-hot-toast')).default;
        toast.error(error.message || 'Failed to share post. Please try again.');
      }
    }
  }, []);

  // Fetch posts when component mounts or options change
  useEffect(() => {
    fetchPosts({ feedType, page: 1, reset: true });
  }, [feedType, authorId, hashtag, search, refreshFlag]);

  // Add event listener for real-time post updates
  useEffect(() => {
    const handleNewPost = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newPost = customEvent.detail?.post;
      
      console.log('Received new post event:', newPost);
      
      if (newPost) {
        // Prepend the new post to the beginning of the feed
        // Process the new post to ensure proper structure
        const processedPosts = processPosts([newPost]);
        console.log('Processed posts:', processedPosts);
        if (processedPosts.length > 0) {
          const processedPost = processedPosts[0];
          if (processedPost) {
            console.log('Processed post:', processedPost);
            // Check if post already exists to avoid duplicates
            // Use a more robust comparison that handles both id and _id
            const exists = processedPost.id ? posts.some((post: Post) => {
              const postId = post.id;
              const newPostId = processedPost.id;
              console.log('Comparing post IDs:', postId, newPostId);
              return postId && newPostId && postId.toString() === newPostId.toString();
            }) : false;
            console.log('Post exists in feed:', exists);
            if (!exists) {
              console.log('Adding new post to feed');
              setPosts(prev => [processedPost, ...prev]);
            } else {
              console.log('Post already exists in feed, not adding');
            }
          }
        }
      }
    };

    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent;
      const feedType = customEvent.detail?.feedType;
      
      console.log('Received refresh event:', feedType);
      
      // Refresh the feed if it matches the current feed type
      if (!feedType || feedType === options.feedType) {
        fetchPosts({ feedType: options.feedType, page: 1, reset: true });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('posts:new', handleNewPost as EventListener);
      window.addEventListener('posts:refresh', handleRefresh as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('posts:new', handleNewPost as EventListener);
        window.removeEventListener('posts:refresh', handleRefresh as EventListener);
      }
    };
  }, [fetchPosts, options.feedType]); // Remove posts from dependency array to prevent infinite loop

  const refresh = () => {
    setRefreshFlag(prev => prev + 1);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPosts({ feedType, page: page + 1, reset: false });
    }
  };

  return {
    posts,
    loading,
    error,
    refresh,
    loadMore,
    hasMore,
    page,
    fetchPosts,
    fetchBookmarkedPosts,
    likePost,
    bookmarkPost,
    sharePost
  };
};