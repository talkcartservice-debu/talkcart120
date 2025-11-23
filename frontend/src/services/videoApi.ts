import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const videoApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0, // No timeout for video operations
});

// Add auth token to requests
videoApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
videoApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Video API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface VideoAnalytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTime: number;
  avgWatchTime: number;
  completionRate: number;
  engagement: number;
  topCountries: string[];
  viewsByHour: Array<{ hour: number; views: number }>;
  demographics: {
    ageGroups: Array<{ range: string; percentage: number }>;
    gender: Array<{ type: string; percentage: number }>;
  };
}

export interface VideoSearchFilters {
  query?: string;
  duration_min?: number;
  duration_max?: number;
  format?: string;
  author?: string;
  tags?: string;
  sort_by?: string;
  sort_order?: string;
  limit?: number;
  page?: number;
}

export interface VideoSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
  duration: number;
  format: string;
  quality: string;
  views: number;
  likes: number;
  comments: number;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  tags: string[];
  createdAt: Date;
  size: number;
}

export const videoApiService = {
  // Get video analytics for a specific post
  async getVideoAnalytics(postId: string): Promise<VideoAnalytics> {
    const response = await videoApi.get(`/analytics/video/${postId}`);
    return response.data.data.videoAnalytics;
  },

  // Track video performance
  async trackVideoPerformance(data: {
    videoId: string;
    sessionId: string;
    metrics: any;
    events: any[];
  }): Promise<void> {
    await videoApi.post('/analytics/video-performance', data);
  },

  // Search videos with filters
  async searchVideos(filters: VideoSearchFilters): Promise<{
    videos: VideoSearchResult[];
    pagination: any;
    filters: any;
  }> {
    const response = await videoApi.get('/posts/videos/search', { params: filters });
    return response.data.data;
  },

  // Update video settings
  async updateVideoSettings(postId: string, settings: {
    quality?: string;
    visibility?: string;
    enableComments?: boolean;
    enableDownload?: boolean;
  }): Promise<any> {
    const response = await videoApi.put(`/posts/${postId}/video-settings`, settings);
    return response.data.data;
  },

  // Upload video file
  async uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await videoApi.post('/media/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.data;
  },

  // Upload multiple videos
  async uploadMultipleVideos(files: File[], onProgress?: (progress: number) => void): Promise<any[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await videoApi.post('/media/upload/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.data;
  },

  // Get video thumbnail
  async getVideoThumbnail(videoUrl: string, options: {
    width?: number;
    height?: number;
    quality?: string;
  } = {}): Promise<string> {
    const response = await videoApi.post('/media/video-thumbnail', {
      url: videoUrl,
      ...options,
    });
    return response.data.data.thumbnail_url;
  },

  // Delete video
  async deleteVideo(postId: string): Promise<void> {
    await videoApi.delete(`/posts/${postId}`);
  },

  // Get video file info
  async getVideoInfo(videoUrl: string): Promise<{
    duration: number;
    width: number;
    height: number;
    format: string;
    size: number;
    bitrate?: number;
  }> {
    const response = await videoApi.post('/media/file-info', { url: videoUrl });
    return response.data.data;
  },

  // Compress video (client-side processing)
  async compressVideo(file: File, options: {
    quality?: 'low' | 'medium' | 'high' | 'auto';
    maxWidth?: number;
    maxHeight?: number;
    maxFileSize?: number;
  } = {}): Promise<{
    compressedFile: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  }> {
    // This would typically use a client-side video compression library
    // For now, return the original file as a placeholder
    return {
      compressedFile: file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0,
    };
  },

  // Generate video thumbnail (client-side)
  async generateThumbnail(file: File, timeOffset: number = 1): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = Math.min(timeOffset, video.duration * 0.1);
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video for thumbnail generation'));
      };

      video.src = URL.createObjectURL(file);
    });
  },

  // Get video metadata (client-side)
  async getVideoMetadata(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    size: number;
    format: string;
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');

      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: file.size,
          format: file.type.split('/')[1] || 'unknown',
        };

        resolve(metadata);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  },
};

export default videoApiService;