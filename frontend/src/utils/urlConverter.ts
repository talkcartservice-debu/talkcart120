import { SOCKET_URL } from '@/config/index';

/**
 * URL Converter Utility
 * 
 * This utility helps convert URLs from backend to frontend proxy URLs
 */

/**
 * Convert a backend URL to a frontend proxy URL
 * @param url The original URL
 * @returns A URL that goes through the frontend proxy
 */
export const convertToProxyUrl = (url: string): string => {
  // URL conversion for proxy
  
  // If it's already a proxied URL, return as is
  if (!url || typeof url !== 'string') {
    // Invalid URL, returning placeholder
    return '/images/placeholder-image-new.png';
  }
  
  // Handle app-relative post detail URLs only (avoid matching Cloudinary folder names)
  if (url.startsWith('/post/')) {
    console.log('App post detail URL detected, returning placeholder:', url);
    return '/images/placeholder-image-new.png';
  }
  
  // Handle known missing files
  if (
    url.includes('file_1760168733155_lfhjq4ik7ht') ||
    url.includes('file_1760263843073_w13593s5t8l') ||
    url.includes('file_1760276276250_3pqeekj048s')
  ) {
    console.log('Known missing file detected, returning placeholder:', url);
    return '/images/placeholder-image-new.png';
  }
  
  // If it's already a proxied URL, return as is
  if (url.startsWith('/uploads/')) {
    console.log('URL is already a relative path, returning as is:', url);
    return url;
  }
  
  // Convert backend URLs to relative paths to use the Next.js proxy
  // Use SOCKET_URL as the base backend URL if available
  const backendBaseUrl = SOCKET_URL || 'http://localhost:8000';
  const cleanBackendBaseUrl = backendBaseUrl.endsWith('/') ? backendBaseUrl.slice(0, -1) : backendBaseUrl;

  if (url.includes('/uploads/') && (url.includes('localhost:8000') || url.includes(cleanBackendBaseUrl.replace('https://', '').replace('http://', '')))) {
    // Extract the path after /uploads/
    try {
      const path = url.split('/uploads/')[1];
      const cleanPath = `/uploads/${path}`;
      console.log('✅ Proxied backend upload URL:', cleanPath);
      return cleanPath;
    } catch (e) {
      console.error('Failed to parse backend URL:', url, e);
      // Fallback to URL as is
      return url;
    }
  }
  
  // Convert HTTP to HTTPS for secure connections (except localhost)
  if (url.startsWith('http://') && !url.includes('localhost:')) {
    url = url.replace('http://', 'https://');
  }
  
  // For other URLs, return as is
  console.log('URL not converted, returning as is:', url);
  return url;
};