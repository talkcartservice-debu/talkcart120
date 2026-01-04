import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Container,
    Grid,
    Typography,
    CircularProgress,
    Tabs,
    Tab,
    Card,
    CardContent,
    Button,
    TextField,
    Stack,
    Avatar,
    Chip,
    IconButton,
    Divider,
    Paper,
    Badge,
    useTheme,
    alpha,
    Skeleton,
    Fade,
    Zoom,
    useMediaQuery,
} from '@mui/material';
import {
    Edit,
    LocationOn,
    Link as LinkIcon,
    CalendarToday,
    Verified,
    Settings,
    Share,
    MoreVert,
    PhotoCamera,
    Message,
    PersonAdd,
    PersonRemove,
    Bookmark,
    Favorite,
    GridOn,
    PlayArrow,
    Image as ImageIcon,
} from '@mui/icons-material';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext'; // Add this import
import { ProfileUser, Post } from '@/types';
import UserPosts from '@/components/profile/UserPosts';
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload';
import FollowersList from '@/components/profile/FollowersList';
import FollowingList from '@/components/profile/FollowingList';
// Enhanced TabPanel with animations
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
    <div
        role="tabpanel"
        hidden={value !== index}
        id={`profile-tabpanel-${index}`}
        aria-labelledby={`profile-tab-${index}`}
        {...other}
    >
        {value === index && (
            <Fade in={true} timeout={300}>
                <Box sx={{ py: 3 }}>{children}</Box>
            </Fade>
        )}
    </div>
);

// Modern Stats Card Component
const StatsCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color?: string; onClick?: () => void }> = ({
    label,
    value,
    icon,
    color = 'primary',
    onClick
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const cardBackground = `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.05)})`;
    const cardBorder = `1px solid ${alpha(theme.palette.primary.main, 0.2)}`;

    return (
        <div
            onClick={onClick}
            style={{
                padding: isMobile ? '6px' : '20px',
                textAlign: 'center',
                background: cardBackground,
                border: cardBorder,
                borderRadius: '16px',
                transition: 'all 0.3s ease',
                cursor: onClick ? 'pointer' : 'default',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: isMobile ? '60px' : 'auto',
            }}
            className="stats-card"
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: isMobile ? '2px' : '4px' }}>
                <Box sx={{ color: theme.palette.primary.main, marginRight: isMobile ? '2px' : '4px' }}>{icon}</Box>
                <Typography variant={isMobile ? "h6" : "h4"} fontWeight="bold" color="primary.main" style={{ fontSize: isMobile ? '0.9rem' : 'inherit' }}>
                    {value.toLocaleString()}
                </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight="medium" style={{ fontSize: isMobile ? '0.65rem' : '0.875rem' }}>
                {label}
            </Typography>
        </div>
    );
};

