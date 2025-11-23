import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { streamingApi } from '@/services/streamingApi';
import { Stream, ChatMessage, StreamMetrics } from '@/services/streamingApi';
import toast from 'react-hot-toast';

interface StreamParams {
  limit?: number;
  page?: number;
  category?: string;
  search?: string;
  isLive?: boolean;
}

interface LiveStreamParams {
  limit?: number;
  page?: number;
  category?: string;
}

interface DonationData {
  amount: number;
  message?: string;
  currency?: string;
}

interface StreamUrls {
  streamUrl: string;
  playbackUrl: string;
}

export const useStreams = (params?: StreamParams): UseQueryResult<any> => {
  return useQuery({
    queryKey: ['streams', params],
    queryFn: () => streamingApi.getStreams(params),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useLiveStreams = (params?: LiveStreamParams): UseQueryResult<any> => {
  return useQuery({
    queryKey: ['streams', 'live', params],
    queryFn: () => streamingApi.getLiveStreams(params),
    staleTime: 10000, // 10 seconds for live streams
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useStream = (id: string): UseQueryResult<any> => {
  return useQuery({
    queryKey: ['stream', id],
    queryFn: () => streamingApi.getStream(id),
    enabled: !!id,
    staleTime: 30000,
    refetchInterval: (data: any) => {
      const isLive = data?.data?.isLive;
      return isLive ? 15000 : 60000;
    },
  });
};

export const useStreamMetrics = (id: string): UseQueryResult<any> => {
  return useQuery({
    queryKey: ['stream', id, 'metrics'],
    queryFn: () => streamingApi.getStreamMetrics(id),
    enabled: !!id,
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
};

export const useStreamHealth = (id: string): UseQueryResult<any> => {
  return useQuery({
    queryKey: ['stream', id, 'health'],
    queryFn: () => streamingApi.getStreamHealth(id),
    enabled: !!id,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useStreamCategories = () => {
  return useQuery({
    queryKey: ['stream-categories'],
    queryFn: () => streamingApi.getCategories(),
    staleTime: 300000, // 5 minutes
  });
};

export const useStreamMutations = () => {
  const queryClient = useQueryClient();

  const createStream = useMutation({
    mutationFn: (data: any) => streamingApi.createStream(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      toast.success('Stream created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create stream');
    },
  });

  const updateStream = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      streamingApi.updateStream(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['stream', id] });
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      toast.success('Stream updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update stream');
    },
  });

  const startStream = useMutation({
    mutationFn: ({ id, data }: { id: string; data: StreamUrls }) =>
      streamingApi.startStream(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['stream', id] });
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      toast.success('Stream started successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start stream');
    },
  });

  const stopStream = useMutation({
    mutationFn: (id: string) => streamingApi.stopStream(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['stream', id] });
      queryClient.invalidateQueries({ queryKey: ['streams'] });
      toast.success('Stream stopped successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to stop stream');
    },
  });

  return {
    createStream,
    updateStream,
    startStream,
    stopStream,
  };
};

export const useStreamChat = (streamId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Note: This is a simplified implementation. In a real app, you would
  // implement actual WebSocket connections for real-time chat

  return {
    messages,
    isConnected,
    sendMessage: (message: string) => {
      // This is a mock implementation
      toast.success('Message sent successfully!');
    },
    isLoading: false,
  };
};