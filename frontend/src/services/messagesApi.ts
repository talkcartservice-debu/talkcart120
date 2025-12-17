import axios from 'axios';
import { Message } from '@/types/message';
import { API_URL, TIMEOUTS } from '@/config/index';

const BROWSER_BASE = `${API_URL}/messages`; // API_URL is '/api' in browser
const SERVER_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/messages`;

// Log the timeout value being used
console.log('Messages API timeout configuration:', TIMEOUTS.API_REQUEST);

// Create axios instance with default config
const messageApi = axios.create({
    baseURL: typeof window !== 'undefined' ? BROWSER_BASE : SERVER_BASE,
    timeout: TIMEOUTS.API_REQUEST, // Use config timeout
});

// Log the actual axios instance configuration
console.log('Messages API axios instance timeout:', messageApi.defaults.timeout);

// Add auth token to requests
messageApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptor for better error handling
messageApi.interceptors.response.use(
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

/**
 * Search messages across all conversations for the authenticated user
 */
export const searchAllMessages = async (
    query: string,
    options: {
        limit?: number;
        page?: number;
    } = {}
): Promise<{
    success: boolean;
    data: {
        messages: Message[];
        total: number;
        query: string;
        pagination: {
            page: number;
            limit: number;
            hasMore: boolean;
        };
    };
}> => {
    try {
        const params = new URLSearchParams();
        params.append('q', query);
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());

        const response = await messageApi.get(`/search?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Search all messages error:', error);
        throw error.response?.data || { success: false, error: 'Failed to search messages across conversations' };
    }
};

// Remove the duplicate function since we already have searchAllMessages above
// The searchAllMessages function already does what searchMessagesGlobally was doing

/**
 * Get messages for a specific conversation
 */
