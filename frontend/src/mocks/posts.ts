/**
 * Mock public post data for the PublicFeed component
 * These mocks represent public posts that can be viewed by visitors
 */

export interface MockPost {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified?: boolean;
  };
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  hashtags?: string[];
  media?: Array<{
    id?: string;
    resource_type: string;
    secure_url: string;
    url?: string;
    thumbnail_url?: string;
    public_id?: string;
  }>;
}

export const mockPublicPosts: MockPost[] = [
  {
    id: 'public-post-1',
    content: 'Just discovered this amazing platform! The community here is so welcoming and the features are top-notch. #NewUser #Community',
    author: {
      id: 'author-1',
      username: 'newuser',
      displayName: 'New User',
      avatar: 'https://via.placeholder.com/40x40/667eea/FFFFFF?text=N',
    },
    createdAt: '2023-06-15T10:30:00Z',
    likeCount: 24,
    commentCount: 5,
    shareCount: 2,
    hashtags: ['#NewUser', '#Community'],
  },
  {
    id: 'public-post-2',
    content: 'Beautiful sunset from my evening walk today. Nature never fails to amaze me!',
    author: {
      id: 'author-2',
      username: 'naturelover',
      displayName: 'Nature Lover',
      avatar: 'https://via.placeholder.com/40x40/10b981/FFFFFF?text=N',
      isVerified: true,
    },
    createdAt: '2023-06-15T18:45:00Z',
    likeCount: 127,
    commentCount: 18,
    shareCount: 9,
    hashtags: ['#Nature', '#Sunset', '#Photography'],
    media: [
      {
        resource_type: 'image',
        secure_url: 'https://via.placeholder.com/600x400/f59e0b/FFFFFF?text=Sunset+Photo',
        url: 'https://via.placeholder.com/600x400/f59e0b/FFFFFF?text=Sunset+Photo',
      }
    ]
  },
  {
    id: 'public-post-3',
    content: 'Just finished reading an incredible book about Web3 and the future of the internet. Highly recommend it to anyone interested in technology trends!',
    author: {
      id: 'author-3',
      username: 'techenthusiast',
      displayName: 'Tech Enthusiast',
      avatar: 'https://via.placeholder.com/40x40/8b5cf6/FFFFFF?text=T',
    },
    createdAt: '2023-06-14T14:22:00Z',
    likeCount: 86,
    commentCount: 24,
    shareCount: 15,
    hashtags: ['#Web3', '#Technology', '#Book'],
  },
  {
    id: 'public-post-4',
    content: 'Quick demo of the new feature I\'ve been working on. Real-time collaboration has never been easier!',
    author: {
      id: 'author-4',
      username: 'developer',
      displayName: 'App Developer',
      avatar: 'https://via.placeholder.com/40x40/0ea5e9/FFFFFF?text=D',
      isVerified: true,
    },
    createdAt: '2023-06-14T09:15:00Z',
    likeCount: 203,
    commentCount: 31,
    shareCount: 42,
    hashtags: ['#Development', '#Tech', '#Innovation'],
    media: [
      {
        resource_type: 'video',
        secure_url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
        url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
        thumbnail_url: 'https://via.placeholder.com/600x400/0ea5e9/FFFFFF?text=Demo+Video',
      }
    ]
  },
  {
    id: 'public-post-5',
    content: 'Morning coffee and a good playlist - the perfect start to a productive day! What\'s everyone working on today?',
    author: {
      id: 'author-5',
      username: 'coffeelover',
      displayName: 'Coffee Lover',
      avatar: 'https://via.placeholder.com/40x40/d946ef/FFFFFF?text=C',
    },
    createdAt: '2023-06-13T07:30:00Z',
    likeCount: 56,
    commentCount: 27,
    shareCount: 3,
    hashtags: ['#Coffee', '#Productivity', '#Morning'],
  },
  {
    id: 'public-post-6',
    content: 'Excited to announce that our startup just closed our Series A funding round! Couldn\'t have done it without this amazing community.',
    author: {
      id: 'author-6',
      username: 'startupfounder',
      displayName: 'Startup Founder',
      avatar: 'https://via.placeholder.com/40x40/f97316/FFFFFF?text=S',
      isVerified: true,
    },
    createdAt: '2023-06-12T16:45:00Z',
    likeCount: 421,
    commentCount: 68,
    shareCount: 127,
    hashtags: ['#Startup', '#Funding', '#Entrepreneur'],
  },
  {
    id: 'public-post-7',
    content: 'Weekend recipe: homemade pizza with fresh ingredients from the local market. Cooking is so therapeutic!',
    author: {
      id: 'author-7',
      username: 'homecook',
      displayName: 'Home Cook',
      avatar: 'https://via.placeholder.com/40x40/e11d48/FFFFFF?text=H',
    },
    createdAt: '2023-06-11T12:15:00Z',
    likeCount: 78,
    commentCount: 19,
    shareCount: 8,
    hashtags: ['#Cooking', '#Food', '#Weekend'],
    media: [
      {
        resource_type: 'image',
        secure_url: 'https://via.placeholder.com/600x400/dc2626/FFFFFF?text=Homemade+Pizza',
        url: 'https://via.placeholder.com/600x400/dc2626/FFFFFF?text=Homemade+Pizza',
      },
      {
        resource_type: 'image',
        secure_url: 'https://via.placeholder.com/600x400/16a34a/FFFFFF?text=Ingredients',
        url: 'https://via.placeholder.com/600x400/16a34a/FFFFFF?text=Ingredients',
      }
    ]
  },
  {
    id: 'public-post-8',
    content: 'Just completed my first marathon! 26.2 miles of pure determination and perseverance. The support from the crowd was incredible.',
    author: {
      id: 'author-8',
      username: 'runner',
      displayName: 'Marathon Runner',
      avatar: 'https://via.placeholder.com/40x40/0891b2/FFFFFF?text=R',
    },
    createdAt: '2023-06-10T15:30:00Z',
    likeCount: 312,
    commentCount: 45,
    shareCount: 62,
    hashtags: ['#Running', '#Marathon', '#Fitness'],
  },
]; 