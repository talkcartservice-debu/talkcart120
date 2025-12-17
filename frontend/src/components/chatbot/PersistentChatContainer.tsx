import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  TextField, 
  IconButton, 
  Paper, 
  CircularProgress, 
  Avatar,
  Button,
  Alert,
  Tooltip,
  styled,
  Divider,
  Badge,
  LinearProgress,
  InputAdornment,
  Collapse,
  Popover,
  Chip,
  Link,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar
} from '@mui/material';
import { 
  Send as SendIcon,
  SupportAgent as SupportAgentIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Mood as MoodIcon,
  GetApp as ExportIcon,
  DoneAll as ReadIcon,
  Done as DeliveredIcon,
  AccessTime as SentIcon,
  Language as LanguageIcon,
  WifiOff as OfflineIcon,
  Wifi as OnlineIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCustomTheme } from '@/contexts/ThemeContext';
import chatbotApiModule, { ChatbotConversation, ChatbotReaction, addReaction } from '@/services/chatbotApi';
import socketService from '@/services/socketService';
import i18nService from '@/services/i18nService';
import { ChatbotMessage, ChatbotAttachment } from '@/services/chatbotApi';

// Define types
interface ChatHistoryItem {
  id: string;
  conversationId: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

interface PersistentChatContainerProps {
  isOpen: boolean;
  onToggle: () => void;
}

// Styled components
const ChatContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  right: 24,
  width: 350,
  height: 400,
  backgroundColor: theme.palette.background.paper,
  borderRadius: '8px 8px 0 0',
  boxShadow: theme.shadows[8],
  display: 'flex',
  flexDirection: 'column',
  zIndex: 1300,
  border: `1px solid ${theme.palette.divider}`,
  // Accessibility: Ensure good contrast
  color: theme.palette.text.primary,
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: '8px 8px 0 0',
  // Accessibility: Focus indicator
  '&:focus-within': {
    outline: `2px solid ${theme.palette.secondary.main}`,
    outlineOffset: '2px',
  },
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[50],
}));

const MessageBubble = styled(Box)(({ theme }) => ({
  borderRadius: '18px',
  padding: theme.spacing(1, 1.5),
  margin: theme.spacing(0.5, 0),
  maxWidth: '80%',
  wordBreak: 'break-word',
  position: 'relative',
  // Accessibility: Ensure good contrast
  color: theme.palette.text.primary,
}));

const UserMessage = styled(MessageBubble)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  marginLeft: 'auto',
  borderRadius: '18px 4px 18px 18px',
}));

const AdminMessage = styled(MessageBubble)(({ theme }) => ({
  backgroundColor: theme.palette.grey[300],
  color: theme.palette.text.primary,
  marginRight: 'auto',
  borderRadius: '4px 18px 18px 18px',
}));

const ReactionsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
}));

const ReactionChip = styled(Chip)(({ theme }) => ({
  height: 20,
  fontSize: '0.75rem',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const AttachmentPreview = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1),
  margin: theme.spacing(0.5, 0),
  backgroundColor: theme.palette.grey[100],
  borderRadius: '8px',
  maxWidth: '80%',
}));

const InputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const HistoryPanel = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: theme.palette.background.paper,
  zIndex: 1400,
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing(2),
}));

const SearchPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  backgroundColor: theme.palette.grey[50],
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const ReactionPicker = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.spacing(1),
  boxShadow: theme.shadows[2],
}));

const RichContentCard = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '8px',
  padding: theme.spacing(1),
  margin: theme.spacing(0.5, 0),
  backgroundColor: theme.palette.background.paper,
  maxWidth: '80%',
}));

const RichContentImage = styled('img')({
  maxWidth: '100%',
  borderRadius: '4px',
  marginBottom: '8px',
});

const MessageStatus = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  marginTop: '4px',
});

const OfflineIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.warning.light,
  color: theme.palette.warning.contrastText,
  fontSize: '0.875rem',
}));

