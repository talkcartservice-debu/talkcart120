import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { Video, Play } from 'lucide-react';
import { normalizeMediaUrl } from '../../utils/mediaUtils';

// Types
interface VideoMediaProps {
  src: string;
  poster?: string;
  alt?: string;
  maxHeight?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const UnifiedVideoMedia: React.FC<VideoMediaProps> = ({ 
  src, 
  poster, 
  alt = 'Video content', 
  maxHeight = '400px',
  className,
  style 
}) => {
  const [error, setError] = useState(false);
  const [finalSrc, setFinalSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Use source URL directly for Cloudinary URLs, normalize others
  const normalizedSrc = src ? (
    src.includes('cloudinary.com') ? src : (normalizeMediaUrl(src, 'video') || src)
  ) : null;

  // Set the final source when normalizedSrc changes
  useEffect(() => {
    if (normalizedSrc) {
      setFinalSrc(normalizedSrc);
    } else if (src) {
      setFinalSrc(src);
    } else {
      setError(true);
    }
    setLoading(false);
  }, [normalizedSrc, src]);

  // Handle video loading errors
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.warn('❌ Video loading failed:', {
      finalSrc: finalSrc || 'undefined',
      videoSrc: (e.target as HTMLVideoElement).src
    });
    
    const videoElement = e.target as HTMLVideoElement;
    
    // Check if this is a 404 error (network state 3 = NETWORK_NO_SOURCE)
    if (videoElement.networkState === 3) {
      console.log('❌ Video not found (404), trying fallback options');
      
      // If we have a localhost URL that failed, and the videoSrc shows a Cloudinary URL,
      // it means the normalization converted it incorrectly. Try the original src.
      if (finalSrc && finalSrc.includes('localhost:') && 
          videoElement.src.includes('cloudinary.com')) {
        console.log('🔧 Localhost URL was converted to Cloudinary incorrectly, trying original src:', src);
        if (src && src !== finalSrc) {
          setFinalSrc(src);
          setRetryCount(prev => prev + 1);
          return;
        }
      }
      
      // For Cloudinary URLs with transformations, try alternatives
      if (finalSrc && finalSrc.includes('cloudinary.com')) {
        // Try removing transformations
        let alternativeUrl = finalSrc;
        
        // Remove c_fill,h_300,w_400 transformation
        if (alternativeUrl.includes('/c_fill,h_300,w_400/')) {
          alternativeUrl = alternativeUrl.replace('/c_fill,h_300,w_400/', '/');
          console.log('🔧 Trying alternative Cloudinary URL:', alternativeUrl);
          setFinalSrc(alternativeUrl);
          setRetryCount(prev => prev + 1);
          return;
        }
        
        // Remove q_auto transformation
        if (alternativeUrl.includes('/q_auto/')) {
          alternativeUrl = alternativeUrl.replace('/q_auto/', '/');
          console.log('🔧 Trying alternative Cloudinary URL without q_auto:', alternativeUrl);
          setFinalSrc(alternativeUrl);
          setRetryCount(prev => prev + 1);
          return;
        }
        
        // Remove both transformations if they exist together
        if (finalSrc.includes('/c_fill,h_300,w_400/q_auto/')) {
          alternativeUrl = finalSrc.replace('/c_fill,h_300,w_400/q_auto/', '/');
          console.log('🔧 Trying alternative Cloudinary URL without transformations:', alternativeUrl);
          setFinalSrc(alternativeUrl);
          setRetryCount(prev => prev + 1);
          return;
        }
      }
      
      // If we've tried a few times and still failing, try a placeholder
      if (retryCount > 5) {
        console.log('❌ Too many retries, showing placeholder');
        setError(true);
        return;
      }
    }
    
    // Show error state
    setError(true);
  };

  // Handle video loading success
  const handleVideoLoad = () => {
    console.log('✅ Video loaded successfully:', finalSrc || 'undefined');
    setLoading(false);
  };

  // Show error placeholder
  if (error || !finalSrc) {
    return (
      <Box 
        className={className}
        sx={{ 
          width: '100%', 
          height: 150,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: 'rgba(0, 0, 0, 0.05)',
          borderRadius: 1,
          position: 'relative',
          ...style
        }}
      >
        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
          <Video size={24} />
          <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem' }}>
            Video content
          </Typography>
        </Box>
        <Box 
          sx={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '50%',
            p: 1
          }}
        >
          <Play size={20} color="white" />
        </Box>
      </Box>
    );
  }

  // Render the video
  return (
    <Box 
      className={className}
      sx={{ 
        position: 'relative', 
        width: '100%', 
        backgroundColor: 'black',
        ...style
      }}
    >
      <video
        ref={videoRef}
        src={finalSrc}
        controls
        style={{ 
          width: '100%', 
          display: 'block', 
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
          backgroundColor: 'black'
        }}
        poster={poster}
        onError={handleVideoError}
        onLoadedData={handleVideoLoad}
      />
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
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem' }}>
            Loading video...
          </Typography>
        </Box>
      )}
    </Box>
  );
};
export default UnifiedVideoMedia;