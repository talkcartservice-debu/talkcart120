import React from 'react';
import UnifiedImageMedia from './UnifiedImageMedia';

// Types
interface OptimizedImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  retryAttempts?: number;
  retryDelay?: number;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt = 'Image', 
  width,
  height,
  fill = false,
  sizes,
  quality = 80,
  priority = false,
  className,
  style,
  onLoad,
  onError,
  retryAttempts = 3,
  retryDelay = 1000
}) => {
  // Convert props to match UnifiedImageMedia interface
  const maxHeight = height ? `${height}px` : '500px';
  
  // Handle fill prop by setting width and height to 100%
  const imageStyle = fill ? { 
    ...style, 
    width: '100%', 
    height: '100%',
    objectFit: 'cover' as const // Maintain aspect ratio while filling container
  } : { ...style };
  
  // Pass through the props that UnifiedImageMedia can handle
  return (
    <UnifiedImageMedia
      src={src}
      alt={alt}
      maxHeight={maxHeight}
      className={className}
      style={imageStyle}
      onLoad={onLoad}
      onError={onError}
    />
  );
};

export default OptimizedImage;