export const getMessages = async (
    conversationId: string,
    options: {
        limit?: number;
        page?: number;
        before?: string;
    } = {}
): Promise<{
    success: boolean;
    data: {
        messages: Message[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            hasMore: boolean;
        };
    };
}> => {
    try {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());
        if (options.before) params.append('before', options.before);

        const response = await messageApi.get(`/conversations/${conversationId}/messages?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Get messages error:', error);
        
        // Handle network timeout errors specifically
        if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
            console.error('Request timeout when fetching messages:', error.config?.url);
            throw { success: false, error: 'Request timeout. Please check your network connection and try again.', timeout: true };
        }
        
        // Handle network errors
        if (!error.response) {
            console.error('Network error when fetching messages:', error.config?.url);
            throw { success: false, error: 'Network error. Please check your connection and try again.', networkError: true };
        }
        
        throw error.response?.data || { success: false, error: 'Failed to get messages' };
    }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (
    conversationId: string,
    data: {
        content?: string;
        type?: string;
        media?: any[];
        replyTo?: string;
    }
): Promise<any> => {
    try {
        const response = await messageApi.post(`/conversations/${conversationId}/messages`, data);
        return response.data;
    } catch (error: any) {
        console.error('Send message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to send message' };
    }
};

/**
 * Edit a message
 */
export const editMessage = async (
    messageId: string,
    data: {
        content: string;
    }
): Promise<any> => {
    try {
        const response = await messageApi.put(`/messages/${messageId}/edit`, data);
        return response.data;
    } catch (error: any) {
        console.error('Edit message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to edit message' };
    }
};

/**
 * Delete a message
 */
export const deleteMessage = async (messageId: string): Promise<any> => {
    try {
        const response = await messageApi.delete(`/messages/${messageId}`);
        return response.data;
    } catch (error: any) {
        console.error('Delete message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to delete message' };
    }
};

/**
 * Forward a message to other conversations
 */
export const forwardMessage = async (
    messageId: string,
    data: {
        conversationIds: string[];
        message?: string;
    }
): Promise<any> => {
    try {
        const response = await messageApi.post(`/messages/${messageId}/forward`, data);
        return response.data;
    } catch (error: any) {
        console.error('Forward message error:', error);
        throw error.response?.data || { success: false, error: 'Failed to forward message' };
    }
};

/**
 * Search messages within a specific conversation
 */
export const searchMessages = async (
    conversationId: string,
    query: string,
    options: {
        limit?: number;
        page?: number;
    } = {}
): Promise<any> => {
    try {
        const params = new URLSearchParams();
        params.append('q', query);
        if (options.limit) params.append('limit', options.limit.toString());
        if (options.page) params.append('page', options.page.toString());

        const response = await messageApi.get(`/conversations/${conversationId}/search?${params.toString()}`);
        return response.data;
    } catch (error: any) {
        console.error('Search messages error:', error);
        throw error.response?.data || { success: false, error: 'Failed to search messages' };
    }
};

/**
 * Add or remove reaction to a message
 */
export const addReaction = async (
    messageId: string,
    data: {
        emoji: string;
    }
): Promise<any> => {
    try {
        const response = await messageApi.post(`/messages/${messageId}/reactions`, data);
        return response.data;
    } catch (error: any) {
        console.error('Add reaction error:', error);
        throw error.response?.data || { success: false, error: 'Failed to add reaction' };
    }
};

/**
 * Toggle reaction to a message (alias for addReaction for backward compatibility)
 */
export const toggleReaction = async (
    messageId: string,
    data: {
        emoji: string;
    }
): Promise<any> => {
    return addReaction(messageId, data);
};

/**
 * Mark a message as read
 */
export const markMessageAsRead = async (messageId: string): Promise<any> => {
    try {
        const response = await messageApi.put(`/messages/${messageId}/read`, {});
        return response.data;
    } catch (error: any) {
        console.error('Mark message as read error:', error);
        throw error.response?.data || { success: false, error: 'Failed to mark message as read' };
    }
};

/**
 * Mark all messages in a conversation as read
 */
export const markAllAsRead = async (conversationId: string): Promise<any> => {
    try {
        const response = await messageApi.put(`/conversations/${conversationId}/read`, {});
        return response.data;
    } catch (error: any) {
        console.error('Mark all as read error:', error);
        throw error.response?.data || { success: false, error: 'Failed to mark all messages as read' };
    }
};

/**
 * Create a new conversation
 */
export const createConversation = async (
    participantIds: string[],
    options: {
        isGroup?: boolean;
        groupName?: string;
        groupDescription?: string;
    } = {}
): Promise<any> => {
    try {
        // Validate participant IDs
        if (!participantIds || participantIds.length === 0) {
            throw new Error('At least one participant is required');
        }
        
        // Determine if this is a direct message (only one participant besides current user)
        const isDirectMessage = !options.isGroup && participantIds.length === 1;
        
        const data = isDirectMessage 
            ? {
                participantId: participantIds[0], // For direct messages, send as participantId
                isGroup: false
            }
            : {
                participantIds, // For group messages, send as participantIds
                isGroup: options.isGroup || false,
                groupName: options.groupName,
                groupDescription: options.groupDescription
            };
        
        console.log('Creating conversation with data:', data);
        const response = await messageApi.post('/conversations', data);
        console.log('Conversation creation response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Create conversation error:', error);
        // Provide more detailed error information
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create conversation';
        throw { success: false, error: errorMessage };
    }
};

/**
 * Update conversation settings
 */
export const updateConversation = async (
    conversationId: string,
    settings: {
        groupName?: string;
        groupDescription?: string;
        groupAvatar?: string;
    }
): Promise<any> => {
    try {
        const response = await messageApi.put(`/conversations/${conversationId}`, settings);
        return response.data;
    } catch (error: any) {
        console.error('Update conversation error:', error);
        throw error.response?.data || { success: false, error: 'Failed to update conversation' };
    }
};

/**
 * Send typing indicator
 */
export const sendTypingIndicator = async (
    conversationId: string,
    isTyping: boolean = true
): Promise<any> => {
    try {
        const response = await messageApi.post(`/conversations/${conversationId}/typing`, { isTyping });
        return response.data;
    } catch (error: any) {
        console.error('Send typing indicator error:', error);
        throw error.response?.data || { success: false, error: 'Failed to send typing indicator' };
    }
};

const messagesApi = {
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    forwardMessage,
    addReaction,
    toggleReaction,
    markMessageAsRead,
    markAllAsRead,
    searchMessages,
    searchAllMessages,
    createConversation,
    updateConversation,
    sendTypingIndicator
};

export default messagesApi;