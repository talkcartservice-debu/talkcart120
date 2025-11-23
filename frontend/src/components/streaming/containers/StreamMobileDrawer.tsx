import React from 'react';
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  useTheme,
  SwipeableDrawer,
} from '@mui/material';
import { X } from 'lucide-react';
import StreamSidebar from './StreamSidebar';

interface StreamMobileDrawerProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  streamId: string;
  stream: any;
  isStreamer: boolean;
  isAuthenticated: boolean;
}

export default function StreamMobileDrawer({
  open,
  onOpen,
  onClose,
  streamId,
  stream,
  isStreamer,
  isAuthenticated,
}: StreamMobileDrawerProps) {
  const theme = useTheme();

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={onOpen}
      disableSwipeToOpen={false}
      PaperProps={{
        sx: {
          height: '80vh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          overflow: 'hidden',
        },
      }}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drag handle */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 4,
              bgcolor: 'grey.400',
              borderRadius: 2,
            }}
          />
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <StreamSidebar
            streamId={streamId}
            stream={stream}
            isStreamer={isStreamer}
            isAuthenticated={isAuthenticated}
            onClose={onClose}
            showCloseButton={false}
          />
        </Box>
      </Box>
    </SwipeableDrawer>
  );
}
