import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    Container,
    Tabs,
    Tab,
    Paper,
    Typography,
    Grid,
    useTheme,
    useMediaQuery,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    GridView,
    Article,
    Favorite,
    Bookmark,
    Image as ImageIcon,
    VideoLibrary,
    People,
    PersonAdd,
} from '@mui/icons-material';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { api } from '@/lib/api';
import ProfileHeader from './ProfileHeader';
import PostGrid from '../posts/PostGrid';
import MediaGrid from '../media/MediaGrid';
import UserCard from './UserCard';
import EditProfileDialog from './EditProfileDialog';
import toast from 'react-hot-toast';

interface ProfilePageProps {
    username: string;
    initialUser?: User;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`profile-tabpanel-${index}`}
            aria-labelledby={`profile-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
};

const ProfilePage: React.FC<ProfilePageProps> = ({ username, initialUser }) => {
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user: currentUser } = useAuth();
    const { socket, isConnected } = useWebSocket();

    const [user, setUser] = useState<User | null>(initialUser || null);
    const [loading, setLoading] = useState(!initialUser);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [followers, setFollowers] = useState<any[]>([]);
    const [following, setFollowing] = useState<any[]>([]);
    const [followersLoading, setFollowersLoading] = useState(false);
    const [followingLoading, setFollowingLoading] = useState(false);
    const [editProfileOpen, setEditProfileOpen] = useState(false);

    const isOwnProfile = currentUser?.username === username;

    // Fetch user profile
    useEffect(() => {
        const fetchUser = async () => {
            if (initialUser) return;

            try {
                setLoading(true);
                setError(null);

                // Type the response properly
                const response: any = await api.users.getByUsername(username);
                if (response && response.success && response.user) {
                    setUser(response.user);
                    setIsFollowing(response.user.isFollowing || false);
                } else {
                    setError('User not found');
                }
            } catch (err: any) {
                console.error('Error fetching user:', err);
                setError(err.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [username, initialUser]);

    // Listen for real-time follow updates
    useEffect(() => {
        if (isOwnProfile || !user) return;

        const handleFollowersUpdate = (event: CustomEvent) => {
            const data = event.detail;
            // Update follower count when someone follows/unfollows this user
            if (data.userId === user._id) {
                setUser(prev => prev ? {
                    ...prev,
                    followerCount: data.followerCount || 0
                } : null);
            }
        };

        const handleFollowingUpdate = (event: CustomEvent) => {
            const data = event.detail;
            // Update following status when current user follows/unfollows someone
            if (data.userId === user._id) {
                // Refresh user data to get updated following status
                api.users.getByUsername(username).then((response: any) => {
                    if (response && response.success && response.user) {
                        setUser(response.user);
                        setIsFollowing(response.user.isFollowing || false);
                    }
                }).catch(err => {
                    console.error('Error refreshing user data:', err);
                });
            }
        };

        // Listen for custom events
        window.addEventListener('user:followers-update', handleFollowersUpdate as EventListener);
        window.addEventListener('user:following-update', handleFollowingUpdate as EventListener);

        // Also listen for socket events if socket is available
        if (socket && isConnected) {
            socket.on('user:followers-update', handleFollowersUpdate);
            socket.on('user:following-update', handleFollowingUpdate);
        }

        return () => {
            window.removeEventListener('user:followers-update', handleFollowersUpdate as EventListener);
            window.removeEventListener('user:following-update', handleFollowingUpdate as EventListener);
            
            if (socket) {
                socket.off('user:followers-update', handleFollowersUpdate);
                socket.off('user:following-update', handleFollowingUpdate);
            }
        };
    }, [socket, isConnected, user, currentUser, isOwnProfile, username]);

    // Fetch followers when followers tab is activated
    useEffect(() => {
        if (activeTab === 3 && user && user._id) { // Followers tab index
            fetchFollowers();
        }
    }, [activeTab, user]);

    // Fetch following when following tab is activated
    useEffect(() => {
        if (activeTab === 4 && user && user._id) { // Following tab index
            fetchFollowing();
        }
    }, [activeTab, user]);

    // Handle tab change
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // Handle follow/unfollow
    const handleFollow = async () => {
        if (!user || !currentUser || !user._id) return;

        try {
            setFollowLoading(true);
            const response: any = await api.users.follow(user._id as string);

            if (response && response.success) {
                setIsFollowing(true);
                const newFollowerCount = response.data?.followerCount || (user.followerCount || 0) + 1;
                setUser(prev => prev ? {
                    ...prev,
                    followerCount: newFollowerCount
                } : null);
                
                // Dispatch event to update current user's following count
                window.dispatchEvent(new CustomEvent('user:following-count-update', {
                    detail: { delta: 1, followingCount: response.data?.followingCount }
                }));
                
                // Dispatch events to update follower/following counts across the platform
                window.dispatchEvent(new CustomEvent('user:followers-update', {
                    detail: { userId: user._id, followerCount: newFollowerCount }
                }));
                
                window.dispatchEvent(new CustomEvent('user:following-update', {
                    detail: { userId: user._id, followingCount: response.data?.followingCount }
                }));
                
                toast.success(`You are now following ${user.displayName || user.username}`);
            }
        } catch (err: any) {
            console.error('Follow error:', err);
            toast.error(err.message || 'Failed to follow user');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleUnfollow = async () => {
        if (!user || !currentUser || !user._id) return;

        try {
            setFollowLoading(true);
            const response: any = await api.users.unfollow(user._id as string);

            if (response && response.success) {
                setIsFollowing(false);
                const newFollowerCount = response.data?.followerCount || Math.max((user.followerCount || 0) - 1, 0);
                setUser(prev => prev ? {
                    ...prev,
                    followerCount: newFollowerCount
                } : null);
                
                // Dispatch event to update current user's following count
                window.dispatchEvent(new CustomEvent('user:following-count-update', {
                    detail: { delta: -1, followingCount: response.data?.followingCount }
                }));
                
                // Dispatch events to update follower/following counts across the platform
                window.dispatchEvent(new CustomEvent('user:followers-update', {
                    detail: { userId: user._id, followerCount: newFollowerCount }
                }));
                
                window.dispatchEvent(new CustomEvent('user:following-update', {
                    detail: { userId: user._id, followingCount: response.data?.followingCount }
                }));
                
                toast.success(`You unfollowed ${user.displayName || user.username}`);
            }
        } catch (err: any) {
            console.error('Unfollow error:', err);
            toast.error(err.message || 'Failed to unfollow user');
        } finally {
            setFollowLoading(false);
        }
    };

    // Handle message
    const handleMessage = async () => {
        if (!user || !currentUser || !user._id) return;

        try {
            // Create or get existing conversation
            const response: any = await api.messages.createConversation([user._id as string]);

            if (response && response.success && response.conversation) {
                // Navigate to messages page with conversation
                window.location.href = `/messages?conversation=${response.conversation._id}`;
            }
        } catch (err: any) {
            console.error('Message error:', err);
            toast.error(err.message || 'Failed to start conversation');
        }
    };

    // Fetch followers list
    const fetchFollowers = async () => {
        if (!user || !user._id) return;

        try {
            setFollowersLoading(true);
            const response: any = await api.users.getFollowers(user._id as string, 1, 50);
            if (response && response.success && response.data) {
                setFollowers(response.data.followers || []);
            }
        } catch (err: any) {
            console.error('Error fetching followers:', err);
            toast.error(err.message || 'Failed to load followers');
        } finally {
            setFollowersLoading(false);
        }
    };

    // Fetch following list
    const fetchFollowing = async () => {
        if (!user || !user._id) return;

        try {
            setFollowingLoading(true);
            const response: any = await api.users.getFollowing(user._id as string, 1, 50);
            if (response && response.success && response.data) {
                setFollowing(response.data.following || []);
            }
        } catch (err: any) {
            console.error('Error fetching following:', err);
            toast.error(err.message || 'Failed to load following');
        } finally {
            setFollowingLoading(false);
        }
    };



    const handleUserUpdate = (updatedFields: Partial<User>) => {
        if (user) {
            setUser({ ...user, ...updatedFields });
        }
    };

    const handleEditProfile = () => {
        setEditProfileOpen(true);
    };

    const handleSettings = () => {
        // Navigate to settings page
        router.push('/settings');
    };

    const handleProfileUpdated = (updatedUser: User) => {
        setUser(updatedUser);
        setEditProfileOpen(false);
        toast.success('Profile updated successfully!');
        // Dispatch event to update profile across the app
        window.dispatchEvent(new CustomEvent('user-profile-updated', { 
            detail: { user: updatedUser } 
        }));
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <ProfileHeader
                    user={{} as User}
                    isOwnProfile={isOwnProfile}
                    onUserUpdate={handleUserUpdate}
                />
            </Container>
        );
    }

    if (error || !user) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error || 'User not found'}
                </Alert>
            </Container>
        );
    }

    const tabs = [
        { label: 'Posts', icon: <Article />, value: 'posts' },
        { label: 'Media', icon: <ImageIcon />, value: 'media' },
        { label: 'Videos', icon: <VideoLibrary />, value: 'videos' },
        { label: 'Followers', icon: <People />, value: 'followers' },
        { label: 'Following', icon: <PersonAdd />, value: 'following' },
        ...(isOwnProfile ? [
            { label: 'Liked', icon: <Favorite />, value: 'liked' },
            { label: 'Saved', icon: <Bookmark />, value: 'saved' },
        ] : []),
    ];

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Profile Header */}
            <ProfileHeader
                user={user}
                isOwnProfile={isOwnProfile}
                isFollowing={isFollowing}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                onEditProfile={handleEditProfile}
                onSettings={handleSettings}
                onUserUpdate={handleUserUpdate}
                followersCount={user.followerCount}
                followingCount={user.followingCount}
                postsCount={user.postCount}
            />

            {/* Edit Profile Dialog */}
            {isOwnProfile && (
                <EditProfileDialog
                    open={editProfileOpen}
                    onClose={() => setEditProfileOpen(false)}
                    user={user}
                    onProfileUpdated={handleProfileUpdated}
                />
            )}

            {/* Content Tabs */}
            <Paper elevation={0} sx={{ borderRadius: 3 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        variant={isMobile ? 'scrollable' : 'fullWidth'}
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTab-root': {
                                minHeight: 64,
                                textTransform: 'none',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                            },
                        }}
                    >
                        {tabs.map((tab, index) => (
                            <Tab
                                key={tab.value}
                                label={tab.label}
                                icon={tab.icon}
                                iconPosition="start"
                                sx={{ gap: 1 }}
                            />
                        ))}
                    </Tabs>
                </Box>

                {/* Tab Panels */}
                {user._id && (
                    <>
                        <TabPanel value={activeTab} index={0}>
                            <PostGrid
                                userId={user._id}
                                username={user.username}
                                showPrivate={isOwnProfile}
                            />
                        </TabPanel>

                        <TabPanel value={activeTab} index={1}>
                            <MediaGrid
                                userId={user._id}
                                mediaType="image"
                                showPrivate={isOwnProfile}
                            />
                        </TabPanel>

                        <TabPanel value={activeTab} index={2}>
                            <MediaGrid
                                userId={user._id}
                                mediaType="video"
                                showPrivate={isOwnProfile}
                            />
                        </TabPanel>

                        <TabPanel value={activeTab} index={3}>
                            {followersLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress />
                                </Box>
                            ) : followers.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography color="text.secondary">
                                        No followers yet
                                    </Typography>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
                                    {followers.map((follower: any) => (
                                        <UserCard
                                            key={follower.id || follower._id}
                                            user={follower}
                                            showFollowButton={true}
                                            size="medium"
                                        />
                                    ))}
                                </Box>
                            )}
                        </TabPanel>

                        <TabPanel value={activeTab} index={4}>
                            {followingLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <CircularProgress />
                                </Box>
                            ) : following.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography color="text.secondary">
                                        Not following anyone yet
                                    </Typography>
                                </Box>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
                                    {following.map((followedUser: any) => (
                                        <UserCard
                                            key={followedUser.id || followedUser._id}
                                            user={followedUser}
                                            showFollowButton={true}
                                            size="medium"
                                        />
                                    ))}
                                </Box>
                            )}
                        </TabPanel>

                        {isOwnProfile && (
                            <>
                                <TabPanel value={activeTab} index={5}>
                                    <PostGrid
                                        userId={user._id}
                                        username={user.username}
                                        filter="liked"
                                        showPrivate={true}
                                    />
                                </TabPanel>

                                <TabPanel value={activeTab} index={6}>
                                    <PostGrid
                                        userId={user._id}
                                        username={user.username}
                                        filter="saved"
                                        showPrivate={true}
                                    />
                                </TabPanel>
                            </>
                        )}
                    </>
                )}
            </Paper>
        </Container>
    );
};

export default ProfilePage;