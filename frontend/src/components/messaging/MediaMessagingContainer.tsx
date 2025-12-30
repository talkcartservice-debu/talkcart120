import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  useTheme,
  alpha,
  TextField,
  Button,
  Tooltip,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Send,
  Mic,
  Image as ImageIcon,
  Video,
  Smile,
  X,
  Play,
  Pause,
  Download,
  MoreVertical,
  Camera,
  FileUp,
  Trash2,
  Check
} from 'lucide-react';
import { Message } from '@/types/message';
import MediaMessageContainer from './MediaMessageContainer';
import MediaMessagePreview from './MediaMessagePreview';
import MediaMessageUpload from './MediaMessageUpload';

interface MediaMessagingContainerProps {
  messages: Message[];
  onSendMessage: (content: string, type: string, media?: any, replyTo?: string) => Promise<boolean>;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onDelete?: (messageId: string) => Promise<boolean>;
  onDownload?: (mediaUrl: string, filename: string) => void;
  onRetry?: (media: any) => void;
  conversationId?: string;
  currentUserId?: string;
  disabled?: boolean;
}

const MediaMessagingContainer: React.FC<MediaMessagingContainerProps> = ({
  messages,
  onSendMessage,
  onReply,
  onForward,
  onDelete,
  onDownload,
  onRetry,
  conversationId,
  currentUserId,
  disabled = false
}) => {
  const theme = useTheme();
  const [newMessage, setNewMessage] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !showMediaUpload) return;

    try {
      const success = await onSendMessage(newMessage.trim(), 'text', undefined, replyToMessage?.id);
      if (success) {
        setNewMessage('');
        setReplyToMessage(null);
        setShowMediaUpload(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSendMedia = async (files: File[], message?: string) => {
    setUploadingMedia(true);
    try {
      // In a real implementation, you would upload the files to your backend
      // and then send the message with the media URLs
      for (const file of files) {
        // Upload file and get URL
        // const mediaUrl = await uploadFile(file);
        // Then send the message with the media
        await onSendMessage(message || '', 'media', { type: file.type.split('/')[0], file }, undefined);
      }
    } catch (error) {
      console.error('Failed to send media:', error);
    } finally {
      setUploadingMedia(false);
      setShowMediaUpload(false);
    }
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  const handleCancelMediaUpload = () => {
    setShowMediaUpload(false);
  };

  const handleActionMenuOpen = (messageId: string) => {
    setShowActions(messageId);
  };

  const handleActionMenuClose = () => {
    setShowActions(null);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Messages container */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: alpha(theme.palette.background.paper, 0.05),
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: alpha(theme.palette.background.paper, 0.1),
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: alpha(theme.palette.text.primary, 0.2),
            borderRadius: 4,
          },
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: 'flex',
              justifyContent: message.isOwn ? 'flex-end' : 'flex-start',
              mb: 2,
            }}
          >
            <Box
              sx={{
                maxWidth: '80%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.isOwn ? 'flex-end' : 'flex-start',
              }}
            >
              {/* Reply preview */}
              {message.replyTo && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1,
                    mb: 1,
                    maxWidth: '100%',
                    borderLeft: `3px solid ${theme.palette.primary.main}`,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderRadius: '8px',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                    {message.replyTo.sender?.displayName || 'User'}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                    {message.replyTo.content}
                  </Typography>
                </Paper>
              )}

              {/* Message content */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: message.isOwn
                    ? alpha(theme.palette.primary.main, 0.1)
                    : alpha(theme.palette.background.paper, 0.8),
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  backdropFilter: 'blur(10px)',
                  position: 'relative',
                }}
              >
                {/* Message text */}
                {message.content && (
                  <Typography variant="body2" sx={{ mb: message.media && message.media.length > 0 ? 1 : 0 }}>
                    {message.content}
                  </Typography>
                )}

                {/* Media content */}
                {message.media && message.media.length > 0 && (
                  <Box sx={{ mt: message.content ? 1 : 0 }}>
                    {message.media.map((media, index) => (
                      <MediaMessageContainer
                        key={`${message.id}-${index}`}
                        message={message}
                        showActions={true}
                        showTimestamp={false}
                        isOwn={message.isOwn}
                        onDownload={onDownload}
                        onRetry={onRetry}
                      />
                    ))}
                  </Box>
                )}

                {/* Message timestamp and status */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 1, gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: theme.palette.text.secondary }}>
                    {formatTime(message.createdAt)}
                  </Typography>
                  {message.isOwn && (
                    <Check size={12} color={theme.palette.text.secondary} />
                  )}
                </Box>
              </Paper>

              {/* Message reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                  {message.reactions.map((reaction, index) => (
                    <Chip
                      key={index}
                      label={reaction.emoji}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Reply preview */}
      {replyToMessage && (
        <Box sx={{ px: 2, py: 1, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
          <Paper
            elevation={0}
            sx={{
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              borderLeft: `3px solid ${theme.palette.primary.main}`,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                Replying to {replyToMessage.sender.displayName}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8rem', color: theme.palette.text.secondary }}>
                {replyToMessage.content || 'Media message'}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleCancelReply}
              sx={{ color: 'text.secondary', p: 0.25 }}
            >
              <X size={16} />
            </IconButton>
          </Paper>
        </Box>
      )}

      {/* Media upload panel */}
      {showMediaUpload && (
        <Box sx={{ px: 2, pb: 1 }}>
          <MediaMessageUpload
            onSend={handleSendMedia}
            onCancel={handleCancelMediaUpload}
            initialMessage={newMessage}
            disabled={disabled || uploadingMedia}
          />
        </Box>
      )}

      {/* Message input */}
      <Box sx={{ p: 2, pt: 0 }}>
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(10px)',
          }}
        >
          <IconButton
            onClick={() => setShowMediaUpload(!showMediaUpload)}
            disabled={disabled}
            sx={{ color: theme.palette.text.secondary }}
          >
            <FileUp size={20} />
          </IconButton>

          <TextField
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            variant="standard"
            multiline
            maxRows={4}
            InputProps={{
              disableUnderline: true,
              sx: {
                px: 1,
                py: 0.5,
                fontSize: '0.9rem',
              },
            }}
            disabled={disabled}
          />

          <IconButton
            onClick={handleSendMessage}
            disabled={disabled || (!newMessage.trim() && !showMediaUpload)}
            sx={{
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              },
            }}
          >
            <Send size={18} />
          </IconButton>
        </Paper>
      </Box>
    </Box>
  );
};

export default MediaMessagingContainer;