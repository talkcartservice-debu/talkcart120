import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import PostCard from '@/components/social/new/PostCard';
import { api } from '@/lib/api';
import { Post } from '@/types/social';
import toast from 'react-hot-toast';

interface UserAchievementsProps {
  username: string;
  isOwnProfile: boolean;
}

const UserAchievements: React.FC<UserAchievementsProps> = ({ username, isOwnProfile }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [achievements, setAchievements] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAchievements = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch user achievement posts from the API
        const response: any = await api.posts.getUserAchievements(username, { limit: 20 });
        
        if (response?.success && response?.data?.posts) {
          // Transform the posts to match the Post interface
          const transformedAchievements: Post[] = response.data.posts.map((post: any) => ({
            id: post.id || post._id,
            _id: post._id,
            type: post.type || 'text',
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
            isAchievement: post.isAchievement || false,
            achievementType: post.achievementType || 'milestone',
            achievementData: post.achievementData || {},
          }));
          
          setAchievements(transformedAchievements);
        } else {
          throw new Error(response?.message || 'Failed to fetch user achievements');
        }
      } catch (err: any) {
        console.error('Error fetching user achievements:', err);
        setError(err.message || 'Failed to load achievements. Please try again later.');
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (username) {
      fetchUserAchievements();
    }
  }, [username, isOwnProfile]);

  const handleLikePost = async (postId: string) => {
    try {
      const response: any = await api.posts.like(postId);
      if (response && response.success) {
        setAchievements(achievements.map(post => 
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
        setAchievements(achievements.map(post => 
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
      setAchievements(achievements.filter(post => post.id !== postId));
      toast.success('Post deleted successfully');
    } catch (err: any) {
      console.error('Error deleting post:', err);
      // Add the post back to the list if deletion failed
      toast.error(err.message || 'Failed to delete post. Please try again later.');
    }
  };

  const handlePostUpdate = async (updatedPost: Post) => {
    try {
      setAchievements(achievements.map(post => 
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
            Error Loading Achievements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (achievements.length === 0) {
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
            No achievements yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isOwnProfile 
              ? "You haven't shared any achievements yet. Create your first achievement!" 
              : "This user hasn't shared any achievements yet."}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={isMobile ? 1 : 2} p={isMobile ? 0.5 : 1}>
      {achievements.map((post) => (
        <PostCard 
          key={post.id} 
          post={post} 
          onLike={handleLikePost}
          onBookmark={handleBookmarkPost}
          onDelete={handleDeletePost}
          onPostUpdate={handlePostUpdate}
        />
      ))}
    </Box>
  );
};

export default UserAchievements;