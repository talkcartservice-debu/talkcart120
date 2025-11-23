/**
 * Video Utilities
 * 
 * This utility provides functions for handling video URLs and validation
 */

/**
 * Validate video file
 * @param file The file to validate
 * @returns Object with validation result
 */
export const validateVideoFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload a video file (MP4, WebM, OGG, AVI, MOV).' };
  }

  // Check file size (200MB max)
  const maxSize = 200 * 1024 * 1024; // 200MB in bytes
  if (file.size > maxSize) {
    return { valid: false, error: 'File size too large. Maximum size is 200MB.' };
  }

  return { valid: true };
};

/**
 * Validate if a string is a valid URL
 * @param urlString The URL string to validate
 * @returns boolean indicating if the URL is valid
 */
export const isValidVideoUrl = (urlString: string): boolean => {
  try {
    if (!urlString) return false;
    
    // Handle Cloudinary URLs with special characters
    if (urlString.includes('cloudinary.com')) {
      // Cloudinary URLs are generally valid even with special characters
      return urlString.startsWith('http://') || urlString.startsWith('https://');
    }
    
    // Handle local development URLs
    if (urlString.includes('localhost:') || urlString.includes('127.0.0.1')) {
      return urlString.startsWith('http://') || urlString.startsWith('https://');
    }
    
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

/**
 * Get appropriate volume icon based on volume level and mute state
 * @param volume Volume level (0-1)
 * @param muted Whether the video is muted
 * @returns Lucide icon component
 */
export const getVolumeIcon = (volume: number, muted?: boolean) => {
  if (muted || volume === 0) return 'VolumeX';
  if (volume < 0.3) return 'Volume';
  if (volume < 0.7) return 'Volume1';
  return 'Volume2';
};

/**
 * Get volume tooltip text
 * @param volume Volume level (0-1)
 * @returns Tooltip text
 */
export const getVolumeTooltip = (volume: number) => {
  return `Volume: ${Math.round(volume * 100)}%`;
};

/**
 * Format time in seconds to MM:SS format
 * @param seconds Time in seconds
 * @returns Formatted time string
 */
export const formatVideoTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Normalize media URL with comprehensive fixes
 * @param urlString The URL to normalize
 * @param resourceType The type of resource (video, image, etc.)
 * @returns Normalized URL string or null
 */
export const normalizeMediaUrl = (urlString: string, resourceType?: string): string | null => {
  try {
    if (!urlString) return null;
    
    // Handle already valid absolute URLs
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      let normalizedUrl = urlString;
      
      // Fix duplicate talkcart path issue
      if (normalizedUrl.includes('/uploads/talkcart/talkcart/')) {
        console.log('🔧 Fixing duplicate talkcart path in URL:', normalizedUrl);
        normalizedUrl = normalizedUrl.replace(/\/uploads\/talkcart\/talkcart\//g, '/uploads/talkcart/');
        console.log('✅ Fixed URL:', normalizedUrl);
      }
      
      // Fix for missing file extensions in local URLs
      if (normalizedUrl.includes('localhost:')) {
        const hasExtension = normalizedUrl.includes('.');
        const isVideoResource = resourceType === 'video';
        
        // For video resources or URLs that look like they should be videos, ensure .mp4 extension
        if (isVideoResource && !hasExtension) {
          normalizedUrl += '.mp4';
        } else if (!hasExtension) {
          // Check if it's missing an extension and try to add .mp4 for videos
          const isVideo = normalizedUrl.includes('video') || normalizedUrl.includes('mp4') || normalizedUrl.includes('mov');
          if (isVideo && !normalizedUrl.endsWith('.mp4')) {
            normalizedUrl += '.mp4';
          }
        }
      }
      
      // Convert HTTP to HTTPS for secure connections (except localhost)
      if (normalizedUrl.startsWith('http://') && !normalizedUrl.includes('localhost:')) {
        normalizedUrl = normalizedUrl.replace('http://', 'https://');
      }
      
      return normalizedUrl;
    }
    
    // Handle relative URLs by converting to absolute
    if (urlString.startsWith('/')) {
      let normalizedUrl = urlString;
      
      // Check for malformed URLs with duplicate path segments
      if (normalizedUrl.includes('/uploads/talkcart/talkcart/')) {
        console.log('🔧 Fixing duplicate talkcart path in relative URL:', normalizedUrl);
        normalizedUrl = normalizedUrl.replace(/\/uploads\/talkcart\/talkcart\//g, '/uploads/talkcart/');
        console.log('✅ Fixed relative URL:', normalizedUrl);
      }
      
      // For development, use localhost:8000 as the base
      // For production, this should be handled by the backend
      const isDev = process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? 'http://localhost:8000' : (typeof window !== 'undefined' ? window.location.origin.replace('http://', 'https://') : 'https://yourdomain.com');
      
      if (baseUrl) {
        // Ensure we don't double up on slashes
        if (normalizedUrl.startsWith('/')) {
          normalizedUrl = `${baseUrl}${normalizedUrl}`;
        } else {
          normalizedUrl = `${baseUrl}/${normalizedUrl}`;
        }
        
        // Fix for missing file extensions in local URLs
        if (normalizedUrl.includes('localhost:')) {
          const hasExtension = normalizedUrl.includes('.');
          const isVideoResource = resourceType === 'video';
          
          // For video resources or URLs that look like they should be videos, ensure .mp4 extension
          if (isVideoResource && !hasExtension) {
            normalizedUrl += '.mp4';
          } else if (!hasExtension) {
            // Check if it's missing an extension and try to add .mp4 for videos
            const isVideo = normalizedUrl.includes('video') || normalizedUrl.includes('mp4') || normalizedUrl.includes('mov');
            if (isVideo && !normalizedUrl.endsWith('.mp4')) {
              normalizedUrl += '.mp4';
            }
          }
        }
        
        // Convert HTTP to HTTPS for secure connections (except localhost)
        if (normalizedUrl.startsWith('http://') && !normalizedUrl.includes('localhost:')) {
          normalizedUrl = normalizedUrl.replace('http://', 'https://');
        }
      }
      return normalizedUrl;
    }
    
    return null;
  } catch (e) {
    console.error('❌ Error in normalizeMediaUrl:', e);
    // Try one more time with basic validation for edge cases
    if (urlString && (urlString.startsWith('http://') || urlString.startsWith('https://'))) {
      // Convert HTTP to HTTPS for secure connections (except localhost)
      if (urlString.startsWith('http://') && !urlString.includes('localhost:')) {
        return urlString.replace('http://', 'https://');
      }
      return urlString;
    }
    return null;
  }
};