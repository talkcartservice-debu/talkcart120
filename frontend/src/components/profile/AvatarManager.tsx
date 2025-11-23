import React, { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    useTheme,
} from '@mui/material';
import { Camera, Trash2, Upload } from 'lucide-react';
import { User } from '@/types';
import UserAvatar from '../common/UserAvatar';
import ProfilePictureUpload from './ProfilePictureUpload';
import { useProfile } from '@/contexts/ProfileContext';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface AvatarManagerProps {
    user: User;
    onAvatarUpdate: (avatarUrl: string) => void;
    size?: number;
    showControls?: boolean;
}

const AvatarManager: React.FC<AvatarManagerProps> = ({
    user,
    onAvatarUpdate,
    size = 120,
    showControls = true,
}) => {
    const theme = useTheme();
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const { updateProfile: updateProfileContext } = useProfile();

    // Listen for user profile updates to keep UI in sync
    useEffect(() => {
        const handleUserUpdate = (event: CustomEvent<{ user: Partial<User> }>) => {
            if (event.detail && event.detail.user && event.detail.user.avatar !== undefined) {
                // Only trigger update if the avatar has changed
                if (user.avatar !== event.detail.user.avatar) {
                    onAvatarUpdate(event.detail.user.avatar || '');
                }
            }
        };

        // Add event listener for profile updates
        window.addEventListener('user-profile-updated', handleUserUpdate as EventListener);

        // Clean up
        return () => {
            window.removeEventListener('user-profile-updated', handleUserUpdate as EventListener);
        };
    }, [user.avatar, onAvatarUpdate]);

    const handleUploadSuccess = useCallback(async (avatarUrl: string) => {
        try {
            // Update through ProfileContext which will sync with AuthContext and use the correct API endpoint
            const success = await updateProfileContext({ avatar: avatarUrl });
            
            if (success) {
                onAvatarUpdate(avatarUrl);
                setUploadDialogOpen(false);
                toast.success('Profile picture updated successfully!');
            } else {
                toast.error('Failed to update profile picture on the server');
            }
        } catch (error) {
            console.error('Failed to update avatar:', error);
            toast.error('Failed to update profile picture');
        }
    }, [onAvatarUpdate, updateProfileContext]);

    const handleRemoveAvatar = async () => {
        try {
            setIsRemoving(true);

            // Update through ProfileContext which will sync with AuthContext and use the correct API endpoint
            const success = await updateProfileContext({ avatar: '' });

            if (success) {
                onAvatarUpdate('');
                setRemoveDialogOpen(false);
                toast.success('Profile picture removed successfully!');
            } else {
                throw new Error('Failed to remove profile picture');
            }
        } catch (error: any) {
            console.error('Failed to remove avatar:', error);
            toast.error(error.message || 'Failed to remove profile picture');
        } finally {
            setIsRemoving(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Avatar Display */}
            <Box sx={{ position: 'relative', mb: 2 }}>
                <UserAvatar
                    src={user.avatar}
                    alt={user.displayName || user.username}
                    size={size}
                    isVerified={user.isVerified}
                    showBorder={true}
                    borderColor={theme.palette.background.paper}
                />

                {showControls && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: -8,
                            right: -8,
                            display: 'flex',
                            gap: 0.5,
                        }}
                    >
                        <Button
                            variant="contained"
                            size="small"
                            onClick={() => setUploadDialogOpen(true)}
                            sx={{
                                minWidth: 'auto',
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                p: 0,
                            }}
                        >
                            <Camera size={16} />
                        </Button>

                        {user.avatar && (
                            <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                onClick={() => setRemoveDialogOpen(true)}
                                sx={{
                                    minWidth: 'auto',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    p: 0,
                                }}
                            >
                                <Trash2 size={16} />
                            </Button>
                        )}
                    </Box>
                )}
            </Box>

            {/* Upload Dialog */}
            <Dialog
                open={uploadDialogOpen}
                onClose={() => setUploadDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Upload size={20} />
                        Update Profile Picture
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <ProfilePictureUpload
                        user={{
                            ...user,
                            displayName: user.displayName || '',
                            isVerified: user.isVerified || false,
                            cover: undefined
                        } as any}
                        onUploadSuccess={handleUploadSuccess}
                        size={200}
                        showUploadButton={false}
                        allowRemove={false}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUploadDialogOpen(false)}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Remove Confirmation Dialog */}
            <Dialog
                open={removeDialogOpen}
                onClose={() => setRemoveDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Remove Profile Picture</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Are you sure you want to remove your profile picture? This action cannot be undone.
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        Your profile will display the default avatar instead.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setRemoveDialogOpen(false)}
                        disabled={isRemoving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRemoveAvatar}
                        color="error"
                        variant="contained"
                        disabled={isRemoving}
                        startIcon={isRemoving ? <CircularProgress size={16} /> : <Trash2 size={16} />}
                    >
                        {isRemoving ? 'Removing...' : 'Remove'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AvatarManager;