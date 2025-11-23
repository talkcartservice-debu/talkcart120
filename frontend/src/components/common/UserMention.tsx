import React, { useState } from 'react';
import {
  Box,
  Typography,
  Popover,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import { User, MapPin, Calendar, Users } from 'lucide-react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import UserAvatar from './UserAvatar';
import FollowButton from './FollowButton';
import { formatDistanceToNow } from 'date-fns';
import { User as UserType, ProfileUser } from '@/types';
import { ApiResponse } from '@/types/api';

// Define a type for the API response structure
interface UserApiResponse extends ApiResponse<UserType> {
  data: UserType;
  user?: UserType;
}

interface UserMentionProps {
  username: string;
  displayText?: string;
  variant?: 'inline' | 'chip';
  showPopover?: boolean;
  context?: 'post' | 'comment' | 'video' | 'stream' | 'marketplace';
  className?: string;
}

/**
 * UserMention component that displays a clickable user mention
 * with optional popover showing user info and follow button
 */
export const UserMention: React.FC<UserMentionProps> = ({
  username,
  displayText,
  variant = 'inline',
  showPopover = true,
  context = 'post',
  className
}) => {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Fetch user data for popover
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-mention', username],
    queryFn: () => api.users.getByUsername(username),
    enabled: showPopover && popoverOpen,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fix the type error by properly accessing the user data
  const user = (userData as UserApiResponse)?.data || (userData as UserApiResponse)?.user || userData;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (showPopover) {
      setAnchorEl(event.currentTarget);
      setPopoverOpen(true);
    } else {
      router.push(`/profile/${username}`);
    }
  };

  const handleClose = () => {
    setPopoverOpen(false);
    setAnchorEl(null);
  };

  const handleViewProfile = () => {
    handleClose();
    router.push(`/profile/${username}`);
  };

  const mentionText = displayText || `@${username}`;

  // Inline variant (default)
  if (variant === 'inline') {
    return (
      <>
        <Typography
          component="span"
          sx={{
            color: 'primary.main',
            cursor: 'pointer',
            textDecoration: 'none',
            fontWeight: 500,
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
          onClick={handleClick}
          className={className}
        >
          {mentionText}
        </Typography>

        {showPopover && (
          <Popover
            open={popoverOpen}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            PaperProps={{
              sx: { maxWidth: 320, minWidth: 280 }
            }}
          >
            <Card elevation={0}>
              <CardContent sx={{ p: 2 }}>
                {isLoading ? (
                  <Box display="flex" alignItems="center" justifyContent="center" py={2}>
                    <Typography variant="body2" color="text.secondary">
                      Loading...
                    </Typography>
                  </Box>
                ) : user && typeof user === 'object' && 'username' in user ? (
                  <>
                    {/* User Header */}
                    <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
                      <UserAvatar 
                        src={user.avatar}
                        alt={user.displayName}
                        size={48}
                        isVerified={user.isVerified}
                      />
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {user.displayName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          @{user.username}
                        </Typography>
                        {user.isVerified && (
                          <Chip
                            label="Verified"
                            size="small"
                            color="primary"
                            sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* User Bio */}
                    {user.bio && (
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {user.bio}
                      </Typography>
                    )}

                    {/* User Stats */}
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      {user.location && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <MapPin size={14} />
                          <Typography variant="caption" color="text.secondary">
                            {user.location}
                          </Typography>
                        </Box>
                      )}
                      {user.createdAt && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Calendar size={14} />
                          <Typography variant="caption" color="text.secondary">
                            Joined {formatDistanceToNow(new Date(user.createdAt))} ago
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Follower Stats */}
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Users size={14} />
                        <Typography variant="caption">
                          <strong>{user.followerCount || 0}</strong> followers
                        </Typography>
                      </Box>
                      <Typography variant="caption">
                        <strong>{user.followingCount || 0}</strong> following
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Action Buttons */}
                    <Box display="flex" gap={1}>
                      <FollowButton
                        user={{
                          id: user.id,
                          username: user.username,
                          displayName: user.displayName,
                          isFollowing: (user as ProfileUser).isFollowing
                        }}
                        variant="button"
                        size="small"
                        context={context === 'video' || context === 'stream' || context === 'marketplace' ? 'stream' : 'profile'}
                        onFollowChange={() => {}}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleViewProfile}
                        sx={{ flex: 1 }}
                      >
                        View Profile
                      </Button>
                    </Box>
                  </>
                ) : (
                  <Box py={2}>
                    <Typography variant="body2" color="text.secondary" align="center">
                      User not found
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Popover>
        )}
      </>
    );
  }

  // Chip variant
  return (
    <Chip
      label={mentionText}
      size="small"
      clickable
      onClick={handleClick}
      sx={{
        backgroundColor: 'primary.light',
        color: 'primary.contrastText',
        '&:hover': {
          backgroundColor: 'primary.main',
        },
      }}
      className={className}
    />
  );
};

export default UserMention;