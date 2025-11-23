import React from 'react';
import { Box, Typography, Stack, useTheme } from '@mui/material';
import { Verified } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import UserAvatar from './UserAvatar';

interface PostAuthorProps {
  author: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    isVerified?: boolean;
  };
  createdAt: string;
  size?: 'small' | 'medium' | 'large';
  showRole?: boolean;
  onAuthorClick?: () => void;
  sx?: any;
}

const PostAuthor: React.FC<PostAuthorProps> = ({
  author,
  createdAt,
  size = 'medium',
  showRole = false,
  onAuthorClick,
  sx,
}) => {
  const theme = useTheme();

  // Safely format the date with error handling
  const timeAgo = (() => {
    try {
      // Check if createdAt is a valid string
      if (!createdAt) {
        return 'Unknown time';
      }
      
      // Try to create a Date object
      const date = new Date(createdAt);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // Format the date
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      // Return a fallback if any error occurs
      return 'Unknown time';
    }
  })();

  // Safely handle author properties
  const safeAuthor = author || {};
  const authorAvatar = safeAuthor.avatar || '';
  const authorDisplayName = safeAuthor.displayName || 'Unknown User';
  const authorUsername = safeAuthor.username || 'unknown';
  const authorIsVerified = safeAuthor.isVerified || false;

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={sx}>
      <UserAvatar
        src={authorAvatar}
        alt={authorDisplayName}
        size={size}
        isVerified={authorIsVerified}
        onClick={onAuthorClick}
      />
      
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{
              cursor: onAuthorClick ? 'pointer' : 'default',
              '&:hover': onAuthorClick ? {
                color: theme.palette.primary.main
              } : undefined,
            }}
            onClick={onAuthorClick}
          >
            {authorDisplayName}
          </Typography>
          
          {authorIsVerified && (
            <Verified 
              size={16} 
              style={{ color: theme.palette.primary.main }} 
            />
          )}
        </Stack>
        
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" color="text.secondary">
            @{authorUsername}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            •
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {timeAgo}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
};

export default PostAuthor;