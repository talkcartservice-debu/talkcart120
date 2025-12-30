import React, { useState } from 'react';
import { Box, Paper, Typography, Container } from '@mui/material';
import { Message } from '@/types/message';
import MediaMessageContainer from './MediaMessageContainer';
import MediaMessageUpload from './MediaMessageUpload';

const MediaMessagingDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Check out these photos from the event!',
      type: 'image',
      senderId: 'user2',
      conversationId: 'conv1',
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      isEdited: false,
      isDeleted: false,
      isForwarded: false,
      reactions: [],
      readBy: [],
      sender: {
        id: 'user2',
        username: 'janedoe',
        displayName: 'Jane Doe',
        avatar: 'https://example.com/avatar2.jpg',
        isVerified: true,
      },
      isOwn: false,
      isRead: true,
      media: [
        {
          type: 'image',
          url: 'https://via.placeholder.com/300x200/4a90e2/ffffff?text=Photo+1',
          filename: 'event-photo-1.jpg',
          fileSize: 102400,
        },
        {
          type: 'image',
          url: 'https://via.placeholder.com/300x200/7ed321/ffffff?text=Photo+2',
          filename: 'event-photo-2.jpg',
          fileSize: 153600,
        },
      ],
    },
    {
      id: '2',
      content: 'Here is the video from the presentation',
      type: 'video',
      senderId: 'user1',
      conversationId: 'conv1',
      createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      isEdited: false,
      isDeleted: false,
      isForwarded: false,
      reactions: [],
      readBy: [],
      sender: {
        id: 'user1',
        username: 'johndoe',
        displayName: 'John Doe',
        avatar: 'https://example.com/avatar1.jpg',
        isVerified: true,
      },
      isOwn: true,
      isRead: true,
      media: [
        {
          type: 'video',
          url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
          filename: 'presentation.mp4',
          fileSize: 1048576,
        },
      ],
    },
    {
      id: '3',
      content: 'Here is my voice note for you',
      type: 'audio',
      senderId: 'user2',
      conversationId: 'conv1',
      createdAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      isEdited: false,
      isDeleted: false,
      isForwarded: false,
      reactions: [],
      readBy: [],
      sender: {
        id: 'user2',
        username: 'janedoe',
        displayName: 'Jane Doe',
        avatar: 'https://example.com/avatar2.jpg',
        isVerified: true,
      },
      isOwn: false,
      isRead: true,
      media: [
        {
          type: 'audio',
          url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
          filename: 'voice-note.mp3',
          fileSize: 51200,
        },
      ],
    },
  ]);

  const handleSendMedia = async (mediaFiles: File[], message?: string) => {
    console.log('Sending media:', mediaFiles, 'with message:', message);
    // In a real app, this would send the media to the backend
    return Promise.resolve();
  };

  const handleReply = (messageId: string) => {
    console.log('Replying to message:', messageId);
  };

  const handleForward = (messageId: string) => {
    console.log('Forwarding message:', messageId);
  };

  const handleDelete = async (messageId: string) => {
    console.log('Deleting message:', messageId);
    setMessages(messages.filter(msg => msg.id !== messageId));
    return true;
  };

  const handleDownload = (mediaUrl: string) => {
    console.log('Downloading media:', mediaUrl);
    // In a real app, this would download the media file
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Media Messaging Demo
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 2 }}>
        <Typography variant="h6" gutterBottom>
          Send Media Message
        </Typography>
        <MediaMessageUpload 
          onSend={handleSendMedia}
          onCancel={() => console.log('Cancelled media upload')}
        />
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {messages.map((message) => (
          <MediaMessageContainer
            key={message.id}
            message={message}
            onReply={() => handleReply(message.id)}
            onForward={() => handleForward(message.id)}
            onDelete={handleDelete}
            onDownload={handleDownload}
            showActions={true}
            showTimestamp={true}
            isOwn={message.isOwn}
          />
        ))}
      </Box>
    </Container>
  );
};

export default MediaMessagingDemo;
