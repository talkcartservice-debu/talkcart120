import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { api } from '@/lib/api';
import { Post } from '@/types/social';
import PostCard from '@/components/social/new/PostCard';
import toast from 'react-hot-toast';

interface PublicFeedProps {
  maxPosts?: number;
  contentFilter?: 'all' | 'text' | 'image' | 'video';
  sortBy?: 'recent' | 'popular' | 'trending';
  showHeader?: boolean;
}

const PublicFeed: React.FC<PublicFeedProps> = ({
  maxPosts = 20,
  contentFilter = 'all',
  sortBy = 'recent',
  showHeader = true,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicPosts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params: Record<string, any> = {
          limit: maxPosts,
          contentType: contentFilter,
          sortBy,
        };
        
        const response = await api.posts.getPublicPosts(params);
        
        if (response && response.success && response.data && response.data.posts) {
          // Transform posts to ensure they have the right structure
          const transformedPosts = response.data.posts.map((post: any) => ({
            ...post,
            id: post.id || post._id,
            likes: post.likeCount || post.likes || 0,
            comments: post.commentCount || post.comments || 0,
            shares: post.shareCount || post.shares || 0,
            bookmarks: post.bookmarkCount || 0,
            isLiked: post.isLiked || false,
            isBookmarked: post.isBookmarked || false,
            isShared: post.isShared || false,
            author: post.author ? {
              ...post.author,
              id: post.author.id || post.author._id,
              displayName: post.author.displayName || post.author.username,
            } : null,
          }));
          
          setPosts(transformedPosts);
        } else {
          throw new Error(response?.message || 'Failed to fetch public posts');
        }
      } catch (err: any) {
        console.error('Error fetching public posts:', err);
        setError(err.message || 'Failed to load posts. Please try again later.');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPublicPosts();
  }, [maxPosts, contentFilter, sortBy]);

  const handleLikePost = async (postId: string) => {
    try {
      // Type the response properly
      const response: any = await api.posts.like(postId);
      if (response && response.success) {
        setPosts(posts.map(post => post.id === postId ? { ...post, likes: post.likes + 1 } : post));
      } else {
        throw new Error(response.message || 'Failed to like post');
      }
    } catch (err: any) {
      console.error('Error liking post:', err);
      toast.error(err.message || 'Failed to like post. Please try again later.');
    }
  };

  const handleCommentPost = async (postId: string) => {
    try {
      // For the PostCard component, we just need to update the comment count
      setPosts(posts.map(post => post.id === postId ? { ...post, comments: post.comments + 1 } : post));
    } catch (err: any) {
      console.error('Error commenting on post:', err);
      toast.error(err.message || 'Failed to comment on post. Please try again later.');
    }
  };

  const handleSharePost = async (post: Post) => {
    try {
      // Type the response properly
      const response: any = await api.posts.share(post.id);
      if (response && response.success) {
        setPosts(posts.map(p => p.id === post.id ? { ...p, shares: p.shares + 1 } : p));
      } else {
        throw new Error(response.message || 'Failed to share post');
      }
    } catch (err: any) {
      console.error('Error sharing post:', err);
      toast.error(err.message || 'Failed to share post. Please try again later.');
    }
  };

  const handleBookmarkPost = async (postId: string) => {
    try {
      // Type the response properly
      const response: any = await api.posts.bookmark(postId);
      if (response && response.success) {
        toast.success('Post bookmarked successfully');
      } else {
        throw new Error(response.message || 'Failed to bookmark post');
      }
    } catch (err: any) {
      console.error('Error bookmarking post:', err);
      toast.error(err.message || 'Failed to bookmark post. Please try again later.');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {showHeader && (
        <Box mb={3}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Public Feed
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Recent posts from our community
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {posts.length === 0 ? (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight={200}
          textAlign="center"
        >
          <Box>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No public posts available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Be the first to share something with the community!
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {posts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              onLike={handleLikePost}
              onComment={handleCommentPost}
              onShare={handleSharePost}
              onBookmark={handleBookmarkPost}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PublicFeed;