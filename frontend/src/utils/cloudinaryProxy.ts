/**
 * Cloudinary Proxy Utility
 * 
 * This utility helps avoid CORS issues when loading Cloudinary images by
 * proxying them through the Next.js server.
 */

/**
 * Convert a Cloudinary URL to a proxied URL through Next.js
 * @param cloudinaryUrl The original Cloudinary URL
 * @returns A proxied URL that goes through Next.js to avoid CORS issues
 */
export const proxyCloudinaryUrl = (cloudinaryUrl: string): string => {
  // URL processing
  
  // If it's already a proxied URL, return as is
  if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string') {
    // Invalid URL, returning placeholder
    return '/images/placeholder-image-new.png';
  }
  
  // Handle app-relative post detail URLs only (avoid matching Cloudinary folder names)
  if (cloudinaryUrl.startsWith('/post/')) {
    console.log('App post detail URL detected, returning placeholder:', cloudinaryUrl);
    return '/images/placeholder-image-new.png';
  }
  
  // Handle known missing files
  if (
    cloudinaryUrl.includes('file_1760168733155_lfhjq4ik7ht') ||
    cloudinaryUrl.includes('file_1760263843073_w13593s5t8l') ||
    cloudinaryUrl.includes('file_1760276276250_3pqeekj048s')
    // Remove file_1760163879851_tt3fdqqim9 as it appears to be a valid file
    // cloudinaryUrl.includes('file_1760163879851_tt3fdqqim9') ||
    // Add pattern to detect truncated URLs that end with partial file names
    // But be more specific to avoid false positives
    // (cloudinaryUrl.includes('file_') && cloudinaryUrl.length < 100 && !cloudinaryUrl.includes('.'))
  ) {
    console.log('Known missing file detected, returning placeholder:', cloudinaryUrl);
    return '/images/placeholder-image-new.png';
  }
  
  if (cloudinaryUrl.startsWith('/cloudinary/') || cloudinaryUrl.startsWith('/uploads/')) {
    console.log('URL is already proxied, returning as is:', cloudinaryUrl);
    return cloudinaryUrl;
  }
  
  // If it's a Cloudinary URL, proxy it
  if (cloudinaryUrl.includes('res.cloudinary.com')) {
    // Extract the path after the domain
    try {
      const urlObj = new URL(cloudinaryUrl);
      const path = urlObj.pathname + urlObj.search;
      const proxiedUrl = `/cloudinary${path}`;
      console.log('Proxied Cloudinary URL:', proxiedUrl);
      return proxiedUrl;
    } catch (error) {
      console.error('Failed to parse Cloudinary URL:', cloudinaryUrl, error);
      return '/images/placeholder-image-new.png';
    }
  }
  
  // If it's a local upload URL from the backend (port 8000), convert to relative path
  if (cloudinaryUrl.includes('localhost:8000/uploads/')) {
    // Extract the path after /uploads/
    try {
      const path = cloudinaryUrl.split('/uploads/')[1];
      const cleanPath = `/uploads/${path}`;
      console.log('✅ Proxied backend upload URL:', cleanPath);
      return cleanPath;
    } catch (e) {
      console.error('Failed to parse localhost URL:', cloudinaryUrl, e);
      // Fallback to URL as is
      return cloudinaryUrl;
    }
  }
  
  // Handle localhost URLs that don't have the full domain but have uploads path
  if (cloudinaryUrl.includes('/uploads/')) {
    // Check if it's already a relative path
    if (cloudinaryUrl.startsWith('/uploads/')) {
      console.log('✅ Local upload URL (already relative):', cloudinaryUrl);
      return cloudinaryUrl;
    }
    
    // Handle full URLs with uploads path
    if (cloudinaryUrl.startsWith('http')) {
      try {
        // Extract the path after /uploads/
        const path = cloudinaryUrl.split('/uploads/')[1];
        const cleanPath = `/uploads/${path}`;
        console.log('✅ Proxied backend upload URL:', cleanPath);
        return cleanPath;
      } catch (e) {
        // If it's not a valid URL, handle as relative path
        const pathAfterUploads = cloudinaryUrl.split('/uploads/')[1];
        const cleanPath = `/uploads/${pathAfterUploads}`;
        console.log('✅ Proxied backend upload URL (split):', cleanPath);
        return cleanPath;
      }
    } else {
      // It's already a relative path
      console.log('✅ URL is already a relative path:', cloudinaryUrl);
      return cloudinaryUrl;
    }
  }
  
  // Convert HTTP to HTTPS for secure connections (except localhost)
  if (cloudinaryUrl.startsWith('http://') && !cloudinaryUrl.includes('localhost:')) {
    cloudinaryUrl = cloudinaryUrl.replace('http://', 'https://');
  }
  
  // For non-Cloudinary URLs, return as is
  console.log('Non-Cloudinary URL, returning as is:', cloudinaryUrl);
  return cloudinaryUrl;
};