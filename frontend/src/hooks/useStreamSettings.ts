import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { streamingApi } from '@/services/streamingApi';

// Hook to fetch and update general stream settings
export const useStreamSettings = (id: string) => {
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: ['stream-settings', id],
    queryFn: () => streamingApi.getStreamSettings(id),
    enabled: !!id,
    staleTime: 60_000,
  });

  const updateSettings = useMutation({
    mutationFn: (settings: any) => streamingApi.updateStreamSettings(id, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-settings', id] });
      queryClient.invalidateQueries({ queryKey: ['stream', id] });
    },
  });

  return { settings, updateSettings };
};