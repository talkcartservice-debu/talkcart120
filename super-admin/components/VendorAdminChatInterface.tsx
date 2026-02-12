import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  TextField, 
  IconButton, 
  Paper, 
  CircularProgress, 
  Avatar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Badge,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText as MenuItemText,
  Fab,
  styled
} from '@mui/material';
import { 
  Send as SendIcon,
  Close as CloseIcon,
  SupportAgent as SupportAgentIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  PushPin as PinIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  Mood as MoodIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Settings as SettingsIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { AdminApi } from '../src/services/api';

interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'system';
  isBotMessage: boolean;
  createdAt: string;
  sender?: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

interface Vendor {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  displayName?: string;
}

interface ChatConversation {
  _id: string;
  customerId: string;
  vendorId: string;
  productId: string;
  productName: string;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  lastActivity: string;
  isActive: boolean;
  isResolved: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  customer: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
  vendor: {
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

interface VendorAdminChatInterfaceProps {
  vendor: Vendor;
  open: boolean;
  onClose: () => void;
}

// Styled components for enhanced UI
const MessageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  marginBottom: theme.spacing(2),
  maxWidth: '80%',
  position: 'relative',
}));

const MessageBubble = styled(Box)(({ theme }) => ({
  borderRadius: '18px',
  padding: theme.spacing(1.5, 2),
  position: 'relative',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  wordBreak: 'break-word',
}));

const UserMessageBubble = styled(MessageBubble)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  alignSelf: 'flex-start',
  borderRadius: '4px 18px 18px 18px',
}));

const AdminMessageBubble = styled(MessageBubble)(({ theme }) => ({
  backgroundColor: theme.palette.grey[200],
  color: theme.palette.text.primary,
  alignSelf: 'flex-end',
  borderRadius: '18px 4px 18px 18px',
}));

const MessageHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(0.5),
}));

const MessageActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  opacity: 0,
  transition: 'opacity 0.2s',
  position: 'absolute',
  top: theme.spacing(-2),
  right: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  '&:hover': {
    opacity: 1,
  },
}));

const MessageContent = styled(Typography)(({ theme }) => ({
  whiteSpace: 'pre-wrap',
}));

