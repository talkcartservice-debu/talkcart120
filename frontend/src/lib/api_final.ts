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

// Utility function to handle API errors and return user-friendly messages
export const handleApiError = (error: any): string => {
  if (error instanceof SessionExpiredError) {
    return 'Your session has expired. Please log in again.';
  }
  
  if (error instanceof HttpError) {
    // Handle specific HTTP status codes with user-friendly messages
    switch (error.status) {
      case 404:
        return 'No result found';
      case 403:
        return 'Access denied. You do not have permission to access this resource.';
      case 401:
        return 'Unauthorized. Please log in to continue.';
      case 400:
        return 'No result found';
      case 500:
        return 'An internal server error occurred. Please try again later.';
      case 502:
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        // Use the error message if available, otherwise a generic message
        return error.data?.message || error.message || 'An error occurred while processing your request.';
    }
  }
  
  // Handle network errors
  if (error?.message?.includes('Network Error') || error?.message?.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Handle timeout errors
  if (error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  // Fallback to the original error message or a generic one
  return error?.message || 'An unexpected error occurred. Please try again.';
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
    // Ultimate defensive approach - ensure we never have undefined values
    let validMessage = message || 'An unknown error occurred';
    if (typeof validMessage !== 'string' || validMessage === 'undefined' || validMessage === '') {
      validMessage = 'An unknown error occurred';
    }
    
    // Ensure we never pass undefined as data - ultimate defensive check
    let validData = data;
    if (validData === undefined || validData === null) {
      validData = { message: validMessage };
    }
    
    // Additional defensive check - ensure it's a valid object
    try {
      // If it's not an object, wrap it in an object
      if (typeof validData !== 'object' || Array.isArray(validData)) {
        validData = { message: String(validData) };
      }
      
      // Try to stringify and check if it's valid
      const jsonString = JSON.stringify(validData);
      if (!jsonString || jsonString === 'undefined' || jsonString === '{}') {
        validData = { message: validMessage };
      }
    } catch (e) {
      // If serialization fails, create a safe fallback
      validData = { message: validMessage, error: 'Serialization error' };
    }
    
    // Additional check to ensure we have a valid message for the Error constructor
    const errorConstructorMessage = validMessage && typeof validMessage === 'string' 
      ? validMessage 
      : 'An error occurred during the request';
    
    super(errorConstructorMessage);
    this.name = 'HttpError';
    this.status = status !== undefined && status !== null ? status : 500;
    this.data = validData;
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
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      // Provide more context about the error
      if ((error as any)?.message?.includes('fetch')) {
        throw new Error('Network error - please check your internet connection');
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
    const maxRetries = method === 'GET' ? 2 : 0; // retry GETs only
    let currentTimeout = timeout;
    // Simple retry loop for transient network/timeout errors
    // Attempts: 0 (original), then up to maxRetries with backoff
    // Backoff: +5s per retry
    // Do not retry non-timeout HTTP errors
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        response = await this.fetchWithTimeout(url, init, currentTimeout);
        break;
      } catch (err: any) {
        const isTimeout = (err?.name === 'AbortError') || (typeof err?.message === 'string' && err.message.toLowerCase().includes('timeout'));
        const isNetwork = typeof err?.message === 'string' && err.message.toLowerCase().includes('network');
        if (attempt < maxRetries && (isTimeout || isNetwork)) {
          attempt += 1;
          currentTimeout = Math.min(currentTimeout + 5000, TIMEOUTS.API_REQUEST * 2);
          console.warn(`API transient error (${isTimeout ? 'timeout' : 'network'}), retrying ${attempt}/${maxRetries} in-flight for ${url}`);
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
        throw new HttpError(validStatus, errorMessage, errorData);
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
        throw new HttpError(validStatus, `Request failed with status ${response.status}`, errorData);
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
      throw new HttpError(validStatus, userFriendlyMessage, errorData);
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
    const fullUrl = `${API_URL}${endpoint}`;
    console.log(`API GET Request to: ${fullUrl}`);
    console.log('Request options:', options);
    return this.request(fullUrl, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      ...options,
    });
  }

  async post(endpoint: string, data?: any, options: RequestInit = {}) {
    const fullUrl = `${API_URL}${endpoint}`;
    console.log(`API POST Request to: ${fullUrl}`);
    console.log('Request data:', data);
    console.log('Request options:', options);
    return this.request(fullUrl, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async put(endpoint: string, data?: any, options: RequestInit = {}) {
    const fullUrl = `${API_URL}${endpoint}`;
    console.log(`API PUT Request to: ${fullUrl}`);
    console.log('Request data:', data);
    console.log('Request options:', options);
    return this.request(fullUrl, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  async delete(endpoint: string, options: RequestInit = {}) {
    const fullUrl = `${API_URL}${endpoint}`;
    console.log(`API DELETE Request to: ${fullUrl}`);
    console.log('Request options:', options);
    return this.request(fullUrl, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      ...options,
    });
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
        const response = await this.fetchWithTimeout(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        }, TIMEOUTS.AUTH_REQUEST);

        const data = await this.safeJsonParse(response);

        // If the response is not ok, the backend has returned an error
        if (!response.ok) {
          // Return the error data so AuthContext can handle it properly
          return {
            success: false,
            message: data?.message || data?.error || 'Login failed',
            ...data
          };
        }

        return data;
      } catch (error: any) {
        // Handle network errors, CORS errors, etc.
        console.error('Login API error:', error);
        return {
          success: false,
          message: error.name === 'AbortError'
            ? 'Request timeout. Please try again.'
            : error.message || 'Network error. Please check your connection.',
          error: error.name || 'NetworkError'
        };
      }
    },

    oauthGoogle: async (idToken: string) => {
      const response = await this.fetchWithTimeout(`${API_URL}/auth/oauth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }, TIMEOUTS.AUTH_REQUEST);

      const data = await this.safeJsonParse(response);

      if (!response.ok) {
        return {
          success: false,
          message: data?.message || data?.error || 'Google authentication failed',
          ...data
        };
      }

      return data;
    },

    oauthApple: async (identityToken: string) => {
      const response = await this.fetchWithTimeout(`${API_URL}/auth/oauth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityToken }),
      }, TIMEOUTS.AUTH_REQUEST);

      const data = await this.safeJsonParse(response);

      if (!response.ok) {
        return {
          success: false,
          message: data?.message || data?.error || 'Apple authentication failed',
          ...data
        };
      }

      return data;
    },

    register: async (userData: any) => {
      try {
        console.log('Sending registration request with data:', userData);
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });

        const data = await this.safeJsonParse(response);
        console.log('Registration response:', data);

        if (!response.ok) {
          console.error('Registration failed with status:', response.status, data);
        }

        return data;
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
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
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
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },

    updateProfile: async (data: any) => {
      // Backend update endpoint is PUT /api/auth/profile
      return this.request(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      }, TIMEOUTS.AUTH_REQUEST);
    },

    getProfile: async (forceRefresh = false) => {
      // Use backend /auth/me to fetch current authenticated user
      if (typeof window === 'undefined') {
        return { success: false } as any;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        return { success: false } as any;
      }

      // If force refresh is requested, add a timestamp parameter to bypass cache
      const url = forceRefresh 
        ? `${API_URL}/auth/me?_t=${Date.now()}`
        : `${API_URL}/auth/me`;

      const res: any = await this.request(url, {
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
        body: JSON.stringify({ settingType, settings: settingsData }),
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
        });
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

    updateProfile: async (data: Partial<{ displayName: string; bio: string; location: string; website: string; socialLinks: Record<string, string>; }>) => {
      return this.request(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });
    },

    follow: async (userId: string) => {
      return this.request(`${API_URL}/users/${userId}/follow`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    },

    unfollow: async (userId: string) => {
      return this.request(`${API_URL}/users/${userId}/follow`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
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

    getByUsername: async (username: string) => {
      return this.request(`${API_URL}/users/profile/${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
    },
  };

  // Orders API
  orders = {
    // Get user's orders
    getOrders: async (page: number = 1, limit: number = 10) => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      return this.get(`/orders?${queryParams}`);
    },

    // Get a specific order by ID
    getOrder: async (orderId: string) => {
      return this.get(`/orders/${orderId}`);
    },

    // Cancel an order
    cancelOrder: async (orderId: string) => {
      return this.post(`/orders/${orderId}/cancel`, {});
    },

    // Get tracking information for an order
    getTrackingInfo: async (orderId: string) => {
      return this.post(`/orders/${orderId}/track`, {});
    },
  };

  // Payments API
  payments = {
    // Get user's payment history
    getPaymentHistory: async (page: number = 1, limit: number = 10) => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      return this.get(`/payments/history?${queryParams}`);
    },

    // Get a specific payment by ID
    getPayment: async (paymentId: string) => {
      return this.get(`/payments/${paymentId}`);
    },
  };

  // Posts API
  posts = {
    // Get all posts with filtering options
    getAll: async (params?: {
      feedType?: string;
      limit?: number;
      page?: number;
      contentType?: string;
      authorId?: string;
      hashtag?: string;
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
      
      return this.get(`/posts?${queryParams}`);
    },

    // Get trending posts
    getTrending: async (params?: {
      limit?: number;
      timeRange?: string;
    }) => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      
      return this.get(`/posts/trending?${queryParams}`);
    },

    // Get public posts (no auth required)
    getPublicPosts: async (params?: {
      limit?: number;
      page?: number;
      contentType?: string;
      hashtag?: string;
      search?: string;
      sortBy?: 'recent' | 'trending' | 'popular';
    }) => {
      const queryParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      return this.get(`/posts/public?${queryParams}`);
    },

    // Get bookmarked posts for a user
    getBookmarkedPosts: async (userId: string, params?: {
      limit?: number;
      page?: number;
    }) => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      
      return this.get(`/posts/bookmarks/${userId}?${queryParams}`);
    },

    // Create a new post
    create: async (postData: any) => {
      return this.post('/posts', postData);
    },

    // Get a specific post by ID
    getById: async (postId: string) => {
      return this.get(`/posts/${postId}`);
    },

    // Update a post
    update: async (postId: string, postData: any) => {
      return this.put(`/posts/${postId}`, postData);
    },

    // Delete a post
    delete: async (postId: string) => {
      return this.delete(`/posts/${postId}`);
    },

    // Like a post
    like: async (postId: string) => {
      return this.post(`/posts/${postId}/like`, {});
    },

    // Unlike a post
    unlike: async (postId: string) => {
      return this.delete(`/posts/${postId}/like`);
    },

    // Bookmark a post
    bookmark: async (postId: string) => {
      return this.post(`/posts/${postId}/bookmark`, {});
    },

    // Remove bookmark from a post
    unbookmark: async (postId: string) => {
      return this.delete(`/posts/${postId}/bookmark`);
    },

    // Share a post
    share: async (postId: string) => {
      return this.post(`/posts/${postId}/share`, {});
    },

    // Add a comment to a post
    addComment: async (postId: string, commentData: any) => {
      return this.post(`/posts/${postId}/comments`, commentData);
    },

    // Hide likes on a post
    hideLikes: async (postId: string, hide: boolean) => {
      return this.put(`/posts/${postId}`, { hideLikes: hide });
    },

    // Hide comments on a post
    hideComments: async (postId: string, hide: boolean) => {
      return this.put(`/posts/${postId}`, { hideComments: hide });
    },

    // Get comments for a post
    getComments: async (postId: string, params?: {
      limit?: number;
      page?: number;
    }) => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }
      
      return this.get(`/posts/${postId}/comments?${queryParams}`);
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
      });
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
      });
    },

    like: async (commentId: string) => {
      return this.request(`${API_URL}/comments/${commentId}/like`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
    },

    unlike: async (commentId: string) => {
      return this.request(`${API_URL}/comments/${commentId}/like`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    },

    delete: async (commentId: string) => {
      return this.request(`${API_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    },

    edit: async (commentId: string, content: string) => {
      return this.request(`${API_URL}/comments/${commentId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ content }),
      });
    },

    report: async (commentId: string, reason: string, description?: string) => {
      return this.request(`${API_URL}/comments/${commentId}/report`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ reason, description }),
      });
    },

    getThread: async (commentId: string, params?: {
      maxDepth?: number;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.maxDepth) queryParams.append('maxDepth', params.maxDepth.toString());

      return this.request(`${API_URL}/comments/${commentId}/thread?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });
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
      });
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

      const response = await fetch(`${API_URL}/search?${queryParams}`, {
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },

    users: async (query: string, limit = 20) => {
      const response = await fetch(`${API_URL}/search/users?q=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },

    posts: async (query: string, limit = 20) => {
      const response = await fetch(`${API_URL}/search/posts?q=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },

    hashtags: async (query: string, limit = 20) => {
      const response = await fetch(`${API_URL}/search/hashtags?q=${encodeURIComponent(query)}&limit=${limit}`, {
        headers: this.getAuthHeaders(),
      });
      return this.safeJsonParse(response);
    },
  };

  // Media API
  media = {
    upload: async (file: File, type: 'avatar' | 'post' | 'cover', opts?: { onProgress?: (percent: number) => void }) => {
      console.log('=== Frontend Upload Request ===');
      console.log('File:', { name: file.name, size: file.size, type: file.type });
      console.log('Upload type:', type);

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
        xhr.ontimeout = () => reject(new Error('Upload timed out'));

        xhr.onload = () => {
          const status = xhr.status;
          let data: { success?: boolean; message?: string; error?: string; details?: string; responseText?: string; data?: any } | null = null;

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

          // Enhanced validation of returned data
          if (status >= 200 && status < 300) {
            if (data && data.success) {
              // Validate that we have the required media fields
              const mediaData = data.data;
              if (mediaData) {
                if (!mediaData.public_id) {
                  reject(new Error('Upload successful but missing public_id'));
                  return;
                }
                
                if (!mediaData.secure_url && !mediaData.url) {
                  reject(new Error('Upload successful but missing URL'));
                  return;
                }
                
                // Check for known missing file patterns
                const url = mediaData.secure_url || mediaData.url;
                const knownMissingPatterns = [
                  'file_1760168733155_lfhjq4ik7ht',
                  'file_1760163879851_tt3fdqqim9',
                  'file_1760263843073_w13593s5t8l',
                  'file_1760276276250_3pqeekj048s'
                ];
                
                for (const pattern of knownMissingPatterns) {
                  if (url && url.includes(pattern)) {
                    reject(new Error('Upload successful but returned a known missing file reference'));
                    return;
                  }
                }
              }
              
              if (opts?.onProgress) opts.onProgress(100);
              resolve(data);
            } else {
              const errorMsg = (data && (data.message || data.error || data.details)) ||
                `Upload failed with status ${status}`;
              console.error('Upload failed:', { status, data, errorMsg });
              reject(new Error(errorMsg));
            }
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

        const requestBody = {
          publicId,
          format: params?.format || 'mp4',
          quality: params?.quality || 'auto',
          width: params?.width,
          height: params?.height
        };

        console.log('Request body:', requestBody);

        // Create cache key for this request
        const cacheKey = `video_opt_${publicId}_${requestBody.format}_${requestBody.quality}_${requestBody.width || 'auto'}x${requestBody.height || 'auto'}`;

        // Check if we have a cached result (simple in-memory cache)
        if (typeof window !== 'undefined' && (window as any).__videoOptCache) {
          const cached = (window as any).__videoOptCache[cacheKey];
          if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
            console.log('Using cached video optimization result');
            return cached.data;
          }
        }

        const response = await this.request(`${API_URL}/media/video/optimized`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestBody),
        }, TIMEOUTS.UPLOAD); // Use longer timeout for media processing

        console.log('Video optimization response:', response);

        // Cache the successful response
        if (typeof window !== 'undefined' && response) {
          if (!(window as any).__videoOptCache) {
            (window as any).__videoOptCache = {};
          }
          (window as any).__videoOptCache[cacheKey] = {
            data: response,
            timestamp: Date.now()
          };
        }

        return response;
      } catch (error: any) {
        console.error('Video optimization error:', error);

        // Provide more specific error messages
        if (error instanceof SessionExpiredError) {
          throw error; // Re-throw session errors as-is
        }

        if (error instanceof HttpError) {
          const message = error.status === 400
            ? `Invalid video optimization request: ${error.data?.details || error.message}`
            : error.status === 401
              ? 'Authentication required for video optimization'
              : error.status === 404
                ? 'Video optimization service not available'
                : `Video optimization failed: ${error.message}`;

          throw new Error(message);
        }

        throw new Error(`Video optimization failed: ${error.message || 'Unknown error'}`);
      }
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
      try {
        const queryParams = new URLSearchParams({
          limit: limit.toString()
        });
        return this.get(`/marketplace/products/random?${queryParams}`);
      } catch (error) {
        console.error('Error fetching random products:', error);
        // Fallback to trending products if random endpoint fails
        try {
          const queryParams = new URLSearchParams({
            limit: limit.toString()
          });
          return this.get(`/marketplace/products/trending?${queryParams}`);
        } catch (fallbackError) {
          console.error('Fallback to trending products also failed:', fallbackError);
          throw error; // Throw the original error
        }
      }
    },

    // Get trending products
    getTrendingProducts: async (limit: number = 10) => {
      const queryParams = new URLSearchParams({
        limit: limit.toString()
      });
      return this.get(`/marketplace/products/trending?${queryParams}`);
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

    // Get related products
    getRelatedProducts: async (productId: string, limit: number = 12) => {
      const queryParams = new URLSearchParams({
        limit: limit.toString()
      });
      return this.get(`/marketplace/products/${productId}/related?${queryParams}`);
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
    buyProduct: async (productId: string, purchaseData: any) => {
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
    }
  };

  // Admin API
  admin = {

    getProducts: async () => {
      return this.get('/admin/products');
    },

    getProduct: async (productId: string) => {
      return this.get(`/admin/products/${productId}`);
    },

    updateProduct: async (productId: string, productData: any) => {
      return this.put(`/admin/products/${productId}`, productData);
    },

    deleteProduct: async (productId: string) => {
      return this.delete(`/admin/products/${productId}`);
    },

    getOrders: async () => {
      return this.get('/admin/orders');
    },

    // Get order details
    getOrder: async (orderId: string) => {
      return this.get(`/orders/${orderId}`);
    },

    // Update order
    updateOrder: async (orderId: string, data: any) => {
      return this.put(`/marketplace/orders/${orderId}`, data);
    },

    deleteOrder: async (orderId: string) => {
      return this.delete(`/admin/orders/${orderId}`);
    },

    getUsers: async () => {
      return this.get('/admin/users');
    },

    getUser: async (userId: string) => {
      return this.get(`/admin/users/${userId}`);
    },

    updateUser: async (userId: string, userData: any) => {
      return this.put(`/admin/users/${userId}`, userData);
    },

    deleteUser: async (userId: string) => {
      return this.delete(`/admin/users/${userId}`);
    },

    getPayments: async () => {
      return this.get('/admin/payments');
    },

    getPayment: async (paymentId: string) => {
      return this.get(`/admin/payments/${paymentId}`);
    },

    getLogs: async () => {
      return this.get('/admin/logs');
    },

    getSettings: async () => {
      return this.get('/admin/settings');
    },

    updateSettings: async (settingsData: any) => {
      return this.put('/admin/settings', settingsData);
    },

    getStats: async () => {
      return this.get('/admin/stats');
    },
  };

  // Help and support
  help = {
    // Placeholder methods for help and support
    getHelpTopics: async () => {
      throw new Error('Help features are not implemented');
    },
    
    getFAQ: async () => {
      throw new Error('FAQ features are not implemented');
    },
    
    submitSupportTicket: async () => {
      throw new Error('Support ticket features are not implemented');
    },
  };

  // AI Voice API
  ai = {
    // Note: AI voice features have been disabled
    // These methods are placeholders only
    transcribeAudio: async () => {
      throw new Error('AI voice features are disabled');
    },
    
    processVoiceCommand: async () => {
      throw new Error('AI voice features are disabled');
    },
    
    processVoiceCommandAutomatic: async () => {
      throw new Error('AI voice features are disabled');
    },
    
    textToSpeech: async () => {
      throw new Error('AI voice features are disabled');
    },
    
    processTextCommand: async () => {
      throw new Error('AI voice features are disabled');
    },
    
    getSupportedLanguages: async () => {
      throw new Error('AI voice features are disabled');
    },
    
    getVoiceCommands: async () => {
      throw new Error('AI voice features are disabled');
    }
  }
}

const apiService = new ApiService();

export default apiService;
