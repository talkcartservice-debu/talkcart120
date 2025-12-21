import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Grid,
    IconButton,
    Divider,
    Alert,
    CircularProgress,
    useTheme,
    useMediaQuery,
    Paper,
    Chip,
    Tooltip,
} from '@mui/material';
import {
    Close,
    Edit,
    Save,
    Person,
    LocationOn,
    Language,
    Info,
    Camera,
    Image as ImageIcon,
} from '@mui/icons-material';
import { User } from '@/types';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import ProfilePictureUpload from './ProfilePictureUpload';
import CoverPhotoUpload from './CoverPhotoUpload';

interface EditProfileDialogProps {
    open: boolean;
    onClose: () => void;
    user: User;
    onProfileUpdated: (updatedUser: User) => void;
}

// Extend User interface to include cover property for this component
interface UserWithCover extends User {
    cover?: string;
}

interface ProfileFormData {
    displayName: string;
    username: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    cover: string;
}

const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
    open,
    onClose,
    user,
    onProfileUpdated,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [formData, setFormData] = useState<ProfileFormData>({
        displayName: '',
        username: '',
        bio: '',
        location: '',
        website: '',
        avatar: '',
        cover: '',
    });

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Partial<ProfileFormData>>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize form data when user changes
    useEffect(() => {
        if (user) {
            // Type assertion to ensure user has cover property
            const userWithCover = user as UserWithCover;
            const initialData = {
                displayName: user.displayName || '',
                username: user.username || '',
                bio: user.bio || '',
                location: user.location || '',
                website: user.website || '',
                avatar: user.avatar || '',
                cover: userWithCover.cover || '',
            };
            setFormData(initialData);
            setHasChanges(false);
            setErrors({});
        }
    }, [user]);

    // Handle form field changes
    const handleChange = (field: keyof ProfileFormData) => (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = event.target.value;
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    // Validate form data
    const validateForm = (): boolean => {
        const newErrors: Partial<ProfileFormData> = {};

        // Display name validation
        if (!formData.displayName.trim()) {
            newErrors.displayName = 'Display name is required';
        } else if (formData.displayName.length > 50) {
            newErrors.displayName = 'Display name must be less than 50 characters';
        }

        // Username validation
        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (formData.username.length > 30) {
            newErrors.username = 'Username must be less than 30 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Username can only contain letters, numbers, and underscores';
        }

        // Bio validation
        if (formData.bio.length > 500) {
            newErrors.bio = 'Bio must be less than 500 characters';
        }

        // Location validation
        if (formData.location.length > 100) {
            newErrors.location = 'Location must be less than 100 characters';
        }

        // Website validation
        if (formData.website && !isValidUrl(formData.website)) {
            newErrors.website = 'Please enter a valid website URL';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // URL validation helper
    const isValidUrl = (url: string): boolean => {
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    };

    // Handle form submission
    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            // Prepare data for API
            const updateData = {
                ...formData,
                website: formData.website && !formData.website.startsWith('http')
                    ? `https://${formData.website}`
                    : formData.website,
            };

            // Type the response properly
            const response: any = await api.auth.updateProfile(updateData);

            if (response && response.success && response.user) {
                onProfileUpdated(response.user);
                toast.success('Profile updated successfully!');
                onClose();
            } else {
                throw new Error(response?.message || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error('Profile update error:', error);

            // Handle specific error cases
            if (error.message?.includes('Username is already taken')) {
                setErrors({ username: 'This username is already taken' });
            } else {
                toast.error(error.message || 'Failed to update profile');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle avatar upload success
    const handleAvatarUpload = (avatarUrl: string) => {
        setFormData(prev => ({ ...prev, avatar: avatarUrl }));
        setHasChanges(true);
    };

    // Handle cover upload success
    const handleCoverUpload = (coverUrl: string) => {
        setFormData(prev => ({ ...prev, cover: coverUrl }));
        setHasChanges(true);
    };

    // Handle dialog close with unsaved changes warning
    const handleClose = () => {
        if (hasChanges && !isLoading) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
            PaperProps={{
                sx: {
                    borderRadius: isMobile ? 0 : 3,
                    maxHeight: '90vh',
                },
            }}
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                        <Edit color="primary" />
                        <Typography variant="h6">Edit Profile</Typography>
                    </Box>
                    <IconButton onClick={handleClose} disabled={isLoading}>
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{ py: 2 }}>
                    {/* Cover Photo Section */}
                    <Paper
                        elevation={0}
                        sx={{
                            position: 'relative',
                            height: 200,
                            borderRadius: 2,
                            overflow: 'hidden',
                            mb: 4,
                            background: formData.cover
                                ? `url(${formData.cover}) center/cover`
                                : `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
                            border: `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <CoverPhotoUpload
                            user={{
                                ...user,
                                displayName: user.displayName || '',
                                isVerified: user.isVerified || false,
                                cover: undefined
                            } as User}
                            onUploadSuccess={handleCoverUpload}
                            height={200}
                            disabled={isLoading}
                        />

                        {/* Avatar positioned over cover */}
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: -40,
                                left: 24,
                                zIndex: 2,
                            }}
                        >
                            <ProfilePictureUpload
                                user={{
                                    ...user,
                                    displayName: user.displayName || '',
                                    isVerified: user.isVerified || false,
                                    cover: undefined
                                } as User}
                                onUploadSuccess={handleAvatarUpload}
                                size={80}
                                disabled={isLoading}
                            />
                        </Box>
                    </Paper>

                    {/* Form Fields */}
                    <Box sx={{ mt: 6 }}>
                        <Grid container spacing={3}>
                            {/* Display Name */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Display Name"
                                    value={formData.displayName}
                                    onChange={handleChange('displayName')}
                                    error={!!errors.displayName}
                                    helperText={errors.displayName || 'Your public display name'}
                                    disabled={isLoading}
                                    InputProps={{
                                        startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                                    }}
                                    inputProps={{ maxLength: 50 }}
                                />
                            </Grid>

                            {/* Username */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Username"
                                    value={formData.username}
                                    onChange={handleChange('username')}
                                    error={!!errors.username}
                                    helperText={errors.username || 'Your unique username'}
                                    disabled={isLoading}
                                    InputProps={{
                                        startAdornment: (
                                            <Typography sx={{ mr: 1, color: 'text.secondary' }}>@</Typography>
                                        ),
                                    }}
                                    inputProps={{ maxLength: 30 }}
                                />
                            </Grid>

                            {/* Bio */}
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Bio"
                                    value={formData.bio}
                                    onChange={handleChange('bio')}
                                    error={!!errors.bio}
                                    helperText={
                                        errors.bio ||
                                        `Tell people about yourself (${formData.bio.length}/500)`
                                    }
                                    disabled={isLoading}
                                    multiline
                                    rows={3}
                                    InputProps={{
                                        startAdornment: <Info sx={{ mr: 1, color: 'text.secondary', alignSelf: 'flex-start', mt: 1 }} />,
                                    }}
                                    inputProps={{ maxLength: 500 }}
                                />
                            </Grid>

                            {/* Location */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Location"
                                    value={formData.location}
                                    onChange={handleChange('location')}
                                    error={!!errors.location}
                                    helperText={errors.location || 'Where are you based?'}
                                    disabled={isLoading}
                                    InputProps={{
                                        startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
                                    }}
                                    inputProps={{ maxLength: 100 }}
                                />
                            </Grid>

                            {/* Website */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Website"
                                    value={formData.website}
                                    onChange={handleChange('website')}
                                    error={!!errors.website}
                                    helperText={errors.website || 'Your website or portfolio'}
                                    disabled={isLoading}
                                    InputProps={{
                                        startAdornment: <Language sx={{ mr: 1, color: 'text.secondary' }} />,
                                    }}
                                    placeholder="https://example.com"
                                />
                            </Grid>
                        </Grid>

                        {/* Tips Section */}
                        <Box sx={{ mt: 4 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Profile Tips
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Chip
                                    size="small"
                                    icon={<Camera />}
                                    label="Add a profile picture"
                                    variant={formData.avatar ? 'filled' : 'outlined'}
                                    color={formData.avatar ? 'success' : 'default'}
                                />
                                <Chip
                                    size="small"
                                    icon={<ImageIcon />}
                                    label="Add a cover photo"
                                    variant={formData.cover ? 'filled' : 'outlined'}
                                    color={formData.cover ? 'success' : 'default'}
                                />
                                <Chip
                                    size="small"
                                    icon={<Info />}
                                    label="Write a bio"
                                    variant={formData.bio ? 'filled' : 'outlined'}
                                    color={formData.bio ? 'success' : 'default'}
                                />
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3 }}>
                <Button
                    onClick={handleClose}
                    disabled={isLoading}
                    sx={{ borderRadius: 2 }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isLoading || !hasChanges}
                    startIcon={isLoading ? <CircularProgress size={16} /> : <Save />}
                    sx={{ borderRadius: 2, minWidth: 120 }}
                >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditProfileDialog;