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
                padding: isMobile ? '4px' : '20px',
                textAlign: 'center',
                background: cardBackground,
                border: cardBorder,
                borderRadius: '16px',
                transition: 'all 0.3s ease',
                cursor: onClick ? 'pointer' : 'default',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
            }}
            className="stats-card"
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                <Box sx={{ color: theme.palette.primary.main, marginRight: '4px' }}>{icon}</Box>
                <Typography variant={isMobile ? "h6" : "h4"} fontWeight="bold" color="primary.main">
                    {value.toLocaleString()}
                </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight="medium" style={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}>
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
                overflow: 'hidden',
                borderRadius: isMobile ? 0 : 24,
                background: '#f5f5f5',
                border: isMobile ? 'none' : '1px solid #e0e0e0',
                boxShadow: isMobile ? 'none' : '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
            }}
        >
            {/* Profile Content */}
            <Box sx={{ p: { xs: 0.5, sm: 1.5, md: 3 }, pt: 0 }}>
                {/* Avatar and Basic Info */}
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: { xs: 'center', sm: 'flex-end' }, 
                    flexDirection: { xs: 'column', sm: 'row' },
                    mb: 2, 
                    mt: { xs: -2, sm: -4 },
                    textAlign: { xs: 'center', sm: 'left' }
                }}>
                    <Box sx={{ position: 'relative', mr: { xs: 0, sm: 3 }, mb: { xs: 2, sm: 0 } }}>
                        <Avatar
                            src={profile.avatar}
                            sx={{
                                width: { xs: 56, sm: 90, md: 120 },
                                height: { xs: 56, sm: 90, md: 120 },
                                border: '4px solid ' + theme.palette.background.paper,
                                boxShadow: theme.shadows[8],
                                fontSize: { xs: '1rem', sm: '1.5rem', md: '2.5rem' },
                                fontWeight: 'bold',
                            }}
                        >
                            {profile.displayName?.charAt(0) || profile.username?.charAt(0)}
                        </Avatar>
                        {isOwnProfile && (
                            <Box sx={{
                                position: 'absolute',
                                bottom: -8,
                                right: -8,
                            }}>
                                <ProfilePictureUpload
                                    user={{
                                        ...profile,
                                        displayName: profile.displayName || '',
                                        isVerified: profile.isVerified || false,
                                        cover: undefined
                                    } as any}
                                    onUploadSuccess={handleAvatarUploadSuccess}
                                    size={isMobile ? 56 : 120}
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
                        width: '100%',
                        mt: { xs: 1, sm: 0 }
                    }}>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5, 
                            mb: 1,
                            justifyContent: { xs: 'center', sm: 'flex-start' },
                            flexWrap: 'wrap'
                        }}>
                        <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold" noWrap sx={{ maxWidth: '100%' }}>
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
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: { xs: 0.5, sm: 1 },
                            width: '100%',
                            justifyContent: { xs: 'center', sm: 'flex-start' }
                        }}>
                            {isOwnProfile ? (
                                <Button
                                    variant="contained"
                                    startIcon={<Edit />}
                                    onClick={onEditProfile}
                                    size={isMobile ? "small" : "medium"}
                                    sx={{ 
                                        borderRadius: 2,
                                        mb: { xs: 0, sm: 0 },
                                        minWidth: { xs: '40%', sm: 'auto' },
                                        fontSize: { xs: '0.7rem', sm: '0.8rem', md: '1rem' },
                                        py: isMobile ? 0.5 : 1
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
                                            mb: { xs: 0, sm: 0 },
                                            minWidth: { xs: '40%', sm: 'auto' },
                                            fontSize: { xs: '0.7rem', sm: '0.8rem', md: '1rem' },
                                            py: isMobile ? 0.5 : 1
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
                                            mb: { xs: 0, sm: 0 },
                                            minWidth: { xs: '40%', sm: 'auto' },
                                            fontSize: { xs: '0.7rem', sm: '0.8rem', md: '1rem' },
                                            py: isMobile ? 0.5 : 1
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
                    gap: { xs: 0.5, sm: 1 }
                }}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        mb: { xs: 0.5, sm: 0 }
                    }}>
                        <LocationOn sx={{ fontSize: { xs: 12, sm: 14, md: 18 }, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' }, wordBreak: 'break-word' }}>
                            {profile.location}
                        </Typography>
                    </Box>

                    {profile.website && (
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            mb: { xs: 0.5, sm: 0 }
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
                                    fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' }
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
                        gap: 0.5
                    }}>
                        <CalendarToday sx={{ fontSize: { xs: 12, sm: 14, md: 18 }, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem', md: '0.875rem' } }}>
                            Joined {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                year: 'numeric'
                            }) : 'Recently'}
                        </Typography>
                    </Box>
                </Box>

                {/* Stats - Responsive grid */}
                <Grid container spacing={1}>
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
        { label: 'Media', icon: <ImageIcon />, disabled: false },
        { label: 'Videos', icon: <PlayArrow />, disabled: false },
        { label: 'Followers', icon: <PersonAdd />, disabled: false },
        { label: 'Following', icon: <PersonRemove />, disabled: false },
        { label: 'Liked', icon: <Favorite />, disabled: !isOwnProfile },
        { label: 'Saved', icon: <Bookmark />, disabled: !isOwnProfile },
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
                scrollButtons={isMobile ? "auto" : false}
                allowScrollButtonsMobile={isMobile}
                sx={{
                    '& .MuiTab-root': {
                        minHeight: { xs: 40, sm: 64 },
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: { xs: '0.75rem', sm: '0.95rem' },
                        '&.Mui-selected': {
                            color: 'primary.main',
                        },
                        minWidth: { xs: 'auto', sm: 'auto' }
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
                        label={isMobile && tab.label.length > 6 ? tab.label.substring(0, 6) + '...' : tab.label}
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
        <Container maxWidth="lg" sx={{ py: { xs: 0.5, sm: 2, md: 4 } }}>
            <Box>
                {/* Profile Header */}
                <ProfileHeader
                    profile={profile}
                    isOwnProfile={isOwnProfile}
                    onEditProfile={() => setEditMode(true)}
                    onFollow={handleFollow}
                    onMessage={() => router.push(`/messages?user=${profile.username}`)}
                    onAvatarUpdate={handleAvatarUpdate} // Use the new handler
                    onFollowersClick={() => setTab(3)}
                    onFollowingClick={() => setTab(4)}
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
                            minHeight: isMobile ? '250px' : '400px',
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
                            <Box p={isMobile ? 1 : 3}>
                                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
                                    Media
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Media content will be loaded here...
                                </Typography>
                            </Box>
                        </TabPanel>
                    
                        <TabPanel value={tab} index={2}>
                            <Box p={isMobile ? 1 : 3}>
                                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
                                    Videos
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Video content will be loaded here...
                                </Typography>
                            </Box>
                        </TabPanel>
                    
                        <TabPanel value={tab} index={3}>
                            {profile && (
                                <FollowersList userId={profile.id} />
                            )}
                        </TabPanel>
                    
                        <TabPanel value={tab} index={4}>
                            {profile && (
                                <FollowingList userId={profile.id} />
                            )}
                        </TabPanel>
                    
                        <TabPanel value={tab} index={5}>
                            <Box p={isMobile ? 1 : 3}>
                                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
                                    Liked Posts
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Liked posts will be loaded here...
                                </Typography>
                            </Box>
                        </TabPanel>
                    
                        <TabPanel value={tab} index={6}>
                            <Box p={isMobile ? 1 : 3}>
                                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
                                    Saved Posts
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Saved posts will be loaded here...
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

