import React, { useState, useEffect } from 'react';
import {
    Grid,
    Card,
    CardMedia,
    CardContent,
    Typography,
    Box,
    IconButton,
    Avatar,
    Chip,
    Skeleton,
    Alert,
    Button,
} from '@mui/material';
import {
    Favorite,
    FavoriteBorder,
    Comment,
    Share,
    MoreVert,
    PlayArrow,
    Image as ImageIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import UnifiedVideoMedia from '@/components/media/UnifiedVideoMedia';
import UnifiedImageMedia from '@/components/media/UnifiedImageMedia';

interface Post {
    _id: string;
    content: string;
    media?: Array<{
        url: string;
        type: 'image' | 'video';
        thumbnail?: string;
    }>;
    author: {
        _id: string;
        username: string;
        displayName?: string;
        avatar?: string;
    };
    likes: string[];
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    isLiked?: boolean;
}

interface PostGridProps {
    userId: string;
    username: string;
    filter?: 'all' | 'liked' | 'saved';
    showPrivate?: boolean;
}

const PostGrid: React.FC<PostGridProps> = ({
    userId,
    username,
    filter = 'all',
    showPrivate = false,
}) => {
    const { user: currentUser } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Fetch posts
    useEffect(() => {
        const loadPosts = async () => {
            try {
                setLoading(true);
                setError(null);

                let response;
                switch (filter) {
                    case 'liked':
                        response = await api.posts.getLikedPosts(page);
                        break;
                    case 'saved':
                        response = await api.posts.getSavedPosts(page);
                        break;
                    default:
                        response = await api.posts.getUserPosts(userId, { page, showPrivate });
                }

                // Check if response indicates success
                if (response?.success && response?.data?.posts) {
                    if (page === 1) {
                        setPosts(response.data.posts);
                    } else {
                        setPosts(prev => [...prev, ...response.data.posts]);
                    }
                    setHasMore(response.data.hasMore || false);
                } else if (response?.success && response?.posts) {
                    // Handle older API response format
                    if (page === 1) {
                        setPosts(response.posts);
                    } else {
                        setPosts(prev => [...prev, ...response.posts]);
                    }
                    setHasMore(response.hasMore || false);
                } else {
                    // Handle error response properly
                    const errorMessage = response?.message || response?.error || 'Failed to load posts';
                    throw new Error(errorMessage);
                }
            } catch (err: any) {
                console.error('Error fetching posts:', err);
                // Handle HttpError specifically
                if (err.name === 'HttpError') {
                    // Use a more user-friendly error message based on status
                    let userFriendlyMessage = 'Failed to load posts. Please try again later.';
                    if (err.status === 404) {
                        userFriendlyMessage = 'User profile not found';
                    } else if (err.status === 401) {
                        userFriendlyMessage = 'You need to login to view this profile';
                    } else if (err.status === 403) {
                        userFriendlyMessage = 'Access denied. You do not have permission to view this profile';
                    } else if (err.message) {
                        userFriendlyMessage = err.message;
                    }
                    setError(userFriendlyMessage);
                } else {
                    // Handle other types of errors
                    const userFriendlyMessage = err.message === 'User not found' 
                        ? 'User profile not found' 
                        : err.message || 'Failed to load posts. Please try again later.';
                    setError(userFriendlyMessage);
                }
            } finally {
                setLoading(false);
            }
        };

        loadPosts();
    }, [userId, filter, showPrivate, page]);

    // Handle like/unlike
    const handleLike = async (postId: string, isLiked: boolean) => {
        if (!currentUser) return;

        try {
            // Type the response properly
            const response: any = isLiked
                ? await api.posts.unlikePost(postId)
                : await api.posts.likePost(postId);

            if (response && response.success) {
                setPosts(prev => prev.map(post =>
                    post._id === postId
                        ? {
                            ...post,
                            isLiked: !isLiked,
                            likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1
                        }
                        : post
                ));
            } else {
                throw new Error(response?.message || 'Failed to update like');
            }
        } catch (err: any) {
            console.error('Like error:', err);
            toast.error(err.message || 'Failed to update like');
        }
    };

    // Load more posts
    const loadMore = () => {
        if (!loading && hasMore) {
            setPage(prev => prev + 1);
        }
    };

    if (loading && page === 1) {
        return (
            <Grid container spacing={2}>
                {Array.from({ length: 6 }).map((_, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card sx={{ borderRadius: 2 }}>
                            <Skeleton variant="rectangular" height={200} />
                            <CardContent>
                                <Skeleton variant="text" width="80%" />
                                <Skeleton variant="text" width="60%" />
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
            </Alert>
        );
    }

    if (posts.length === 0) {
        return (
            <Box
                sx={{
                    textAlign: 'center',
                    py: 8,
                    color: 'text.secondary',
                }}
            >
                <ImageIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                    No posts yet
                </Typography>
                <Typography variant="body2">
                    {filter === 'liked'
                        ? "Posts you like will appear here"
                        : filter === 'saved'
                            ? "Posts you save will appear here"
                            : `${username} hasn't posted anything yet`
                    }
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Grid container spacing={2}>
                {posts.map((post) => (
                    <Grid item xs={12} sm={6} md={4} key={post._id}>
                        <Card
                            sx={{
                                borderRadius: 2,
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: 4,
                                },
                            }}
                            onClick={() => {
                                // Navigate to post detail
                                window.location.href = `/post/${post._id}`;
                            }}
                        >
                            {/* Media Preview */}
                            {post.media && post.media.length > 0 && (
                                <Box sx={{ position: 'relative' }}>
                                    {post.media[0]?.type === 'video' ? (
                                        <UnifiedVideoMedia
                                            src={post.media[0]?.thumbnail || post.media[0]?.url || ''}
                                            alt="Post media"
                                            style={{
                                                width: '100%',
                                                height: 200,
                                                objectFit: 'cover',
                                                display: 'block'
                                            }}
                                        />
                                    ) : (
                                        <UnifiedImageMedia
                                            src={post.media[0]?.thumbnail || post.media[0]?.url || ''}
                                            alt="Post media"
                                            style={{
                                                width: '100%',
                                                height: 200,
                                                objectFit: 'cover',
                                                display: 'block'
                                            }}
                                        />
                                    )}

                                    {/* Media type indicator */}
                                    {post.media[0]?.type === 'video' && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                bgcolor: 'rgba(0, 0, 0, 0.7)',
                                                borderRadius: 1,
                                                p: 0.5,
                                            }}
                                        >
                                            <PlayArrow sx={{ color: 'white', fontSize: 16 }} />
                                        </Box>
                                    )}

                                    {/* Multiple media indicator */}
                                    {post.media.length > 1 && (
                                        <Chip
                                            label={`+${post.media.length - 1}`}
                                            size="small"
                                            sx={{
                                                position: 'absolute',
                                                top: 8,
                                                left: 8,
                                                bgcolor: 'rgba(0, 0, 0, 0.7)',
                                                color: 'white',
                                            }}
                                        />
                                    )}
                                </Box>
                            )}

                            <CardContent sx={{ pb: 1 }}>
                                {/* Author Info */}
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Avatar
                                        src={post.author.avatar}
                                        alt={post.author.displayName || post.author.username}
                                        sx={{ width: 24, height: 24, mr: 1 }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {post.author.displayName || post.author.username}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                                    </Typography>
                                </Box>

                                {/* Content Preview */}
                                <Typography
                                    variant="body2"
                                    sx={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        mb: 1,
                                    }}
                                >
                                    {post.content}
                                </Typography>

                                {/* Actions */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLike(post._id, post.isLiked || false);
                                            }}
                                            color={post.isLiked ? 'error' : 'default'}
                                        >
                                            {post.isLiked ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                                        </IconButton>
                                        <Typography variant="caption" color="text.secondary">
                                            {post.likesCount}
                                        </Typography>

                                        <IconButton size="small">
                                            <Comment fontSize="small" />
                                        </IconButton>
                                        <Typography variant="caption" color="text.secondary">
                                            {post.commentsCount}
                                        </Typography>
                                    </Box>

                                    <IconButton size="small">
                                        <Share fontSize="small" />
                                    </IconButton>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Load More Button */}
            {hasMore && (
                <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Button
                        variant="outlined"
                        onClick={loadMore}
                        disabled={loading}
                        sx={{ borderRadius: 2 }}
                    >
                        {loading ? 'Loading...' : 'Load More'}
                    </Button>
                </Box>
            )}
        </Box>
    );
};

export default PostGrid;