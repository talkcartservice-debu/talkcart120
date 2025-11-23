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
    // Remove file_1760163879851_tt3fdqqim9 as it appears to be a valid file
    // url.includes('file_1760163879851_tt3fdqqim9') ||
    // Add pattern to detect truncated URLs that end with partial file names
    // But be more specific to avoid false positives
    // (url.includes('file_') && url.length < 100 && !url.includes('.'))
  ) {
    console.log('Known missing file detected, returning placeholder:', url);
    return '/images/placeholder-image-new.png';
  }
  
  // If it's already a proxied URL, return as is
  if (url.startsWith('/uploads/')) {
    console.log('URL is already a relative path, returning as is:', url);
    return url;
  }
  
  // Convert localhost:8000 URLs to relative paths to use the Next.js proxy
  if (url.includes('localhost:8000/uploads/')) {
    // Extract the path after /uploads/
    try {
      const path = url.split('/uploads/')[1];
      const cleanPath = `/uploads/${path}`;
      console.log('✅ Proxied backend upload URL:', cleanPath);
      return cleanPath;
    } catch (e) {
      console.error('Failed to parse localhost URL:', url, e);
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