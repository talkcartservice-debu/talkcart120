// Enhanced URL validation and normalization utility
export const isValidUrl = (urlString: string): boolean => {
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

// Enhanced URL normalization with comprehensive fix for duplicate paths and missing extensions
export const normalizeMediaUrl = (urlString: string, resourceType?: string): string | null => {
  try {
    console.log('🔧 normalizeMediaUrl called with:', { urlString, resourceType });
    
    if (!urlString) {
      console.log('❌ No URL string provided');
      return null;
    }
    
    // Fix for malformed Cloudinary URLs that are missing the protocol and domain
    // Handle cases like: cloudinary/dftpdqd4k/image/upload/talkcart/filename.jpg
    if (urlString.startsWith('cloudinary/') && urlString.includes('talkcart/')) {
      console.log('🔧 Fixing malformed Cloudinary URL:', urlString);
      const fixedUrl = `https://res.cloudinary.com/${urlString}`;
      console.log('✅ Fixed Cloudinary URL:', fixedUrl);
      return normalizeMediaUrl(fixedUrl, resourceType); // Recursively normalize the fixed URL
    }
    
    // Don't normalize localhost URLs - they should remain as-is, but ensure they're valid
    if (urlString.includes('localhost:') || urlString.includes('127.0.0.1')) {
      console.log('🔧 Localhost URL detected:', urlString);
      let normalizedUrl = urlString;
      
      // Fix duplicate talkcart path issue even for localhost URLs
      if (normalizedUrl.includes('/uploads/talkcart/talkcart/')) {
        console.log('🔧 Fixing duplicate talkcart path in localhost URL:', normalizedUrl);
        normalizedUrl = normalizedUrl.replace(/\/uploads\/talkcart\/talkcart\//g, '/uploads/talkcart/');
        console.log('✅ Fixed localhost URL:', normalizedUrl);
      }
      
      // For localhost URLs, we should ensure they're properly formatted
      // but not add extensions if they already have them
      if (resourceType === 'image' && !normalizedUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
        // Only add extension if it's clearly missing and we can determine the type
        // This is a more conservative approach
        console.log('🔧 Image URL might be missing extension, but not adding automatically');
      } else if (resourceType === 'video' && !normalizedUrl.match(/\.(mp4|mov|webm|ogg|avi|mkv|flv|wmv)$/i)) {
        // Only add extension if it's clearly missing and we can determine the type
        console.log('🔧 Video URL might be missing extension, but not adding automatically');
      }
      
      // Add a cache-busting parameter for localhost URLs in development
      if (process.env.NODE_ENV === 'development' && !normalizedUrl.includes('?')) {
        normalizedUrl += `?v=${Date.now()}`;
        console.log('🔧 Added cache-busting parameter to localhost URL:', normalizedUrl);
      }
      
      return normalizedUrl;
    }
    
    // Special handling for Cloudinary URLs - preserve them as they are likely correct
    if (urlString.includes('cloudinary.com')) {
      console.log('🔧 Processing Cloudinary URL - preserving original');
      let normalizedUrl = urlString;
      
      // Use Next.js proxy for Cloudinary URLs to avoid CORS issues
      // Convert https://res.cloudinary.com/... to /cloudinary/...
      if (normalizedUrl.startsWith('https://res.cloudinary.com/')) {
        normalizedUrl = normalizedUrl.replace('https://res.cloudinary.com/', '/cloudinary/');
        console.log('🔧 Using Next.js Cloudinary proxy:', normalizedUrl);
        return normalizedUrl;
      }
      
      // Fix duplicate talkcart path issue in Cloudinary URLs
      if (normalizedUrl.includes('/talkcart/talkcart/')) {
        console.log('🔧 Fixing duplicate talkcart path in Cloudinary URL:', normalizedUrl);
        normalizedUrl = normalizedUrl.replace(/\/talkcart\/talkcart\//g, '/talkcart/');
        console.log('✅ Fixed Cloudinary URL:', normalizedUrl);
      }
      
      // Handle specific Cloudinary transformation patterns that might cause issues
      // Pattern: /c_fill,h_300,w_400/q_auto/v1/
      if (normalizedUrl.includes('/c_fill,h_300,w_400/q_auto/v1/')) {
        console.log('🔧 Detected problematic Cloudinary transformation pattern');
        // Try a simpler version without the transformations
        const simplifiedUrl = normalizedUrl.replace('/c_fill,h_300,w_400/q_auto/v1/', '/v1/');
        console.log('🔧 Simplified Cloudinary URL:', simplifiedUrl);
        normalizedUrl = simplifiedUrl;
      }
      
      // Remove problematic transformations that might cause 404 errors
      // Remove c_fill,h_300,w_400 transformation
      if (normalizedUrl.includes('/c_fill,h_300,w_400/')) {
        normalizedUrl = normalizedUrl.replace('/c_fill,h_300,w_400/', '/');
        console.log('🔧 Removed c_fill transformation:', normalizedUrl);
      }
      
      // Remove q_auto transformation
      if (normalizedUrl.includes('/q_auto/')) {
        normalizedUrl = normalizedUrl.replace('/q_auto/', '/');
        console.log('🔧 Removed q_auto transformation:', normalizedUrl);
      }
      
      // Remove f_auto transformation
      if (normalizedUrl.includes('/f_auto/')) {
        normalizedUrl = normalizedUrl.replace('/f_auto/', '/');
        console.log('🔧 Removed f_auto transformation:', normalizedUrl);
      }
      
      // Validate that the Cloudinary URL structure is correct
      // Should be: cloudinary.com/{cloud_name}/{resource_type}/upload/.../{version}/{public_id}.{extension}
      const cloudinaryPattern = /https:\/\/res\.cloudinary\.com\/[^\/]+\/(image|video)\/upload\/(.+)/;
      const match = normalizedUrl.match(cloudinaryPattern);
      
      if (!match) {
        console.warn('⚠️ Cloudinary URL may be malformed:', normalizedUrl);
        // Try to fix common issues
        if (!normalizedUrl.includes('/upload/')) {
          // Try to insert /upload/ if missing
          const parts = normalizedUrl.split('cloudinary.com/');
          if (parts.length === 2) {
            const domainAndCloud = parts[0] + 'cloudinary.com/';
            const path = parts[1];
            normalizedUrl = domainAndCloud + 'image/upload/' + path;
            console.log('🔧 Attempted to fix Cloudinary URL:', normalizedUrl);
          }
        }
      }
      
      // Make sure we're using the proxy URL
      if (normalizedUrl.startsWith('https://res.cloudinary.com/')) {
        normalizedUrl = normalizedUrl.replace('https://res.cloudinary.com/', '/cloudinary/');
        console.log('🔧 Converted to proxy URL:', normalizedUrl);
      }
      
      console.log('✅ Normalized Cloudinary URL:', { original: urlString, normalized: normalizedUrl, resourceType });
      return normalizedUrl;
    }
    
    // Handle already valid absolute URLs (but not Cloudinary or localhost)
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
        const isImageResource = resourceType === 'image';
        
        // For video resources or URLs that look like they should be videos, ensure .mp4 extension
        if (isVideoResource && !hasExtension) {
          normalizedUrl += '.mp4';
        } else if (isImageResource && !hasExtension) {
          // For image resources, try to determine appropriate extension
          normalizedUrl += '.png'; // Default to png for images
        } else if (!hasExtension) {
          // Check if it's missing an extension and try to add appropriate extension
          const isVideo = normalizedUrl.includes('video') || normalizedUrl.includes('mp4') || normalizedUrl.includes('mov') || normalizedUrl.includes('webm') || normalizedUrl.includes('ogg');
          if (isVideo && !normalizedUrl.endsWith('.mp4') && !normalizedUrl.endsWith('.mov') && !normalizedUrl.endsWith('.webm') && !normalizedUrl.endsWith('.ogg')) {
            normalizedUrl += '.mp4';
          }
        }
      }
      
      // Convert HTTP to HTTPS for secure connections
      if (normalizedUrl.startsWith('http://') && !normalizedUrl.includes('localhost:')) {
        normalizedUrl = normalizedUrl.replace('http://', 'https://');
      }
      
      console.log('✅ Normalized absolute URL:', { original: urlString, normalized: normalizedUrl, resourceType });
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
        
        console.log('🔧 Constructed absolute URL from relative:', { original: urlString, absolute: normalizedUrl, baseUrl, resourceType });
        
        // Fix for missing file extensions in local URLs
        if (normalizedUrl.includes('localhost:')) {
          const hasExtension = normalizedUrl.includes('.');
          const isVideoResource = resourceType === 'video';
          const isImageResource = resourceType === 'image';
          
          // For video resources or URLs that look like they should be videos, ensure .mp4 extension
          if (isVideoResource && !hasExtension) {
            normalizedUrl += '.mp4';
          } else if (isImageResource && !hasExtension) {
            // For image resources, try to determine appropriate extension
            normalizedUrl += '.png'; // Default to png for images
          } else if (!hasExtension) {
            // Check if it's missing an extension and try to add appropriate extension
            const isVideo = normalizedUrl.includes('video') || normalizedUrl.includes('mp4') || normalizedUrl.includes('mov') || normalizedUrl.includes('webm') || normalizedUrl.includes('ogg');
            if (isVideo && !normalizedUrl.endsWith('.mp4') && !normalizedUrl.endsWith('.mov') && !normalizedUrl.endsWith('.webm') && !normalizedUrl.endsWith('.ogg')) {
              normalizedUrl += '.mp4';
            }
          }
        }
        
        // Convert HTTP to HTTPS for secure connections (except localhost)
        if (normalizedUrl.startsWith('http://') && !normalizedUrl.includes('localhost:')) {
          normalizedUrl = normalizedUrl.replace('http://', 'https://');
        }
      }
      console.log('✅ Normalized relative URL:', { original: urlString, normalized: normalizedUrl, resourceType });
      return normalizedUrl;
    }
    
    // If it's not an absolute or relative URL, but looks like it might be a filename, try to construct a proper URL
    if (urlString.includes('.') && !urlString.includes('://')) {
      console.log('🔧 Treating as filename, constructing URL:', urlString);
      const isDev = process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? 'http://localhost:8000' : (typeof window !== 'undefined' ? window.location.origin.replace('http://', 'https://') : 'https://yourdomain.com');
      
      if (baseUrl) {
        let normalizedUrl = `${baseUrl}/uploads/${urlString}`;
        console.log('✅ Constructed URL from filename:', { original: urlString, constructed: normalizedUrl });
        return normalizedUrl;
      }
    }
    
    console.log('❌ Unable to normalize URL:', { original: urlString, resourceType });
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

// Check if this is a known missing file
export const isKnownMissingFile = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  // Specific known missing files
  const knownMissingFiles = [
    'file_1760168733155_lfhjq4ik7ht',
    'file_1760163879851_tt3fdqqim9',
    'file_1760263843073_w13593s5t8l',
    'file_1760276276250_3pqeekj048s',
    // Add the new missing files
    'file_1762523155004_4r2ndcb9o6.mp4',
    'file_1762529225547_3uzoa3u7b7o.jpg'
  ];
  
  // Check for specific known missing files
  for (const missingFile of knownMissingFiles) {
    if (url.includes(missingFile)) {
      return true;
    }
  }
  
  // Pattern matching for missing files (more specific to avoid false positives)
  const fileName = url.split('/').pop() || '';
  if (fileName) {
    // Only match files that follow the exact pattern: file_number_alphanumeric.extension
    // But be more restrictive to avoid matching valid files
    const missingFilePatterns = [
      /^file_\d+_[a-z0-9]+\.mp4$/,
      /^file_\d+_[a-z0-9]+\.png$/,
      /^file_\d+_[a-z0-9]+\.jpg$/,
      /^file_\d+_[a-z0-9]+\.jpeg$/
    ];
    
    for (const pattern of missingFilePatterns) {
      if (pattern.test(fileName)) {
        // Additional check to avoid false positives
        // Only consider it missing if it's not a known valid file
        const validFilePatterns = [
          'file_1760473798652_vm6onvgccj',
          'file_1761368048641_1k74ki3krib',
          'file_1761372008196_1sx2wn6cuoc'
        ];
        
        // If it matches a valid file pattern, don't consider it missing
        for (const validPattern of validFilePatterns) {
          if (fileName.includes(validPattern)) {
            return false;
          }
        }
        
        return true;
      }
    }
  }
  
  return false;
};

// Enhanced function to check if a URL is likely to be a video
export const isLikelyVideoUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check for common video file extensions
  const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.avi', '.mkv', '.flv', '.wmv'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

// Enhanced function to check if a URL is likely to be an image
export const isLikelyImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check for common image file extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  return imageExtensions.some(ext => url.toLowerCase().includes(ext));
};

export default {
  isValidUrl,
  normalizeMediaUrl,
  isKnownMissingFile,
  isLikelyVideoUrl,
  isLikelyImageUrl
};