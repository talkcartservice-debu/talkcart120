// Import centralized configuration
import { config, isDebugMode } from '../config';
import { fetchWithAuth } from './auth';

// Configuration constants
const API_BASE = config.api.baseUrl;
const BACKEND_URL = config.api.backendUrl;
const REQUEST_TIMEOUT = config.api.timeout;
const DEBUG_MODE = isDebugMode();

// Enhanced fetch with timeout and error handling
const fetchWithConfig = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Skip timeout logic when timeout is 0
  if (REQUEST_TIMEOUT === 0) {
    try {
      if (DEBUG_MODE) {
        console.log(`[Super Admin API] ${options.method || 'GET'} ${url}`);
      }

      const response = await fetchWithAuth(url, options);

      if (DEBUG_MODE) {
        console.log(`[Super Admin API] Response ${response.status} for ${url}`);
      }

      return response;
    } catch (error) {
      if (DEBUG_MODE) {
        console.error(`[Super Admin API] Error for ${url}:`, error);
      }
      throw error;
    }
  }

  // Original timeout logic for non-zero timeouts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('Request timed out'), REQUEST_TIMEOUT);

  try {
    if (DEBUG_MODE) {
      console.log(`[Super Admin API] ${options.method || 'GET'} ${url}`);
    }

    const response = await fetchWithAuth(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (DEBUG_MODE) {
      console.log(`[Super Admin API] Response ${response.status} for ${url}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (DEBUG_MODE) {
      console.error(`[Super Admin API] Error for ${url}:`, error);
    }
    // Handle AbortError specifically
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT}ms`);
    }
    throw error;
  }
};

