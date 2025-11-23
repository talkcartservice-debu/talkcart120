import React from 'react';
import { Avatar, Badge, useTheme } from '@mui/material';
import { Verified } from 'lucide-react';
import { DEFAULT_AVATAR_URL } from '@/config';

interface UserAvatarProps {
  src?: string;
  alt?: string;
  size?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | number;
  isVerified?: boolean;
  isOnline?: boolean;
  onClick?: () => void;
  sx?: any; // Allow custom sx props to override default sizing
  showBorder?: boolean;
  borderColor?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt,
  size = 'medium',
  isVerified = false,
  isOnline = false,
  onClick,
  sx,
  showBorder = false,
  borderColor,
}) => {
  const theme = useTheme();

  const sizeMap = {
    xsmall: { width: 24, height: 24 },
    small: { width: 32, height: 32 },
    medium: { width: 40, height: 40 },
    large: { width: 56, height: 56 },
    xlarge: { width: 80, height: 80 },
  };

  // Handle numeric size or predefined size
  const avatarSize = typeof size === 'number'
    ? { width: size, height: size }
    : sizeMap[size] || sizeMap.medium;

  // Better avatar URL resolution with fallback handling
  const resolvedSrc = React.useMemo(() => {
    if (!src || src.trim().length === 0) {
      return DEFAULT_AVATAR_URL;
    }

    // Handle relative URLs
    if (src.startsWith('/')) {
      return src;
    }

    // Handle data URLs (base64 images)
    if (src.startsWith('data:')) {
      return src;
    }

    // Handle full URLs (Cloudinary, etc.)
    if (src.startsWith('http')) {
      // Fix localhost:4000 URLs to use the correct default avatar path
      if (src.includes('localhost:4000/images/default-avatar.png')) {
        return DEFAULT_AVATAR_URL;
      }
      return src;
    }

    // Default fallback
    return DEFAULT_AVATAR_URL;
  }, [src]);

  const avatar = (
    <Avatar
      src={resolvedSrc}
      alt={alt}
      sx={{
        ...avatarSize,
        cursor: onClick ? 'pointer' : 'default',
        border: isVerified
          ? `2px solid ${theme.palette.primary.main}`
          : showBorder
            ? `2px solid ${borderColor || theme.palette.divider}`
            : 'none',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'scale(1.05)',
          boxShadow: theme.shadows[4],
        } : {},
        ...sx, // Allow custom sx to override defaults
      }}
      onClick={onClick}
      imgProps={{
        onError: (e: any) => {
          // Silently fallback to default avatar on error
          if (e.currentTarget.src !== DEFAULT_AVATAR_URL) {
            e.currentTarget.src = DEFAULT_AVATAR_URL;
          }
        },
        style: {
          objectFit: 'cover',
          objectPosition: 'center',
        }
      }}
      role="img"
      aria-label={alt ? `${alt}'s avatar` : "User avatar"}
    >
      {alt?.charAt(0)?.toUpperCase()}
    </Avatar>
  );

  if (isOnline) {
    return (
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        badgeContent={
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: theme.palette.success.main,
              border: `2px solid ${theme.palette.background.paper}`,
            }}
          />
        }
      >
        {avatar}
      </Badge>
    );
  }

  return avatar;
};

export default UserAvatar;