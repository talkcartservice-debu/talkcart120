import React from 'react';
import { Typography, Box, Chip } from '@mui/material';
import { Clock, Eye, EyeOff } from 'lucide-react';
import { useSafePresence } from '@/contexts/PresenceContext';
import { useAuth } from '@/contexts/AuthContext';

interface LastSeenDisplayProps {
  userId: string;
  variant?: 'text' | 'chip' | 'inline';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  fallbackText?: string;
}

export const LastSeenDisplay: React.FC<LastSeenDisplayProps> = ({
  userId,
  variant = 'text',
  size = 'medium',
  showIcon = true,
  fallbackText = 'Last seen unknown'
}) => {
  const presenceContext = useSafePresence();
  const { user } = useAuth();

  // Check if we can show this user's last seen based on their privacy settings
  const canShowLastSeen = presenceContext?.canShowUserLastSeen(userId) ?? false;
  const isUserOnline = presenceContext?.isUserOnline(userId) ?? false;
  const lastSeenDate = presenceContext?.getUserLastSeen(userId);
  const isOwnUser = userId === user?.id;

  // Don't show anything if privacy doesn't allow it
  if (!canShowLastSeen && !isOwnUser) {
    return null;
  }

  // Format the last seen time
  const formatLastSeen = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Determine what to display
  let displayText: string;
  let displayColor: 'success' | 'warning' | 'default' | 'secondary' = 'default';

  if (isUserOnline) {
    displayText = 'Online now';
    displayColor = 'success';
  } else if (lastSeenDate) {
    displayText = `Last seen ${formatLastSeen(lastSeenDate)}`;
    displayColor = 'secondary';
  } else {
    displayText = fallbackText;
    displayColor = 'default';
  }

  // Privacy indicator for own profile
  if (isOwnUser && !canShowLastSeen) {
    displayText = 'Last seen hidden (private)';
    displayColor = 'warning';
  }

  // Typography variant based on size
  const getTypographyVariant = () => {
    switch (size) {
      case 'small':
        return 'caption';
      case 'large':
        return 'body1';
      default:
        return 'body2';
    }
  };

  // Icon size based on size
  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 20;
      default:
        return 16;
    }
  };

  // Render based on variant
  switch (variant) {
    case 'chip':
      return (
        <Chip
          icon={showIcon ? <Clock size={14} /> : undefined}
          label={displayText}
          size={size === 'large' ? 'medium' : 'small'}
          color={displayColor}
          variant="outlined"
        />
      );

    case 'inline':
      return (
        <Box display="inline-flex" alignItems="center" gap={0.5}>
          {showIcon && <Clock size={getIconSize()} />}
          <Typography
            variant={getTypographyVariant()}
            color={displayColor === 'secondary' ? 'text.secondary' : `${displayColor}.main`}
            component="span"
          >
            {displayText}
          </Typography>
        </Box>
      );

    default: // 'text'
      return (
        <Box display="flex" alignItems="center" gap={1}>
          {showIcon && (
            <Clock 
              size={getIconSize()} 
              color={displayColor === 'success' ? '#4caf50' : '#666'} 
            />
          )}
          <Typography
            variant={getTypographyVariant()}
            color={displayColor === 'secondary' ? 'text.secondary' : `${displayColor}.main`}
          >
            {displayText}
          </Typography>
        </Box>
      );
  }
};

// Hook for getting last seen information
export const useLastSeen = (userId: string) => {
  const presenceContext = useSafePresence();
  const { user } = useAuth();

  const canShowLastSeen = presenceContext?.canShowUserLastSeen(userId) ?? false;
  const isUserOnline = presenceContext?.isUserOnline(userId) ?? false;
  const lastSeenDate = presenceContext?.getUserLastSeen(userId);
  const isOwnUser = userId === user?.id;

  return {
    canShowLastSeen: canShowLastSeen || isOwnUser,
    isUserOnline,
    lastSeenDate,
    isOwnUser,
    hasLastSeenData: !!lastSeenDate,
  };
};

export default LastSeenDisplay;
