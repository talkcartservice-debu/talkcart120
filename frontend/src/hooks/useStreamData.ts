import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, HttpError } from '@/lib/api';
import { streamingApi } from '@/services/streamingApi';
import { useWebSocket } from '@/contexts/WebSocketContext';
import toast from 'react-hot-toast';

export interface StreamData {
  id: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  isLive: boolean;
  viewerCount: number;
  peakViewerCount?: number;
  totalViews?: number;
  startedAt?: string;
  createdAt?: string;
  duration?: number;
  streamUrl?: string;
  playbackUrl?: string;
  thumbnail?: {
    secure_url: string;
  };
  streamer: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    isVerified: boolean;
    followerCount: number;
    isFollowing?: boolean;
  };
  settings?: {
    allowChat: boolean;
    isMatureContent: boolean;
  };
  moderators?: Array<{
    id: string;
    userId: string;
  }>;
  analytics?: {
    totalChatMessages: number;
  };
}

export interface StreamMetrics {
  viewerCount: number;
  peakViewerCount: number;
  totalViews: number;
  chatMessages: number;
  likes: number;
  shares: number;
  avgWatchTime: number;
  engagement: number;
}

export interface StreamHealth {
  status: 'live' | 'offline' | 'error';
  bitrate: number;
  fps: number;
  latency: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
}

