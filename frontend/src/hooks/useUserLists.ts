import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  followedAt: string;
}

interface FollowersResponse {
  items: User[];
  total: number;
  nextSkip: number | null;
}

const PAGE_SIZE = 20;

export function useFollowersList(userId?: string, enabled: boolean = true, pageSize: number = PAGE_SIZE) {
  return useInfiniteQuery<FollowersResponse>({
    queryKey: ['followers', userId, pageSize],
    enabled: enabled && !!userId,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return { items: [], total: 0, nextSkip: null };
      const res = await api.users.getFollowers(userId, pageSize, pageParam as number);
      const items = res.data?.data?.items || res.data?.items || res.items || [];
      const total = res.data?.data?.total ?? res.data?.total ?? res.total ?? items.length;
      const nextSkip = (pageParam as number) + items.length < total ? (pageParam as number) + items.length : null;
      return { items, total, nextSkip };
    },
    getNextPageParam: (lastPage) => lastPage.nextSkip,
    staleTime: 60 * 1000,
  });
}

export function useFollowingList(userId?: string, enabled: boolean = true, pageSize: number = PAGE_SIZE) {
  return useInfiniteQuery<FollowersResponse>({
    queryKey: ['following', userId, pageSize],
    enabled: enabled && !!userId,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return { items: [], total: 0, nextSkip: null };
      const res = await api.users.getFollowing(userId, pageSize, pageParam as number);
      const items = res.data?.data?.items || res.data?.items || res.items || [];
      const total = res.data?.data?.total ?? res.data?.total ?? res.total ?? items.length;
      const nextSkip = (pageParam as number) + items.length < total ? (pageParam as number) + items.length : null;
      return { items, total, nextSkip };
    },
    getNextPageParam: (lastPage) => lastPage.nextSkip,
    staleTime: 60 * 1000,
  });
}