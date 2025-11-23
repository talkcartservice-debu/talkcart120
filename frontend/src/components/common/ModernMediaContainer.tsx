import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Play, Volume2, VolumeX } from 'lucide-react';

interface ModernMediaContainerProps {
  children: React.ReactNode;
  type?: 'image' | 'video' | 'audio';
  variant?: 'standard' | 'elevated' | 'glass';
  showOverlay?: boolean;
  overlayContent?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const ModernMediaContainer: React.FC<ModernMediaContainerProps> = ({
  children,
  type = 'image',
  variant = 'standard',
  showOverlay = true,
  overlayContent,
  className = '',
  onClick,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          '&:hover': {
            transform: 'translateY(-8px) scale(1.02)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          },
        };
      case 'glass':
        return {
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: 'rgba(255,255,255,0.2)',
            transform: 'translateY(-2px)',
          },
        };
      default:
        return {
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            transform: 'translateY(-2px)',
          },
        };
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'video':
        return {
          background: 'linear-gradient(145deg, #000 0%, #1a1a1a 100%)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.1) 100%)',
            opacity: 0,
            transition: 'opacity 0.3s ease',
          },
          '&:hover::before': {
            opacity: 1,
          },
        };
      case 'audio':
        return {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        };
      default:
        return {};
    }
  };

  return (
    <Box
      className={`modern-media-container ${className}`}
      sx={{
        position: 'relative',
        borderRadius: 3,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...getVariantStyles(),
        ...getTypeStyles(),
      }}
      onClick={onClick}
    >
      {children}
      
      {showOverlay && (
        <Box
          className="media-overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: type === 'image' 
              ? 'linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)'
              : 'transparent',
            opacity: 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
            '.modern-media-container:hover &': {
              opacity: 1,
            },
          }}
        />
      )}

      {overlayContent && (
        <Box
          className="overlay-content"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            opacity: 0,
            transform: 'scale(0.9)',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            '.modern-media-container:hover &': {
              opacity: 1,
              transform: 'scale(1)',
            },
          }}
        >
          {overlayContent}
        </Box>
      )}
    </Box>
  );
};

export default ModernMediaContainer;