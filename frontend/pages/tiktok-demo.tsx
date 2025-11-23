import React from 'react';
import { Container, Box, Typography, useTheme } from '@mui/material';
import Layout from '@/components/layout/Layout';
import TikTokStyleVideoPost from '@/components/social/new/TikTokStyleVideoPost';

const TikTokDemoPage = () => {
  const theme = useTheme();

  // Mock data for demonstration
  const mockVideoPost = {
    videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    thumbnailUrl: 'https://i.pravatar.cc/300',
    author: {
      username: 'creative_user',
      displayName: 'Creative Creator',
      avatar: 'https://i.pravatar.cc/150?img=1'
    },
    content: 'Check out this amazing video! #trending #fun #viral',
    tags: ['trending', 'fun', 'viral', 'entertainment'],
    likeCount: 12500,
    commentCount: 342,
    shareCount: 892,
    songName: 'Original Sound - Creative Creator'
  };

  const handleLike = () => {
    console.log('Liked post');
  };

  const handleComment = () => {
    console.log('Commented on post');
  };

  const handleShare = () => {
    console.log('Shared post');
  };

  const handleBookmark = () => {
    console.log('Bookmarked post');
  };

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          TikTok-Style Components Demo
        </Typography>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          TikTok-Style Video Post
        </Typography>
        
        <Box sx={{ 
          height: 600, 
          borderRadius: 2, 
          overflow: 'hidden',
          mb: 4,
          boxShadow: `0 8px 32px ${theme.palette.primary.main}20`
        }}>
          <TikTokStyleVideoPost
            videoUrl={mockVideoPost.videoUrl}
            thumbnailUrl={mockVideoPost.thumbnailUrl}
            author={mockVideoPost.author}
            content={mockVideoPost.content}
            tags={mockVideoPost.tags}
            likeCount={mockVideoPost.likeCount}
            commentCount={mockVideoPost.commentCount}
            shareCount={mockVideoPost.shareCount}
            songName={mockVideoPost.songName}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            onBookmark={handleBookmark}
          />
        </Box>
        
        <Typography variant="body1" sx={{ mt: 4 }}>
          This demo showcases our new TikTok-style components for the social feed. 
          The video post component features:
        </Typography>
        
        <Box component="ul" sx={{ pl: 2, mt: 2 }}>
          <li>
            <Typography variant="body1">
              Full-screen video player with autoplay
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              TikTok-style overlay content with gradient background
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              Vertical side action buttons (like, comment, share, bookmark)
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              Mute/unmute controls
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              User follow functionality
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              Hashtag support
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              Song/track information display
            </Typography>
          </li>
        </Box>
      </Container>
    </Layout>
  );
};

export default TikTokDemoPage;

// Add getStaticPaths to fix prerendering errors
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  };
}
