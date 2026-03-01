import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Use relative URL in browser to take advantage of Next.js proxy
const BROWSER_BASE = '/api/chatbot';
const SERVER_BASE = (() => {
    // Ensure the base URL doesn't end with '/api' or '/api/' to prevent double '/api/api' paths
    const normalizedBase = API_BASE_URL.endsWith('/api/') 
      ? API_BASE_URL.slice(0, -5) 
      : API_BASE_URL.endsWith('/api') 
        ? API_BASE_URL.slice(0, -4) 
        : API_BASE_URL;
    return `${normalizedBase}/api/chatbot`;
})();

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: typeof window !== 'undefined' ? BROWSER_BASE : SERVER_BASE,
    timeout: 60000, // 60 seconds timeout
});

// Add auth token to requests with enhanced debugging and error handling
apiClient.interceptors.request.use((config) => {
    console.log('Chatbot API Request:', {
        url: config.url,
        method: config.method,
        headers: { ...config.headers }
    });
    
    // Ensure we're in browser environment
    if (typeof window !== 'undefined' && localStorage) {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('Token added to request:', token.substring(0, 10) + '...');
        } else {
            console.warn('No auth token found in localStorage');
        }
    } else {
        console.warn('Not in browser environment or localStorage not available');
    }
    return config;
}, (error) => {
    console.error('Chatbot API Request Error:', error);
    return Promise.reject(error);
});

// Add response interceptor for debugging
apiClient.interceptors.response.use(
    (response) => {
        console.log('Chatbot API Success Response:', {
            status: response.status,
            url: response.config.url,
            data: response.data
        });
        return response;
    },
    (error) => {
        console.error('Chatbot API Error Response:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            data: error.response?.data,
            headers: error.response?.headers
        });
        
        // Handle 401 errors by redirecting to login
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                // Clear tokens and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/auth/login?expired=1';
            }
        }
        
        return Promise.reject(error);
    }
);

// Helper function to validate ObjectId format
const isValidObjectId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

