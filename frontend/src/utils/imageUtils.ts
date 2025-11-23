// Image utility functions for fallbacks and placeholders

/**
 * Generate a solid color data URL
 */
export const generateSolidColorDataUrl = (
  width: number = 800,
  height: number = 600,
  color: string = '#0ea5e9'
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/png');
};

/**
 * Generate a gradient data URL
 */
export const generateGradientDataUrl = (
  width: number = 800,
  height: number = 600,
  color1: string = '#0ea5e9',
  color2: string = '#d946ef'
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/png');
};

/**
 * Generate a text placeholder data URL
 */
export const generateTextPlaceholderDataUrl = (
  width: number = 800,
  height: number = 600,
  text: string = 'Image',
  backgroundColor: string = '#f3f4f6',
  textColor: string = '#6b7280'
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  
  // Text
  ctx.fillStyle = textColor;
  ctx.font = `${Math.min(width, height) / 10}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  
  return canvas.toDataURL('image/png');
};

/**
 * Fallback image URLs that work reliably
 */
export const FALLBACK_IMAGES = {
  // Reliable placeholder services
  picsum: (width: number = 800, height: number = 600) => 
    `https://picsum.photos/${width}/${height}`,
  
  // Data URL fallbacks (always work)
  solidColor: (width: number = 800, height: number = 600, color: string = '#0ea5e9') => {
    if (typeof window === 'undefined') {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${color}"/>
        </svg>
      `)}`;
    }
    return generateSolidColorDataUrl(width, height, color);
  },
  
  gradient: (width: number = 800, height: number = 600) => {
    if (typeof window === 'undefined') {
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#0ea5e9;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#d946ef;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad)"/>
        </svg>
      `)}`;
    }
    return generateGradientDataUrl(width, height);
  },
  
  textPlaceholder: (width: number = 800, height: number = 600, text: string = 'Image') => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" font-family="Arial" font-size="${Math.min(width, height) / 10}" 
              fill="#6b7280" text-anchor="middle" dominant-baseline="middle">${text}</text>
      </svg>
    `)}`;
  }
};

/**
 * Get a reliable fallback image URL
 */
export const getReliablePlaceholder = (
  width: number = 800,
  height: number = 600,
  type: 'solid' | 'gradient' | 'text' = 'gradient',
  text?: string
): string => {
  try {
    switch (type) {
      case 'solid':
        return FALLBACK_IMAGES.solidColor(width, height);
      case 'text':
        return FALLBACK_IMAGES.textPlaceholder(width, height, text || 'Image');
      case 'gradient':
      default:
        return FALLBACK_IMAGES.gradient(width, height);
    }
  } catch (error) {
    console.warn('Failed to generate placeholder image:', error);
    // Ultimate fallback - a simple SVG
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#e5e7eb"/>
        <text x="50%" y="50%" font-family="Arial" font-size="16" 
              fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">Image</text>
      </svg>
    `)}`;
  }
};

/**
 * Image component with automatic fallback
 */
export const createImageWithFallback = (
  src: string,
  fallbackType: 'solid' | 'gradient' | 'text' = 'gradient',
  width: number = 800,
  height: number = 600
) => {
  const fallbackSrc = getReliablePlaceholder(width, height, fallbackType);
  
  return {
    src,
    fallbackSrc,
    onError: (event: Event) => {
      const img = event.target as HTMLImageElement;
      if (img.src !== fallbackSrc) {
        img.src = fallbackSrc;
      }
    }
  };
};