const VendorAdminChatInterface: React.FC<VendorAdminChatInterfaceProps> = ({ vendor, open, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [messageActionsAnchor, setMessageActionsAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch vendor-admin conversations
      const conversationsRes = await AdminApi.getVendorAdminConversations({
        vendorId: vendor._id
      });
      
      if (conversationsRes?.success) {
        const vendorConversations = Array.isArray(conversationsRes.data) 
          ? conversationsRes.data 
          : [];
        if (vendorConversations.length > 0) {
          // Sort by last activity and get the most recent
          const sorted = [...vendorConversations].sort((a: ChatConversation, b: ChatConversation) => 
            new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
          );
          const conv = sorted[0];
          setConversation(conv);
          setIsPinned(conv.isPinned || false);
          setIsMuted(conv.isMuted || false);
          
          // Fetch messages for this conversation
          const messagesRes = await AdminApi.getChatMessages(conv._id, {
            limit: 50
          });
          
          if (messagesRes?.success) {
            // Check if messages are in data.messages or directly in data
            const messagesData = Array.isArray(messagesRes.data?.messages) 
              ? messagesRes.data.messages 
              : Array.isArray(messagesRes.data) 
                ? messagesRes.data 
                : [];
            setMessages(messagesData);
          }
        } else {
          setConversation(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create new vendor-admin conversation
      const createRes = await AdminApi.createVendorAdminConversation(vendor._id);
      
      if (createRes?.success) {
        const conv = createRes.data;
        setConversation(conv);
        setMessages([]);
        setIsPinned(false);
        setIsMuted(false);
      } else {
        setError(createRes?.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      setError('Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setMessages([]);
      setNewMessage('');
      setConversation(null);
      setError(null);
      setIsPinned(false);
      setIsMuted(false);
      
      fetchConversation();
    }
  }, [open, vendor._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !conversation) return;
    
    try {
      setSending(true);
      setError(null);
      
      // Send the message to the backend
      const sendRes = await AdminApi.sendChatMessage(conversation._id, {
        content: newMessage
      });
      
      if (sendRes?.success) {
        // Add the new message to the messages list
        // Check the structure of the response to get the message correctly
        const newMsg: ChatMessage = sendRes.data?.message || sendRes.data;
        if (newMsg && newMsg._id) {
          setMessages(prev => [...prev, newMsg]);
        }
        setNewMessage('');
        
        // Update conversation's last message
        setConversation((prev: ChatConversation | null) => prev ? {
          ...prev,
          lastMessage: {
            content: newMessage,
            senderId: 'admin', // Since admin is sending the message
            createdAt: new Date().toISOString()
          },
          lastActivity: new Date().toISOString()
        } : null);
      } else {
        setError(sendRes?.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePinConversation = async () => {
    if (!conversation) return;
    
    try {
      // In a real implementation, you would call an API endpoint to pin the conversation
      setIsPinned(!isPinned);
    } catch (err: any) {
      console.error('Failed to pin conversation:', err);
      setError('Failed to update conversation pin status');
    }
  };

  const handleMuteConversation = async () => {
    if (!conversation) return;
    
    try {
      // In a real implementation, you would call an API endpoint to mute the conversation
      setIsMuted(!isMuted);
    } catch (err: any) {
      console.error('Failed to mute conversation:', err);
      setError('Failed to update conversation mute status');
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleOpenMessageActions = (event: React.MouseEvent<HTMLElement>, message: ChatMessage) => {
    event.stopPropagation();
    setMessageActionsAnchor(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleCloseMessageActions = () => {
    setMessageActionsAnchor(null);
    setSelectedMessage(null);
  };

  const handleReplyToMessage = () => {
    if (!selectedMessage) return;
    // In a real implementation, you would add a reply reference to the message
    handleCloseMessageActions();
  };

  const handleForwardMessage = () => {
    if (!selectedMessage) return;
    // In a real implementation, you would show a forward dialog
    handleCloseMessageActions();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isFullscreen}
      PaperProps={{
        sx: { 
          height: isFullscreen ? '100%' : '80vh', 
          maxHeight: 600, 
          display: 'flex', 
          flexDirection: 'column' 
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar>
            <BusinessIcon />
          </Avatar>
          <Box>
            <Typography variant="h6">
              Chat with {vendor.displayName || vendor.username}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vendor • {vendor.email}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={isPinned ? "Unpin conversation" : "Pin conversation"}>
            <IconButton onClick={handlePinConversation} color={isPinned ? "primary" : "default"}>
              <PinIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={isMuted ? "Unmute conversation" : "Mute conversation"}>
            <IconButton onClick={handleMuteConversation} color={isMuted ? "default" : "primary"}>
              {isMuted ? <NotificationsOffIcon /> : <NotificationsIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
            <IconButton onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
          <IconButton onClick={handleOpenMenu}>
            <MoreVertIcon />
          </IconButton>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleCloseMenu}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <MenuItemText>Chat Settings</MenuItemText>
        </MenuItem>
        <MenuItem onClick={handleCloseMenu}>
          <ListItemIcon>
            <RefreshIcon fontSize="small" />
          </ListItemIcon>
          <MenuItemText>Refresh</MenuItemText>
        </MenuItem>
      </Menu>
      
      <DialogContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
        {/* Messages area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: 'grey.50' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : !conversation ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
              <SupportAgentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No conversation found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Start a new conversation with this vendor. 
              </Typography>
              <Button 
                variant="contained" 
                onClick={createConversation}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              >
                Start Conversation
              </Button>
            </Box>
          ) : (
            <List sx={{ display: 'flex', flexDirection: 'column' }}>
              {messages.map((message) => (
                <Box
                  key={message._id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.senderId === 'admin' ? 'flex-start' : 'flex-end',
                    mb: 1,
                  }}
                >
                  <MessageContainer>
                    <MessageHeader>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                        {message.senderId === 'admin' ? 'You' : (message.sender?.displayName || message.sender?.username || 'Vendor')}
                      </Typography>
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        {formatTime(message.createdAt)}
                      </Typography>
                    </MessageHeader>
                    {message.senderId === 'admin' ? (
                      <UserMessageBubble>
                        <MessageContent>{message.content}</MessageContent>
                      </UserMessageBubble>
                    ) : (
                      <AdminMessageBubble>
                        <MessageContent>{message.content}</MessageContent>
                      </AdminMessageBubble>
                    )}
                    <MessageActions>
                      <IconButton size="small" onClick={(e) => handleOpenMessageActions(e, message)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </MessageActions>
                  </MessageContainer>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </List>
          )}
        </Box>
        
        {/* Input area - only show if conversation exists */}
        {conversation && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <IconButton size="small" color="primary">
                <AttachFileIcon />
              </IconButton>
              <IconButton size="small" color="primary">
                <EmojiEmotionsIcon />
              </IconButton>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sending}
                multiline
                maxRows={4}
                size="small"
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                sx={{ p: 1 }}
              >
                {sending ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        {conversation && (
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={fetchConversation}
            disabled={loading}
          >
            Refresh
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      
      {/* Message actions menu */}
      <Menu
        anchorEl={messageActionsAnchor}
        open={Boolean(messageActionsAnchor)}
        onClose={handleCloseMessageActions}
      >
        <MenuItem onClick={handleReplyToMessage}>
          <ListItemIcon>
            <ReplyIcon fontSize="small" />
          </ListItemIcon>
          <MenuItemText>Reply</MenuItemText>
        </MenuItem>
        <MenuItem onClick={handleForwardMessage}>
          <ListItemIcon>
            <ForwardIcon fontSize="small" />
          </ListItemIcon>
          <MenuItemText>Forward</MenuItemText>
        </MenuItem>
      </Menu>
    </Dialog>
  );
};

export default VendorAdminChatInterface;