import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const mediaApi = axios.create({
    baseURL: `${API_BASE_URL}/api/media`,
    timeout: 0, // No timeout for file uploads
});

// Add auth token to requests
mediaApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface UploadResponse {
    success: boolean;
    data: {
        public_id: string;
        secure_url: string;
        url: string;
        format: string;
        resource_type: string;
        bytes: number;
        width?: number;
        height?: number;
        duration?: number;
        created_at: string;
    };
    message: string;
}

export interface UploadError {
    success: false;
    error: string;
    details?: string;
}

/**
 * Upload a single file to the media service
 */
export const uploadFile = async (
    file: File,
    onProgress?: (progress: number) => void
): Promise<UploadResponse> => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await mediaApi.post<UploadResponse>('/upload', formData, {
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

        return response.data;
    } catch (error: any) {
        console.error('File upload error:', error);

        if (error.response?.data) {
            throw error.response.data;
        }

        throw {
            success: false,
            error: 'Failed to upload file',
            details: error.message,
        } as UploadError;
    }
};

/**
 * Upload multiple files
 */
export const uploadMultipleFiles = async (
    files: File[],
    onProgress?: (fileIndex: number, progress: number) => void
): Promise<UploadResponse[]> => {
    const results: UploadResponse[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue; // Skip if file is undefined
        try {
            const result = await uploadFile(file, (progress) => {
                onProgress?.(i, progress);
            });
            results.push(result);
        } catch (error) {
            console.error(`Failed to upload file ${file.name}:`, error);
            throw error;
        }
    }

    return results;
};

/**
 * Delete a file from the media service
 */
export const deleteFile = async (publicId: string): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await mediaApi.delete(`/delete/${publicId}`);
        return response.data;
    } catch (error: any) {
        console.error('File deletion error:', error);
        throw error.response?.data || { success: false, error: 'Failed to delete file' };
    }
};

/**
 * Get optimized URL for an image
 */
export const getOptimizedImageUrl = (
    publicId: string,
    options: {
        width?: number;
        height?: number;
        quality?: 'auto' | number;
        format?: 'auto' | 'webp' | 'jpg' | 'png';
        crop?: 'fill' | 'fit' | 'scale' | 'crop';
    } = {}
): string => {
    const baseUrl = 'https://res.cloudinary.com/your-cloud-name/image/upload';

    const transformations = [];

    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.format) transformations.push(`f_${options.format}`);
    if (options.crop) transformations.push(`c_${options.crop}`);

    const transformationString = transformations.length > 0 ? `${transformations.join(',')}/` : '';

    return `${baseUrl}/${transformationString}${publicId}`;
};

/**
 * Get video thumbnail
 */
export const getVideoThumbnail = (publicId: string, timeOffset: number = 0): string => {
    const baseUrl = 'https://res.cloudinary.com/your-cloud-name/video/upload';
    return `${baseUrl}/so_${timeOffset},w_300,h_200,c_fill,f_jpg/${publicId}.jpg`;
};

/**
 * Validate file before upload
 */
export const validateFile = (
    file: File,
    options: {
        maxSize?: number; // in MB
        allowedTypes?: string[];
        maxWidth?: number;
        maxHeight?: number;
    } = {}
): { valid: boolean; error?: string } => {
    const {
        maxSize = 50, // 50MB default
        allowedTypes = ['image/*', 'video/*', 'audio/webm', 'audio/webm;codecs=opus', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'application/pdf', 'text/*'],
        maxWidth = 4000,
        maxHeight = 4000,
    } = options;

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
        return {
            valid: false,
            error: `File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed size (${maxSize}MB)`,
        };
    }

    // Check file type
    const isAllowedType = allowedTypes.some(type => {
        // For exact matches
        if (file.type === type) return true;
        
        // For wildcard matches
        if (type.endsWith('/*')) {
            return file.type.startsWith(type.slice(0, -1));
        }
        
        // For audio files with codecs, check base type
        if (file.type.startsWith('audio/') && type.startsWith('audio/')) {
            const baseFileType = file.type.split(';')[0];
            return baseFileType === type;
        }
        
        return false;
    });

    if (!isAllowedType) {
        return {
            valid: false,
            error: `File type "${file.type}" is not allowed`,
        };
    }

    // For images, we could check dimensions, but that requires loading the image
    // This would be done in the component if needed

    return { valid: true };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file type from MIME type
 */
export const getFileType = (mimeType: string): 'image' | 'video' | 'audio' | 'document' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
};

export default {
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    getOptimizedImageUrl,
    getVideoThumbnail,
    validateFile,
    formatFileSize,
    getFileType,
};