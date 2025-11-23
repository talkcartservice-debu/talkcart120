import { API_URL, TIMEOUTS } from '@/config/index';
import { api } from '@/lib/api';

// Enhanced Posts API with better error handling and new endpoints
class EnhancedPostsApi {
  private getAuthHeaders(includeJsonContentType: boolean = true): HeadersInit {
    // Avoid accessing localStorage during SSR
    if (typeof window === 'undefined') {
      return includeJsonContentType ? { 'Content-Type': 'application/json' } : {};
    }
    const token = localStorage.getItem('token');
    const base: HeadersInit = includeJsonContentType ? { 'Content-Type': 'application/json' } : {};
    return {
      ...base,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Enhanced method to fetch posts with better error handling
  async getEnhancedPosts(params?: any) {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      
      const response = await fetch(`${API_URL}/posts-enhanced/enhanced?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch posts');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching enhanced posts:', error);
      throw error;
    }
  }

  // Enhanced method to create a post with better validation
  async createEnhancedPost(postData: any) {
    try {
      const response = await fetch(`${API_URL}/posts-enhanced/enhanced`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(postData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create post');
      }
      
      return data;
    } catch (error) {
      console.error('Error creating enhanced post:', error);
      throw error;
    }
  }

  // Enhanced like/unlike endpoint
  async likeEnhancedPost(postId: string) {
    try {
      const response = await fetch(`${API_URL}/posts-enhanced/${postId}/like-enhanced`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to like post');
      }
      
      return data;
    } catch (error) {
      console.error('Error liking enhanced post:', error);
      throw error;
    }
  }

  // Enhanced bookmark/unbookmark endpoint
  async bookmarkEnhancedPost(postId: string) {
    try {
      const response = await fetch(`${API_URL}/posts-enhanced/${postId}/bookmark-enhanced`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to bookmark post');
      }
      
      return data;
    } catch (error) {
      console.error('Error bookmarking enhanced post:', error);
      throw error;
    }
  }

  // Enhanced share endpoint
  async shareEnhancedPost(postId: string, platform: string = 'internal') {
    try {
      const response = await fetch(`${API_URL}/posts-enhanced/${postId}/share-enhanced`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ platform }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to share post');
      }
      
      return data;
    } catch (error) {
      console.error('Error sharing enhanced post:', error);
      throw error;
    }
  }

  // Get bookmarked posts for a user
  async getBookmarkedPosts(userId: string, params?: any) {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      
      const response = await fetch(`${API_URL}/posts/bookmarks/${userId}?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch bookmarked posts');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching bookmarked posts:', error);
      throw error;
    }
  }

  // Get trending posts
  async getTrendingPosts(params?: any) {
    try {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      
      const response = await fetch(`${API_URL}/posts/trending?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch trending posts');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching trending posts:', error);
      throw error;
    }
  }
}

export const enhancedPostsApi = new EnhancedPostsApi();
export default enhancedPostsApi;