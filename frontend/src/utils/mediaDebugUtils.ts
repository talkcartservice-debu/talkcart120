/**
 * Media Debugging Utilities
 * 
 * Utility functions to help debug media loading issues
 */

/**
 * Check if a URL is valid and accessible
 * @param url The URL to check
 * @returns Promise that resolves to true if URL is accessible
 */
export const isUrlAccessible = async (url: string): Promise<boolean> => {
  try {
    if (!url) return false;
    
    // For data URLs, they're always accessible
    if (url.startsWith('data:')) return true;
    
    // For relative URLs, they should be accessible
    if (url.startsWith('/')) return true;
    
    // For absolute URLs, check if we can fetch them
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return response.ok || response.type === 'opaque';
  } catch (error) {
    console.warn('URL accessibility check failed:', url, error);
    return false;
  }
};

/**
 * Get detailed information about an image element
 * @param img The image element
 * @returns Object with detailed image information
 */
export const getImageInfo = (img: HTMLImageElement) => {
  return {
    src: img.src,
    alt: img.alt,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    width: img.width,
    height: img.height,
    complete: img.complete,
    currentSrc: img.currentSrc,
    hasAttribute: {
      src: img.hasAttribute('src'),
      alt: img.hasAttribute('alt'),
    },
    style: {
      display: img.style.display,
      visibility: img.style.visibility,
      opacity: img.style.opacity,
      backgroundColor: img.style.backgroundColor,
      objectFit: img.style.objectFit,
    },
    computedStyle: img.ownerDocument ? {
      display: getComputedStyle(img).display,
      visibility: getComputedStyle(img).visibility,
      opacity: getComputedStyle(img).opacity,
      backgroundColor: getComputedStyle(img).backgroundColor,
      objectFit: getComputedStyle(img).objectFit,
    } : null,
  };
};

/**
 * Debug media loading issues
 * @param mediaItem The media item from the post
 * @param mediaUrl The URL of the media
 */
export const debugMediaLoading = (mediaItem: any, mediaUrl: string) => {
  // Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    console.group('=== Media Debug Info ===');
    console.log('Media Item:', mediaItem);
    console.log('Media URL:', mediaUrl);
    console.log('Resource Type:', mediaItem?.resource_type);
    console.log('Valid URL:', !!mediaUrl && typeof mediaUrl === 'string' && mediaUrl.length > 0);
    
    // Check if URL contains common issues
    if (mediaUrl) {
      console.log('URL Issues:');
      if (mediaUrl.includes(' ')) console.log('- Contains spaces');
      if (mediaUrl.includes('\\')) console.log('- Contains backslashes');
      if (!mediaUrl.includes('://') && !mediaUrl.startsWith('/')) console.log('- Missing protocol or relative path');
    }
    
    console.groupEnd();
  }
};

/**
 * Create a test image to check if URLs are working
 * @param url The URL to test
 * @returns Promise that resolves with test results
 */
export const testImageUrl = (url: string): Promise<{success: boolean, error?: string, info?: any}> => {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ success: false, error: 'No URL provided' });
      return;
    }
    
    const img = new Image();
    
    img.onload = () => {
      resolve({
        success: true,
        info: {
          width: img.naturalWidth,
          height: img.naturalHeight,
        }
      });
    };
    
    img.onerror = (error) => {
      resolve({
        success: false,
        error: `Failed to load image: ${error}`,
        info: getImageInfo(img)
      });
    };
    
    // Set a reasonable timeout
    setTimeout(() => {
      resolve({
        success: false,
        error: 'Image loading timeout'
      });
    }, 10000);
    
    img.src = url;
  });
};