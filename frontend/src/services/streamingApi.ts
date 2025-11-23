import { API_URL } from '@/config';

export interface Stream {
  id: string;
  title: string;
  description?: string;
  thumbnail?: {
    secure_url: string;
    public_id: string;
  };
  streamUrl?: string;
  playbackUrl?: string;
  category: string;
  tags: string[];
  language: string;
  isLive: boolean;
  isActive: boolean;
  isScheduled: boolean;
  scheduledAt?: string;
  isRecording: boolean;
  viewerCount: number;
  peakViewerCount: number;
  totalViews: number;
  duration: number;
  startedAt?: string;
  endedAt?: string;
  streamer: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    isVerified: boolean;
    followerCount: number;
  };
  settings: {
    allowChat: boolean;
    allowDonations: boolean;
    allowRecording: boolean;
    isSubscriberOnly: boolean;
    isMatureContent: boolean;
    maxViewers: number;
    chatSlowMode: number;
    requireFollowToChat: boolean;
    autoModeration: boolean;
    quality: {
      resolution: string;
      bitrate: number;
      fps: number;
    };
  };
  monetization: {
    subscriptionPrice: number;
    donationGoal: number;
    totalDonations: number;
    minimumDonation: number;
    donationCurrency: string;
  };
  analytics: {
    totalChatMessages: number;
    totalLikes: number;
    totalShares: number;
    newFollowers: number;
    engagementRate: number;
    averageWatchTime: number;
  };
  health: {
    status: string;
    bitrate: number;
    fps: number;
    quality: string;
    latency: number;
    droppedFrames: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  message: string;
  timestamp: string;
  type: 'message' | 'system' | 'donation';
  reactions: {
    likes: number;
    hearts: number;
    isLiked: boolean;
    isHearted: boolean;
  };
}

export interface StreamDonation {
  id: string;
  donorId: string;
  donorUsername: string;
  donorDisplayName: string;
  amount: number;
  currency: string;
  message: string;
  timestamp: string;
}

export interface StreamMetrics {
  viewerStats: {
    current: number;
    peak: number;
    total: number;
    average: number;
  };
  engagement: {
    chatMessages: number;
    likes: number;
    shares: number;
    newFollowers: number;
  };
  revenue: {
    donations: number;
    subscriptions: number;
    totalEarnings: number;
  };
  topChatters: Array<{
    username: string;
    messages: number;
  }>;
  demographics: {
    countries: Array<{
      name: string;
      viewers: number;
      percentage: number;
    }>;
    devices: Array<{
      type: string;
      count: number;
    }>;
  };
}

class StreamingApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Stream Management
  async getStreams(params?: {
    limit?: number;
    page?: number;
    category?: string;
    search?: string;
    isLive?: boolean;
    streamerId?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_URL}/streams?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch streams');
    }

    return response.json();
  }

  async getLiveStreams(params?: {
    limit?: number;
    page?: number;
    category?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_URL}/streams/live?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch live streams');
    }

    return response.json();
  }

  async getStream(id: string) {
    const response = await fetch(`${API_URL}/streams/${id}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stream');
    }

    return response.json();
  }

  async createStream(data: {
    title: string;
    description?: string;
    category: string;
    tags?: string[];
    thumbnail?: any;
    settings?: Partial<Stream['settings']>;
    monetization?: Partial<Stream['monetization']>;
  }) {
    const response = await fetch(`${API_URL}/streams`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create stream');
    }

    return response.json();
  }

  async updateStream(id: string, data: Partial<Stream>) {
    const response = await fetch(`${API_URL}/streams/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update stream');
    }

    return response.json();
  }

  async startStream(id: string, data: { streamUrl: string; playbackUrl: string }) {
    const response = await fetch(`${API_URL}/streams/${id}/start`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to start stream');
    }

    return response.json();
  }

  async stopStream(id: string) {
    const response = await fetch(`${API_URL}/streams/${id}/stop`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to stop stream');
    }

    return response.json();
  }

  // Stream Settings
  async getStreamSettings(id: string) {
    const response = await fetch(`${API_URL}/streams/${id}/settings`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stream settings');
    }

    return response.json();
  }

  async updateStreamSettings(id: string, settings: Partial<Stream['settings']>) {
    const response = await fetch(`${API_URL}/streams/${id}/settings`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ settings }),
    });

    if (!response.ok) {
      throw new Error('Failed to update stream settings');
    }

    return response.json();
  }

  // Analytics & Metrics
  async getStreamMetrics(id: string): Promise<{ success: boolean; data: StreamMetrics }> {
    const response = await fetch(`${API_URL}/streams/${id}/metrics`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stream metrics');
    }

    return response.json();
  }

  async getStreamHealth(id: string) {
    const response = await fetch(`${API_URL}/streams/${id}/health`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stream health');
    }

    return response.json();
  }

  async exportAnalytics(id: string, format: 'json' | 'csv' = 'json', timeRange = 'all') {
    const response = await fetch(`${API_URL}/streams/${id}/analytics/export?format=${format}&timeRange=${timeRange}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to export analytics');
    }

    if (format === 'csv') {
      return response.text();
    }

    return response.json();
  }

  // Chat & Donations are provided via lib/api.ts (api.streams.*). Duplicate methods removed to avoid drift.

  // Categories
  async getCategories() {
    const response = await fetch(`${API_URL}/streams/categories`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    return response.json();
  }

  // Real-time updates
  async updateViewerCount(id: string, viewerCount: number) {
    const response = await fetch(`${API_URL}/streams/${id}/update-viewers`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ viewerCount }),
    });

    if (!response.ok) {
      throw new Error('Failed to update viewer count');
    }

    return response.json();
  }

  async updateStreamHealth(id: string, health: {
    bitrate: number;
    fps: number;
    quality: string;
    latency: number;
    droppedFrames: number;
  }) {
    const response = await fetch(`${API_URL}/streams/${id}/update-health`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(health),
    });

    if (!response.ok) {
      throw new Error('Failed to update stream health');
    }

    return response.json();
  }

  async broadcastMessage(id: string, message: string, type = 'announcement') {
    const response = await fetch(`${API_URL}/streams/${id}/broadcast-message`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ message, type }),
    });

    if (!response.ok) {
      throw new Error('Failed to broadcast message');
    }

    return response.json();
  }
}

export const streamingApi = new StreamingApiService();
export default streamingApi;