// Main hook for stream data with real-time updates
export function useStreamData(streamId: string) {
  const queryClient = useQueryClient();
  const { socket, isConnected, joinStream, leaveStream, onViewerUpdate, onStreamUpdate, offViewerUpdate, offStreamUpdate } = useWebSocket();
  const [realTimeMetrics, setRealTimeMetrics] = useState<Partial<StreamMetrics>>({});
  const [canViewMetrics, setCanViewMetrics] = useState(true);
  const [canViewHealth, setCanViewHealth] = useState(true);

  // Fetch initial stream data
  const {
    data: streamResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => api.streams.getById(streamId),
    enabled: !!streamId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute for live streams
  });

  const stream = streamResponse as StreamData | undefined;

  // Fetch stream metrics
  const { data: metricsResponse } = useQuery({
    queryKey: ['stream-metrics', streamId],
    queryFn: () => streamingApi.getStreamMetrics(streamId),
    enabled: !!streamId && !!stream?.isLive && canViewMetrics,
    refetchInterval: canViewMetrics ? 30000 : false,
    retry: (failureCount, error: any) => {
      if (error instanceof HttpError && error.status === 403) return false;
      return failureCount < 2;
    },
    meta: {
      onError: (err: any) => {
        if (err instanceof HttpError && err.status === 403) {
          setCanViewMetrics(false);
        }
      }
    }
  });

  const metrics = metricsResponse as StreamMetrics | undefined;

  // Fetch stream health (for streamers)
  const { data: healthResponse } = useQuery({
    queryKey: ['stream-health', streamId],
    queryFn: () => streamingApi.getStreamHealth(streamId),
    enabled: !!streamId && !!stream?.isLive && canViewHealth,
    refetchInterval: canViewHealth ? 10000 : false,
    retry: (failureCount, error: any) => {
      if (error instanceof HttpError && error.status === 403) return false;
      return failureCount < 2;
    },
    meta: {
      onError: (err: any) => {
        if (err instanceof HttpError && err.status === 403) {
          setCanViewHealth(false);
        }
      }
    }
  });

  const health = healthResponse as StreamHealth | undefined;

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!streamId || !isConnected) return;

    joinStream(streamId);

    // Listen for real-time updates
    const handleViewerUpdate = (data: { viewerCount: number }) => {
      setRealTimeMetrics(prev => ({
        ...prev,
        viewerCount: data.viewerCount,
      }));

      // Update the cached stream data
      queryClient.setQueryData(['stream', streamId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            viewerCount: data.viewerCount,
          },
        };
      });
    };

    const handleMetricsUpdate = (data: Partial<StreamMetrics>) => {
      setRealTimeMetrics(prev => ({
        ...prev,
        ...data,
      }));
    };

    const handleStreamEnd = () => {
      queryClient.setQueryData(['stream', streamId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            isLive: false,
          },
        };
      });
      toast('Stream has ended');
    };

    // Register WebSocket listeners
    const streamUpdateCb = (data: any) => {
      if (!data || data.streamId !== streamId) return;
      if (typeof data.isLive === 'boolean') {
        // Update cached stream isLive status
        queryClient.setQueryData(['stream', streamId], (old: any) => {
          if (!old?.data) return old;
          return { ...old, data: { ...old.data, isLive: data.isLive } };
        });
        if (data.isLive === false) {
          toast('Stream has ended');
        }
      }
      if (data.health) {
        // Optionally update health cache
        queryClient.setQueryData(['stream-health', streamId], (old: any) => ({ data: data.health }));
      }
    };
    onViewerUpdate(handleViewerUpdate);
    onStreamUpdate(streamUpdateCb);

    return () => {
      leaveStream(streamId);
      offViewerUpdate(handleViewerUpdate);
      offStreamUpdate(streamUpdateCb);
    };
  }, [streamId, isConnected, joinStream, leaveStream, queryClient]);

  // Listen for chat settings changes (allowChat, slowMode, etc.) and update cache
  useEffect(() => {
    if (!socket) return;
    const handleChatSettings = (payload: any) => {
      if (!payload || payload.streamId !== streamId) return;
      const settings = payload.settings || {};
      queryClient.setQueryData(['stream', streamId], (old: any) => {
        if (!old?.data) return old;
        const currentSettings = old.data.settings || {};
        return {
          ...old,
          data: {
            ...old.data,
            settings: { ...currentSettings, allowChat: settings.allowChat ?? currentSettings.allowChat },
          },
        };
      });
    };
    socket.on('chat:settings', handleChatSettings);
    return () => {
      socket.off('chat:settings', handleChatSettings);
    };
  }, [socket, streamId, queryClient]);

  // Merge real-time metrics with fetched metrics
  const combinedMetrics = {
    ...metrics,
    ...realTimeMetrics,
  };

  // Stream actions
  const followMutation = useMutation({
    mutationFn: (streamerId: string) => api.users.follow(streamerId),
    onSuccess: () => {
      toast.success('Following streamer!');
      queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    },
    onError: () => {
      toast.error('Failed to follow streamer');
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: (streamerId: string) => api.users.unfollow(streamerId),
    onSuccess: () => {
      toast.success('Unfollowed streamer');
      queryClient.invalidateQueries({ queryKey: ['stream', streamId] });
    },
    onError: () => {
      toast.error('Failed to unfollow streamer');
    },
  });

  const likeMutation = useMutation({
    mutationFn: (streamId: string) => api.posts.like(streamId),
    onSuccess: () => {
      toast.success('Liked stream!');
      queryClient.invalidateQueries({ queryKey: ['stream-metrics', streamId] });
    },
    onError: () => {
      toast.error('Failed to like stream');
    },
  });

  const reportMutation = useMutation({
    mutationFn: ({ streamId, reason }: { streamId: string; reason: string }) =>
      // TODO: Implement report stream functionality
      Promise.resolve({ success: true }),
    onSuccess: () => {
      toast.success('Report submitted');
    },
    onError: () => {
      toast.error('Failed to submit report');
    },
  });

  // Action handlers
  const handleFollow = useCallback(
    (streamerId: string) => followMutation.mutate(streamerId),
    [followMutation]
  );

  const handleUnfollow = useCallback(
    (streamerId: string) => unfollowMutation.mutate(streamerId),
    [unfollowMutation]
  );

  const handleLike = useCallback(
    (streamId: string) => likeMutation.mutate(streamId),
    [likeMutation]
  );

  const handleReport = useCallback(
    (streamId: string, reason: string) => reportMutation.mutate({ streamId, reason }),
    [reportMutation]
  );

  const handleShare = useCallback(async (streamId: string) => {
    const url = `${window.location.origin}/streams/${streamId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: stream?.title,
          text: `Watch ${stream?.streamer?.displayName}'s live stream`,
          url,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Stream link copied to clipboard!');
    }
  }, [stream]);

  return {
    // Data
    stream,
    metrics: combinedMetrics,
    health,
    canViewMetrics,
    canViewHealth,

    // Loading states
    isLoading,
    isLoadingMetrics: !metrics && !!stream?.isLive && canViewMetrics,
    isLoadingHealth: !health && !!stream?.isLive && canViewHealth,
    
    // Error states
    error,
    
    // Actions
    handleFollow,
    handleUnfollow,
    handleLike,
    handleReport,
    handleShare,
    refetch,
    
    // Mutation states
    isFollowing: followMutation.isPending,
    isUnfollowing: unfollowMutation.isPending,
    isLiking: likeMutation.isPending,
    isReporting: reportMutation.isPending,
  };
}
