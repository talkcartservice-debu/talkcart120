import axios from 'axios';
import { Conversation } from '@/types/conversation';
import { API_URL, TIMEOUTS } from '@/config/index';

const BROWSER_BASE = `${API_URL}/messages`; // API_URL is '/api' in browser
const SERVER_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/messages`;

// Log the timeout value being used
console.log('Conversation API timeout configuration:', TIMEOUTS.API_REQUEST);

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: typeof window !== 'undefined' ? BROWSER_BASE : SERVER_BASE,
    timeout: 30000, // 30 seconds default timeout
});

// Log the actual axios instance configuration
console.log('Conversation API axios instance timeout:', apiClient.defaults.timeout);

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle network timeout errors specifically
        if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
            console.error('Request timeout:', error.config?.url);
            return Promise.reject({
                success: false,
                error: 'Request timeout. Please check your network connection and try again.',
                timeout: true
            });
        }
        
        // Handle network errors
        if (!error.response) {
            console.error('Network error:', error.config?.url);
            return Promise.reject({
                success: false,
                error: 'Network error. Please check your connection and try again.',
                networkError: true
            });
        }
        
        return Promise.reject(error);
    }
);

export interface GetConversationsResponse {
    success: boolean;
    data: {
        conversations: Conversation[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalConversations: number;
            hasMore: boolean;
        };
    };
}

export interface GetConversationResponse {
    success: boolean;
    data: Conversation;
}

/**
 * Get user conversations
 */
export const getConversations = async (options: {
    limit?: number;
    page?: number;
} = {}): Promise<GetConversationsResponse> => {
    // Create a temporary axios instance with a longer timeout for this operation
    const longTimeoutApi = axios.create({
        baseURL: typeof window !== 'undefined' ? BROWSER_BASE : SERVER_BASE,
        timeout: 45000, // 45 seconds timeout for this operation
    });
    
    // Add auth token to requests
    longTimeoutApi.interceptors.request.use((config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });
    
    // Add response interceptor for better error handling
    longTimeoutApi.interceptors.response.use(
        (response) => response,
        (error) => {
            // Handle network timeout errors specifically
            if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
                console.error('Request timeout:', error.config?.url);
                return Promise.reject({
                    success: false,
                    error: 'Request timeout. Please check your network connection and try again.',
                    timeout: true
                });
            }
            
            // Handle network errors
            if (!error.response) {
                console.error('Network error:', error.config?.url);
                return Promise.reject({
                    success: false,
                    error: 'Network error. Please check your connection and try again.',
                    networkError: true
                });
            }
            
            return Promise.reject(error);
        }
    );
    
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.page) params.append('page', options.page.toString());

    const url = `conversations?${params.toString()}`;

    // Improved retry logic for transient errors/timeouts
    let attempt = 0;
    const maxRetries = 3;
    let lastError: any = null;
    
    while (attempt <= maxRetries) {
        try {
            console.log(`Attempting to fetch conversations (attempt ${attempt + 1}/${maxRetries + 1})`);
            const response = await longTimeoutApi.get(url);
            
            // Check if response is valid
            if (!response || !response.data) {
                throw new Error('Invalid response from server');
            }
            
            return response.data;
        } catch (error: any) {
            lastError = error;
            console.error(`Conversation API error (attempt ${attempt + 1}):`, error);
            
            const isNetworkError = !error.response || 
                error.code === 'ECONNABORTED' || 
                (error.message && (error.message.includes('timeout') || error.message.includes('network')));
                
            // Only retry on network errors, not on HTTP errors like 404, 401, etc.
            if (attempt < maxRetries && isNetworkError) {
                attempt += 1;
                // Exponential backoff: 5s, 10s, 15s with longer delays for 10-minute timeout
                const delay = attempt * 5000;
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            break;
        }
    }
    
    console.error('Get conversations failed after all retries:', lastError);
    throw lastError?.response?.data || { 
        success: false, 
        error: 'Failed to get conversations. Please check your network connection and try again.' 
    };
};

export const getConversation = async (id: string): Promise<GetConversationResponse> => {
    // Create a temporary axios instance with a longer timeout for this operation
    const longTimeoutApi = axios.create({
        baseURL: typeof window !== 'undefined' ? BROWSER_BASE : SERVER_BASE,
        timeout: 45000, // 45 seconds timeout for this operation
    });
    
    // Add auth token to requests
    longTimeoutApi.interceptors.request.use((config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });
    
    // Add response interceptor for better error handling
    longTimeoutApi.interceptors.response.use(
        (response) => response,
        (error) => {
            // Handle network timeout errors specifically
            if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
                console.error('Request timeout:', error.config?.url);
                return Promise.reject({
                    success: false,
                    error: 'Request timeout. Please check your network connection and try again.',
                    timeout: true
                });
            }
            
            // Handle network errors
            if (!error.response) {
                console.error('Network error:', error.config?.url);
                return Promise.reject({
                    success: false,
                    error: 'Network error. Please check your connection and try again.',
                    networkError: true
                });
            }
            
            return Promise.reject(error);
        }
    );
    
    // Improved retry logic for transient errors/timeouts
    let attempt = 0;
    const maxRetries = 3;
    let lastError: any = null;
    
    while (attempt <= maxRetries) {
        try {
            console.log(`Attempting to fetch conversation ${id} (attempt ${attempt + 1}/${maxRetries + 1})`);
            const response = await longTimeoutApi.get(`conversations/${id}`);
            
            // Check if response is valid
            if (!response || !response.data) {
                throw new Error('Invalid response from server');
            }
            
            return response.data;
        } catch (error: any) {
            lastError = error;
            console.error(`Get conversation error (attempt ${attempt + 1}):`, error);
            
            const isNetworkError = !error.response || 
                error.code === 'ECONNABORTED' || 
                (error.message && (error.message.includes('timeout') || error.message.includes('network')));
                
            // Only retry on network errors, not on HTTP errors like 404, 401, etc.
            if (attempt < maxRetries && isNetworkError) {
                attempt += 1;
                // Exponential backoff: 5s, 10s, 15s with longer delays for 10-minute timeout
                const delay = attempt * 5000;
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            break;
        }
    }
    
    console.error('Get conversation failed after all retries:', lastError);
    throw lastError?.response?.data || { 
        success: false, 
        error: 'Failed to get conversation. Please check your network connection and try again.' 
    };
};

const conversationApi = {
    getConversations,
    getConversation,
};

export default conversationApi;