import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box, Typography, CircularProgress, Alert } from '@mui/material';
import { MessageCircle, Send } from 'lucide-react';
import { createConversation, sendMessage, CreateConversationResponse, SendMessageResponse } from '@/services/chatbotApi';

interface ChatbotButtonProps {
  productId: string;
  vendorId: string;
  productName: string;
  onChatStarted?: () => void;
}

const ChatbotButton: React.FC<ChatbotButtonProps> = ({ 
  productId, 
  vendorId, 
  productName,
  onChatStarted 
}) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    // Prevent event propagation to parent elements
    e.stopPropagation();
    setOpen(true);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    setOpen(false);
    setMessage('');
    setError(null);
    setSuccess(false);
  };

  const handleStartChat = async (e: React.FormEvent) => {
    // Prevent default form submission behavior
    e.preventDefault();
    e.stopPropagation();
    
    if (!message.trim()) {
      setError('Please enter a message to start the conversation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create chatbot conversation
      const conversationResponse: CreateConversationResponse = await createConversation({
        vendorId,
        productId
      });

      if (conversationResponse.success) {
        // Send initial message
        const messageResponse: SendMessageResponse = await sendMessage(
          conversationResponse.data.conversation._id,
          {
            content: message
          }
        );

        if (messageResponse.success) {
          setSuccess(true);
          setMessage('');
          
          // Notify parent component
          if (onChatStarted) {
            onChatStarted();
          }
          
          // Don't automatically close the dialog - let the user close it manually
          // This prevents any potential refresh issues
        } else {
          setError(messageResponse.message || 'Failed to send message');
        }
      } else {
        setError(conversationResponse.message || 'Failed to start conversation');
      }
    } catch (err: any) {
      console.error('Chatbot error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<MessageCircle size={16} />}
        onClick={handleOpen}
        sx={{
          minWidth: 'auto',
          px: 1,
          py: 0.5,
          fontSize: '0.75rem',
          borderColor: 'rgba(0, 0, 0, 0.23)',
          color: 'text.primary',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          }
        }}
      >
        Chat
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleStartChat}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MessageCircle size={20} />
              Chat with Vendor about {productName}
            </Box>
          </DialogTitle>
          
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Start a conversation with the vendor about this product. Our chatbot will assist you 
                and connect you with a vendor representative.
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Conversation started successfully! A vendor representative will respond shortly.
                </Alert>
              )}
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Your message"
                placeholder="Ask a question about this product..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading || success}
                helperText="This will start a new conversation with the vendor"
              />
            </Box>
          </DialogContent>
          
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || success || !message.trim()}
              startIcon={loading ? <CircularProgress size={16} /> : <Send size={16} />}
            >
              {loading ? 'Sending...' : 'Start Chat'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

export default ChatbotButton;