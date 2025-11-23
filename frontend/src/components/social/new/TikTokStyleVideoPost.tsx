import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, IconButton, Button, useTheme } from '@mui/material';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Heart, 
  MessageSquare, 
  Share, 
  Bookmark,
  MoreHorizontal,
  Music
} from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';

interface TikTokStyleVideoPostProps {
  videoUrl: string;
  thumbnailUrl?: string;
  author: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  content?: string;
  tags?: string[];
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  songName?: string;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBookmark?: () => void;
}

const TikTokStyleVideoPost: React.FC<TikTokStyleVideoPostProps> = ({
  videoUrl,
  thumbnailUrl,
  author,
  content,
  tags = [],
  likeCount = 0,
  commentCount = 0,
  shareCount = 0,
  songName = 'Original Sound',
  onLike,
  onComment,
  onShare,
  onBookmark
}) => {
  const theme = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    onLike?.();
  };

  // Auto-play when component mounts
  useEffect(() => {
    const playVideo = async () => {
      if (videoRef.current) {
        try {
          await videoRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.log('Autoplay failed:', error);
        }
      }
    };

    playVideo();
  }, []);

  return (
    <Box sx={{ 
      position: 'relative', 
      width: '100%', 
      height: '100vh',
      bgcolor: '#000',
      overflow: 'hidden'
    }}>
      {/* Video Player */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        loop
        muted={isMuted}
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onClick={togglePlay}
      />

      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10
        }}>
          <IconButton 
            onClick={togglePlay}
            sx={{ 
              width: 64, 
              height: 64, 
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.3)'
              }
            }}
          >
            <Play size={32} color="white" />
          </IconButton>
        </Box>
      )}

      {/* Content Overlay */}
      <Box sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        p: 2,
        pt: 6,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        color: 'white',
        zIndex: 10
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <UserAvatar src={author.avatar} alt={author.username} size={40} />
          <Box sx={{ ml: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {author.displayName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              @{author.username}
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            size="small" 
            sx={{ 
              ml: 2, 
              color: 'white', 
              borderColor: 'rgba(255,255,255,0.3)',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                borderColor: 'white'
              }
            }}
          >
            Follow
          </Button>
        </Box>

        {content && (
          <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.4 }}>
            {content}
          </Typography>
        )}

        {tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {tags.map((tag, index) => (
              <Typography 
                key={index} 
                variant="caption" 
                sx={{ 
                  color: 'white',
                  fontWeight: 500,
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                #{tag}
              </Typography>
            ))}
          </Box>
        )}

        {songName && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Music size={16} style={{ marginRight: 8 }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
              {songName}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Side Action Buttons */}
      <Box sx={{
        position: 'absolute',
        right: 16,
        bottom: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        zIndex: 20
      }}>
        {/* Like button */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <IconButton 
            onClick={handleLike}
            sx={{ 
              width: 48,
              height: 48,
              bgcolor: liked ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              mb: 0.5,
              '&:hover': {
                bgcolor: liked ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.5)',
                transform: 'scale(1.1)'
              }
            }}
          >
            <Heart 
              size={24} 
              fill={liked ? theme.palette.error.main : 'none'} 
              color={liked ? theme.palette.error.main : 'white'} 
            />
          </IconButton>
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 500, fontSize: '0.75rem' }}>
            {likeCount}
          </Typography>
        </Box>
        
        {/* Comment button */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <IconButton 
            onClick={onComment}
            sx={{ 
              width: 48,
              height: 48,
              bgcolor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              mb: 0.5,
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.5)',
                transform: 'scale(1.1)'
              }
            }}
          >
            <MessageSquare size={24} color="white" />
          </IconButton>
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 500, fontSize: '0.75rem' }}>
            {commentCount}
          </Typography>
        </Box>
        
        {/* Share button */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <IconButton 
            onClick={onShare}
            sx={{ 
              width: 48,
              height: 48,
              bgcolor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              border: 'none',
              mb: 0.5,
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.5)',
                transform: 'scale(1.1)'
              }
            }}
          >
            <Share size={24} color="white" />
          </IconButton>
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 500, fontSize: '0.75rem' }}>
            {shareCount}
          </Typography>
        </Box>
        
        {/* Bookmark button */}
        <IconButton 
          onClick={onBookmark}
          sx={{ 
            width: 48,
            height: 48,
            bgcolor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            mt: 1,
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.5)',
              transform: 'scale(1.1)'
            }
          }}
        >
          <Bookmark size={24} color="white" />
        </IconButton>
        
        {/* User avatar at the bottom */}
        <Box sx={{ mt: 1 }}>
          <UserAvatar src={author.avatar} alt={author.username} size={48} />
        </Box>
      </Box>

      {/* Volume Control */}
      <Box sx={{
        position: 'absolute',
        right: 16,
        top: 16,
        zIndex: 20
      }}>
        <IconButton 
          onClick={toggleMute}
          sx={{ 
            width: 40,
            height: 40,
            bgcolor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.5)'
            }
          }}
        >
          {isMuted ? <VolumeX size={20} color="white" /> : <Volume2 size={20} color="white" />}
        </IconButton>
      </Box>

      {/* More Options */}
      <Box sx={{
        position: 'absolute',
        right: 16,
        top: 72,
        zIndex: 20
      }}>
        <IconButton 
          sx={{ 
            width: 40,
            height: 40,
            bgcolor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(10px)',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.5)'
            }
          }}
        >
          <MoreHorizontal size={20} color="white" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default TikTokStyleVideoPost;