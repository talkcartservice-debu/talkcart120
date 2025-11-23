export interface SearchResult {
  id: string;
  type: 'user' | 'post' | 'hashtag' | 'content';
  title: string;
  description?: string;
  url?: string;
  avatar?: string;
  metadata?: Record<string, any>;
}

export interface SearchSuggestion {
  id: string;
  type: 'user' | 'hashtag' | 'content' | 'recent';
  text: string;
  metadata?: Record<string, any>;
}

export interface SearchFilters {
  query: string;
  types?: string[];
  limit?: number;
  page?: number;
}

class SearchService {
  private recentSearches: string[] = [];
  private maxRecentSearches = 10;

  // Real search function that connects to backend
  async search(filters: SearchFilters): Promise<{ results: SearchResult[]; total: number }> {
    try {
      const results: SearchResult[] = [];

      // Search for users using the proper search endpoint
      if (!filters.query) {
        return { results: [], total: 0 };
      }

      // Search users by username or display name
      const userResponse = await fetch(`/api/search/users?q=${encodeURIComponent(filters.query)}&limit=${filters.limit || 10}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Include auth header if available, but don't require it
          ...(typeof window !== 'undefined' && localStorage.getItem('token') ? {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          } : {})
        }
      });

      const userData = await userResponse.json();

      // Add user results
      if (userData.success && userData.data) {
        const users = Array.isArray(userData.data) ? userData.data : (userData.data.users || []);
        users.forEach((user: any) => {
          results.push({
            id: `user-${user._id || user.id}`,
            type: 'user',
            title: user.displayName || user.username,
            description: `@${user.username}${user.isVerified ? ' • Verified' : ''}`,
            avatar: user.avatar,
            url: `/profile/${user.username}`,
            metadata: {
              username: user.username,
              isVerified: user.isVerified,
              followersCount: user.followerCount,
              bio: user.bio
            }
          });
        });
      }

      // Add hashtag result
      if (filters.query.length > 1) {
        results.push({
          id: `hashtag-${filters.query}`,
          type: 'hashtag',
          title: `#${filters.query}`,
          description: `Search posts tagged with #${filters.query}`,
          url: `/hashtag/${filters.query}`
        });
      }

      // Add content search result for posts containing the query
      results.push({
        id: `content-${filters.query}`,
        type: 'content',
        title: `Posts about "${filters.query}"`,
        description: `Search for posts containing "${filters.query}"`,
        url: `/search?q=${encodeURIComponent(filters.query)}&type=posts`
      });

      return {
        results: results.slice(0, filters.limit || 20),
        total: results.length,
      };

    } catch (error) {
      console.error('Error searching:', error);

      // Fallback to basic results if API fails
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'user',
          title: `User ${filters.query}`,
          description: `@${filters.query} • Verified user`,
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        },
        {
          id: '2',
          type: 'hashtag',
          title: `#${filters.query}`,
          description: `Posts tagged with #${filters.query}`,
        },
        {
          id: '3',
          type: 'content',
          title: `Posts about "${filters.query}"`,
          description: `Search for posts containing "${filters.query}"`,
        },
      ];

      return {
        results: mockResults.slice(0, filters.limit || 20),
        total: mockResults.length,
      };
    }
  }

  // Real suggestions function that connects to backend
  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (!query) {
      // Return recent searches when no query
      return this.recentSearches.map((search, index) => ({
        id: `recent-${index}`,
        type: 'recent' as const,
        text: search,
      }));
    }

    try {
      // Call the backend API for user suggestions
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(query)}&limit=5`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Include auth header if available, but don't require it
          ...(typeof window !== 'undefined' && localStorage.getItem('token') ? {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          } : {})
        }
      });

      const data = await response.json();

      const suggestions: SearchSuggestion[] = [];

      // Add user suggestions from backend
      if (data.success && data.data) {
        const users = Array.isArray(data.data) ? data.data : (data.data.users || []);
        users.forEach((user: any, index: number) => {
          suggestions.push({
            id: `user-${user._id || user.id || index}`,
            type: 'user',
            text: user.displayName || user.username,
            metadata: {
              username: `@${user.username}`,
              avatar: user.avatar,
              isVerified: user.isVerified,
              followersCount: user.followerCount
            }
          });
        });
      }

      // Add hashtag suggestion
      if (query.length > 1) {
        suggestions.push({
          id: `hashtag-${query}`,
          type: 'hashtag',
          text: `#${query}`,
        });
      }

      // Add content search suggestion
      suggestions.push({
        id: `content-${query}`,
        type: 'content',
        text: `Posts about "${query}"`,
      });

      return suggestions;

    } catch (error) {
      console.error('Error fetching suggestions:', error);

      // Fallback to basic suggestions if API fails
      return [
        {
          id: '1',
          type: 'user',
          text: `User ${query}`,
        },
        {
          id: '2',
          type: 'hashtag',
          text: `#${query}`,
        },
        {
          id: '3',
          type: 'content',
          text: `Posts about "${query}"`,
        },
      ];
    }
  }

  saveSearchQuery(query: string) {
    // Remove if already exists
    this.recentSearches = this.recentSearches.filter(search => search !== query);

    // Add to beginning
    this.recentSearches.unshift(query);

    // Keep only max recent searches
    this.recentSearches = this.recentSearches.slice(0, this.maxRecentSearches);

    // Save to localStorage
    try {
      localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
    } catch (error) {
      console.warn('Failed to save recent searches to localStorage:', error);
    }
  }

  getRecentSearches(): string[] {
    try {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        this.recentSearches = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load recent searches from localStorage:', error);
    }

    return this.recentSearches;
  }

  clearRecentSearches() {
    this.recentSearches = [];
    try {
      localStorage.removeItem('recentSearches');
    } catch (error) {
      console.warn('Failed to clear recent searches from localStorage:', error);
    }
  }
}

const searchService = new SearchService();
export default searchService;