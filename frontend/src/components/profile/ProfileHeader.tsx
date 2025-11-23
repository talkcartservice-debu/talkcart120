import React, { useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    useTheme,
    useMediaQuery,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    MapPin,
    Link as LinkIcon,
    Calendar,
    Edit,
    Settings,
    MoreHorizontal,
} from 'lucide-react';
import UserAvatar from '../common/UserAvatar';

import AvatarManager from './AvatarManager';
import { User } from '@/types';

interface ProfileHeaderProps {
    user: User;
    isOwnProfile?: boolean;
    isFollowing?: boolean;
    onFollow?: () => void;
    onUnfollow?: () => void;
    onEditProfile?: () => void;
    onSettings?: () => void;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    onUserUpdate?: (updatedUser: Partial<User>) => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    user,
    isOwnProfile = false,
    isFollowing = false,
    onFollow,
    onUnfollow,
    onEditProfile,
    onSettings,
    followersCount = 0,
    followingCount = 0,
    postsCount = 0,
    onUserUpdate,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Listen for user profile updates to keep UI in sync
    useEffect(() => {
        const handleUserUpdate = (event: CustomEvent<{ user: Partial<User> }>) => {
            if (event.detail && event.detail.user && onUserUpdate) {
                onUserUpdate(event.detail.user);
            }
        };

        // Add event listener for profile updates
        window.addEventListener('user-profile-updated', handleUserUpdate as EventListener);

        // Clean up
        return () => {
            window.removeEventListener('user-profile-updated', handleUserUpdate as EventListener);
        };
    }, [onUserUpdate]);

    const handleFollowClick = () => {
        if (isFollowing) {
            onUnfollow?.();
        } else {
            onFollow?.();
        }
    };

    const handleAvatarUpdate = (avatarUrl: string) => {
        onUserUpdate?.({ avatar: avatarUrl });
    };



    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 2,
                overflow: 'hidden',
                border: `1px solid ${theme.palette.divider}`,
            }}
        >


            {/* Profile Info */}
            <Box sx={{ p: 3, position: 'relative' }}>
                {/* Avatar */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: isMobile ? -40 : -60,
                        left: 24,
                    }}
                >
                    {isOwnProfile ? (
                        <AvatarManager
                            user={user}
                            onAvatarUpdate={handleAvatarUpdate}
                            size={isMobile ? 80 : 120}
                        />
                    ) : (
                        <UserAvatar
                            src={user.avatar}
                            alt={user.displayName || user.username}
                            size={isMobile ? 80 : 120}
                            isVerified={user.isVerified}
                            showBorder={true}
                            borderColor={theme.palette.background.paper}
                        />
                    )}
                </Box>

                {/* Action Buttons */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 1,
                        mb: 2,
                    }}
                >
                    {isOwnProfile ? (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<Edit size={16} />}
                                onClick={onEditProfile}
                                size="small"
                            >
                                Edit Profile
                            </Button>
                            <IconButton
                                onClick={onSettings}
                                size="small"
                                sx={{
                                    border: `1px solid ${theme.palette.divider}`,
                                }}
                            >
                                <Settings size={16} />
                            </IconButton>
                        </>
                    ) : (
                        <>
                            <Button
                                variant={isFollowing ? 'outlined' : 'contained'}
                                onClick={handleFollowClick}
                                size="small"
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </Button>
                            <IconButton
                                size="small"
                                sx={{
                                    border: `1px solid ${theme.palette.divider}`,
                                }}
                            >
                                <MoreHorizontal size={16} />
                            </IconButton>
                        </>
                    )}
                </Box>

                {/* User Info */}
                <Box sx={{ mt: isMobile ? 3 : 4 }}>
                    <Typography variant="h5" fontWeight={600} gutterBottom>
                        {user.displayName || user.username}
                    </Typography>

                    {user.displayName && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            @{user.username}
                        </Typography>
                    )}

                    {user.bio && (
                        <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
                            {user.bio}
                        </Typography>
                    )}

                    {/* User Details */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 2,
                            mb: 2,
                            '& > *': {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                            },
                        }}
                    >
                        {user.location && (
                            <Box>
                                <MapPin size={16} />
                                <Typography variant="body2" color="text.secondary">
                                    {user.location}
                                </Typography>
                            </Box>
                        )}

                        {user.website && (
                            <Box>
                                <LinkIcon size={16} />
                                <Typography
                                    variant="body2"
                                    color="primary"
                                    component="a"
                                    href={user.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ textDecoration: 'none' }}
                                >
                                    {user.website.replace(/^https?:\/\//, '')}
                                </Typography>
                            </Box>
                        )}

                        <Box>
                            <Calendar size={16} />
                            <Typography variant="body2" color="text.secondary">
                                Joined {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', {
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Stats */}
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 3,
                            '& > *': {
                                cursor: 'pointer',
                                '&:hover': {
                                    textDecoration: 'underline',
                                },
                            },
                        }}
                    >
                        <Box>
                            <Typography variant="body2" component="span">
                                <strong>{postsCount}</strong> Posts
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" component="span">
                                <strong>{followingCount}</strong> Following
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" component="span">
                                <strong>{followersCount}</strong> Followers
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
};

export default ProfileHeader;