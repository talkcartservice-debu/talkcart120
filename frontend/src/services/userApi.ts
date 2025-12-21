import axios from 'axios';
import { API_URL } from '@/config';

// Create a dedicated user API instance
const userApi = axios.create({
  baseURL: `${API_URL}/users`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
userApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar: string | null;
  bio?: string;
  location?: string;
  website?: string;
  isVerified: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  createdAt?: string;
  updatedAt?: string;
  walletAddress?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    instagram?: string;
    linkedin?: string;
  };
  settings?: any;
  isFollowing?: boolean;
  canMessage?: boolean;
  canInviteToGroup?: boolean;
}

export interface SearchUsersParams {
  query: string;
  limit?: number;
  page?: number;
  excludeIds?: string[];
}

export interface SearchUsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    instagram?: string;
    linkedin?: string;
  };
}

class UserService {
  // Search users
  async searchUsers(params: SearchUsersParams): Promise<SearchUsersResponse> {
    try {
      const { query, limit = 20, page = 1, excludeIds = [] } = params;
      
      const response = await userApi.get('/search', {
        params: {
          query,
          limit,
          page,
          excludeIds: excludeIds.length > 0 ? excludeIds : undefined
        }
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to search users');
      }
    } catch (error) {
      console.error('Search users error:', error);
      throw error;
    }
  }

  // Get suggested users for new conversations
  async getSuggestedUsers(limit = 10): Promise<User[]> {
    try {
      const response = await userApi.get('/suggestions', {
        params: { limit }
      });
      
      if (response.data.success) {
        const data = response.data.data;
        // Backend returns { suggestions: User[], total } — normalize to User[]
        return Array.isArray(data) ? data : (data?.suggestions || []);
      } else {
        throw new Error(response.data.error || 'Failed to get suggested users');
      }
    } catch (error) {
      console.error('Get suggested users error:', error);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(id: string): Promise<User> {
    try {
      const response = await userApi.get(`/${id}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get user');
      }
    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  }

  // Get user profile by username
  async getUserProfile(username: string): Promise<User> {
    try {
      const response = await userApi.get(`/profile/${username}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get user profile');
      }
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  // Update user profile
  async updateProfile(data: UpdateProfileData): Promise<User> {
    try {
      const response = await userApi.put('/profile', data);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  // Get multiple users by IDs
  async getUsersBatch(userIds: string[]): Promise<User[]> {
    try {
      const response = await userApi.post('/batch', { userIds });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get users');
      }
    } catch (error) {
      console.error('Get users batch error:', error);
      throw error;
    }
  }

  // Get user contacts
  async getContacts(limit = 50): Promise<User[]> {
    try {
      const response = await userApi.get('/contacts', {
        params: { limit }
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get contacts');
      }
    } catch (error) {
      console.error('Get contacts error:', error);
      throw error;
    }
  }

  // Follow a user
  async followUser(userId: string): Promise<{ followerCount: number; followingCount: number } | null> {
    try {
      const response = await userApi.post(`/${userId}/follow`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to follow user');
      }
      
      // Return the counts from the response data
      return response.data.data || null;
    } catch (error) {
      console.error('Follow user error:', error);
      throw error;
    }
  }

  // Unfollow a user
  async unfollowUser(userId: string): Promise<{ followerCount: number; followingCount: number } | null> {
    try {
      const response = await userApi.delete(`/${userId}/follow`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to unfollow user');
      }
      
      // Return the counts from the response data
      return response.data.data || null;
    } catch (error) {
      console.error('Unfollow user error:', error);
      throw error;
    }
  }

  // Get user followers
  async getFollowers(userId: string, page = 1, limit = 20): Promise<{
    followers: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response = await userApi.get(`/${userId}/followers`, {
        params: { page, limit }
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get followers');
      }
    } catch (error) {
      console.error('Get followers error:', error);
      throw error;
    }
  }

  // Get user following
  async getFollowing(userId: string, page = 1, limit = 20): Promise<{
    following: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      const response = await userApi.get(`/${userId}/following`, {
        params: { page, limit }
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to get following');
      }
    } catch (error) {
      console.error('Get following error:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;