const PersistentChatContainer: React.FC<PersistentChatContainerProps> = ({ isOpen, onToggle }) => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { reducedMotion, highContrast } = useCustomTheme();
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<ChatbotConversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [attachments, setAttachments] = useState<ChatbotAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<ChatbotMessage[]>([]);
  const [searching, setSearching] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reactionPickerAnchor, setReactionPickerAnchor] = useState<{ element: HTMLElement | null; messageId: string | null }>({ element: null, messageId: null });
  const [exporting, setExporting] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({}); // Track typing users
  const [isTyping, setIsTyping] = useState(false); // Track if current user is typing
  const [isOnline, setIsOnline] = useState(true); // Track online status
  const [showOfflineAlert, setShowOfflineAlert] = useState(false); // Show offline alert
  const [syncing, setSyncing] = useState(false); // Track message sync status
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const snackbarRef = useRef<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // useCallback functions
  const showBrowserNotification = useCallback((message: ChatbotMessage) => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    // Don't show notification for own messages
    if (message.senderId === user?.id) {
      return;
    }

    const title = 'New Chat Message';
    const options = {
      body: message.content || 'You received a new message',
      icon: '/favicon.ico',
      tag: `chat-${conversation?._id}`,
      renotify: true,
    };

    new Notification(title, options);
  }, [user, conversation?._id]);

  const updateChatHistory = useCallback((conv: ChatbotConversation, msgs: ChatbotMessage[]) => {
    if (!user) return;
    
    const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    const historyItem: ChatHistoryItem = {
      id: conv._id,
      conversationId: conv._id,
      title: conv.productName || 'Vendor Support',
      lastMessage: lastMessage ? lastMessage.content : 'No messages yet',
      timestamp: conv.lastActivity,
      unreadCount: 0 // In a real implementation, this would be tracked
    };
    
    // Update or add to chat history
    setChatHistory(prev => {
      const existingIndex = prev.findIndex(item => item.conversationId === conv._id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = historyItem;
        return updated;
      } else {
        return [historyItem, ...prev];
      }
    });
  }, [user]);

  const fetchOrCreateConversation = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Try to find existing conversation between vendor and admin
      const response = await chatbotApiModule.getConversations({ 
        limit: 1 
      });
      
      if (response?.data?.conversations?.length > 0) {
        const conversation = response.data.conversations[0] || null;
        setConversation(conversation);
        
        // Fetch messages for this conversation
        if (conversation) {
          const messagesResponse = await chatbotApiModule.getMessages(conversation._id, { limit: 50 });
          if (messagesResponse?.data?.messages) {
            setMessages(messagesResponse.data.messages);
            
            // Update chat history
            updateChatHistory(conversation, messagesResponse.data.messages);
          }
        }
      } else {
        // No existing conversation found
        setConversation(null);
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [user, updateChatHistory]);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const loadChatHistory = () => {
      if (typeof window !== 'undefined' && user) {
        try {
          const savedHistory = localStorage.getItem(`chatHistory_${user.id}`);
          if (savedHistory) {
            const history = JSON.parse(savedHistory);
            setChatHistory(history);
          }
        } catch (err) {
          console.error('Failed to load chat history:', err);
        }
      }
    };

    loadChatHistory();
  }, [user]);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && user && chatHistory.length > 0) {
      try {
        localStorage.setItem(`chatHistory_${user.id}`, JSON.stringify(chatHistory));
      } catch (err) {
        console.error('Failed to save chat history:', err);
      }
    }
  }, [chatHistory, user]);

  // Request notification permissions on component mount
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === 'granted');
      }
    };

    requestNotificationPermission();
  }, []);

  // Setup socket event listeners
  useEffect(() => {
    // Listen for new chatbot messages
    const handleNewMessage = (data: any) => {
      if (data.conversationId === conversation?._id) {
        const newMessage = data.message;
        setMessages(prev => [...prev, newMessage]);
        if (conversation) {
          updateChatHistory(conversation, [...messages, newMessage]);
        }
        
        // Show browser notification if enabled
        if (notificationsEnabled && newMessage.senderId !== user?.id) {
          showBrowserNotification(newMessage);
        }
      }
    };

    // Listen for user joined events
    const handleUserJoined = (data: any) => {
      console.log('User joined chatbot conversation:', data);
    };

    // Listen for user left events
    const handleUserLeft = (data: any) => {
      console.log('User left chatbot conversation:', data);
    };

    // Listen for typing indicators (chatbot conversations)
    const handleTyping = (data: any) => {
      if (data.conversationId === conversation?._id) {
        setTypingUsers(prev => {
          const updated = { ...prev };
          if (data.isTyping) {
            updated[data.userId] = true;
          } else {
            delete updated[data.userId];
          }
          return updated;
        });
      }
    };

    // Listen for message status updates
    const handleMessageStatus = (data: any) => {
      if (data.conversationId === conversation?._id) {
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg._id === data.messageId 
              ? { ...msg, status: data.status } 
              : msg
          )
        );
      }
    };

    socketService.on('chatbot:message:new', handleNewMessage);
    socketService.on('chatbot:user-joined', handleUserJoined);
    socketService.on('chatbot:user-left', handleUserLeft);
    socketService.on('chatbot:typing', handleTyping);
    socketService.on('chatbot:message:status', handleMessageStatus);

    return () => {
      socketService.off('chatbot:message:new', handleNewMessage);
      socketService.off('chatbot:user-joined', handleUserJoined);
      socketService.off('chatbot:user-left', handleUserLeft);
      socketService.off('chatbot:typing', handleTyping);
      socketService.off('chatbot:message:status', handleMessageStatus);
    };
  }, [conversation, messages, notificationsEnabled, user]);

  // Fetch or create conversation when component mounts or user changes
  useEffect(() => {
    if (isOpen && user) {
      fetchOrCreateConversation();
    }
  }, [isOpen, user, fetchOrCreateConversation]);

  // Join/leave chatbot conversation room when conversation changes
  useEffect(() => {
    if (conversation) {
      // Join the chatbot conversation room
      socketService.joinChatbotConversation(conversation._id);
      
      // Clean up when conversation changes or component unmounts
      return () => {
        socketService.leaveChatbotConversation(conversation._id);
      };
    }
    // Return undefined when the condition is not met
    return undefined;
  }, [conversation]);

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
      // Try to sync queued messages
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.active?.postMessage({ type: 'sync-messages' });
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  // Listen for service worker messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type) {
        switch (event.data.type) {
          case 'online-status':
            setIsOnline(event.data.isOnline);
            setShowOfflineAlert(!event.data.isOnline);
            break;
          case 'sync-started':
            setSyncing(true);
            break;
          case 'sync-completed':
            setSyncing(false);
            break;
          case 'offline-message-queued':
            // Show notification that message was queued
            snackbarRef.current = {
              open: true,
              message: t('chatbot.messageQueued'),
              severity: 'info'
            };
            break;
        }
      }
    };

    if (typeof window !== 'undefined') {
      navigator.serviceWorker?.addEventListener('message', handleMessage);
    }

    return () => {
      if (typeof window !== 'undefined') {
        navigator.serviceWorker?.removeEventListener('message', handleMessage);
      }
    };
  }, [t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createConversation = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Create new conversation between vendor and admin
      const response = await chatbotApiModule.createConversation({
        vendorId: user.id,
        productId: '' // Empty productId for general vendor-admin chat
      });
      
      if (response?.data?.conversation) {
        setConversation(response.data.conversation);
        setMessages([]);
        
        // Update chat history
        updateChatHistory(response.data.conversation, []);
      }
    } catch (err: any) {
      console.error('Failed to create conversation:', err);
      setError('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!conversation) {
      setError('Please start a conversation first');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Upload file to chatbot conversation
      const response = await chatbotApiModule.uploadFile(conversation._id, file);
      
      if (response?.data?.attachment) {
        setAttachments(prev => [...prev, response.data.attachment]);
      }
    } catch (err: any) {
      console.error('Failed to upload file:', err);
      setError('Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]) {
      handleFileUpload(files[0]);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Send typing indicator when user starts/stops typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing started
    if (value.trim() && conversation && !isTyping) {
      setIsTyping(true);
      socketService.sendChatbotTyping(conversation._id, true);
    }
    
    // Set timeout to send typing stopped
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping && conversation) {
          setIsTyping(false);
          socketService.sendChatbotTyping(conversation._id, false);
        }
      }, 1000);
    } else if (isTyping && conversation) {
      // If input is cleared, immediately send typing stopped
      setIsTyping(false);
      socketService.sendChatbotTyping(conversation._id, false);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || sending || !conversation) return;

    try {
      setSending(true);
      setError(null);
      
      // Clear typing indicator before sending
      if (isTyping) {
        setIsTyping(false);
        socketService.sendChatbotTyping(conversation._id, false);
      }
      
      const response = await chatbotApiModule.sendMessage(conversation._id, {
        content: newMessage,
        attachments: attachments.length > 0 ? attachments : undefined
      });
      
      if (response?.data?.message) {
        // Message will be added via socket event listener
        setNewMessage('');
        setAttachments([]);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    if (!conversation) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await chatbotApiModule.getMessages(conversation._id, { limit: 50 });
      if (response?.data?.messages) {
        setMessages(response.data.messages);
        
        // Update chat history
        if (conversation) {
          updateChatHistory(conversation, response.data.messages);
        }
      }
    } catch (err: any) {
      console.error('Failed to refresh messages:', err);
      setError('Failed to refresh messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !conversation) return;

    try {
      setSearching(true);
      setError(null);
      
      const response = await chatbotApiModule.searchMessages(
        conversation._id, 
        searchQuery, 
        { limit: 20, page: 1 }
      );
      
      if (response?.data?.messages) {
        setSearchResults(response.data.messages);
      }
    } catch (err: any) {
      console.error('Failed to search messages:', err);
      setError('Failed to search messages');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      // Request permission if trying to enable
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === 'granted');
      }
    } else {
      // Just disable locally
      setNotificationsEnabled(false);
    }
  };

  const handleReactionClick = (event: React.MouseEvent<HTMLElement>, messageId: string) => {
    setReactionPickerAnchor({
      element: event.currentTarget,
      messageId
    });
  };

  const handleReactionSelect = async (emoji: string) => {
    if (!reactionPickerAnchor.messageId) return;
    
    try {
      const response = await addReaction(reactionPickerAnchor.messageId, emoji);
      
      if (response?.data?.message) {
        // Update the message in state with the new reactions
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg._id === reactionPickerAnchor.messageId 
              ? response.data.message 
              : msg
          )
        );
      }
    } catch (err: any) {
      console.error('Failed to add reaction:', err);
      setError('Failed to add reaction');
    } finally {
      setReactionPickerAnchor({ element: null, messageId: null });
    }
  };

  const handleCloseReactionPicker = () => {
    setReactionPickerAnchor({ element: null, messageId: null });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderReactions = (message: ChatbotMessage) => {
    if (!message.reactions || message.reactions.length === 0) return null;
    
    return (
      <ReactionsContainer>
        {message.reactions.map((reaction) => (
          <ReactionChip
            key={`${reaction.emoji}-${reaction.count}`}
            label={`${reaction.emoji} ${reaction.count}`}
            size="small"
            onClick={(e) => handleReactionClick(e, message._id)}
          />
        ))}
        <IconButton 
          size="small" 
          onClick={(e) => handleReactionClick(e, message._id)}
          sx={{ width: 20, height: 20, minHeight: 0, minWidth: 0 }}
        >
          <MoodIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </ReactionsContainer>
    );
  };

  const renderAttachment = (attachment: ChatbotAttachment, index: number) => {
    switch (attachment.type) {
      case 'image':
        return (
          <AttachmentPreview key={index}>
            {attachment.thumbnail ? (
              <img 
                src={attachment.thumbnail} 
                alt={attachment.name} 
                style={{ maxWidth: 100, maxHeight: 100, borderRadius: 4 }} 
              />
            ) : (
              <Box sx={{ p: 1 }}>
                <Typography variant="caption">{attachment.name}</Typography>
              </Box>
            )}
            <IconButton size="small" onClick={() => removeAttachment(index)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </AttachmentPreview>
        );
      case 'video':
        return (
          <AttachmentPreview key={index}>
            <Box sx={{ p: 1 }}>
              <Typography variant="caption">📹 {attachment.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {(attachment.size / (1024 * 1024)).toFixed(1)} MB
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => removeAttachment(index)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </AttachmentPreview>
        );
      default:
        return (
          <AttachmentPreview key={index}>
            <AttachFileIcon />
            <Box sx={{ ml: 1, flexGrow: 1 }}>
              <Typography variant="caption">{attachment.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {(attachment.size / 1024).toFixed(1)} KB
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => removeAttachment(index)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </AttachmentPreview>
        );
    }
  };

  const renderMessageStatus = (message: ChatbotMessage) => {
    if (!message.status || message.senderId === user?.id) return null;
    
    const statusColor = message.status === 'read' ? 'primary.main' : 'text.secondary';
    const statusText = t(`chatbot.messageStatus.${message.status}`);
    
    return (
      <MessageStatus aria-label={statusText}>
        {message.status === 'read' && <ReadIcon sx={{ fontSize: 14, color: statusColor }} />}
        {message.status === 'delivered' && <DeliveredIcon sx={{ fontSize: 14, color: statusColor }} />}
        {message.status === 'sent' && <SentIcon sx={{ fontSize: 14, color: statusColor }} />}
      </MessageStatus>
    );
  };

  const renderRichContent = (message: ChatbotMessage) => {
    if (!message.richContent) return null;
    
    const { title, description, imageUrl, url } = message.richContent;
    
    return (
      <RichContentCard>
        {imageUrl && <RichContentImage src={imageUrl} alt={title} />}
        {title && (
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            {url ? (
              <Link href={url} target="_blank" rel="noopener" underline="hover">
                {title}
              </Link>
            ) : (
              title
            )}
          </Typography>
        )}
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </RichContentCard>
    );
  };

  const renderTypingIndicator = () => {
    const typingUserIds = Object.keys(typingUsers).filter(userId => userId !== user?.id);
    
    if (typingUserIds.length === 0) return null;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {t('chatbot.admin')} {t('chatbot.isTyping')}
        </Typography>
        <Box sx={{ display: 'flex', ml: 1 }}>
          <CircularProgress size={12} sx={{ mx: 0.5 }} />
          <CircularProgress size={12} sx={{ mx: 0.5, animationDelay: '0.2s' }} />
          <CircularProgress size={12} sx={{ mx: 0.5, animationDelay: '0.4s' }} />
        </Box>
      </Box>
    );
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch the selected conversation
      const response = await chatbotApiModule.getConversation(conversationId);
      if (response?.data?.conversation) {
        const conversation = response.data.conversation;
        setConversation(conversation);
        
        // Fetch messages for this conversation
        const messagesResponse = await chatbotApiModule.getMessages(conversationId, { limit: 50 });
        if (messagesResponse?.data?.messages) {
          setMessages(messagesResponse.data.messages);
        }
        
        // Close the history panel
        setShowHistory(false);
      }
    } catch (err: any) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = (conversationId: string) => {
    setChatHistory(prev => prev.filter(item => item.conversationId !== conversationId));
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!conversation) return;
    
    try {
      setExporting(true);
      setError(null);
      
      // Create a temporary link to trigger download
      const response = await chatbotApiModule.exportConversation(conversation._id, format);
      
      if (format === 'json') {
        // Handle JSON export
        const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${conversation._id}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle CSV export
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${conversation._id}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: any) {
      console.error('Failed to export conversation:', err);
      setError('Failed to export conversation');
    } finally {
      setExporting(false);
    }
  };

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close chat with Escape key
    if (e.key === 'Escape') {
      onToggle();
    }
    
    // Focus management for accessibility
    if (e.key === 'Tab') {
      // Handle tab navigation within the chat container
      const focusableElements = document.querySelectorAll(
        '#persistent-chat-container button, #persistent-chat-container input, #persistent-chat-container a'
      );
      
      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  if (!isOpen) {
    return (
      <Tooltip title={t('chatbot.adminSupport')}>
        <IconButton
          onClick={onToggle}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            zIndex: 1200,
          }}
        >
          <SupportAgentIcon />
          {chatHistory.some(item => item.unreadCount > 0) && (
            <Badge
              badgeContent={chatHistory.reduce((sum, item) => sum + item.unreadCount, 0)}
              color="error"
              sx={{
                position: 'absolute',
                top: -5,
                right: -5,
              }}
            />
          )}
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <ChatContainer 
      id="persistent-chat-container"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="region"
      aria-label={t('chatbot.adminSupport')}
    >
      <ChatHeader
        role="banner"
        aria-label={t('chatbot.adminSupport')}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar 
            sx={{ width: 24, height: 24, bgcolor: 'secondary.main' }}
            role="img"
            aria-label={t('chatbot.adminSupport')}
          >
            <SupportAgentIcon sx={{ fontSize: 16 }} />
          </Avatar>
          <Typography variant="subtitle1">{t('chatbot.adminSupport')}</Typography>
        </Box>
        <Box role="toolbar" aria-label="Chat controls">
          <FormControl size="small" sx={{ minWidth: 80, mr: 1 }}>
            <Select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as string)}
              sx={{ 
                color: 'inherit',
                '& .MuiSelect-icon': { color: 'inherit' },
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    maxHeight: 200,
                  }
                }
              }}
            >
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="es">ES</MenuItem>
              <MenuItem value="fr">FR</MenuItem>
              <MenuItem value="de">DE</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title={t('chatbot.exportChat')}>
            <IconButton 
              size="small" 
              onClick={() => handleExport('json')}
              disabled={exporting || !conversation}
              sx={{ color: 'inherit' }}
            >
              {exporting ? <CircularProgress size={16} /> : <ExportIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title={notificationsEnabled ? t('chatbot.notificationsOn') : t('chatbot.notificationsOff')}>
            <IconButton 
              size="small" 
              onClick={toggleNotifications}
              sx={{ color: 'inherit' }}
            >
              {notificationsEnabled ? <NotificationsIcon sx={{ fontSize: 20 }} /> : <NotificationsOffIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('chatbot.search')}>
            <IconButton 
              size="small" 
              onClick={() => setShowSearch(!showSearch)}
              sx={{ color: 'inherit' }}
            >
              <SearchIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('chatbot.history')}>
            <IconButton 
              size="small" 
              onClick={() => setShowHistory(true)}
              sx={{ color: 'inherit' }}
            >
              <HistoryIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('chatbot.refresh')}>
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              disabled={loading}
              sx={{ color: 'inherit' }}
            >
              <RefreshIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('chatbot.close')}>
            <IconButton 
              size="small" 
              onClick={onToggle}
              sx={{ color: 'inherit' }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </ChatHeader>

      <Collapse in={showSearch}>
        <SearchPanel role="search">
          <TextField
            fullWidth
            size="small"
            placeholder={t('chatbot.searchMessages')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    size="small" 
                    onClick={handleSearch}
                    disabled={!searchQuery.trim() || searching}
                  >
                    {searching ? <CircularProgress size={16} /> : <SearchIcon />}
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={clearSearch}
                  >
                    <CloseIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            aria-label={t('chatbot.searchMessages')}
          />
        </SearchPanel>
      </Collapse>

      <Popover
        open={Boolean(reactionPickerAnchor.element)}
        anchorEl={reactionPickerAnchor.element}
        onClose={handleCloseReactionPicker}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <ReactionPicker>
          {['👍', '👎', '❤️', '😂', '😮', '😢', '👏', '🔥'].map((emoji) => (
            <IconButton
              key={emoji}
              onClick={() => handleReactionSelect(emoji)}
              size="small"
            >
              <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
            </IconButton>
          ))}
        </ReactionPicker>
      </Popover>

      {showHistory ? (
        <HistoryPanel
          role="dialog"
          aria-label={t('chatbot.chatHistory')}
          aria-modal="true"
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t('chatbot.chatHistory')}</Typography>
            <IconButton onClick={() => setShowHistory(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          {chatHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">{t('chatbot.noChatHistory')}</Typography>
            </Box>
          ) : (
            <List sx={{ flexGrow: 1, overflow: 'auto' }}>
              {chatHistory.map((item) => (
                <ListItem 
                  key={item.conversationId}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'grey.100' },
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}
                  onClick={() => handleSelectConversation(item.conversationId)}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2">{item.title}</Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      noWrap
                      sx={{ maxWidth: 250 }}
                    >
                      {item.lastMessage}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {item.unreadCount > 0 && (
                      <Badge badgeContent={item.unreadCount} color="primary" sx={{ mr: 1 }} />
                    )}
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHistory(item.conversationId);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </HistoryPanel>
      ) : (
        <>
          <MessagesContainer 
            role="log" 
            aria-live="polite"
            aria-label={t('chatbot.messages')}
          >
            {loading && messages.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : searchResults.length > 0 ? (
              <List>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('chatbot.searchResults')} &quot;{searchQuery}&quot;
                  </Typography>
                  <IconButton size="small" onClick={clearSearch}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                {searchResults.map((message) => (
                  <Box
                    key={message._id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: message.senderId === user?.id ? 'flex-end' : 'flex-start',
                      mb: 1,
                    }}
                  >
                    {message.senderId === user?.id ? (
                      <UserMessage
                        role="article"
                        aria-label={`${t('chatbot.you')}: ${message.content}`}
                      >
                        {message.content && (
                          <Typography variant="body2">{message.content}</Typography>
                        )}
                        {renderRichContent(message)}
                        {message.attachments && message.attachments.map((attachment, index) => renderAttachment(attachment, index))}
                        {renderReactions(message)}
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                          {formatTime(message.createdAt)}
                        </Typography>
                        {renderMessageStatus(message)}
                      </UserMessage>
                    ) : (
                      <AdminMessage
                        role="article"
                        aria-label={`${t('chatbot.admin')}: ${message.content}`}
                      >
                        {message.content && (
                          <Typography variant="body2">{message.content}</Typography>
                        )}
                        {renderRichContent(message)}
                        {message.attachments && message.attachments.map((attachment, index) => renderAttachment(attachment, index))}
                        {renderReactions(message)}
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                          {t('chatbot.admin')} • {formatTime(message.createdAt)}
                        </Typography>
                        {renderMessageStatus(message)}
                      </AdminMessage>
                    )}
                  </Box>
                ))}
              </List>
            ) : messages.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                <SupportAgentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {t('chatbot.welcomeMessage')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('chatbot.sendMessageToGetHelp')}
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={createConversation}
                  disabled={loading}
                >
                  {t('chatbot.startConversation')}
                </Button>
              </Box>
            ) : (
              <List>
                {messages.map((message) => (
                  <Box
                    key={message._id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: message.senderId === user?.id ? 'flex-end' : 'flex-start',
                      mb: 1,
                    }}
                  >
                    {message.senderId === user?.id ? (
                      <UserMessage
                        role="article"
                        aria-label={`${t('chatbot.you')}: ${message.content}`}
                      >
                        {message.content && (
                          <Typography variant="body2">{message.content}</Typography>
                        )}
                        {renderRichContent(message)}
                        {message.attachments && message.attachments.map((attachment, index) => renderAttachment(attachment, index))}
                        {renderReactions(message)}
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                          {formatTime(message.createdAt)}
                        </Typography>
                        {renderMessageStatus(message)}
                      </UserMessage>
                    ) : (
                      <AdminMessage
                        role="article"
                        aria-label={`${t('chatbot.admin')}: ${message.content}`}
                      >
                        {message.content && (
                          <Typography variant="body2">{message.content}</Typography>
                        )}
                        {renderRichContent(message)}
                        {message.attachments && message.attachments.map((attachment, index) => renderAttachment(attachment, index))}
                        {renderReactions(message)}
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                          {t('chatbot.admin')} • {formatTime(message.createdAt)}
                        </Typography>
                        {renderMessageStatus(message)}
                      </AdminMessage>
                    )}
                  </Box>
                ))}
                {renderTypingIndicator()}
                <div ref={messagesEndRef} />
              </List>
            )}
          </MessagesContainer>

          {/* Offline Indicator */}
          {!isOnline && (
            <OfflineIndicator>
              <OfflineIcon sx={{ mr: 1 }} />
              {t('chatbot.offline')}
            </OfflineIndicator>
          )}

          {/* Syncing Indicator */}
          {syncing && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1, bgcolor: 'info.light', color: 'info.contrastText' }}>
              <SyncIcon sx={{ mr: 1, animation: 'spin 1s linear infinite' }} />
              {t('chatbot.syncing')}
            </Box>
          )}

          {uploading && (
            <Box sx={{ px: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          {attachments.length > 0 && (
            <Box sx={{ px: 2, py: 1 }}>
              {attachments.map((attachment, index) => renderAttachment(attachment, index))}
            </Box>
          )}

          <Divider />

          <InputContainer
            role="form"
            aria-label={t('chatbot.messageInput')}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,application/pdf,text/plain,video/*"
              style={{ display: 'none' }}
              aria-label={t('chatbot.attachFile')}
            />
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
              aria-label={t('chatbot.attachFile')}
            >
              <AttachFileIcon />
            </IconButton>
            <TextField
              fullWidth
              variant="outlined"
              placeholder={t('chatbot.typeMessage')}
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={sending || loading || uploading}
              size="small"
              multiline
              maxRows={3}
              aria-label={t('chatbot.typeMessage')}
            />
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={sending || (!newMessage.trim() && attachments.length === 0) || loading || uploading}
              sx={{ ml: 1 }}
              aria-label={t('chatbot.send')}
            >
              {sending ? <CircularProgress size={24} /> : <SendIcon />}
            </IconButton>
          </InputContainer>
        </>
      )}
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarRef.current.open}
        autoHideDuration={6000}
        onClose={() => snackbarRef.current.open = false}
      >
        <Alert 
          onClose={() => snackbarRef.current.open = false} 
          severity={snackbarRef.current.severity}
          sx={{ width: '100%' }}
        >
          {snackbarRef.current.message}
        </Alert>
      </Snackbar>
    </ChatContainer>
  );
};

export default PersistentChatContainer;