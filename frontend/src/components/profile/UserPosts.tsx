import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import PostCard from '@/components/social/new/PostCard';
import { api } from '@/lib/api';
import { Post } from '@/types/social';
import toast from 'react-hot-toast';

interface UserPostsProps {
  username: string;
  isOwnProfile: boolean;
}

const UserPosts: React.FC<UserPostsProps> = ({ username, isOwnProfile }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch user posts from the API
        const response: any = await api.posts.getUserPosts(username, { limit: 20 });
        
        // Check if response indicates success
        if (response?.success && response?.data?.posts) {
          // Transform the posts to match the Post interface
          const transformedPosts: Post[] = response.data.posts.map((post: any) => ({
            id: post.id || post._id,
            _id: post._id,
            type: post.type || (post.media && post.media.length > 0 ? 
              (post.media[0]?.resource_type === 'video' ? 'video' : 
               post.media[0]?.resource_type === 'image' ? 'image' : 'text') : 'text'),
            content: post.content,
            author: {
              id: post.author?.id || post.author?._id,
              _id: post.author?._id,
              username: post.author?.username,
              displayName: post.author?.displayName,
              name: post.author?.displayName || post.author?.username,
              avatar: post.author?.avatar,
              isVerified: post.author?.isVerified,
              bio: post.author?.bio,
              role: post.author?.role,
              followerCount: post.author?.followerCount,
              location: post.author?.location,
            },
            media: Array.isArray(post.media) ? post.media.map((media: any) => ({
              ...media,
              resource_type: media.resource_type || 'image',
              secure_url: media.secure_url || media.url || '',
            })) : [],
            views: post.views || 0,
            likes: post.likes || post.likeCount || 0,
            comments: post.comments || post.commentCount || 0,
            shares: post.shares || post.shareCount || 0,
            bookmarkCount: post.bookmarks || post.bookmarkCount || 0,
            isLiked: post.isLiked || false,
            isBookmarked: post.isBookmarked || false,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            privacy: post.privacy,
            hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
          }));
          
          setPosts(transformedPosts);
        } else {
          // Handle error response properly
          const errorMessage = response?.message || response?.error || 'Failed to fetch user posts';
          throw new Error(errorMessage);
        }
      } catch (err: any) {
        console.error('Error fetching user posts:', err);
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
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (username) {
      fetchUserPosts();
    }
  }, [username, isOwnProfile]);

  const handleLikePost = async (postId: string) => {
    try {
      const response: any = await api.posts.like(postId);
      if (response && response.success) {
        setPosts(posts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes: post.isLiked ? post.likes - 1 : post.likes + 1,
                isLiked: !post.isLiked
              } 
            : post
        ));
      } else {
        throw new Error(response?.message || 'Failed to like post');
      }
    } catch (err: any) {
      console.error('Error liking post:', err);
      toast.error(err.message || 'Failed to like post. Please try again later.');
    }
  };

  const handleBookmarkPost = async (postId: string) => {
    try {
      const response: any = await api.posts.bookmark(postId);
      if (response && response.success) {
        setPosts(posts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                bookmarkCount: post.isBookmarked ? Math.max(0, (post.bookmarkCount || 0) - 1) : (post.bookmarkCount || 0) + 1,
                isBookmarked: !post.isBookmarked
              } 
            : post
        ));
        toast.success(response.data?.action === 'bookmark' ? 'Post bookmarked' : 'Post unbookmarked');
      } else {
        throw new Error(response?.message || 'Failed to bookmark post');
      }
    } catch (err: any) {
      console.error('Error bookmarking post:', err);
      toast.error(err.message || 'Failed to bookmark post. Please try again later.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      setPosts(posts.filter(post => post.id !== postId));
      toast.success('Post deleted successfully');
    } catch (err: any) {
      console.error('Error deleting post:', err);
      // Add the post back to the list if deletion failed
      // In a real implementation, you might want to refetch the posts instead
      toast.error(err.message || 'Failed to delete post. Please try again later.');
    }
  };

  // Add this new handler function
  const handlePostUpdate = async (updatedPost: Post) => {
    try {
      setPosts(posts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      ));
    } catch (err: any) {
      console.error('Error updating post:', err);
      toast.error(err.message || 'Failed to update post. Please try again later.');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={isMobile ? 150 : 200}>
        <CircularProgress size={isMobile ? 30 : 40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight={isMobile ? 150 : 200}
        textAlign="center"
        p={isMobile ? 1 : 2}
      >
        <Box>
          <Typography variant={isMobile ? "h6" : "h5"} color="error" gutterBottom>
            Error Loading Posts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (posts.length === 0) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight={isMobile ? 150 : 200}
        textAlign="center"
        p={isMobile ? 1 : 2}
      >
        <Box>
          <Typography variant={isMobile ? "h6" : "h5"} color="text.secondary" gutterBottom>
            No posts yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isOwnProfile 
              ? "You haven&apos;t posted anything yet. Share something with the community!" 
              : "This user hasn&apos;t posted anything yet."}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={isMobile ? 1 : 2} p={isMobile ? 0.5 : 1}>
      {posts.map((post) => (
        <PostCard 
          key={post.id} 
          post={post} 
          onLike={handleLikePost}
          onBookmark={handleBookmarkPost}
          onDelete={handleDeletePost}
          onPostUpdate={handlePostUpdate} // Add this line
        />
      ))}
    </Box>
  );
};

export default UserPosts;