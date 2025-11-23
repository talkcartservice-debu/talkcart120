// API Response Types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: any; // Backend returns user at root level
  accessToken?: string; // Backend returns tokens at root level
  refreshToken?: string;
  data?: {
    user: any;
    accessToken: string;
    refreshToken: string;
  };
  message?: string;
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  data?: {
    url: string;
    public_id: string;
    secure_url: string;
    resource_type: string;
    format: string;
    width?: number;
    height?: number;
    bytes: number;
  };
  message?: string;
  error?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}