import React, { useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, IconButton } from '@mui/material';
import { Play, Pause } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  url: string;
  format?: string;
  duration?: number;
}

interface SimpleVideoPlaylistProps {
  videos: Video[];
  autoPlay?: boolean;
  showPlaylist?: boolean;
}

export const SimpleVideoPlaylist: React.FC<SimpleVideoPlaylistProps> = ({
  videos,
  autoPlay = false,
  showPlaylist = true,
}) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentVideo = videos[currentVideoIndex];

  if (!currentVideo) return null;

  return (
    <Box>
      <Box sx={{ position: 'relative', mb: showPlaylist ? 2 : 0 }}>
        <video
          key={currentVideo.id}
          src={currentVideo.url}
          controls
          autoPlay={autoPlay}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: '12px',
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </Box>

      {showPlaylist && videos.length > 1 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            Playlist ({videos.length} videos)
          </Typography>
          <List dense>
            {videos.map((video, index) => (
              <ListItem
                key={video.id}
                onClick={() => setCurrentVideoIndex(index)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  cursor: 'pointer',
                  backgroundColor: index === currentVideoIndex ? 'action.selected' : 'transparent',
                }}
              >
                <IconButton size="small" sx={{ mr: 1 }}>
                  {index === currentVideoIndex && isPlaying ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                </IconButton>
                <ListItemText
                  primary={video.title}
                  secondary={video.duration ? `${Math.floor(video.duration)}s` : undefined}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: index === currentVideoIndex ? 600 : 400,
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};