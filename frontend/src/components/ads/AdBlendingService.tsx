import { useState, useEffect, useCallback } from 'react';
import { useAdTracking } from '@/contexts/AdTrackingContext';
import api from '@/lib/api';

interface AdBlendingServiceProps {
  userId?: string;
  feedType?: string;
  limit?: number;
}

interface FeedItem {
  id: string;
  type: 'post' | 'ad' | 'product-post';
  data: any;
  priority?: number; // Higher priority items appear more frequently
}

export const useAdBlending = ({ userId, feedType = 'for-you', limit = 20 }: AdBlendingServiceProps) => {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { trackAdImpression, trackProductPostView } = useAdTracking();
  
  // Fetch regular posts
  const fetchPosts = useCallback(async () => {
    try {
      // Handle different feed types
      let response: any;
      if (feedType === 'bookmarks' && userId) {
        // For bookmarks, fetch user's bookmarked posts
        response = await api.posts.getBookmarkedPosts(userId, { limit });
      } else {
        // For other feed types, use the regular getAll method
        response = await api.posts.getAll({ feedType, limit });
      }
      
      if (response.success && response.data?.posts) {
        return response.data.posts.map((post: any) => ({
          id: post.id || post._id,
          type: 'post' as const,
          data: post,
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching posts:', err);
      return [];
    }
  }, [feedType, limit, userId]);
  
  // Fetch targeted ads
  const fetchAds = useCallback(async () => {
    try {
      const response: any = await api.ads.getTargetedAds({
        userId,
        limit: Math.floor(limit / 4)
      });
      if (response.success && response.data?.ads) {
        return response.data.ads.map((ad: any) => ({
          id: ad._id || ad.id,
          type: 'ad' as const,
          data: ad,
          priority: ad.priority || 1,
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching ads:', err);
      return [];
    }
  }, [userId, limit]);

  // Fetch product posts
  const fetchProductPosts = useCallback(async () => {
    try {
      const response: any = await api.ads.getProductPosts({
        limit: Math.floor(limit / 3)
      });
      if (response.success && response.data?.productPosts) {
        return response.data.productPosts.map((productPost: any) => ({
          id: productPost._id || productPost.id,
          type: 'product-post' as const,
          data: {
            ...productPost,
            post: productPost.postId, // Map the post data
            product: productPost.productId // Map the product data
          },
          priority: productPost.priority || 1,
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching product posts:', err);
      return [];
    }
  }, [limit]);

  // Blend feed items with ads and product posts
  const blendFeed = useCallback((posts: FeedItem[], ads: FeedItem[], productPosts: FeedItem[]) => {
    const blendedItems: FeedItem[] = [];
    
    // Add regular posts
    blendedItems.push(...posts);
    
    // Add ads and product posts at strategic intervals
    const adInterval = Math.max(3, Math.floor(posts.length / (ads.length || 1)));
    const productPostInterval = Math.max(4, Math.floor(posts.length / (productPosts.length || 1)));
    
    // Insert ads
    ads.forEach((ad, index) => {
      const insertIndex = (index + 1) * adInterval;
      if (insertIndex < blendedItems.length) {
        blendedItems.splice(insertIndex, 0, ad);
      } else {
        // If we've run out of positions, append at the end
        blendedItems.push(ad);
      }
    });
    
    // Insert product posts
    productPosts.forEach((productPost, index) => {
      const insertIndex = (index + 1) * productPostInterval + index; // Adjust for previously inserted items
      if (insertIndex < blendedItems.length) {
        blendedItems.splice(insertIndex, 0, productPost);
      } else {
        // If we've run out of positions, append at the end
        blendedItems.push(productPost);
      }
    });
    
    // Shuffle the feed to make ad placement feel more natural
    // But keep the strategic intervals roughly in place
    return blendedItems.sort((a, b) => {
      // Prioritize higher priority items
      const priorityA = a.priority || 1;
      const priorityB = b.priority || 1;
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      // Otherwise maintain original order
      return 0;
    });
  }, []);

  // Refresh the blended feed
  const refreshFeed = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const [posts, ads, productPosts] = await Promise.all([
        fetchPosts(),
        fetchAds(),
        fetchProductPosts(),
      ]);
      
      const blended = blendFeed(posts, ads, productPosts);
      setFeedItems(blended);
    } catch (err) {
      console.error('Error blending feed:', err);
      setError('Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [fetchPosts, fetchAds, fetchProductPosts, blendFeed]);

  // Track when an ad or product post becomes visible
  const trackItemView = useCallback((item: FeedItem) => {
    if (item.type === 'ad') {
      trackAdImpression(item.data.id);
    } else if (item.type === 'product-post') {
      trackProductPostView(item.data.id);
    }
  }, [trackAdImpression, trackProductPostView]);

  useEffect(() => {
    refreshFeed();
  }, [refreshFeed, feedType]);
  
  // Listen for new posts to update the feed in real-time
  useEffect(() => {
    const handleNewPost = (event: any) => {
      if (event.detail?.post) {
        // Check if this post should be added to the current feed type
        // For now, we'll add it to the beginning of the feed regardless of type
        // as the backend should have already filtered appropriately
        setFeedItems(prevItems => {
          // Check if this post is already in the feed to avoid duplicates
          const postExists = prevItems.some(item => 
            item.id === event.detail.post.id || item.id === event.detail.post._id
          );
          
          if (!postExists) {
            const newPostItem = {
              id: event.detail.post.id || event.detail.post._id,
              type: 'post' as const,
              data: event.detail.post,
            };
            
            // Add the new post at the beginning of the feed
            return [newPostItem, ...prevItems];
          }
          
          return prevItems;
        });
      }
    };
    
    const handleNewProductPost = (event: any) => {
      if (event.detail?.productPost) {
        setFeedItems(prevItems => {
          // Check if this product post is already in the feed to avoid duplicates
          const productPostExists = prevItems.some(item => 
            item.id === event.detail.productPost.id || item.id === event.detail.productPost._id
          );
          
          if (!productPostExists) {
            const newProductPostItem = {
              id: event.detail.productPost.id || event.detail.productPost._id,
              type: 'product-post' as const,
              data: event.detail.productPost,
            };
            
            // Add the new product post at the beginning of the feed
            return [newProductPostItem, ...prevItems];
          }
          
          return prevItems;
        });
      }
    };
    
    const handleRefresh = (event: any) => {
      // Refresh the feed if it matches the current feed type
      if (!event.detail?.feedType || event.detail.feedType === feedType) {
        refreshFeed();
      }
    };
    
    window.addEventListener('posts:new', handleNewPost);
    window.addEventListener('product-posts:new', handleNewProductPost);
    window.addEventListener('posts:refresh', handleRefresh);
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('posts:new', handleNewPost);
      window.removeEventListener('product-posts:new', handleNewProductPost);
      window.removeEventListener('posts:refresh', handleRefresh);
    };
  }, [refreshFeed, feedType]);

  return {
    feedItems,
    loading,
    error,
    refreshFeed,
    trackItemView,
  };
};