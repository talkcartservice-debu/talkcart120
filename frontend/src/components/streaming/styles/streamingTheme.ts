import { Theme, alpha } from '@mui/material/styles';
import { keyframes } from '@mui/system';

// Streaming-specific animations
export const streamingAnimations = {
  // Pulse animation for live indicators
  livePulse: keyframes`
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  `,

  // Bounce animation for interactions
  bounce: keyframes`
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  `,

  // Slide in from bottom (mobile drawer)
  slideUp: keyframes`
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  `,

  // Fade and scale for gift animations
  giftBurst: keyframes`
    0% {
      transform: scale(0) translateY(0);
      opacity: 0;
    }
    20% {
      transform: scale(1.2) translateY(-10px);
      opacity: 1;
    }
    80% {
      transform: scale(1) translateY(-50px);
      opacity: 1;
    }
    100% {
      transform: scale(0.8) translateY(-80px);
      opacity: 0;
    }
  `,

  // Heart float animation
  heartFloat: keyframes`
    0% {
      transform: translateY(0) scale(0);
      opacity: 0;
    }
    15% {
      transform: translateY(-10px) scale(1);
      opacity: 1;
    }
    100% {
      transform: translateY(-100px) scale(0.5);
      opacity: 0;
    }
  `,

  // Shimmer effect for loading
  shimmer: keyframes`
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  `,

  // Wiggle animation for notifications
  wiggle: keyframes`
    0%, 7% {
      transform: rotateZ(0);
    }
    15% {
      transform: rotateZ(-15deg);
    }
    20% {
      transform: rotateZ(10deg);
    }
    25% {
      transform: rotateZ(-10deg);
    }
    30% {
      transform: rotateZ(6deg);
    }
    35% {
      transform: rotateZ(-4deg);
    }
    40%, 100% {
      transform: rotateZ(0);
    }
  `,
};

