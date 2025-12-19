import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { Image as ImageIcon } from 'lucide-react';
import { normalizeMediaUrl, isKnownMissingFile } from '../../utils/mediaUtils';

// Types
interface ImageMediaProps {
  src: string;
  alt?: string;
  maxHeight?: string | number;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}

// Enhanced URL validation
const isValidUrl = (urlString: string): boolean => {
  try {
    if (!urlString) return false;
    
    // Handle Cloudinary URLs with special characters
    if (urlString.includes('cloudinary.com')) {
      return urlString.startsWith('http://') || urlString.startsWith('https://');
    }
    
    // Handle local development URLs
    if (urlString.includes('localhost:') || urlString.includes('127.0.0.1')) {
      return urlString.startsWith('http://') || urlString.startsWith('https://');
    }
    
    // More permissive validation - try to create URL object
    // If it fails, still allow the URL if it looks like a valid path
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      // If URL parsing fails, check if it's a relative path that might be valid
      if (urlString.startsWith('/')) {
        return true; // Allow relative paths
      }
      return false;
    }
  } catch (e) {
    return false;
  }
};

const UnifiedImageMedia: React.FC<ImageMediaProps> = ({ 
  src, 
  alt = 'Image content', 
  maxHeight = '400px',
  className,
  style,
  onLoad,
  onError
}) => {
  const [error, setError] = useState(false);
  const [finalSrc, setFinalSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0); // Add key for force re-rendering
  
  // Log incoming props
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ UnifiedImageMedia received props:', { src, alt, maxHeight, className });
    }
  }, [src, alt, maxHeight, className]);
  
  // Use source URL directly for Cloudinary URLs, normalize others
  const normalizedSrc = src ? (
    src.includes('cloudinary.com') ? src : (normalizeMediaUrl(src, 'image') || src)
  ) : null;
  
  // Special handling for localhost URLs to ensure they are valid
  useEffect(() => {
    if (src && (src.includes('localhost:') || src.includes('127.0.0.1'))) {
      // For localhost URLs, we should try to verify if the file actually exists
      // This is a development-only check
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Checking localhost image URL:', src);
      }
    }
  }, [src]);
  
  // Log normalized source
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ UnifiedImageMedia normalized source:', { src, normalizedSrc: normalizedSrc || 'null' });
    }
  }, [src, normalizedSrc]);

  // Validate URL and check for missing files
  useEffect(() => {
    console.log('🖼️ useEffect triggered with:', { normalizedSrc, src });
    
    // Reset error state when source changes
    setError(false);
    
    // Check if this is a known missing file
    if (normalizedSrc && isKnownMissingFile(normalizedSrc)) {
      console.log('🔧 Detected known missing file, using placeholder directly');
      setFinalSrc('/images/placeholder-image-new.png');
      setLoading(false);
      return;
    }
    
    // Try to use the normalized source first
    if (normalizedSrc) {
      console.log('✅ Using normalized image URL:', normalizedSrc);
      setFinalSrc(normalizedSrc);
      
      // Add timeout fallback for image loading
      const loadingTimeout = setTimeout(() => {
        console.warn('⚠️ Image loading timeout - clearing loading state');
        setLoading(false);
      }, 5000); // 5 second timeout (shorter timeout for better UX)
      
      console.log('🖼️ Set loading timeout for normalized image:', { normalizedSrc, timeoutId: loadingTimeout });
      
      // Clean up timeout on component unmount or when source changes
      return () => clearTimeout(loadingTimeout);
    }
    
    // Fallback to original source if normalization failed
    if (src) {
      console.log('⚠️ Normalization failed, using original source:', src);
      setFinalSrc(src);
      
      // Add timeout fallback for image loading
      const loadingTimeout = setTimeout(() => {
        console.warn('⚠️ Image loading timeout - clearing loading state');
        setLoading(false);
      }, 5000); // 5 second timeout (shorter timeout for better UX)
      
      console.log('🖼️ Set loading timeout for original image:', { src, timeoutId: loadingTimeout });
      
      // Clean up timeout on component unmount or when source changes
      return () => clearTimeout(loadingTimeout);
    }
    
    // No valid source available
    console.log('❌ No valid image URL provided');
    setError(true);
    setLoading(false); // Ensure loading state is cleared
    
    // Return a cleanup function to satisfy React hooks requirements
    return () => {};
  }, [normalizedSrc, src, key]); // Add key to dependencies

  // Handle image loading success
  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully:', finalSrc || 'undefined');
    setLoading(false);
    console.log('🖼️ Cleared loading state after successful image load');
    onLoad?.();
  };
  
  // Handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn('❌ Image loading failed:', {
      normalizedSrc: normalizedSrc || 'undefined',
      finalSrc: finalSrc || 'undefined',
      errorEvent: e.type,
      imageSrc: (e.target as HTMLImageElement).src
    });
    
    console.log('🖼️ Handling image error for:', (e.target as HTMLImageElement).src);
    
    // Special handling for localhost URLs - try different approaches
    if (finalSrc && (finalSrc.includes('localhost:') || finalSrc.includes('127.0.0.1'))) {
      console.log('🔧 Handling localhost URL error, trying alternative approaches');
      const imgElement = e.target as HTMLImageElement;
      
      // First, try with https instead of http
      if (finalSrc.startsWith('http://localhost')) {
        const httpsUrl = finalSrc.replace('http://', 'https://');
        console.log('🔧 Trying HTTPS version:', httpsUrl);
        imgElement.src = httpsUrl;
        return;
      }
      
      // If that fails, try a different port
      if (finalSrc.includes('localhost:8000')) {
        const altPortUrl = finalSrc.replace('localhost:8000', 'localhost:3000');
        console.log('🔧 Trying alternative port:', altPortUrl);
        imgElement.src = altPortUrl;
        return;
      }
      
      // Try adding a cache-busting parameter
      if (finalSrc === (e.target as HTMLImageElement).src) {
        const cacheBustedUrl = `${finalSrc}?t=${Date.now()}`;
        console.log('🔧 Trying cache-busted URL:', cacheBustedUrl);
        imgElement.src = cacheBustedUrl;
        return;
      }
      
      // If original source is different from final source, try that
      if (src && src !== finalSrc) {
        console.log('🔧 Trying original source:', src);
        imgElement.src = src;
        return;
      }
    }
    
    // Special handling for Cloudinary URLs - try without transformations
    if (finalSrc && finalSrc.includes('cloudinary.com')) {
      console.log('🔧 Handling Cloudinary URL error, trying simplified version');
      const imgElement = e.target as HTMLImageElement;
      
      // Make sure we're using the proxy URL
      if (finalSrc.startsWith('https://res.cloudinary.com/')) {
        const proxyUrl = finalSrc.replace('https://res.cloudinary.com/', '/cloudinary/');
        console.log('🔧 Converting to proxy URL:', proxyUrl);
        imgElement.src = proxyUrl;
        return;
      }
      
      // Try removing common Cloudinary transformations that might cause issues
      let simplifiedUrl = finalSrc;
      
      // Remove c_fill transformation
      simplifiedUrl = simplifiedUrl.replace(/\/c_fill[^\/]*/g, '');
      
      // Remove q_auto transformation
      simplifiedUrl = simplifiedUrl.replace(/\/q_auto[^\/]*/g, '');
      
      // Remove f_auto transformation
      simplifiedUrl = simplifiedUrl.replace(/\/f_auto[^\/]*/g, '');
      
      // Remove v1 transformation if it's causing issues
      simplifiedUrl = simplifiedUrl.replace(/\/v\d+\//g, '/v1/');
      
      // Clean up any double slashes that might have been created
      simplifiedUrl = simplifiedUrl.replace(/\/\//g, '/');
      simplifiedUrl = simplifiedUrl.replace('http:/', 'http://');
      simplifiedUrl = simplifiedUrl.replace('https:/', 'https://');
      
      if (simplifiedUrl !== finalSrc) {
        console.log('🔧 Trying simplified Cloudinary URL:', simplifiedUrl);
        imgElement.src = simplifiedUrl;
        return;
      }
    }
    
    // Try to load the original source directly if we have one
    if (src && src !== finalSrc) {
      console.log('🔧 Trying to load original source directly:', src);
      const imgElement = e.target as HTMLImageElement;
      imgElement.src = src;
      return;
    }
    
    // Try adding a cache-busting parameter to the original source
    if (src) {
      const cacheBustedUrl = `${src}?t=${Date.now()}`;
      console.log('🔧 Trying cache-busted original source:', cacheBustedUrl);
      const imgElement = e.target as HTMLImageElement;
      imgElement.src = cacheBustedUrl;
      return;
    }
    
    // Try a different placeholder image
    console.log('🔧 Trying alternative placeholder image');
    const imgElement = e.target as HTMLImageElement;
    // Try the new placeholder first
    if (!imgElement.src.includes('placeholder-image-new.png')) {
      imgElement.src = '/images/placeholder-image-new.png';
      return;
    }
    // If that fails, try the old placeholder
    else if (!imgElement.src.includes('placeholder-image.png')) {
      imgElement.src = '/images/placeholder-image.png';
      return;
    }
    
    // As a last resort, try to show a data URL placeholder
    try {
      const imgElement = e.target as HTMLImageElement;
      imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTkiPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
      return;
    } catch (fallbackError) {
      console.warn('❌ Even fallback image failed:', fallbackError);
    }
    
    // Set error state to show fallback UI
    console.log('🖼️ Setting error state and clearing loading state');
    setError(true);
    setLoading(false); // Ensure loading state is cleared even on error
    onError?.();
  };

  // Show error placeholder
  if (error || !normalizedSrc) {
    console.log('🖼️ Showing error placeholder for image');
    return (
      <Box 
        className={className}
        sx={{ 
          width: '100%', 
          height: '100%',
          minHeight: 200,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 1,
          ...style
        }}
        key={`error-${key}`}
      >
        <Box sx={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
          <ImageIcon size={48} style={{ marginBottom: 16 }} />
          <Typography variant="body2">Image unavailable</Typography>
        </Box>
      </Box>
    );
  }

  // If we have a final source, render the image
  if (finalSrc) {
    console.log('🖼️ Rendering image with src:', finalSrc);
    
    // Log detailed information about what we're about to render
    if (process.env.NODE_ENV === 'development') {
      console.log('🖼️ Image component details:', {
        finalSrc,
        alt,
        maxHeight,
        loading,
        error,
        srcType: typeof finalSrc,
        srcLength: finalSrc.length
      });
    }
    
    return (
      <Box 
        className={className}
        sx={{ 
          width: '100%',
          position: 'relative',
          minHeight: '50px', // Ensure minimum height
          ...style
        }}
        key={`image-${key}`}
      >
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          height: '100%'
        }}>
          <img
            key={`img-${key}`}
            src={finalSrc}
            alt={alt}
            loading="lazy"
            style={{ 
              width: '100%', 
              display: 'block', 
              maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight, 
              objectFit: 'cover', // Maintain aspect ratio while filling container
              minHeight: '50px'
            }}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        </Box>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.3)'
            }}
          >
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem' }}>
              Loading image...
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // Default fallback
  console.log('🖼️ Showing default fallback for image');
  return (
    <Box 
      className={className}
      sx={{ 
        width: '100%', 
        height: '100%',
        minHeight: 200,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 1,
        ...style
      }}
      key={`default-${key}`}
    >
      <Box sx={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' }}>
        <ImageIcon size={48} style={{ marginBottom: 16 }} />
        <Typography variant="body2">No image content</Typography>
      </Box>
    </Box>
  );
};

export default UnifiedImageMedia;