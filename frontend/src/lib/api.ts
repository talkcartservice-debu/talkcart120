import { API_URL, TIMEOUTS } from '@/config/index';

// Upload error handler utility
export const handleUploadError = (error: any): string => {
  if (error?.response?.status === 413) {
    return 'File is too large. Please choose a smaller file.';
  }

  if (error?.message?.includes('too large')) {
    return 'File is too large. Please choose a smaller file.';
  }

  if (error?.message?.includes('timeout')) {
    return 'Upload timed out. Please try again with a smaller file.';
  }

  if (error?.message?.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (error?.message?.includes('format')) {
    return 'Unsupported file format. Please use JPG, PNG, or GIF.';
  }

  return error?.message || 'Upload failed. Please try again.';
};

// Custom error type for session expiration to allow targeted handling without generic crashes
export class SessionExpiredError extends Error {
  status = 401 as const;
  constructor(message = 'Session expired. Please login again.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

// Generic HTTP error with status code for non-OK responses (except 401 which uses SessionExpiredError)
export class HttpError extends Error {
  status: number;
  data?: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    Object.setPrototypeOf(this, HttpError.prototype);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
  }
}

class ApiService {
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

  // Helper method to make requests with timeout
  private async fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = TIMEOUTS.API_REQUEST) {
    // If timeout is 0, don't use timeout at all
    if (timeout === 0) {
      return fetch(url, options);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as any)?.name === 'AbortError') {
        // Determine a more specific error message based on the URL or request type
        let errorMessage = 'Request timeout';
        if (url.includes('/upload') || url.includes('/media') || url.includes('/avatar')) {
          errorMessage = 'Upload request timeout. The file may be too large or network is slow.';
        } else if (url.includes('/auth') || url.includes('/login') || url.includes('/register')) {
          errorMessage = 'Authentication request timeout. Please check your connection and try again.';
        } else if (url.includes('/posts') || url.includes('/feed')) {
          errorMessage = 'Content request timeout. Please check your connection and try again.';
        } else {
          errorMessage = 'Request timeout. Please check your connection and try again.';
        }
        throw new HttpError(408, errorMessage);
      }
      throw error;
    }
  }

  // Helper method to safely parse JSON response
  private async safeJsonParse(response: Response): Promise<any> {
    try {
      const text = await response.text();
      if (!text) return null;

      // Check if response looks like JSON
      const trimmedText = text.trim();
      if ((trimmedText.startsWith('{') || trimmedText.startsWith('[')) && 
          (trimmedText.endsWith('}') || trimmedText.endsWith(']'))) {
        try {
          return JSON.parse(text);
        } catch (parseError) {
          console.error('JSON parsing failed:', parseError);
          // Return a proper error object
          return {
            error: 'Invalid JSON response',
            message: 'Server returned invalid JSON data'
          };
        }
      }

      // If it's not JSON, return a proper error object with the text content
      return {
        error: 'Invalid response format',
        message: text.includes('Internal Server Error') ? 'Server encountered an error. Please try again.' : 'Server returned invalid response format',
        details: text.substring(0, 200) // Include first 200 characters of the response
      };
    } catch (error) {
      console.error('Failed to read response:', error);
      return {
        error: 'Response read error',
        message: 'Failed to read server response'
      };
    }
  }

  // Unified request method with auto-refresh on 401
  private async request<T>(url: string, init: RequestInit = {}, timeout: number = TIMEOUTS.API_REQUEST): Promise<T> {
    console.log(`API Request: ${init.method || 'GET'} ${url}`);
    const method = (init.method || 'GET').toUpperCase();
    let response: Response;
    let attempt = 0;
    // Increase retry attempts for timeout errors, but still limit to prevent infinite loops
    const maxRetries = method === 'GET' ? 3 : 1; // Allow more retries for GET requests, at least 1 for others
    let currentTimeout = timeout;
    // Simple retry loop for transient network/timeout errors
    // Attempts: 0 (original), then up to maxRetries with backoff
    // Backoff: +5s per retry, max 2x the original timeout
    // Do not retry non-timeout HTTP errors
    // Increase retries for auth requests since they can be more complex
    const isAuthRequest = url.includes('/auth');
    const maxRetriesForThisRequest = isAuthRequest ? 3 : maxRetries; // Allow more retries for auth requests
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        response = await this.fetchWithTimeout(url, init, currentTimeout);
        break;
      } catch (err: any) {
        const isTimeout = (err?.name === 'AbortError') || (typeof err?.message === 'string' && err.message.toLowerCase().includes('timeout'));
        const isNetwork = typeof err?.message === 'string' && err.message.toLowerCase().includes('network');
        if (attempt < maxRetriesForThisRequest && (isTimeout || isNetwork)) {
          attempt += 1;
          // Increase timeout for retries to allow for slower responses
          currentTimeout = Math.min(currentTimeout + 5000, TIMEOUTS.API_REQUEST * 2);
          console.warn(`API transient error (${isTimeout ? 'timeout' : 'network'}), retrying ${attempt}/${maxRetriesForThisRequest} in-flight for ${url}`);
          // Add a small delay before retrying to allow network to recover
          await new Promise(resolve => setTimeout(resolve, attempt * 1000)); // 1s, 2s, 3s etc
          continue;
        }
        throw err;
      }
    }

    if (response.status === 401) {
      const refreshResult = await this.auth.refreshToken().catch(() => null);

      if (!refreshResult || !refreshResult.success) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          // Notify the app that the user has been logged out
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        // Create and throw a targeted error so callers can handle it properly
        throw new SessionExpiredError();
      }

      // Merge/refresh Authorization header and retry
      const headers = new Headers(init.headers || {});
      const token = localStorage.getItem('token');
      if (token) headers.set('Authorization', `Bearer ${token}`);

      const retryResponse = await this.fetchWithTimeout(url, { ...init, headers }, timeout);
      
      // Check content type before parsing
      const contentType = retryResponse.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        // For non-JSON responses, return the response directly
        return retryResponse as unknown as T;
      }
      
      const retryData = await this.safeJsonParse(retryResponse);
      // Ensure data is valid before passing to HttpError constructor
      let errorData = retryData && typeof retryData === 'object' ? retryData : { message: 'Unknown error' };
      // Additional check to ensure errorData is never undefined or null
      if (!errorData || typeof errorData !== 'object') {
        errorData = { message: 'Unknown error' };
      }
      // Final defensive check to ensure we have a valid object
      try {
        // Try to stringify and parse to ensure it's a valid object
        const jsonString = JSON.stringify(errorData);
        if (!jsonString || jsonString === 'undefined') {
          errorData = { message: 'Unknown error' };
        }
      } catch (e) {
        errorData = { message: 'Unknown error' };
      }
      if (!retryResponse.ok) {
        const errorMessage = (errorData && (errorData.message || errorData.error)) || `Request failed with status ${retryResponse.status}`;
        // Final defensive check right before throwing the error - ultimate protection
        if (!errorData || typeof errorData !== 'object' || errorData === null || errorData === undefined) {
          errorData = { message: `Request failed with status ${retryResponse.status}`, error: 'Unknown error' };
        }
        // One final check to ensure errorData is a valid object
        if (typeof errorData !== 'object' || errorData === null) {
          errorData = { message: `Request failed with status ${retryResponse.status}`, error: 'Unknown error' };
        }
        // Ultimate defensive check to ensure errorData is never undefined
        if (errorData === undefined) {
          errorData = { message: `Request failed with status ${retryResponse.status}`, error: 'Unknown error' };
        }
        
        // Ensure status is always a valid number
        const validStatus = retryResponse.status !== undefined && retryResponse.status !== null ? retryResponse.status : 500;
        // Additional defensive check to ensure errorData is a valid object
        const safeErrorData = errorData && typeof errorData === 'object' && errorData !== null ? errorData : { message: errorMessage };
        throw new HttpError(validStatus, errorMessage, safeErrorData);
      }
      // Final defensive check to ensure we never return undefined
      if (retryData === undefined) {
        return null as unknown as T;
      }
      return retryData as T;
    }

    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    let data: any;
    if (contentType && !contentType.includes('application/json')) {
      // For non-JSON responses, return the response directly
      data = response;
    } else {
      data = await this.safeJsonParse(response);
    }

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`, { url, status: response.status, data });
      // For non-JSON error responses, create a generic error
      if (data instanceof Response) {
        const errorData = { message: `Request failed with status ${response.status}` };
        // Defensive check to ensure errorData is never undefined
        if (errorData === undefined) {
          // Ensure status is always a valid number
          const validStatus = response.status !== undefined && response.status !== null ? response.status : 500;
          throw new HttpError(validStatus, `Request failed with status ${response.status}`, { message: `Request failed with status ${response.status}` });
        }
        // Ensure status is always a valid number
        const validStatus = response.status !== undefined && response.status !== null ? response.status : 500;
        // Additional defensive check to ensure errorData is a valid object
        const safeErrorData = errorData && typeof errorData === 'object' && errorData !== null ? errorData : { message: `Request failed with status ${response.status}` };
        throw new HttpError(validStatus, `Request failed with status ${response.status}`, safeErrorData);
      }
      // Ensure data is valid before passing to HttpError constructor
      let errorData = data && typeof data === 'object' ? data : { message: `Request failed with status ${response.status}` };
      // Additional check to ensure errorData is never undefined or null
      if (!errorData || typeof errorData !== 'object') {
        errorData = { message: `Request failed with status ${response.status}` };
      }
      // Final defensive check to ensure we have a valid object
      try {
        // Try to stringify and parse to ensure it's a valid object
        const jsonString = JSON.stringify(errorData);
        if (!jsonString || jsonString === 'undefined') {
          errorData = { message: `Request failed with status ${response.status}`, error: 'Unknown error' };
        }
      } catch (e) {
        errorData = { message: `Request failed with status ${response.status}`, error: 'Unknown error' };
      }
      const errorMessage = (errorData && (errorData.message || errorData.error)) || `Request failed with status ${response.status}`;
      // Final defensive check right before throwing the error
      if (!errorData || typeof errorData !== 'object' || errorData === null || errorData === undefined) {
        errorData = { message: `Request failed with status ${response.status}`, error: 'Unknown error' };
      }
      // Ultimate defensive check to ensure errorData is never undefined
      if (errorData === undefined) {
        errorData = { message: `Request failed with status ${response.status}`, error: 'Unknown error' };
      }
      
      // User-friendly error messages based on status codes
      let userFriendlyMessage = errorMessage;
      if (response.status === 404) {
        userFriendlyMessage = 'No result found';
      } else if (response.status === 500) {
        userFriendlyMessage = 'An internal server error occurred. Please try again later.';
      } else if (response.status === 403) {
        userFriendlyMessage = 'Access denied. You do not have permission to access this resource.';
      } else if (response.status === 400) {
        // For 400 errors, try to provide more specific error messages
        if (errorData && errorData.message) {
          userFriendlyMessage = errorData.message;
        } else if (errorData && errorData.error) {
          userFriendlyMessage = errorData.error;
        } else {
          userFriendlyMessage = 'Invalid request data. Please check your input and try again.';
        }
        console.log('400 Error Details:', errorData);
      }
      
      // Ensure status is always a valid number
      const validStatus = response.status !== undefined && response.status !== null ? response.status : 500;
      // Additional defensive check to ensure errorData is a valid object
      const safeErrorData = errorData && typeof errorData === 'object' && errorData !== null ? errorData : { message: userFriendlyMessage };
      throw new HttpError(validStatus, userFriendlyMessage, safeErrorData);
    }
    
    // For non-JSON success responses, return the response directly
    if (data instanceof Response) {
      return data as unknown as T;
    }
    
    // Final defensive check to ensure we never return undefined
    if (data === undefined) {
      return null as unknown as T;
    }
    
    return data as T;
  }

  // Generic HTTP methods
  async get(endpoint: string, options: RequestInit = {}) {
    return this.request(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      ...options,
    }, TIMEOUTS.API_REQUEST);
  }

  async post(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }, TIMEOUTS.API_REQUEST);
  }

  async put(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }, TIMEOUTS.API_REQUEST);
  }

  async delete(endpoint: string, options: RequestInit = {}) {
    return this.request(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      ...options,
    }, TIMEOUTS.API_REQUEST);
  }

  // Auth API
  auth = {
    removeCover: async () => {
      return this.request(`${API_URL}/auth/profile/cover`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.AUTH_REQUEST);
    },

    login: async (credentials: any) => {
      try {
        console.log('Attempting login for:', credentials.email);
        const response = await this.request(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        }, TIMEOUTS.AUTH_REQUEST);

        return response;
      } catch (error: any) {
        // Handle network errors, CORS errors, etc.
        console.error('Login API error:', error);
        if (error instanceof HttpError) {
          // Return structured error response
          return {
            success: false,
            message: error.message,
            error: error.message,
            status: error.status
          };
        }
        return {
          success: false,
          message: error.message || 'Network error. Please check your connection.',
          error: error.name || 'NetworkError'
        };
      }
    },

    oauthGoogle: async (idToken: string) => {
      try {
        const response = await this.request(`${API_URL}/auth/oauth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }, TIMEOUTS.AUTH_REQUEST);

        return response;
      } catch (error: any) {
        console.error('Google OAuth API error:', error);
        
        if (error instanceof HttpError) {
          // Provide more specific error messages based on status codes
          let errorMessage = error.message || 'Google authentication failed';
          
          if (error.status === 400) {
            errorMessage = error.message || 'Invalid Google token. Please try again.';
          } else if (error.status === 401) {
            errorMessage = error.message || 'Authentication failed. Please try again.';
          } else if (error.status === 504) {
            errorMessage = 'Google verification service timeout. Please check your connection and try again.';
          } else if (error.status >= 500) {
            errorMessage = 'Server error during Google authentication. Please try again later.';
          }
          
          return {
            success: false,
            message: errorMessage,
            status: error.status,
            ...error.data
          };
        }
        
        if (error?.message?.includes('network') || error?.message?.includes('failed to fetch')) {
          return {
            success: false,
            message: 'Network error. Please check your connection and try again.',
            error: 'NETWORK_ERROR'
          };
        }
        
        return {
          success: false,
          message: error?.message || 'Failed to authenticate with Google. Please try again.',
          error: error?.name || 'UNKNOWN_ERROR'
        };
      }
    },

    oauthApple: async (identityToken: string) => {
      try {
        const response = await this.request(`${API_URL}/auth/oauth/apple`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identityToken }),
        }, TIMEOUTS.AUTH_REQUEST);

        return response;
      } catch (error: any) {
        console.error('Apple OAuth API error:', error);
        
        if (error instanceof HttpError) {
          return {
            success: false,
            message: error.message || 'Apple authentication failed',
            status: error.status,
            ...error.data
          };
        }
        
        return {
          success: false,
          message: error?.message || 'Failed to authenticate with Apple. Please try again.',
          error: error?.name || 'UNKNOWN_ERROR'
        };
      }
    },

    register: async (userData: any) => {
      try {
        console.log('Sending registration request with data:', userData);
        const response = await this.request(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        }, TIMEOUTS.AUTH_REQUEST);

        console.log('Registration response:', response);
        return response;
      } catch (error) {
        console.error('Registration request error:', error);
        throw error;
      }
    },

    refreshToken: async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return { success: false, message: 'No refresh token available' };
      }
      try {
        const response = await this.fetchWithTimeout(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }, TIMEOUTS.AUTH_REQUEST);
        const data = await this.safeJsonParse(response);
        if (data?.success && data.accessToken) {
          localStorage.setItem('token', data.accessToken);
        }
        return data;
      } catch (error) {
        console.error('Token refresh error:', error);
        return { success: false, message: 'Failed to refresh token' };
      }
    },

    logout: async () => {
      return await this.request(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.AUTH_REQUEST);
    },

    updateProfile: async (data: any) => {
      // Backend update endpoint is PUT /api/auth/profile
      return this.request(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }, TIMEOUTS.AUTH_REQUEST);
    },

    getProfile: async () => {
      // Use backend /auth/me to fetch current authenticated user
      if (typeof window === 'undefined') {
        return { success: false } as any;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false } as any;
      }

      const res: any = await this.request(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.AUTH_REQUEST);

      // Normalize shape to { success, data }
      if (res && typeof res === 'object') {
        if (res.success && res.data) return res as any;
        if (res.user) return { success: true, data: res.user } as any;
      }
      return res as any;
    },

    getSettings: async () => {
      return this.request(`${API_URL}/auth/settings`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    updateSettings: async (settingType: string, settingsData: any) => {
      return this.request(`${API_URL}/auth/settings`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ type: settingType, data: settingsData }),
      });
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      return this.request(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },

    deleteAccount: async (password: string) => {
      return this.request(`${API_URL}/auth/delete-account`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ password }),
      });
    },

    exportData: async () => {
      return this.request(`${API_URL}/auth/export-data`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },
  };

  // Users API
  users = {
    getAll: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      return this.request(`${API_URL}/users?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },
    checkUsernameAvailability: async (username: string) => {
      try {
        const response = await fetch(`${API_URL}/users/check-username?username=${encodeURIComponent(username)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return this.safeJsonParse(response);
      } catch (error) {
        console.error('Username check error:', error);
        return { success: false, available: false };
      }
    },

    getProfile: async (username: string) => {
      try {
        return await this.request(`${API_URL}/users/profile/${encodeURIComponent(username)}`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }, TIMEOUTS.API_REQUEST);
      } catch (error: any) {
        // For profile requests, we want to handle errors gracefully
        // and return a structured response instead of throwing
        if (error instanceof HttpError) {
          return {
            success: false,
            error: error.data?.error || error.message,
            message: error.data?.message || error.message,
            status: error.status
          };
        } else if (error instanceof SessionExpiredError) {
          // For session expired, try without auth (for public profiles)
          try {
            const response = await fetch(`${API_URL}/users/profile/${encodeURIComponent(username)}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            const data = await this.safeJsonParse(response);
            return data;
          } catch (fallbackError) {
            return {
              success: false,
              error: 'Failed to load profile',
              message: 'Unable to access profile'
            };
          }
        } else {
          return {
            success: false,
            error: error.message || 'Failed to load profile',
            message: error.message || 'An unexpected error occurred'
          };
        }
      }
    },

    updateProfile: async (data: Partial<{ displayName: string; bio: string; location: string; website: string; socialLinks: Record<string, string>; avatar?: string; }>) => {
      // Check if we're updating avatar - if so, use the auth endpoint which properly handles avatars
      if (data.avatar !== undefined) {
        console.warn('Redirecting avatar update to auth endpoint which properly handles avatars');
        return this.auth.updateProfile(data);
      }
      
      // For non-avatar updates, use the existing endpoint
      return this.request(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }, TIMEOUTS.API_REQUEST);
    },

    follow: async (userId: string) => {
      return this.request(`${API_URL}/users/${userId}/follow`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    unfollow: async (userId: string) => {
      return this.request(`${API_URL}/users/${userId}/follow`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    getRelationship: async (userId: string) => {
      const response = await fetch(`${API_URL}/users/${userId}/relationship`, {
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },

    getFollowers: async (userId: string, limit: number = 20, skip: number = 0) => {
      const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
      const response = await fetch(`${API_URL}/users/${userId}/followers?${params.toString()}`, {
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },

    getFollowing: async (userId: string, limit: number = 20, skip: number = 0) => {
      const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
      const response = await fetch(`${API_URL}/users/${userId}/following?${params.toString()}`, {
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },

    getById: async (id: string) => {
      return this.request(`${API_URL}/users/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    getByUsername: async (username: string) => {
      return this.request(`${API_URL}/users/profile/${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },
  };

  // Orders API
  orders = {
    // Get all orders for the user
    getAll: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      return this.request(`${API_URL}/marketplace/orders?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    // Get specific order details
    getOrder: async (orderId: string) => {
      return this.request(`${API_URL}/orders/${orderId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    // Cancel an order
    cancelOrder: async (orderId: string) => {
      return this.request(`${API_URL}/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    // Get tracking information for an order
    getTrackingInfo: async (orderId: string) => {
      return this.request(`${API_URL}/orders/${orderId}/track`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    // Download invoice for an order
    downloadInvoice: async (orderId: string) => {
      return this.request(`${API_URL}/orders/${orderId}/invoice`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },
  };

  // Posts API
  posts = {
    getAll: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      const response = await fetch(`${API_URL}/posts?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },

    create: async (postData: any) => {
      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(postData),
      });
      return this.safeJsonParse(response);
    },

    getById: async (postId: string) => {
      const response = await fetch(`${API_URL}/posts/${postId}`, {
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },

    getUserPosts: async (username: string, params?: any) => {
      // Avoid backend call for placeholder username
      if (username && username.toLowerCase() === 'anonymous') {
        const limit = Number(params?.limit ?? 10);
        return Promise.resolve({
          success: true,
          data: {
            posts: [],
            pagination: { page: 1, limit, total: 0, pages: 0 },
          },
        } as any);
      }

      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && `${value}`.length > 0) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      return this.request(`${API_URL}/posts/user/${encodeURIComponent(username)}?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    getUserAchievements: async (username: string, params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && `${value}`.length > 0) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      return this.request(`${API_URL}/posts/user/${encodeURIComponent(username)}/achievements?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    getUserLikedPosts: async (userId: string, params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && `${value}`.length > 0) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      return this.request(`${API_URL}/posts/user/${encodeURIComponent(userId)}/liked?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    like: async (postId: string) => {
      return this.request(`${API_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    },

    // Note: Unlike is handled by the same like endpoint (toggle functionality)
    unlike: async (postId: string) => {
      // Use the same endpoint as like - it toggles the like status
      return this.request(`${API_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    },

    bookmark: async (postId: string) => {
      return this.request(`${API_URL}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    },

    share: async (postId: string, platform: string = 'internal') => {
      return this.request(`${API_URL}/posts/${postId}/share`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ platform }),
      });
    },

    shareWithFollowers: async (postId: string, message: string = '') => {
      return this.request(`${API_URL}/posts/${postId}/share/followers`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ message }),
      });
    },

    shareWithUsers: async (postId: string, userIds: string[], message: string = '') => {
      return this.request(`${API_URL}/posts/${postId}/share/users`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ userIds, message }),
      });
    },

    unbookmark: async (postId: string) => {
      // Use the same endpoint as bookmark - it toggles the bookmark status
      return this.request(`${API_URL}/posts/${postId}/bookmark`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    },

    getPublicPosts: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && `${value}`.length > 0) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      const response = await fetch(`${API_URL}/posts/public?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },

    getLikedPosts: async (page: number = 1) => {
      return this.request(`${API_URL}/posts/liked?page=${page}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    getSavedPosts: async (page: number = 1) => {
      return this.request(`${API_URL}/posts/saved?page=${page}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    likePost: async (postId: string) => {
      return this.request(`${API_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    },

    unlikePost: async (postId: string) => {
      return this.request(`${API_URL}/posts/${postId}/unlike`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    },

    getBookmarkedPosts: async (userId: string, params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      return this.request(`${API_URL}/posts/bookmarks/${userId}?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

  getTrending: async (params?: any) => {
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
    return this.safeJsonParse(response);
  },

  getAchievements: async (params?: any) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value?.toString() ?? '');
        }
      });
    }
    const response = await fetch(`${API_URL}/posts/achievements?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    return this.safeJsonParse(response);
  },

  delete: async (postId: string) => {
    return this.request(`${API_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
  },

  // Hide likes on a post
  hideLikes: async (postId: string, hide: boolean) => {
    return this.request(`${API_URL}/posts/${postId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ hideLikes: hide }),
    });
  },

  // Hide comments on a post
  hideComments: async (postId: string, hide: boolean) => {
    return this.request(`${API_URL}/posts/${postId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ hideComments: hide }),
    });
  },

  // Track post view
  trackView: async (postId: string) => {
    return this.request(`${API_URL}/posts/${postId}/view`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  },

  // Create achievement post
  createAchievement: async (postData: any) => {
    return this.request(`${API_URL}/posts`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ ...postData, isAchievement: true }),
    });
  },
};

  // NFTs API
  nfts = {
    getUserNFTs: async (username: string, params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      const response = await fetch(`${API_URL}/nfts/user/${username}?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },
  };

  // Messages API
  messages = {
    createConversation: async (participantIds: string[]) => {
      return this.request(`${API_URL}/messages/conversations`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ participantIds }),
      });
    },

    addGroupMembers: async (groupId: string, data: { memberIds: string[] }) => {
      const response = await fetch(`${API_URL}/messages/conversations/${groupId}/members`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return this.safeJsonParse(response);
    },
  };

  // Comments API
  comments = {
    getByPostId: async (postId: string, params?: {
      limit?: number;
      page?: number;
      sortBy?: 'newest' | 'oldest' | 'popular';
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy);

      return this.request(`${API_URL}/comments/${postId}?${queryParams}`, {
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    create: async (data: {
      postId: string;
      content: string;
      parentId?: string;
    }) => {
      return this.request(`${API_URL}/comments`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }, TIMEOUTS.API_REQUEST);
    },

    like: async (commentId: string) => {
      return this.request(`${API_URL}/comments/${commentId}/like`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    unlike: async (commentId: string) => {
      return this.request(`${API_URL}/comments/${commentId}/like`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    delete: async (commentId: string) => {
      return this.request(`${API_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    edit: async (commentId: string, content: string) => {
      return this.request(`${API_URL}/comments/${commentId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ content }),
      }, TIMEOUTS.API_REQUEST);
    },

    report: async (commentId: string, reason: string, description?: string) => {
      return this.request(`${API_URL}/comments/${commentId}/report`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ reason, description }),
      }, TIMEOUTS.API_REQUEST);
    },

    getThread: async (commentId: string, params?: {
      maxDepth?: number;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.maxDepth) queryParams.append('maxDepth', params.maxDepth.toString());

      return this.request(`${API_URL}/comments/${commentId}/thread?${queryParams}`, {
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    search: async (query: string, params?: {
      postId?: string;
      limit?: number;
      page?: number;
    }) => {
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      if (params?.postId) queryParams.append('postId', params.postId);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.page) queryParams.append('page', params.page.toString());

      return this.request(`${API_URL}/comments/search?${queryParams}`, {
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },
  };

  // Search API
  search = {
    query: async (params: {
      query: string;
      type?: string;
      filters?: string[];
      limit?: number;
      page?: number;
    }) => {
      const queryParams = new URLSearchParams();
      queryParams.append('q', params.query);
      if (params.type) queryParams.append('type', params.type);
      if (params.filters) queryParams.append('filters', params.filters.join(','));
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.page) queryParams.append('page', params.page.toString());

      return this.request(`${API_URL}/search?${queryParams}`, {
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    users: async (query: string, limit = 20) => {
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      queryParams.append('limit', limit.toString());
      
      return this.request(`${API_URL}/search/users?${queryParams}`, {
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    posts: async (query: string, limit = 20) => {
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      queryParams.append('limit', limit.toString());
      
      return this.request(`${API_URL}/search/posts?${queryParams}`, {
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },

    hashtags: async (query: string, limit = 20) => {
      const queryParams = new URLSearchParams();
      queryParams.append('q', query);
      queryParams.append('limit', limit.toString());
      
      return this.request(`${API_URL}/search/hashtags?${queryParams}`, {
        headers: this.getAuthHeaders(),
      }, TIMEOUTS.API_REQUEST);
    },
  };

  // Media API
  media = {
    upload: async (file: File, type: 'avatar' | 'post' | 'cover', opts?: { onProgress?: (percent: number) => void }) => {
      console.log('=== Frontend Upload Request ===');
      console.log('File:', { name: file.name, size: file.size, type: file.type });
      console.log('Upload type:', type);
      
      // Check if this is an audio file and log additional info
      if (file.type.startsWith('audio/')) {
        console.log('Audio file detected:', {
          mimeType: file.type,
          extension: file.name.split('.').pop(),
          size: file.size
        });
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const token = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
      const endpoint = type === 'avatar'
        ? `${API_URL}/media/upload/profile-picture`
        : `${API_URL}/media/upload/single`;

      console.log('Upload endpoint:', endpoint);
      console.log('Has auth token:', !!token);

      // Use XHR for upload progress support
      const xhr = new XMLHttpRequest();

      const promise: Promise<any> = new Promise((resolve, reject) => {
        xhr.open('POST', endpoint, true);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        // Use empty string to allow access to both responseText and response
        xhr.responseType = '';

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && opts?.onProgress) {
            const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
            opts.onProgress(percent);
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new HttpError(408, 'Upload request timed out. The file may be too large or network connection is slow.'));

        xhr.onload = () => {
          const status = xhr.status;
          let data: { success?: boolean; message?: string; error?: string; details?: string; responseText?: string } | null = null;

          try {
            const responseText = xhr.responseText || '';

            // Use our safe JSON parsing logic
            if (!responseText) {
              data = status >= 200 && status < 300
                ? { success: true, message: 'Upload completed successfully' }
                : { error: 'No response from server' };
            } else if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
              // Looks like JSON, try to parse it
              data = JSON.parse(responseText);
            } else {
              // Not JSON, likely HTML error page
              data = {
                error: responseText.includes('Internal Server Error') ? 'Internal Server Error' : responseText,
                message: responseText.includes('Internal Server Error')
                  ? 'Server encountered an error during upload. Please try again.'
                  : 'Upload failed with unexpected response format.'
              };
            }
          } catch (parseError) {
            console.error('Failed to parse upload response:', parseError);
            data = {
              error: 'Invalid response format',
              message: 'Server returned an invalid response. Please try again.',
              responseText: xhr.responseText
            };
          }

          console.log('Upload response:', { status, data });

          if (status >= 200 && status < 300) {
            if (opts?.onProgress) opts.onProgress(100);
            resolve(data);
          } else {
            const errorMsg = (data && (data.message || data.error || data.details)) ||
              `Upload failed with status ${status}`;
            console.error('Upload failed:', { status, data, errorMsg });
            
            // Provide more specific error messages for different file types
            if (errorMsg.includes('not allowed') && file && file.type && file.type.startsWith('audio/')) {
              reject(new Error(`Audio file type ${file.type} is not supported. Please use MP3, WAV, AAC, OGG, or M4A formats.`));
            } else {
              reject(new Error(errorMsg));
            }
          }
        };

        xhr.send(formData);
      });

      return promise;
    },

    uploadMultiple: async (files: File[], type: 'post', opts?: { onProgress?: (percent: number) => void }) => {
      console.log('=== Frontend Multiple Upload Request ===');
      console.log('Files count:', files.length);
      console.log('Upload type:', type);
      
      const formData = new FormData();
      
      // Append all files
      files.forEach((file, index) => {
        formData.append('files', file);
      });
      
      formData.append('type', type);
      
      const token = (typeof window !== 'undefined') ? localStorage.getItem('token') : null;
      const endpoint = `${API_URL}/media/upload/multiple`;
      
      console.log('Upload endpoint:', endpoint);
      console.log('Has auth token:', !!token);
      
      // Use XHR for upload progress support
      const xhr = new XMLHttpRequest();
      
      const promise: Promise<any> = new Promise((resolve, reject) => {
        xhr.open('POST', endpoint, true);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        // Use empty string to allow access to both responseText and response
        xhr.responseType = '';
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && opts?.onProgress) {
            const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
            opts.onProgress(percent);
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.ontimeout = () => reject(new HttpError(408, 'Upload request timed out. The file may be too large or network connection is slow.'));
        
        xhr.onload = () => {
          const status = xhr.status;
          let data: { success?: boolean; message?: string; error?: string; details?: string; responseText?: string } | null = null;
          
          try {
            const responseText = xhr.responseText || '';
            
            // Use our safe JSON parsing logic
            if (!responseText) {
              data = status >= 200 && status < 300
                ? { success: true, message: 'Upload completed successfully' }
                : { error: 'No response from server' };
            } else if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
              // Looks like JSON, try to parse it
              data = JSON.parse(responseText);
            } else {
              // Not JSON, likely HTML error page
              data = {
                error: responseText.includes('Internal Server Error') ? 'Internal Server Error' : responseText,
                message: responseText.includes('Internal Server Error')
                  ? 'Server encountered an error during upload. Please try again.'
                  : 'Upload failed with unexpected response format.'
              };
            }
          } catch (parseError) {
            console.error('Failed to parse upload response:', parseError);
            data = {
              error: 'Invalid response format',
              message: 'Server returned an invalid response. Please try again.',
              responseText: xhr.responseText
            };
          }
          
          console.log('Upload response:', { status, data });
          
          if (status >= 200 && status < 300) {
            if (opts?.onProgress) opts.onProgress(100);
            resolve(data);
          } else {
            const errorMsg = (data && (data.message || data.error || data.details)) ||
              `Upload failed with status ${status}`;
            console.error('Upload failed:', { status, data, errorMsg });
            reject(new Error(errorMsg));
          }
        };
        
        xhr.send(formData);
      });
      
      return promise;
    },

    getVideoThumbnail: async (publicId: string, params?: { width?: number; height?: number; quality?: string }) => {
      return this.request(`${API_URL}/media/video/thumbnail`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ publicId, ...(params || {}) }),
      });
    },

    getOptimizedAudio: async (publicId: string, params?: { format?: string; quality?: string }) => {
      try {
        console.log('=== Frontend Audio Optimization Request ===');
        console.log('API_URL:', API_URL);
        console.log('Full URL:', `${API_URL}/media/audio/optimized`);
        console.log('PublicId:', publicId);
        console.log('Params:', params);

        if (!publicId) {
          throw new Error('Public ID is required for audio optimization');
        }

        const requestBody = {
          publicId,
          format: params?.format || 'mp3',
          quality: params?.quality || 'auto'
        };

        console.log('Request body:', requestBody);

        // Create cache key for this request
        const cacheKey = `audio_opt_${publicId}_${requestBody.format}_${requestBody.quality}`;

        // Check if we have a cached result (simple in-memory cache)
        if (typeof window !== 'undefined' && (window as any).__audioOptCache) {
          const cached = (window as any).__audioOptCache[cacheKey];
          if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
            console.log('Using cached audio optimization result');
            return cached.data;
          }
        }

        const response = await this.request(`${API_URL}/media/audio/optimized`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestBody),
        }, TIMEOUTS.UPLOAD); // Use longer timeout for media processing

        console.log('Audio optimization response:', response);

        // Cache the successful response
        if (typeof window !== 'undefined' && response) {
          if (!(window as any).__audioOptCache) {
            (window as any).__audioOptCache = {};
          }
          (window as any).__audioOptCache[cacheKey] = {
            data: response,
            timestamp: Date.now()
          };
        }

        return response;
      } catch (error: any) {
        console.error('Audio optimization error:', error);

        // Provide more specific error messages
        if (error instanceof SessionExpiredError) {
          throw error; // Re-throw session errors as-is
        }

        if (error instanceof HttpError) {
          const message = error.status === 400
            ? `Invalid audio optimization request: ${error.data?.details || error.message}`
            : error.status === 401
              ? 'Authentication required for audio optimization'
              : error.status === 404
                ? 'Audio optimization service not available'
                : `Audio optimization failed: ${error.message}`;

          throw new Error(message);
        }

        throw new Error(`Audio optimization failed: ${error.message || 'Unknown error'}`);
      }
    },

    getOptimizedVideo: async (publicId: string, params?: { format?: string; quality?: string; width?: number; height?: number }) => {
      try {
        console.log('=== Frontend Video Optimization Request ===');
        console.log('API_URL:', API_URL);
        console.log('Full URL:', `${API_URL}/media/video/optimized`);
        console.log('PublicId:', publicId);
        console.log('Params:', params);

        if (!publicId) {
          throw new Error('Public ID is required for video optimization');
        }
        
        // Add the rest of the implementation here
        // This seems to be a partial implementation
        throw new Error('Not implemented');
      } catch (error) {
        // Handle the error appropriately
        console.error('Video optimization error:', error);
        throw error;
      }
    },
  };

  // Ads API
  ads = {
    // Create a product post (link an existing product to a post)
    createProductPost: async (postData: {
      postId: string;
      productId: string;
      productPosition?: 'main' | 'tagged' | 'featured' | 'promoted';
      placementData?: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        mediaIndex?: number;
      };
      currentPrice?: number;
      originalPrice?: number;
      availableStock?: number;
      showPrice?: boolean;
      showProductTag?: boolean;
      isFeatured?: boolean;
      isPromoted?: boolean;
      promotionDiscount?: number;
    }) => {
      return this.post(`/ads/product-posts`, postData);
    },

    // Get a specific product post
    getProductPost: async (id: string) => {
      return this.get(`/ads/product-posts/${id}`);
    },

    // Update a product post
    updateProductPost: async (id: string, updateData: any) => {
      return this.put(`/ads/product-posts/${id}`, updateData);
    },

    // Get vendor's product posts
    getVendorProductPosts: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.get(`/ads/product-posts?${queryParams}`);
    },

    // Record ad impression
    recordAdImpression: async (adId: string) => {
      return this.post(`/ads/${adId}/impressions`, {});
    },

    // Record ad click
    recordAdClick: async (adId: string) => {
      return this.post(`/ads/${adId}/clicks`, {});
    },

    // Record product post view
    recordProductPostView: async (productPostId: string) => {
      return this.post(`/ads/product-posts/${productPostId}/views`, {});
    },

    // Record product post interaction
    recordProductPostInteraction: async (productPostId: string, interactionType: string) => {
      return this.post(`/ads/product-posts/${productPostId}/interactions`, {
        type: interactionType
      });
    },

    // Get ad campaigns
    getAdCampaigns: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.get(`/ads/campaigns?${queryParams}`);
    },

    // Get ad analytics
    getAdAnalytics: async (adId: string = 'all', params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      // If adId is 'all', we want to get overall analytics
      if (adId === 'all') {
        return this.get(`/ads/analytics?${queryParams}`);
      }
      // Otherwise, get analytics for a specific ad
      queryParams.append('adId', adId);
      return this.get(`/ads/analytics?${queryParams}`);
    },

    // Get campaign analytics
    getCampaignAnalytics: async (campaignId: string, params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.get(`/ads/campaigns/${campaignId}/analytics?${queryParams}`);
    },

    // Get targeted ads for a user
    getTargetedAds: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.get(`/ads/targeted?${queryParams}`);
    },

    // Get product posts
    getProductPosts: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.get(`/ads/product-posts?${queryParams}`);
    },
  };

  // Marketplace API
  marketplace = {
    // Get products with various filters
    getProducts: async (params?: {
      vendorId?: string;
      category?: string;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.get(`/marketplace/products?${queryParams}`);
    },

    // Get a specific product by ID
    getProduct: async (productId: string) => {
      return this.get(`/marketplace/products/${productId}`);
    },

    // Create a new product
    createProduct: async (productData: any) => {
      return this.post('/marketplace/products', productData);
    },

    // Update an existing product
    updateProduct: async (productId: string, productData: any) => {
      return this.put(`/marketplace/products/${productId}`, productData);
    },

    // Delete a product
    deleteProduct: async (productId: string) => {
      return this.delete(`/marketplace/products/${productId}`);
    },

    // Get product reviews
    getProductReviews: async (productId: string, page: number = 1, limit: number = 10) => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      return this.get(`/marketplace/products/${productId}/reviews?${queryParams}`);
    },

    // Add a review to a product
    addProductReview: async (productId: string, reviewData: { rating: number; comment: string }) => {
      return this.post(`/marketplace/products/${productId}/reviews`, reviewData);
    },

    // Get vendor's products
    getVendorProducts: async (vendorId: string, page: number = 1, limit: number = 20) => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      return this.get(`/marketplace/vendors/${vendorId}/products?${queryParams}`);
    },

    // Get vendor information
    getVendor: async (vendorId: string) => {
      return this.get(`/marketplace/vendors/${vendorId}`);
    },

    // Get current user's products
    getMyProducts: async (params?: {
      page?: number;
      limit?: number;
      category?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.get(`/marketplace/my/products?${queryParams}`);
    },

    // Get all vendors
    getVendors: async (params?: {
      page?: number;
      limit?: number;
      search?: string;
    }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.get(`/marketplace/vendors?${queryParams}`);
    },

    // Search products
    searchProducts: async (query: string, filters?: any) => {
      const params: any = { q: query };
      if (filters) {
        Object.assign(params, filters);
      }
      const queryParams = new URLSearchParams(params);
      return this.get(`/marketplace/search?${queryParams}`);
    },

    // Add product to wishlist
    addToWishlist: async (productId: string) => {
      return this.post(`/marketplace/wishlist/${productId}`, {});
    },

    // Remove product from wishlist
    removeFromWishlist: async (productId: string) => {
      return this.delete(`/marketplace/wishlist/${productId}`);
    },

    // Get user's wishlist
    getWishlist: async (page: number = 1, limit: number = 20) => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      return this.get(`/marketplace/wishlist?${queryParams}`);
    },

    // Get product categories
    getCategories: async () => {
      return this.get('/marketplace/categories');
    },

    // Get featured products
    getFeaturedProducts: async (limit: number = 10) => {
      const queryParams = new URLSearchParams({
        limit: limit.toString()
      });
      return this.get(`/marketplace/products/featured?${queryParams}`);
    },

    // Get random products
    getRandomProducts: async (limit: number = 10) => {
      const queryParams = new URLSearchParams({
        limit: limit.toString()
      });
      return this.get(`/marketplace/products/random?${queryParams}`);
    },

    // Get product recommendations
    getRecommendations: async (productId: string, limit: number = 5) => {
      const queryParams = new URLSearchParams({
        limit: limit.toString()
      });
      return this.get(`/marketplace/products/${productId}/recommendations?${queryParams}`);
    },

    // Get user-specific recommendations
    getUserRecommendations: async (userId: string, limit: number = 10) => {
      const queryParams = new URLSearchParams({
        limit: limit.toString()
      });
      return this.get(`/marketplace/recommendations/${userId}?${queryParams}`);
    },

    // Provide feedback on recommendations
    provideRecommendationFeedback: async (data: { productId: string; feedback: 'like' | 'dislike'; reason?: string }) => {
      return this.post('/marketplace/recommendations/feedback', data);
    },

    // Get related products
    getRelatedProducts: async (productId: string, limit: number = 12) => {
      const queryParams = new URLSearchParams({
        limit: limit.toString()
      });
      return this.get(`/marketplace/products/${productId}/related?${queryParams}`);
    },

    // Get trending products
    getTrendingProducts: async (limit: number = 10) => {
      const queryParams = new URLSearchParams({
        limit: limit.toString()
      });
      return this.get(`/marketplace/products/trending?${queryParams}`);
    },

    // Get best selling products
    getBestSellingProducts: async (limit: number = 10) => {
      const queryParams = new URLSearchParams({
        limit: limit.toString()
      });
      return this.get(`/marketplace/products/best-selling?${queryParams}`);
    },

    // Get newly added products
    getNewProducts: async (limit: number = 10) => {
      const queryParams = new URLSearchParams({
        limit: limit.toString()
      });
      return this.get(`/marketplace/products/new?${queryParams}`);
    },

    // Get vendor analytics
    getVendorAnalytics: async () => {
      return this.get('/marketplace/vendor/analytics');
    },

    // Get vendor analytics by vendor ID
    getVendorAnalyticsById: async (vendorId: string) => {
      return this.get(`/marketplace/vendor/${vendorId}/analytics`);
    },

    // Get vendor performance overview
    getVendorPerformanceOverview: async () => {
      return this.get('/marketplace/vendors/me/analytics/overview');
    },

    // Get vendor sales trends
    getVendorSalesTrends: async (params?: { period?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.period) {
        queryParams.append('period', params.period);
      }
      return this.get(`/marketplace/vendors/me/analytics/trends?${queryParams}`);
    },

    // Get detailed vendor analytics
    getDetailedVendorAnalytics: async (params?: { period?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.period) {
        queryParams.append('period', params.period);
      }
      return this.get(`/marketplace/vendors/me/analytics/detailed?${queryParams}`);
    },

    // Get customer demographics
    getCustomerDemographics: async () => {
      return this.get('/marketplace/vendors/me/analytics/demographics');
    },

    // Get inventory analytics
    getInventoryAnalytics: async () => {
      return this.get('/marketplace/vendors/me/analytics/inventory');
    },

    // Get performance benchmarks
    getPerformanceBenchmarks: async () => {
      return this.get('/marketplace/vendors/me/analytics/benchmarks');
    },

    // Get vendor comparison data (admin only)
    getVendorComparison: async (params?: { limit?: number; period?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.limit) {
        queryParams.append('limit', params.limit.toString());
      }
      if (params?.period) {
        queryParams.append('period', params.period);
      }
      return this.get(`/marketplace/admin/analytics/vendor-comparison?${queryParams}`);
    },

    // Update product review
    updateProductReview: async (reviewId: string, reviewData: any) => {
      return this.put(`/marketplace/reviews/${reviewId}`, reviewData);
    },

    // Upload product images
    uploadImages: async (imageFiles: File[]) => {
      const formData = new FormData();
      imageFiles.forEach((file, index) => {
        formData.append(`images`, file);
      });
      
      // Use the existing media upload endpoint but with marketplace context
      return this.request(`${API_URL}/marketplace/products/upload-images`, {
        method: 'POST',
        headers: this.getAuthHeaders(false), // Don't include JSON content type for FormData
        body: formData,
      });
    },

    // Buy a product
    buyProduct: async (productId: string, purchaseData: { quantity?: number; shippingAddress: any }) => {
      return this.post(`/marketplace/products/${productId}/buy`, purchaseData);
    },

    // Get product by ID (alias for getProduct)
    getProductById: async (productId: string) => {
      return this.get(`/marketplace/products/${productId}`);
    },

    // Get vendor payment preferences
    getVendorPaymentPreferences: async (vendorId: string) => {
      return this.get(`/marketplace/vendors/${vendorId}/payment-preferences`);
    },

    // Get my payment preferences
    getMyPaymentPreferences: async () => {
      return this.get(`/marketplace/vendors/me/payment-preferences`);
    },

    // Update my payment preferences
    updateMyPaymentPreferences: async (preferences: any) => {
      return this.put(`/marketplace/vendors/me/payment-preferences`, preferences);
    },

    // Get my payout history
    getMyPayoutHistory: async (params?: { limit?: number; status?: string }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.get(`/marketplace/vendors/me/payout-history?${queryParams}`);
    },

    // Vendor Store Endpoints
    // Get my vendor store
    getMyVendorStore: async () => {
      return this.get(`/marketplace/vendors/me/store`);
    },

    // Create vendor store
    createVendorStore: async (storeData: any) => {
      console.log('API: Creating vendor store with data:', storeData);
      return this.post(`/marketplace/vendors/me/store`, storeData);
    },

    // Update my vendor store
    updateMyVendorStore: async (storeData: any) => {
      console.log('API: Updating vendor store with data:', storeData);
      return this.put(`/marketplace/vendors/me/store`, storeData);
    },

    // Delete my vendor store
    deleteMyVendorStore: async () => {
      return this.delete(`/marketplace/vendors/me/store`);
    },

    // Get vendor store by vendor ID
    getVendorStore: async (vendorId: string) => {
      return this.get(`/marketplace/vendors/${vendorId}/store`);
    },

    // Compare products
    compareProducts: async (productIds: string[]) => {
      return this.post('/marketplace/products/compare', { productIds });
    },

    // Get product review stats
    getProductReviewStats: async (productId: string) => {
      return this.get(`/marketplace/products/${productId}/reviews/stats`);
    },

    // Mark review as helpful
    markReviewHelpful: async (reviewId: string) => {
      return this.post(`/marketplace/reviews/${reviewId}/helpful`, {});
    },

    // Delete product review
    deleteProductReview: async (reviewId: string) => {
      return this.delete(`/marketplace/reviews/${reviewId}`);
    },

    // Cart endpoints
    // Get user's cart
    getCart: async () => {
      return this.get('/marketplace/cart');
    },

    // Add product to cart
    addToCart: async (productId: string, quantity: number = 1, color?: string) => {
      const payload: any = { productId, quantity };
      if (color) {
        payload.color = color;
      }
      return this.post('/marketplace/cart/add', payload);
    },

    // Update cart item quantity
    updateCartQuantity: async (productId: string, quantity: number) => {
      return this.put(`/marketplace/cart/${productId}`, { quantity });
    },

    // Remove item from cart
    removeFromCart: async (productId: string) => {
      return this.delete(`/marketplace/cart/${productId}`);
    },

    // Clear entire cart
    clearCart: async () => {
      return this.delete('/marketplace/cart');
    },

    // Checkout cart
    checkoutCart: async (data?: any) => {
      return this.post('/marketplace/cart/checkout', data);
    },

    // Vendor Order Management
    getVendorOrders: async (params?: any) => {
      const query = new URLSearchParams(params).toString();
      return this.get(`/marketplace/vendor/orders${query ? `?${query}` : ''}`);
    },

    getVendorStats: async () => {
      return this.get('/marketplace/vendor/stats');
    },

    updateOrderStatus: async (orderId: string, data: any) => {
      return this.put(`/orders/${orderId}/status`, data);
    },

    // Payment Confirmation
    confirmPayment: async (orderId: string, paymentMethod: string, transactionReference?: string) => {
      return this.post(`/orders/${orderId}/confirm-payment`, { paymentMethod, transactionReference });
    },

    confirmCODPayment: async (orderId: string) => {
      return this.post(`/orders/${orderId}/confirm-cod-payment`);
    },

    // Order Management
    getOrders: async (params?: { limit?: number; page?: number; status?: string }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.get(`/orders?${queryParams}`);
    },

    getOrder: async (orderId: string) => {
      return this.get(`/orders/${orderId}`);
    }
  };



  // Streams API
  streams = {
    getAll: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      return this.request(`${API_URL}/streams?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    getLive: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, value?.toString() ?? '');
          }
        });
      }
      return this.request(`${API_URL}/streams/live?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    getById: async (id: string) => {
      return this.request(`${API_URL}/streams/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },
  };

  // Support API
  support = {
    // Get vendor tickets
    getVendorTickets: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.request(`${API_URL}/support/tickets/vendor?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    // Get user tickets
    getUserTickets: async (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.request(`${API_URL}/support/tickets?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    // Create a support ticket
    createTicket: async (ticketData: any) => {
      return this.request(`${API_URL}/support/tickets`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(ticketData),
      });
    },

    // Get specific ticket
    getTicket: async (ticketId: string) => {
      return this.request(`${API_URL}/support/tickets/${ticketId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    // Update ticket status
    updateTicketStatus: async (ticketId: string, status: string, resolutionNotes?: string) => {
      return this.request(`${API_URL}/support/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status, resolutionNotes }),
      });
    },

    // Add message to ticket
    addTicketMessage: async (ticketId: string, message: string) => {
      return this.request(`${API_URL}/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ content: message }),
      });
    },

    // Get ticket messages
    getTicketMessages: async (ticketId: string) => {
      return this.request(`${API_URL}/support/tickets/${ticketId}/messages`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },
  };

  // Notifications API
  notifications = {
    // Get user notifications
    getNotifications: async (params?: {
      page?: number;
      limit?: number;
      type?: string;
      unreadOnly?: boolean;
    }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        if (params.page !== undefined) queryParams.append('page', params.page.toString());
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params.type !== undefined) queryParams.append('type', params.type);
        if (params.unreadOnly !== undefined) queryParams.append('unreadOnly', params.unreadOnly.toString());
      }
      return this.request(`${API_URL}/notifications?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    // Get unread notifications count
    getUnreadCount: async () => {
      return this.request(`${API_URL}/notifications/unread-count`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },

    // Mark specific notifications as read
    markAsRead: async (notificationIds: string[]) => {
      return this.request(`${API_URL}/notifications/mark-read`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ notificationIds }),
      });
    },

    // Mark all notifications as read
    markAllAsRead: async () => {
      return this.request(`${API_URL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    },

    // Delete a notification
    delete: async (notificationId: string) => {
      return this.request(`${API_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    },

    // Get available notification types
    getTypes: async () => {
      return this.request(`${API_URL}/notifications/types`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },
  };
}

export const api = new ApiService();
export default api;