// Health check function
const healthCheck = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`);
    return response.ok;
  } catch (error) {
    if (DEBUG_MODE) {
      console.error('[Super Admin API] Backend health check failed:', error);
    }
    return false;
  }
};

// Chat Management Types
interface ChatConversation {
  _id: string;
  customerId: string;
  vendorId: string;
  productId: string;
  productName: string;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  lastActivity: string;
  isActive: boolean;
  isResolved: boolean;
  customer: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
  vendor: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'system';
  isBotMessage: boolean;
  createdAt: string;
  sender?: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

interface ChatAnalytics {
  total_conversations: number;
  active_conversations: number;
  resolved_conversations: number;
  closed_conversations: number;
  total_messages: number;
  vendor_response_rate: number;
  avg_response_time: number;
}

export const AdminApi = {
  // Health and connection
  healthCheck,

  // Authentication
  me: async () => {
    try {
      const res = await fetchWithConfig(`${API_BASE}/admin/me`);
      return res.json();
    } catch (error) {
      // Provide more specific error handling
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to the authentication server. Please ensure the backend service is running.');
      }
      throw error;
    }
  },

  // Products
  listProductsAdmin: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/products?${params.toString()}`);
    return res.json();
  },
  createProduct: async (data: {
    name: string;
    description: string;
    price: number;
    currency?: string;
    images?: Array<{ public_id: string; secure_url: string; url: string }>;
    category: string;
    tags?: string[];
    stock?: number;
    featured?: boolean;
    isNFT?: boolean;
    contractAddress?: string;
    tokenId?: string;
    vendorId?: string;
  }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  toggleProduct: async (id: string, body: { isActive?: boolean; featured?: boolean }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  updateProduct: async (id: string, body: { price?: number; stock?: number }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  deleteProduct: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  approveProduct: async (id: string, featured = false) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ featured }),
    });
    return res.json();
  },
  bulkProducts: async (ids: string[], action: string, payload: any = {}) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/products/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, action, payload }),
    });
    return res.json();
  },
  exportProductsCsvUrl: (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    return `${API_BASE}/admin/products/export.csv?${params.toString()}`;
  },
  
  // Orders
  listOrders: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/orders?${params.toString()}`);
    return res.json();
  },
  getOrder: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/orders/${id}`);
    return res.json();
  },
  updateOrderStatus: async (id: string, status: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // Marketplace (create)
  createMarketplaceProduct: async (body: any) => {
    // Create products via marketplace route (admin-only, strict auth)
    const res = await fetchWithConfig(`${API_BASE}/marketplace/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },

  // Helper to build a frontend marketplace product URL
  getMarketplaceProductUrl: (id: string) => {
    const base = config.urls.frontend?.replace(/\/$/, '') || 'http://localhost:4000';
    return `${base}/marketplace/${id}`;
  },
  // Marketplace image upload (Admin only)
  uploadProductImages: async (files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    const res = await fetchWithConfig(`${API_BASE}/marketplace/products/upload-images`, {
      method: 'POST',
      // Important: do not set Content-Type; the browser will set the multipart boundary
      body: form,
    });
    return res.json();
  },
  // Analytics
  getAnalyticsOverview: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/analytics/overview`);
    return res.json();
  },

  getSalesTrends: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/analytics/sales-trends?${params.toString()}`);
    return res.json();
  },

  getTopProducts: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/analytics/top-products?${params.toString()}`);
    return res.json();
  },

  getVendorPerformance: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/analytics/vendor-performance?${params.toString()}`);
    return res.json();
  },

  // Vendor Analytics
  getVendorComparison: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/marketplace/admin/analytics/vendor-comparison?${params.toString()}`);
    return res.json();
  },

  // Refunds
  refundsRecent: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/recent?${params.toString()}`);
    return res.json();
  },
  refundsExportUrl: (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    return `${API_BASE}/admin/refunds/export.csv?${params.toString()}`;
  },
  refundsAnalytics: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/analytics?${params.toString()}`);
    return res.json();
  },
  processRefund: async (data: { paymentIntentId: string; amount: number; currency: string; reason?: string }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Comprehensive Refund Management
  getRefunds: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/refunds/management?${params.toString()}`);
    return res.json();
  },

  // Users
  listUsers: async (query: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/users?${params.toString()}`);
    return res.json();
  },
  getUser: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${id}`);
    return res.json();
  },
  getUserDetails: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${id}`);
    return res.json();
  },
  updateUser: async (id: string, data: Record<string, any>) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  deleteUser: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  restoreUser: async (userId: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}/restore`, {
      method: 'POST'
    });
    return res.json();
  },

  // Email Communication
  sendUserEmail: async (userId: string, emailData: {
    subject: string;
    message: string;
    template?: string;
  }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });
    return res.json();
  },

  sendBulkEmail: async (userIds: string[], emailData: {
    subject: string;
    message: string;
    template?: string;
  }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/bulk-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds,
        ...emailData
      })
    });
    return res.json();
  },

  getUserEmailHistory: async (userId: string, limit: number = 50) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/users/${userId}/email-history?limit=${limit}`);
    return res.json();
  },

  // Chat Management
  getChatConversations: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/chat/conversations?${params.toString()}`);
    return res.json();
  },

  getChatConversation: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/chat/conversations/${id}`);
    return res.json();
  },

  getChatMessages: async (conversationId: string, query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/chat/conversations/${conversationId}/messages?${params.toString()}`);
    return res.json();
  },

  sendChatMessage: async (conversationId: string, data: { content: string }) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  resolveChatConversation: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/chat/conversations/${id}/resolve`, {
      method: 'PUT',
    });
    return res.json();
  },

  closeChatConversation: async (id: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/chat/conversations/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  getChatAnalytics: async (query: Record<string, any> = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
      const res = await fetchWithConfig(`${API_BASE}/admin/chat/analytics?${params.toString()}`);
      return res.json();
    } catch (error) {
      console.error('Failed to fetch chat analytics:', error);
      // Return a default response to prevent app crashes
      return { 
        success: false, 
        message: 'Failed to fetch chat analytics',
        data: {
          total_conversations: 0,
          active_conversations: 0,
          resolved_conversations: 0,
          closed_conversations: 0,
          total_messages: 0,
          vendor_response_rate: 0,
          avg_response_time: 0
        }
      };
    }
  },

  // Vendor-Admin Chat
  getVendorAdminConversations: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/chat/vendor-admin?${params.toString()}`);
    return res.json();
  },

  createVendorAdminConversation: async (vendorId: string) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/chat/vendor-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId }),
    });
    return res.json();
  },

  // Vendor search for chat
  searchVendorsForChat: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/chat/search/vendors?${params.toString()}`);
    return res.json();
  },

  // Vendor-Admin Chat (from chatbot API)
  getVendorAdminChatConversations: async (vendorId: string) => {
    const res = await fetchWithConfig(`${API_BASE}/chatbot/conversations/vendor-admin?vendorId=${vendorId}`);
    return res.json();
  },

  // Settings
  getSettings: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings`);
    return res.json();
  },

  updateSettings: async (type: string, updates: Record<string, any>) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, updates }),
    });
    return res.json();
  },

  // Admin Payment Preferences
  getPaymentPreferences: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/payment-preferences`);
    return res.json();
  },

  updatePaymentPreferences: async (updates: Record<string, any>) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/payment-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  // Admin Commission
  getTotalCommission: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/commission/total`);
    return res.json();
  },

  withdrawCommission: async (amount: number, currency: string = 'RWF', withdrawalDetails: Record<string, any> = {}) => {
    const res = await fetchWithConfig(`${API_BASE}/admin/commission/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, withdrawalDetails }),
    });
    return res.json();
  },

  getCommissionHistory: async (query: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(query || {}).forEach(([k,v]) => { if (v != null && v !== '') params.set(k, String(v)); });
    const res = await fetchWithConfig(`${API_BASE}/admin/commission/history?${params.toString()}`);
    return res.json();
  },

  // Categories
  getCategories: async () => {
    const res = await fetchWithConfig(`${API_BASE}/admin/categories`);
    return res.json();
  },
};