// Enhanced Profile Header Component
const ProfileHeader: React.FC<{
    profile: ProfileUser;
    isOwnProfile: boolean;
    onEditProfile?: () => void;
    onFollow?: () => void;
    onMessage?: () => void;
    onAvatarUpdate?: (avatarUrl: string) => void;
    onFollowersClick?: () => void;
    onFollowingClick?: () => void;
}> = ({ profile, isOwnProfile, onEditProfile, onFollow, onMessage, onAvatarUpdate, onFollowersClick, onFollowingClick }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleAvatarUploadSuccess = useCallback((avatarUrl: string) => {
        if (onAvatarUpdate) {
            onAvatarUpdate(avatarUrl);
        }
    }, [onAvatarUpdate]);

    // Use a simple div instead of Paper component to avoid parsing issues entirely
    return (
        <div 
            className="profile-header-paper"
            style={{
                position: 'relative',
                overflow: 'visible', // Changed from 'hidden' to 'visible' to ensure avatar is not clipped
                borderRadius: isMobile ? 0 : 24,
                background: '#f5f5f5',
                border: isMobile ? 'none' : '1px solid #e0e0e0',
                boxShadow: isMobile ? 'none' : '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
                paddingTop: isMobile ? '30px' : '50px', // Extra padding to accommodate larger avatar
            }}
        >
            {/* Profile Content */}
            <Box sx={{ p: { xs: 0.5, sm: 1.5, md: 3 }, pt: { xs: 4, sm: 6 }, overflow: 'visible', pb: { xs: 1, sm: 2 } }}>
                {/* Avatar and Basic Info */}
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: { xs: 'center', sm: 'flex-end' }, 
                    flexDirection: { xs: 'column', sm: 'row' },
                    mb: 2, 
                    mt: { xs: 2, sm: 0 },
                    textAlign: { xs: 'center', sm: 'left' },
                    position: 'relative', // Ensure proper positioning context
                    overflow: 'visible', // Ensure content is not clipped
                    width: '100%',
                    justifyContent: 'center',
                    maxWidth: '100%',
                }}>
                    <Box sx={{ 
                        position: 'relative', 
                        mr: { xs: 0, sm: 3 }, 
                        mb: { xs: 2, sm: 0 },
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        alignSelf: 'center',
                    }}>
                        <Avatar
                            src={profile.avatar}
                            sx={{
                                width: { xs: 80, sm: 100, md: 120 },
                                height: { xs: 80, sm: 100, md: 120 },
                                border: '4px solid ' + theme.palette.background.paper,
                                boxShadow: theme.shadows[8],
                                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                                fontWeight: 'bold',
                                overflow: 'visible', // Ensure avatar is not clipped
                                // Ensure avatar container doesn't clip content
                                '& img': {
                                    objectFit: 'cover',
                                    width: '100%',
                                    height: '100%',
                                },
                                // Ensure the avatar is centered within its container
                                margin: '0 auto',
                            }}
                        >
                            {profile.displayName?.charAt(0) || profile.username?.charAt(0)}
                        </Avatar>
                        {isOwnProfile && (
                            <Box sx={{
                                position: 'absolute',
                                bottom: isMobile ? -12 : -10,
                                right: isMobile ? -12 : -10,
                            }}>
                                <ProfilePictureUpload
                                    user={{
                                        ...profile,
                                        displayName: profile.displayName || '',
                                        isVerified: profile.isVerified || false,
                                        cover: undefined
                                    } as any}
                                    onUploadSuccess={handleAvatarUploadSuccess}
                                    size={isMobile ? 80 : 120}
                                    showUploadButton={true}
                                    allowRemove={true}
                                    disabled={false}
                                />
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ 
                        ml: { xs: 0, sm: 3 }, 
                        flex: 1,
                        width: { xs: '100%', sm: 'auto' },
                        mt: { xs: 1, sm: 0 },
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: { xs: 'center', sm: 'flex-start' },
                    }}>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5, 
                            mb: 1,
                            justifyContent: { xs: 'center', sm: 'flex-start' },
                            flexWrap: 'wrap',
                            width: '100%',
                            textAlign: 'center',
                        }}>
                        <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold" noWrap sx={{ maxWidth: '100%', textAlign: 'center' }}>
                                {profile.displayName || profile.username}
                            </Typography>
                            {profile.isVerified && (
                                <Verified sx={{ color: 'primary.main', fontSize: isMobile ? 18 : 28 }} />
                            )}
                            {profile.isOnline && (
                                <Chip
                                    label="Online"
                                    size="small"
                                    color="success"
                                    sx={{ height: isMobile ? 16 : 20, fontSize: isMobile ? '0.6rem' : '0.7rem' }}
                                />
                            )}
                        </Box>

                        <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                                mb: 1.5,
                                fontSize: { xs: '0.65rem', sm: '0.75rem', md: '1rem' },
                                wordBreak: 'break-word'
                            }}
                        >
                            @{profile.username}
                        </Typography>

                        {/* Action Buttons - Responsive layout */}
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: { xs: 1, sm: 1.5 },
                            width: '100%'
                        }}>
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            flexWrap: 'wrap',
                            gap: { xs: 0.5, sm: 1 },
                            width: '100%',
                            justifyContent: { xs: 'center', sm: 'flex-start' },
                            alignItems: 'center',
                        }}>
                            {isOwnProfile ? (
                                <Button
                                    variant="contained"
                                    startIcon={<Edit />}
                                    onClick={onEditProfile}
                                    size={isMobile ? "small" : "medium"}
                                    sx={{ 
                                        borderRadius: 2,
                                        mb: { xs: 0.5, sm: 0 },
                                        minWidth: { xs: '100%', sm: 'auto' },
                                        fontSize: { xs: '0.7rem', sm: '0.8rem', md: '1rem' },
                                        py: isMobile ? 0.5 : 1,
                                        width: { xs: '100%', sm: 'auto' },
                                    }}
                                >
                                    {isMobile ? "Edit" : "Edit Profile"}
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        variant="contained"
                                        startIcon={profile.isFollowing ? <PersonRemove /> : <PersonAdd />}
                                        onClick={onFollow}
                                        color={profile.isFollowing ? "secondary" : "primary"}
                                        size={isMobile ? "small" : "medium"}
                                        sx={{ 
                                            borderRadius: 2,
                                            mb: { xs: 0.5, sm: 0 },
                                            minWidth: { xs: '100%', sm: 'auto' },
                                            fontSize: { xs: '0.7rem', sm: '0.8rem', md: '1rem' },
                                            py: isMobile ? 0.5 : 1,
                                            width: { xs: '100%', sm: 'auto' },
                                        }}
                                    >
                                        {profile.isFollowing ? (isMobile ? 'Unfollow' : 'Unfollow') : (isMobile ? 'Follow' : 'Follow')}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<Message />}
                                        onClick={onMessage}
                                        size={isMobile ? "small" : "medium"}
                                        sx={{ 
                                            borderRadius: 2,
                                            mb: { xs: 0.5, sm: 0 },
                                            minWidth: { xs: '100%', sm: 'auto' },
                                            fontSize: { xs: '0.7rem', sm: '0.8rem', md: '1rem' },
                                            py: isMobile ? 0.5 : 1,
                                            width: { xs: '100%', sm: 'auto' },
                                        }}
                                    >
                                        {isMobile ? "Message" : "Message"}
                                    </Button>
                                </>
                            )}
                        </Box>
                    </Box>

                {/* Bio */}
                {profile.bio && (
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            mb: 2, 
                            lineHeight: 1.5,
                            textAlign: { xs: 'center', sm: 'left' },
                            fontSize: { xs: '0.75rem', sm: '0.85rem', md: '1rem' },
                            wordBreak: 'break-word'
                        }}
                    >
                        {profile.bio}
                    </Typography>
                )}

                {/* Profile Details - Responsive layout */}
                <Box sx={{ 
                    mb: 2,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'center', sm: 'flex-start' },
                    gap: { xs: 0.5, sm: 1 },
                    flexWrap: 'wrap',
                }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        mb: { xs: 0.5, sm: 0 },
                        minWidth: 0,
                    }}>
                        <LocationOn sx={{ fontSize: { xs: 12, sm: 14, md: 18 }, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' }, wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {profile.location}
                        </Typography>
                    </Box>

                    {profile.website && (
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            mb: { xs: 0.5, sm: 0 },
                            minWidth: 0,
                        }}>
                            <LinkIcon sx={{ fontSize: { xs: 12, sm: 14, md: 18 }, color: 'text.secondary' }} />
                            <Typography
                                variant="body2"
                                color="primary"
                                component="a"
                                href={profile.website}
                                target="_blank"
                                sx={{ 
                                    textDecoration: 'none', 
                                    '&:hover': { textDecoration: 'underline' },
                                    wordBreak: 'break-all',
                                    fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' },
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {profile.website.replace(/^https?:\/\//, '').substring(0, isMobile ? 15 : 30)}
                                {profile.website.replace(/^https?:\/\//, '').length > (isMobile ? 15 : 30) ? '...' : ''}
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        minWidth: 0,
                    }}>
                        <CalendarToday sx={{ fontSize: { xs: 12, sm: 14, md: 18 }, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' }, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Joined {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric'
                            }) : 'Recently'}
                        </Typography>
                    </Box>
                </Box>

                {/* Stats - Responsive grid */}
                <Grid container spacing={isMobile ? 0.5 : 1} justifyContent="center">
                    <Grid item xs={6} sm={3}>
                        <StatsCard
                            label="Posts"
                            value={profile.postCount || 0}
                            icon={<GridOn />}
                            color="primary"
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <StatsCard
                            label="Followers"
                            value={profile.followerCount || 0}
                            icon={<PersonAdd />}
                            color="secondary"
                            onClick={onFollowersClick}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <StatsCard
                            label="Following"
                            value={profile.followingCount || 0}
                            icon={<PersonRemove />}
                            color="info"
                            onClick={onFollowingClick}
                        />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <StatsCard
                            label="Likes"
                            value={profile.postCount || 0}
                            icon={<Favorite />}
                            color="error"
                        />
                    </Grid>
                </Grid>
            </Box>
        </Box>
    </Box>
</div>
    );
};

// Modern Content Tabs
const ContentTabs: React.FC<{
    value: number;
    onChange: (event: React.SyntheticEvent, newValue: number) => void;
    isOwnProfile: boolean;
    profile: ProfileUser;
}> = ({ value, onChange, isOwnProfile, profile }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const tabs = [
        { label: 'Posts', icon: <GridOn />, disabled: false },
        { label: 'Followers', icon: <PersonAdd />, disabled: false },
        { label: 'Following', icon: <PersonRemove />, disabled: false },
        { label: 'Liked', icon: <Favorite />, disabled: !isOwnProfile },
    ];

    return (
        <div
            style={{
                borderRadius: isMobile ? '0px' : '16px',
                border: isMobile ? 'none' : '1px solid ' + alpha(theme.palette.divider, 0.1),
                overflow: 'hidden',
            }}
            className="content-tabs"
        >
            <Tabs
                value={value}
                onChange={onChange}
                variant={isMobile ? "scrollable" : "fullWidth"}
                scrollButtons="auto"
                allowScrollButtonsMobile={true}
                sx={{
                    '& .MuiTab-root': {
                        minHeight: { xs: 40, sm: 64 },
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: { xs: '0.7rem', sm: '0.85rem' },
                        '&.Mui-selected': {
                            color: 'primary.main',
                        },
                        minWidth: { xs: 80, sm: 120 },
                        px: { xs: 1, sm: 2 },
                        py: { xs: 1, sm: 1.5 },
                    },
                    '& .MuiTabs-indicator': {
                        height: 3,
                        borderRadius: '3px 3px 0 0',
                    },
                }}
            >
                {tabs.map((tab, index) => (
                    <Tab
                        key={index}
                        value={index}
                        label={isMobile && tab.label.length > 5 ? tab.label.substring(0, 5) + '...' : tab.label}
                        icon={tab.icon}
                        iconPosition="start"
                        disabled={tab.disabled}
                        sx={{
                            '& .MuiTab-iconWrapper': {
                                marginRight: { xs: 0.3, sm: 1 },
                                marginBottom: 0,
                                fontSize: { xs: '0.8rem', sm: '1.25rem' }
                            },
                        }}
                    />
                ))}
            </Tabs>
        </div>
    );
};

// Main Profile Component
const ModernProfilePage: React.FC = () => {
    const router = useRouter();
    const { user: currentUser, isAuthenticated } = useAuth();
    const { updateProfile: updateProfileContext } = useProfile(); // Add this line
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Profile state
    const [profile, setProfile] = useState<ProfileUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState(0);
    const [editMode, setEditMode] = useState(false);

    // Posts state
    const [posts, setPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);

    // Get username from URL
    const { username } = router.query;
    const effectiveUsername = username as string;
    // For the user's own profile (index.tsx), username will be undefined
    // In that case, we use the current user's username
    const isOwnProfile = !username || currentUser?.username === effectiveUsername;

    // Listen for user profile updates to keep UI in sync
    useEffect(() => {
        const handleUserUpdate = (event: CustomEvent<{ user: ProfileUser }>) => {
            if (event.detail && event.detail.user) {
                setProfile(prev => {
                    if (!prev) return event.detail.user;
                    return { ...prev, ...event.detail.user };
                });
            }
        };

        // Add event listener for profile updates
        window.addEventListener('user-profile-updated', handleUserUpdate as EventListener);

        // Clean up
        return () => {
            window.removeEventListener('user-profile-updated', handleUserUpdate as EventListener);
        };
    }, []);

    // Load profile data
    useEffect(() => {
        const loadProfile = async () => {
            // For own profile, we can load even if effectiveUsername is undefined
            // For other profiles, we need the username
            if (!isOwnProfile && !effectiveUsername) return;

            setLoading(true);
            setError(null);

            try {
                let res: any = null;

                if (isOwnProfile) {
                    res = await api.auth.getProfile();
                } else {
                    res = await api.users.getProfile(effectiveUsername);
                }

                if (res?.success && res.data) {
                    setProfile(res.data as ProfileUser);
                } else {
                    throw new Error(res?.message || 'Failed to load profile');
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [effectiveUsername, isOwnProfile, currentUser?.username]);

    // Handle tab change
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
    };

    // Handle follow/unfollow
    const handleFollow = async () => {
        if (!profile) return;

        try {
            if (profile.isFollowing) {
                await api.users.unfollow(profile.id);
                setProfile(prev => prev ? {
                    ...prev,
                    isFollowing: false,
                    followerCount: (prev.followerCount || 0) - 1
                } : null);
            } else {
                await api.users.follow(profile.id);
                setProfile(prev => prev ? {
                    ...prev,
                    isFollowing: true,
                    followerCount: (prev.followerCount || 0) + 1
                } : null);
            }
        } catch (error) {
            console.error('Follow/unfollow error:', error);
        }
    };

    // Handle avatar update through ProfileContext to ensure consistency
    const handleAvatarUpdate = async (avatarUrl: string) => {
        try {
            // Update through ProfileContext which will sync with AuthContext and use the correct API endpoint
            const success = await updateProfileContext({ avatar: avatarUrl });
            
            if (success) {
                // Update local state to reflect the change immediately
                setProfile(prev => prev ? { ...prev, avatar: avatarUrl } : null);
            }
        } catch (error) {
            console.error('Failed to update avatar:', error);
        }
    };

    // Loading state
    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
                <Skeleton variant="rectangular" sx={{ height: 200, borderRadius: 3, mb: 3 }} />
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Skeleton variant="rectangular" sx={{ height: 50, borderRadius: 2, mb: 2 }} />
                        <Skeleton variant="rectangular" sx={{ height: 300, borderRadius: 2 }} />
                    </Grid>
                </Grid>
            </Container>
        );
    }

    // Error state
    if (error) {
        return (
            <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
                <div
                    style={{
                        padding: isMobile ? '8px' : '16px',
                        textAlign: 'center',
                        borderRadius: '24px',
                        border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                        backgroundColor: alpha(theme.palette.error.main, 0.05),
                    }}
                    className="error-container"
                >
                    <Typography variant="h5" color="error" gutterBottom>
                        Profile Not Found
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        {error}
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={() => router.push('/')}
                        sx={{ borderRadius: 2 }}
                    >
                        Go Home
                    </Button>
                </div>
            </Container>
        );
    }

    if (!profile) return null;

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 0.5, sm: 2, md: 4 }, px: { xs: 0, sm: 2 }, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ width: '100%', maxWidth: '800px' }}>
                {/* Profile Header */}
                <ProfileHeader
                    profile={profile}
                    isOwnProfile={isOwnProfile}
                    onEditProfile={() => setEditMode(true)}
                    onFollow={handleFollow}
                    onMessage={() => router.push(`/messages?user=${profile.username}`)}
                    onAvatarUpdate={handleAvatarUpdate} // Use the new handler
                    onFollowersClick={() => setTab(1)}
                    onFollowingClick={() => setTab(2)}
                />

                {/* Content Tabs */}
                <Box sx={{ mt: { xs: 0.5, sm: 2, md: 4 } }}>
                    <ContentTabs
                        value={tab}
                        onChange={handleTabChange}
                        isOwnProfile={isOwnProfile}
                        profile={profile}
                    />
                
                    {/* Tab Content */}
                    <div
                        style={{
                            marginTop: 0,
                            borderRadius: isMobile ? '0px' : '0 0 12px 12px',
                            border: isMobile ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            borderTop: 'none',
                            minHeight: isMobile ? '200px' : '400px',
                        }}
                        className="tab-content"
                    >
                        <TabPanel value={tab} index={0}>
                            <UserPosts 
                              username={profile.username} 
                              isOwnProfile={isOwnProfile} 
                            />
                        </TabPanel>
                    
                        <TabPanel value={tab} index={1}>
                            {profile && (
                                <FollowersList userId={profile.id} />
                            )}
                        </TabPanel>
                    
                        <TabPanel value={tab} index={2}>
                            {profile && (
                                <FollowingList userId={profile.id} />
                            )}
                        </TabPanel>
                    
                        <TabPanel value={tab} index={3}>
                            <Box p={isMobile ? 0.5 : 3}>
                                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
                                    Liked Posts
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Liked posts will be loaded here...
                                </Typography>
                            </Box>
                        </TabPanel>
                    </div>
                </Box>
            </Box>
        </Container>
    );
};

export default ModernProfilePage;

