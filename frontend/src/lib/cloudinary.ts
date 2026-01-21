import { Cloudinary } from '@cloudinary/url-gen';

// Cloudinary configuration
const cloudinary = new Cloudinary({
  cloud: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dftpdqd4k'
  },
});

// Upload preset for unsigned uploads
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'vetora_uploads';

// Upload URL (using our backend API)
const UPLOAD_URL = '/api/media/upload/single';

export interface CloudinaryUploadResult {
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
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload a file to Cloudinary
 */
export const uploadToCloudinary = async (
  file: File,
  options: {
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    folder?: string;
    tags?: string[];
    onProgress?: (progress: UploadProgress) => void;
  } = {}
): Promise<CloudinaryUploadResult> => {
  const { onProgress } = options;
  const formData = new FormData();
  formData.append('file', file);
  
  // Don't add resource_type to FormData - let the backend handle it automatically

  const xhr = new XMLHttpRequest();

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          };
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Upload failed'));
          }
        } catch (parseError) {
          reject(new Error('Invalid response format'));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`));
        } catch (parseError) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'));
    });

    xhr.open('POST', UPLOAD_URL);
    
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
};

/**
 * Generate optimized image URL
 */
export const getOptimizedImageUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | string | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'crop';
  } = {}
): string => {
  const {
    width = 400,
    height = 300,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  let transformations = [`q_${quality}`, `f_${format}`];
  
  if (width || height) {
    const dimensions: string[] = [];
    if (width) dimensions.push(`w_${width}`);
    if (height) dimensions.push(`h_${height}`);
    transformations.push(...dimensions, `c_${crop}`);
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dftpdqd4k';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join(',')}/${publicId}`;
};

/**
 * Generate video thumbnail URL
 */
export const getVideoThumbnailUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
  } = {}
): string => {
  const {
    width = 400,
    height = 300,
    quality = 'auto',
  } = options;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dftpdqd4k';
  return `https://res.cloudinary.com/${cloudName}/video/upload/w_${width},h_${height},c_fill,q_${quality},f_jpg/${publicId}.jpg`;
};

/**
 * Delete a file from Cloudinary
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<void> => {
  // Note: This requires server-side implementation for security
  // Client-side deletion is not recommended for production
  console.warn('Cloudinary deletion should be implemented on the server side');
  
  // This would typically be done via your backend API
  // Example: await api.cloudinary.delete({ publicId, resourceType });
};