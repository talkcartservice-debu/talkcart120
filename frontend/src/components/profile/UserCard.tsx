import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import { Wallet, Copy } from 'lucide-react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '../common/UserAvatar';
import { ProfileUser } from '@/types';
import { usePrivacy } from '@/contexts/PrivacyContext';
import LastSeenDisplay from '@/components/common/LastSeenDisplay';
import DirectMessageButton from '@/components/common/DirectMessageButton';
import GroupInviteButton from '@/components/common/GroupInviteButton';
import FollowButton from '@/components/common/FollowButton';
import { usePresence } from '@/contexts/PresenceContext';

interface UserCardProps {
  user: ProfileUser;
  showFollowButton?: boolean;
  variant?: 'outlined' | 'elevation';
  size?: 'small' | 'medium' | 'large';
  onFollowChange?: (isFollowing: boolean) => void;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  showFollowButton = true,
  variant = 'outlined',
  size = 'medium',
  onFollowChange
}) => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { privacySettings } = usePrivacy();
  const { isUserOnline } = usePresence();

  const handleViewProfile = () => {
    router.push(`/profile/${user.username}`);
  };

  // Map card size to avatar size prop
  const avatarSize: 'small' | 'medium' | 'large' = size === 'small' ? 'small' : size === 'large' ? 'large' : 'medium';

  // Don't show follow button for current user
  const isCurrentUser = currentUser && (currentUser.id === user.id || currentUser.id === (user as any)._id);

  return (
    <Card variant={variant === 'outlined' ? 'outlined' : 'elevation'}>
      <CardContent sx={{ p: size === 'small' ? 1.5 : 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <UserAvatar
            src={user.avatar || ''}
            alt={user.displayName || user.username}
            size={avatarSize}
            isVerified={!!user.isVerified}
            isOnline={isUserOnline(user.id)}
          />
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography
                variant={size === 'small' ? 'body1' : 'subtitle1'}
                fontWeight={600}
              >
                {user.displayName}
              </Typography>
              {user.isVerified && (
                <Chip
                  label="Verified"
                  size="small"
                  color="primary"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              @{user.username}
            </Typography>
            {size !== 'small' && user.bio && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {user.bio}
              </Typography>
            )}

            {/* Last Seen - Only show if not small card and user has ID */}
            {size !== 'small' && user.id && (
              <Box sx={{ mt: 1 }}>
                <LastSeenDisplay
                  userId={user.id}
                  variant="inline"
                  size="small"
                  showIcon={true}
                />
              </Box>
            )}

            {/* Wallet Address - Only show if privacy allows and it's not a small card */}
            {size !== 'small' && user.walletAddress && (
              // Show wallet address if the user has enabled "showWallet" in privacy settings
              // Note: For other users, we'd need to check their privacy settings from the backend
              // For now, we'll show it if the current user has showWallet enabled (as a demo)
              privacySettings.showWallet && (
                <Box display="flex" alignItems="center" gap={0.5} sx={{ mt: 1 }}>
                  <Wallet size={12} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem'
                    }}
                  >
                    {`${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
                  </Typography>
                  <Box
                    component="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(user.walletAddress!);
                      toast.success('Wallet address copied');
                    }}
                    sx={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main'
                      }
                    }}
                  >
                    <Copy size={10} />
                  </Box>
                </Box>
              )
            )}
          </Box>
          <Box ml="auto" display="flex" gap={1}>
            {showFollowButton && !isCurrentUser && (
              <FollowButton
                user={user}
                size={size === 'small' ? 'small' : 'medium'}
                context="profile"
                onFollowChange={onFollowChange}
              />
            )}
            {!isCurrentUser && size !== 'small' && (
              <>
                <DirectMessageButton
                  targetUserId={user.id}
                  targetUsername={user.username}
                  targetDisplayName={user.displayName}
                  targetAllowsDirectMessages={user.settings?.privacy?.allowDirectMessages}
                  variant="icon"
                  size="medium"
                />
                <GroupInviteButton
                  targetUserId={user.id}
                  targetUsername={user.username}
                  targetDisplayName={user.displayName}
                  targetAllowsGroupInvites={user.settings?.privacy?.allowGroupInvites}
                  variant="icon"
                  size="medium"
                />
              </>
            )}
            <Button
              variant="outlined"
              size={size === 'small' ? 'small' : 'medium'}
              onClick={handleViewProfile}
            >
              View
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UserCard;