export interface ChatbotConversation {
    _id: string;
    customerId: string;
    vendorId: string;
    productId: string;
    productName: string;
    lastMessage?: ChatbotMessage;
    lastActivity: string;
    isActive: boolean;
    isResolved: boolean;
    botEnabled: boolean;
    botPersonality: string;
    isPinned?: boolean;
    isMuted?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ChatbotAttachment {
    type: 'image' | 'document' | 'video' | 'audio' | 'file';
    url: string;
    name: string;
    size: number;
    thumbnail?: string;
}

export interface ChatbotReaction {
    emoji: string;
    userIds: string[];
    count: number;
}

export interface ChatbotMessage {
    _id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: 'text' | 'system' | 'suggestion' | 'image' | 'file' | 'link';
    isBotMessage: boolean;
    botConfidence?: number;
    suggestedResponses?: Array<{
        text: string;
        action: string;
    }>;
    responseTime?: number;
    userSatisfaction?: number;
    isEdited: boolean;
    isDeleted: boolean;
    attachments?: ChatbotAttachment[];
    reactions?: ChatbotReaction[];
    status?: 'sent' | 'delivered' | 'read';
    richContent?: {
        title: string;
        description: string;
        imageUrl: string;
        url: string;
        metadata: any;
    };
    createdAt: string;
    updatedAt: string;
}

export interface Vendor {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    walletAddress?: string;
    followerCount: number;
    followingCount: number;
    productCount: number;
}

export interface Customer {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    createdAt: string;
    orderCount: number;
}

export interface GetConversationsResponse {
    success: boolean;
    data: {
        conversations: ChatbotConversation[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalConversations: number;
            hasMore: boolean;
        };
    };
}

export interface SearchVendorsResponse {
    success: boolean;
    data: {
        vendors: Vendor[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
}

export interface SearchCustomersResponse {
    success: boolean;
    data: {
        customers: Customer[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    };
}

export interface CreateConversationRequest {
    vendorId: string;
    productId: string;
}

export interface CreateConversationResponse {
    success: boolean;
    data: {
        conversation: ChatbotConversation;
        isNew: boolean;
    };
    message: string;
}

export interface SendMessageRequest {
    content: string;
    attachments?: ChatbotAttachment[];
}

export interface SendMessageResponse {
    success: boolean;
    data: {
        message: ChatbotMessage;
    };
    message: string;
}

export interface SearchMessagesResponse {
    success: boolean;
    data: {
        messages: ChatbotMessage[];
        total: number;
        page: number;
        limit: number;
        query: string;
    };
    message: string;
}

export interface UploadFileResponse {
    success: boolean;
    data: {
        attachment: ChatbotAttachment;
    };
    message: string;
}

export interface ExportConversationResponse {
    success: boolean;
    data: {
        conversation: ChatbotConversation;
        messages: ChatbotMessage[];
    };
    message: string;
}

// Vendor-Admin Conversation Response Types
export interface GetVendorAdminConversationResponse {
    success: boolean;
    data: {
        conversation: ChatbotConversation | null;
    };
    message?: string;
}

export interface CreateVendorAdminConversationResponse {
    success: boolean;
    data: {
        conversation: ChatbotConversation;
        isNew: boolean;
    };
    message: string;
}

export interface AddReactionResponse {
    success: boolean;
    data: {
        message: ChatbotMessage;
    };
    message: string;
}

/**
 * Get user chatbot conversations
 */
export const getConversations = async (options: {
    limit?: number;
    page?: number;
} = {}): Promise<GetConversationsResponse> => {
    try {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());

        const response = await apiClient.get(`conversations?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Get chatbot conversations error:', error);
        throw error.response?.data || { success: false, error: 'Failed to get conversations' };
    }
};

/**
 * Search vendors for messaging
 */
export const searchVendors = async (options: {
    search?: string;
    limit?: number;
    page?: number;
} = {}): Promise<SearchVendorsResponse> => {
    try {
        const params = new URLSearchParams();
        if (options.search) params.append('search', options.search);
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());

        const response = await apiClient.get(`search/vendors?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Search vendors error:', error);
        throw error.response?.data || { success: false, error: 'Failed to search vendors' };
    }
};

/**
 * Search customers for messaging
 */
export const searchCustomers = async (options: {
    search?: string;
    limit?: number;
    page?: number;
} = {}): Promise<SearchCustomersResponse> => {
    try {
        const params = new URLSearchParams();
        if (options.search) params.append('search', options.search);
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());

        const response = await apiClient.get(`search/customers?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Search customers error:', error);
        throw error.response?.data || { success: false, error: 'Failed to search customers' };
    }
};

/**
 * Create new chatbot conversation
 */
export const createConversation = async (
    data: CreateConversationRequest
): Promise<CreateConversationResponse> => {
    try {
        const response = await apiClient.post('conversations', data);
        return response.data;
    } catch (error: any) {
        console.error('Create chatbot conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to create conversation' };
    }
};

/**
 * Get a specific chatbot conversation
 */
export const getConversation = async (conversationId: string): Promise<{ success: boolean; data: { conversation: ChatbotConversation } }> => {
    try {
        // Validate conversation ID
        if (!isValidObjectId(conversationId)) {
            throw { success: false, error: 'Invalid conversation ID' };
        }
        
        const response = await apiClient.get(`conversations/${conversationId}`);
        return response.data;
    } catch (error: any) {
        console.error('Get chatbot conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to get conversation' };
    }
};

/**
 * Get messages in a chatbot conversation
 */
export const getMessages = async (conversationId: string, options: {
    limit?: number;
    page?: number;
    before?: string;
} = {}): Promise<{
    success: boolean;
    data: {
        messages: ChatbotMessage[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalMessages: number;
            hasMore: boolean;
        };
    };
}> => {
    try {
        // Validate conversation ID
        if (!isValidObjectId(conversationId)) {
            throw { success: false, error: 'Invalid conversation ID' };
        }
        
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());
        if (options.before) params.append('before', options.before);

        const response = await apiClient.get(`conversations/${conversationId}/messages?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Get chatbot messages error:', error);
        throw error.response?.data || { success: false, error: 'Failed to get messages' };
    }
};

/**
 * Upload file for chatbot message
 */
export const uploadFile = async (
    conversationId: string,
    file: File
): Promise<UploadFileResponse> => {
    try {
        // Validate conversation ID
        if (!isValidObjectId(conversationId)) {
            throw { success: false, error: 'Invalid conversation ID' };
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post(`conversations/${conversationId}/messages/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        
        return response.data;
    } catch (error: any) {
        console.error('Upload chatbot file error:', error);
        throw error.response?.data || { success: false, error: 'Failed to upload file' };
    }
};

/**
 * Send message in chatbot conversation
 */
export const sendMessage = async (
    conversationId: string,
    data: SendMessageRequest
): Promise<SendMessageResponse> => {
    try {
        // Validate conversation ID
        if (!isValidObjectId(conversationId)) {
            throw { success: false, error: 'Invalid conversation ID' };
        }
        
        const response = await apiClient.post(`conversations/${conversationId}/messages`, data);
        return response.data;
    } catch (error: any) {
        console.error('Send chatbot message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to send message' };
    }
};

/**
 * Edit a chatbot message
 */
export const editMessage = async (
    conversationId: string,
    messageId: string,
    data: { content: string }
): Promise<SendMessageResponse> => {
    try {
        // Validate IDs
        if (!isValidObjectId(conversationId) || !isValidObjectId(messageId)) {
            throw { success: false, error: 'Invalid conversation or message ID' };
        }
        
        const response = await apiClient.put(`conversations/${conversationId}/messages/${messageId}`, data);
        return response.data;
    } catch (error: any) {
        console.error('Edit chatbot message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to edit message' };
    }
};

/**
 * Delete a chatbot message
 */
export const deleteMessage = async (
    conversationId: string,
    messageId: string
): Promise<{ success: boolean; message: string }> => {
    try {
        // Validate IDs
        if (!isValidObjectId(conversationId) || !isValidObjectId(messageId)) {
            throw { success: false, error: 'Invalid conversation or message ID' };
        }
        
        const response = await apiClient.delete(`conversations/${conversationId}/messages/${messageId}`);
        return response.data;
    } catch (error: any) {
        console.error('Delete chatbot message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to delete message' };
    }
};

/**
 * Reply to a chatbot message
 */
export const replyToMessage = async (
    conversationId: string,
    messageId: string,
    data: SendMessageRequest
): Promise<SendMessageResponse> => {
    try {
        // Validate IDs
        if (!isValidObjectId(conversationId) || !isValidObjectId(messageId)) {
            throw { success: false, error: 'Invalid conversation or message ID' };
        }
        
        const response = await apiClient.post(`conversations/${conversationId}/messages/${messageId}/reply`, data);
        return response.data;
    } catch (error: any) {
        console.error('Reply to chatbot message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to send reply' };
    }
};

/**
 * Search messages within a chatbot conversation
 */
export const searchMessages = async (
    conversationId: string,
    query: string,
    options: {
        limit?: number;
        page?: number;
    } = {}
): Promise<SearchMessagesResponse> => {
    try {
        // Validate conversation ID
        if (!isValidObjectId(conversationId)) {
            throw { success: false, error: 'Invalid conversation ID' };
        }

        // Validate search query
        if (!query || query.trim().length === 0) {
            throw { success: false, error: 'Search query is required' };
        }

        const params = new URLSearchParams();
        params.append('q', query);
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());

        const response = await apiClient.get(`conversations/${conversationId}/search?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Search chatbot messages error:', error);
        throw error.response?.data || { success: false, error: 'Failed to search messages' };
    }
};

/**
 * Export conversation history
 */
export const exportConversation = async (
    conversationId: string,
    format: 'json' | 'csv' = 'json'
): Promise<any> => {
    try {
        // Validate conversation ID
        if (!isValidObjectId(conversationId)) {
            throw { success: false, error: 'Invalid conversation ID' };
        }

        const response = await apiClient.get(`conversations/${conversationId}/export?format=${format}`, {
            responseType: format === 'json' ? 'json' : 'blob'
        });
        
        return response.data;
    } catch (error: any) {
        console.error('Export conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to export conversation' };
    }
};

/**
 * Mark chatbot conversation as resolved
 */
export const resolveConversation = async (conversationId: string): Promise<{ success: boolean; data: { conversation: ChatbotConversation }; message: string }> => {
    try {
        // Validate conversation ID
        if (!isValidObjectId(conversationId)) {
            throw { success: false, error: 'Invalid conversation ID' };
        }
        
        const response = await apiClient.put(`conversations/${conversationId}/resolve`);
        return response.data;
    } catch (error: any) {
        console.error('Resolve chatbot conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to resolve conversation' };
    }
};

/**
 * Close chatbot conversation
 */
export const closeConversation = async (conversationId: string): Promise<{ success: boolean; message: string }> => {
    try {
        // Validate conversation ID
        if (!isValidObjectId(conversationId)) {
            throw { success: false, error: 'Invalid conversation ID' };
        }
        
        const response = await apiClient.delete(`conversations/${conversationId}`);
        return response.data;
    } catch (error: any) {
        console.error('Close chatbot conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to close conversation' };
    }
};

/**
 * Get vendor-admin conversation
 */
export const getVendorAdminConversation = async (): Promise<GetVendorAdminConversationResponse> => {
    try {
        // Check if we have a token before making the request
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            return {
                success: false,
                data: { conversation: null },
                message: 'No authentication token found. Please log in again.'
            };
        }
        
        const response = await apiClient.get('conversations/vendor-admin');
        return response.data;
    } catch (error: any) {
        console.error('Get vendor-admin conversation error:', error);
        // Return a structured error response instead of throwing
        if (error.response) {
            // Server responded with error status
            const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
            // Provide more specific error messages based on status code
            if (error.response.status === 403) {
                return {
                    success: false,
                    data: { conversation: null },
                    message: 'Access denied. Only vendors can access this feature.'
                };
            } else if (error.response.status === 400) {
                return {
                    success: false,
                    data: { conversation: null },
                    message: 'Invalid request. Please try refreshing the page.'
                };
            }
            return {
                success: false,
                data: { conversation: null },
                message: errorMessage
            };
        } else if (error.request) {
            // Request was made but no response received
            return {
                success: false,
                data: { conversation: null },
                message: 'Network error - please check your connection'
            };
        } else {
            // Something else happened
            return {
                success: false,
                data: { conversation: null },
                message: error.message || 'Failed to get vendor-admin conversation'
            };
        }
    }
};

/**
 * Create vendor-admin conversation
 */
export const createVendorAdminConversation = async (): Promise<CreateVendorAdminConversationResponse> => {
    try {
        // Check if we have a token before making the request
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            return {
                success: false,
                data: { conversation: null as any, isNew: false },
                message: 'No authentication token found. Please log in again.'
            };
        }
        
        const response = await apiClient.post('conversations/vendor-admin');
        return response.data;
    } catch (error: any) {
        console.error('Create vendor-admin conversation error:', error);
        // Return a structured error response instead of throwing
        if (error.response) {
            // Server responded with error status
            const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
            // Provide more specific error messages based on status code
            if (error.response.status === 403) {
                return {
                    success: false,
                    data: { conversation: null as any, isNew: false },
                    message: 'Access denied. Only vendors can access this feature.'
                };
            } else if (error.response.status === 400) {
                return {
                    success: false,
                    data: { conversation: null as any, isNew: false },
                    message: 'Invalid request. Please try refreshing the page.'
                };
            }
            return {
                success: false,
                data: { conversation: null as any, isNew: false },
                message: errorMessage
            };
        } else if (error.request) {
            // Request was made but no response received
            return {
                success: false,
                data: { conversation: null as any, isNew: false },
                message: 'Network error - please check your connection'
            };
        } else {
            // Something else happened
            return {
                success: false,
                data: { conversation: null as any, isNew: false },
                message: error.message || 'Failed to create vendor-admin conversation'
            };
        }
    }
};

/**
 * Add reaction to a chatbot message
 */
export const addReaction = async (
    messageId: string,
    emoji: string
): Promise<AddReactionResponse> => {
    try {
        // Validate message ID
        if (!isValidObjectId(messageId)) {
            throw { success: false, error: 'Invalid message ID' };
        }

        const response = await apiClient.post(`/messages/${messageId}/reactions`, { emoji });
        return response.data;
    } catch (error: any) {
        console.error('Add reaction error:', error);
        throw error.response?.data || { success: false, error: 'Failed to add reaction' };
    }
};

/**
 * Pin/unpin a conversation
 */
export const pinConversation = async (
    conversationId: string,
    isPinned: boolean
): Promise<{ success: boolean; data: { conversation: ChatbotConversation }; message: string }> => {
    try {
        // Validate conversation ID
        if (!isValidObjectId(conversationId)) {
            throw { success: false, error: 'Invalid conversation ID' };
        }
        
        const response = await apiClient.put(`/conversations/${conversationId}/pin`, { isPinned });
        return response.data;
    } catch (error: any) {
        console.error('Pin conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to update conversation pin status' };
    }
};

/**
 * Mute/unmute a conversation
 */
export const muteConversation = async (
    conversationId: string,
    isMuted: boolean
): Promise<{ success: boolean; data: { conversation: ChatbotConversation }; message: string }> => {
    try {
        // Validate conversation ID
        if (!isValidObjectId(conversationId)) {
            throw { success: false, error: 'Invalid conversation ID' };
        }
        
        const response = await apiClient.put(`/conversations/${conversationId}/mute`, { isMuted });
        return response.data;
    } catch (error: any) {
        console.error('Mute conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to update conversation mute status' };
    }
};

const chatbotApi = {
    getConversations,
    searchVendors,
    searchCustomers,
    createConversation,
    getConversation,
    getMessages,
    uploadFile,
    sendMessage,
    editMessage,
    deleteMessage,
    replyToMessage,
    searchMessages,
    addReaction,
    exportConversation,
    resolveConversation,
    closeConversation,
    getVendorAdminConversation,
    createVendorAdminConversation,
    pinConversation,
    muteConversation,
};

export default chatbotApi;
















