import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { debounce, throttle } from 'lodash';

interface FeedOptimizationOptions {
  debounceDelay?: number;
  throttleDelay?: number;
  maxCacheSize?: number;
  prefetchThreshold?: number;
}

export const useFeedOptimization = (options: FeedOptimizationOptions = {}) => {
  const {
    debounceDelay = 300,
    throttleDelay = 100,
    maxCacheSize = 50,
    prefetchThreshold = 5,
  } = options;

  const queryClient = useQueryClient();
  const scrollPositionRef = useRef(0);
  const lastUpdateRef = useRef(Date.now());

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm: string, callback: (term: string) => void) => {
      callback(searchTerm);
    }, debounceDelay),
    [debounceDelay]
  );

  // Throttled scroll handler
  const throttledScrollHandler = useCallback(
    throttle((scrollTop: number, callback: (position: number) => void) => {
      scrollPositionRef.current = scrollTop;
      callback(scrollTop);
    }, throttleDelay),
    [throttleDelay]
  );

  // Optimized cache management
  const optimizeCache = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Remove old post queries if cache is too large
    if (queries.length > maxCacheSize) {
      const postQueries = queries
        .filter(query => query.queryKey[0] === 'posts')
        .sort((a, b) => (b.state.dataUpdatedAt || 0) - (a.state.dataUpdatedAt || 0))
        .slice(maxCacheSize);

      postQueries.forEach(query => {
        queryClient.removeQueries({ queryKey: query.queryKey });
      });
    }
  }, [queryClient, maxCacheSize]);

  // Prefetch next page when near bottom
  const handlePrefetch = useCallback((
    currentPage: number,
    totalPages: number,
    feedType: string,
    contentFilter: string,
    prefetchFn: () => void
  ) => {
    if (currentPage < totalPages - prefetchThreshold) {
      prefetchFn();
    }
  }, [prefetchThreshold]);

  // Optimized post update function
  const optimizedPostUpdate = useCallback((
    postId: string,
    updates: Record<string, any>,
    feedType: string,
    contentFilter: string
  ) => {
    const now = Date.now();
    
    // Prevent too frequent updates
    if (now - lastUpdateRef.current < 100) {
      return;
    }
    
    lastUpdateRef.current = now;

    queryClient.setQueryData(['posts', feedType, contentFilter], (oldData: any) => {
      if (!oldData?.data?.posts) return oldData;

      const updatedPosts = oldData.data.posts.map((post: any) => {
        if ((post.id || post._id) === postId) {
          return { ...post, ...updates };
        }
        return post;
      });

      return {
        ...oldData,
        data: {
          ...oldData.data,
          posts: updatedPosts,
        },
      };
    });
  }, [queryClient]);

  // Memory cleanup
  const cleanup = useCallback(() => {
    debouncedSearch.cancel();
    throttledScrollHandler.cancel();
    optimizeCache();
  }, [debouncedSearch, throttledScrollHandler, optimizeCache]);

  // Auto cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Performance monitoring
  const performanceMetrics = useMemo(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      postQueries: queries.filter(q => q.queryKey[0] === 'posts').length,
      cacheSize: queries.reduce((size, query) => {
        const dataSize = JSON.stringify(query.state.data || {}).length;
        return size + dataSize;
      }, 0),
      lastOptimization: lastUpdateRef.current,
    };
  }, [queryClient]);

  return {
    debouncedSearch,
    throttledScrollHandler,
    optimizeCache,
    handlePrefetch,
    optimizedPostUpdate,
    cleanup,
    performanceMetrics,
    scrollPosition: scrollPositionRef.current,
  };
};