// Streaming-specific theme extensions
export const createStreamingTheme = (theme: Theme) => ({
  // Color palette for streaming
  streaming: {
    live: {
      primary: '#ff4444',
      secondary: '#ff6b6b',
      background: alpha('#ff4444', 0.1),
    },
    viewer: {
      primary: theme.palette.primary.main,
      secondary: theme.palette.primary.light,
      background: alpha(theme.palette.primary.main, 0.05),
    },
    chat: {
      background: theme.palette.mode === 'dark' 
        ? alpha(theme.palette.background.paper, 0.95)
        : alpha(theme.palette.background.paper, 0.98),
      message: theme.palette.mode === 'dark'
        ? alpha(theme.palette.background.default, 0.3)
        : alpha(theme.palette.grey[100], 0.8),
      streamer: alpha(theme.palette.warning.main, 0.1),
      moderator: alpha(theme.palette.info.main, 0.1),
      gift: alpha(theme.palette.success.main, 0.1),
    },
    quality: {
      excellent: theme.palette.success.main,
      good: theme.palette.warning.main,
      poor: theme.palette.error.main,
    },
    glow: {
      primary: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`,
      live: `0 0 20px ${alpha('#ff4444', 0.4)}`,
      success: `0 0 15px ${alpha(theme.palette.success.main, 0.3)}`,
    },
  },

  // Enhanced shadows
  shadows: {
    card: theme.palette.mode === 'dark'
      ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
      : '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
    player: theme.palette.mode === 'dark'
      ? '0 12px 48px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)'
      : '0 12px 48px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.06)',
    chat: theme.palette.mode === 'dark'
      ? '0 4px 16px rgba(0, 0, 0, 0.25)'
      : '0 4px 16px rgba(0, 0, 0, 0.05)',
    floating: theme.palette.mode === 'dark'
      ? '0 16px 64px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.3)'
      : '0 16px 64px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.08)',
  },

  // Glassmorphism effects
  glass: {
    light: {
      background: alpha('#ffffff', 0.1),
      backdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${alpha('#ffffff', 0.2)}`,
    },
    dark: {
      background: alpha('#000000', 0.2),
      backdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${alpha('#ffffff', 0.1)}`,
    },
    primary: {
      background: alpha(theme.palette.primary.main, 0.1),
      backdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  },

  // Gradient backgrounds
  gradients: {
    primary: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    secondary: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
    live: 'linear-gradient(135deg, #ff4444 0%, #cc1111 100%)',
    success: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
    warning: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
    error: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
    rainbow: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7)',
    night: theme.palette.mode === 'dark'
      ? 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
  },

  // Border radius system
  borderRadius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    pill: '100px',
    circle: '50%',
  },

  // Spacing system for streaming components
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },

  // Typography extensions
  typography: {
    live: {
      fontSize: '0.75rem',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    viewer: {
      fontSize: '0.875rem',
      fontWeight: 600,
    },
    metric: {
      fontSize: '1.5rem',
      fontWeight: 700,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 500,
      opacity: 0.7,
    },
  },

  // Component-specific mixins
  mixins: {
    liveBadge: {
      background: 'linear-gradient(135deg, #ff4444 0%, #cc1111 100%)',
      color: '#ffffff',
      fontWeight: 700,
      fontSize: '0.75rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      padding: '4px 12px',
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(255, 68, 68, 0.3)',
      animation: `${streamingAnimations.livePulse} 2s ease-in-out infinite`,
    },
    
    streamCard: {
      borderRadius: '16px',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 16px 48px rgba(0, 0, 0, 0.4)'
          : '0 16px 48px rgba(0, 0, 0, 0.1)',
      },
    },

    chatMessage: {
      borderRadius: '12px',
      padding: '8px 12px',
      margin: '2px 0',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: alpha(theme.palette.action.hover, 0.5),
      },
    },

    glowButton: {
      position: 'relative' as const,
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
        transition: 'left 0.6s',
      },
      '&:hover::before': {
        left: '100%',
      },
    },

    shimmerLoading: {
      background: `linear-gradient(90deg, ${alpha(theme.palette.grey[300], 0.2)} 25%, ${alpha(theme.palette.grey[300], 0.5)} 50%, ${alpha(theme.palette.grey[300], 0.2)} 75%)`,
      backgroundSize: '200px 100%',
      animation: `${streamingAnimations.shimmer} 1.5s infinite`,
    },
  },

  // Breakpoints for streaming components
  breakpoints: {
    streamPlayer: {
      mobile: '(max-width: 768px)',
      tablet: '(max-width: 1024px)',
      desktop: '(min-width: 1025px)',
    },
    chat: {
      collapsed: '(max-width: 600px)',
      expanded: '(min-width: 601px)',
    },
  },
});

// Helper functions for creating consistent styles
export const createStreamingStyles = (theme: Theme) => {
  const streamingTheme = createStreamingTheme(theme);
  
  return {
    // Live indicator component
    liveIndicator: (size: 'sm' | 'md' | 'lg' = 'md') => ({
      ...streamingTheme.mixins.liveBadge,
      fontSize: size === 'sm' ? '0.625rem' : size === 'lg' ? '0.875rem' : '0.75rem',
      padding: size === 'sm' ? '2px 8px' : size === 'lg' ? '6px 16px' : '4px 12px',
    }),

    // Stream card with hover effects
    streamCard: (featured = false) => ({
      ...streamingTheme.mixins.streamCard,
      ...(featured && {
        border: `2px solid ${theme.palette.primary.main}`,
        boxShadow: streamingTheme.streaming.glow.primary,
      }),
    }),

    // Chat message styling
    chatMessage: (type: 'normal' | 'streamer' | 'moderator' | 'gift' | 'system' = 'normal') => ({
      ...streamingTheme.mixins.chatMessage,
      backgroundColor: {
        normal: 'transparent',
        streamer: streamingTheme.streaming.chat.streamer,
        moderator: streamingTheme.streaming.chat.moderator,
        gift: streamingTheme.streaming.chat.gift,
        system: alpha(theme.palette.info.main, 0.05),
      }[type],
    }),

    // Quality indicator
    qualityIndicator: (quality: 'excellent' | 'good' | 'poor') => ({
      width: 12,
      height: 12,
      borderRadius: '50%',
      backgroundColor: streamingTheme.streaming.quality[quality],
      boxShadow: `0 0 8px ${alpha(streamingTheme.streaming.quality[quality], 0.4)}`,
    }),

    // Glassmorphism container
    glassContainer: (variant: 'light' | 'dark' | 'primary' = 'light') => ({
      ...streamingTheme.glass[variant],
      borderRadius: streamingTheme.borderRadius.lg,
    }),

    // Floating action button
    floatingButton: {
      position: 'fixed' as const,
      bottom: 24,
      right: 24,
      zIndex: 1000,
      boxShadow: streamingTheme.shadows.floating,
      '&:hover': {
        transform: 'scale(1.1)',
      },
    },
  };
};

export default createStreamingTheme;