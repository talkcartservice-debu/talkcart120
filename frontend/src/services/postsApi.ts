import axios from 'axios';
import { API_URL } from '@/config';

export interface TrendingHashtag {
  hashtag: string; // without leading '#'
  count: number; // number of posts
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  score: number;
}

export async function getTrendingHashtags(limit = 10): Promise<TrendingHashtag[]> {
  const url = `${API_URL}/posts/trending/hashtags`;
  const res = await axios.get(url, { params: { limit } });

  if (res.data?.success && res.data?.data?.hashtags) {
    return res.data.data.hashtags as TrendingHashtag[];
  }

  throw new Error(res.data?.error || 'Failed to fetch trending hashtags');
}