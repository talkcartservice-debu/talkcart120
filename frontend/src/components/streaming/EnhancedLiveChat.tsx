import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Badge,
  Tooltip,
  Divider,
  Alert,
  Fade,
  Slide,
  Stack,
  alpha,
  useTheme,
  InputAdornment,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  Paper,
  Zoom,
  CircularProgress,
} from '@mui/material';
import {
  Send,
  Smile,
  Gift,
  MoreVertical,
  Pin,
  Flag,
  Crown,
  Star,
  Heart,
  ThumbsUp,
  Settings,
  Users,
  MessageCircle,
  Zap,
  Shield,
  Volume2,
  VolumeX,
  Verified,
  Clock,
  Ban,
  UserX,
  AlertTriangle,
  PinOff,
  Copy,
  Sparkles,
  Flame,
  Rocket,
  Diamond,
  Image,
  Paperclip,
  AtSign,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { streamingApi } from '@/services/streamingApi';
import { STREAMING_CAPABILITIES } from '@/config';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { createStreamingStyles, streamingAnimations } from './styles/streamingTheme';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedLiveChatProps {
  streamId: string;
  isStreamer?: boolean;
  isModerator?: boolean;
  allowChat?: boolean;
  height?: number | string;
  variant?: 'default' | 'compact' | 'overlay';
  showUserList?: boolean;
  enableGifts?: boolean;
  enableEmojis?: boolean;
  onSendMessage?: (message: string) => void;
  onSendGift?: (giftType: string, targetUser: string) => void;
  onModerateUser?: (userId: string, action: 'timeout' | 'ban' | 'unban') => void;
  onPinMessage?: (messageId: string) => void;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'gift' | 'follow' | 'subscription' | 'system';
  isStreamer?: boolean;
  isModerator?: boolean;
  isVerified?: boolean;
  isPinned?: boolean;
  giftData?: {
    giftType: string;
    emoji: string;
    value: number;
  };
  reactions?: {
    likes: number;
    hearts: number;
    isLiked: boolean;
    isHearted: boolean;
  };
  mentions?: string[];
  attachments?: {
    type: 'image' | 'gif' | 'sticker';
    url: string;
    preview?: string;
  }[];
}

interface ChatUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  isStreamer?: boolean;
  isModerator?: boolean;
  isVerified?: boolean;
  isOnline: boolean;
  joinedAt: Date;
  messageCount: number;
  lastActive: Date;
}

interface EmojiData {
  emoji: string;
  name: string;
  category: string;
}

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

// Emoji categories
const emojiCategories = {
  'Faces & People': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙'],
  'Animals & Nature': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊'],
  'Food & Drink': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥒'],
  'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅'],
  'Objects': ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹'],
  'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️'],
  'Flags': ['🏁', '🚩', 'obia', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️', '🇦🇨', '🇦🇩', '🇦🇪', '🇦🇫', '🇦🇬', '🇦🇮', '🇦🇱', '🇦🇲', '🇦🇴'],
};

// Gift animations
const giftAnimations = {
  sparkle: {
    initial: { scale: 0, rotate: 0 },
    animate: { scale: [0, 1.2, 1], rotate: [0, 180, 360] },
    exit: { scale: 0, opacity: 0 }
  },
  bounce: {
    initial: { y: 50, opacity: 0 },
    animate: { y: [50, -10, 0], opacity: 1 },
    exit: { y: -50, opacity: 0 }
  },
  float: {
    initial: { y: 0, opacity: 0 },
    animate: { y: [-10, -20, -30], opacity: [0, 1, 0] },
    exit: { opacity: 0 }
  }
};

const EnhancedLiveChat: React.FC<EnhancedLiveChatProps> = ({
  streamId,
  isStreamer = false,
  isModerator = false,
  allowChat = true,
  height = 600,
  variant = 'default',
  showUserList = false,
  enableGifts = true,
  enableEmojis = true,
  onSendMessage,
  onSendGift,
  onModerateUser,
  onPinMessage,
}) => {
  const theme = useTheme();
  const streamingStyles = createStreamingStyles(theme);
  const queryClient = useQueryClient();
  
  // State management
  const [message, setMessage] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState<{ user: ChatUser; anchor: HTMLElement } | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<{ message: ChatMessage; anchor: HTMLElement } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [typingUsers, setTypingUsers] = useState<ChatUser[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
  const [messageFilter, setMessageFilter] = useState<'all' | 'streamer' | 'moderator' | 'gifts'>('all');
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket integration
  const { socket, onChatMessage, offChatMessage } = useWebSocket();

  // Fetch chat data
  const { data: chatData, isLoading } = useQuery({
    queryKey: ['chat-messages', streamId],
    queryFn: () => streamingApi.getStream(streamId),
    refetchInterval: false,
    enabled: !!streamId && STREAMING_CAPABILITIES.chatEnabled,
  });

  const { data: onlineUsersData } = useQuery({
    queryKey: ['chat-users', streamId],
    queryFn: () => streamingApi.getStream(streamId),
    refetchInterval: 30000,
    enabled: showUserList && !!streamId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      if (!STREAMING_CAPABILITIES.chatEnabled) return { success: false } as any;
      // Mock implementation since we don't have a specific chat message API
      return { success: true, data: { message: msg } };
    },
    onSuccess: () => {
      setMessage('');
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ['chat-messages', streamId] });
      onSendMessage?.(message);
    },
  });

  // Process messages
  const messages = useMemo(() => {
    const rawMessages: any[] = STREAMING_CAPABILITIES.chatEnabled
      ? (chatData?.data?.messages || [])
      : [];

    const processedMessages: ChatMessage[] = rawMessages.map((m: any) => ({
      id: String(m.id || m._id || Math.random()),
      userId: String(m.userId || ''),
      username: m.username || `User${String(m.userId || '').slice(-4)}`,
      displayName: m.displayName || m.username || `User${String(m.userId || '').slice(-4)}`,
      avatar: m.avatar,
      message: String(m.message || ''),
      timestamp: new Date(m.timestamp || Date.now()),
      type: (m.type as ChatMessage['type']) || 'message',
      isStreamer: !!m.isStreamer,
      isModerator: !!m.isModerator,
      isVerified: !!m.isVerified,
      isPinned: !!m.isPinned,
      giftData: m.giftData,
      reactions: m.reactions,
      mentions: m.mentions || [],
      attachments: m.attachments || [],
    }));

    // Filter messages based on current filter
    return processedMessages.filter(msg => {
      switch (messageFilter) {
        case 'streamer': return msg.isStreamer;
        case 'moderator': return msg.isModerator;
        case 'gifts': return msg.type === 'gift';
        default: return true;
      }
    });
  }, [chatData, messageFilter]);

  const onlineUsers = useMemo(() => {
    return (onlineUsersData?.data?.users || []).map((u: any) => ({
      id: String(u.id || u._id),
      username: u.username,
      displayName: u.displayName || u.username,
      avatar: u.avatar,
      isStreamer: !!u.isStreamer,
      isModerator: !!u.isModerator,
      isVerified: !!u.isVerified,
      isOnline: true,
      joinedAt: new Date(u.joinedAt || Date.now()),
      messageCount: u.messageCount || 0,
      lastActive: new Date(u.lastActive || Date.now()),
    })) as ChatUser[];
  }, [onlineUsersData]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('chat:typing:start', { streamId });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('chat:typing:stop', { streamId });
    }, 2000);
  }, [socket, streamId, isTyping]);

  // Handle message submission
  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !allowChat) return;
    sendMessageMutation.mutate(message.trim());
  }, [message, allowChat, sendMessageMutation]);

  // Handle emoji insertion
  const handleEmojiSelect = useCallback((emoji: string) => {
    const input = chatInputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMessage);
      
      // Set cursor position after emoji
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
    setShowEmojiPicker(false);
  }, [message]);

  // Message component
  const MessageComponent = React.memo<{ message: ChatMessage; isLast?: boolean }>(({ message: msg, isLast }) => {
    const [showActions, setShowActions] = useState(false);
    const [reactionCount, setReactionCount] = useState(msg.reactions?.likes || 0);
    
    const messageVariants = {
      initial: { opacity: 0, y: 20, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -20, scale: 0.95 }
    };

    const getMessageStyles = () => {
      if (msg.isPinned) {
        return {
          bgcolor: alpha(theme.palette.warning.main, 0.1),
          border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
        };
      }
      if (msg.isStreamer) {
        return streamingStyles.chatMessage('streamer');
      }
      if (msg.isModerator) {
        return streamingStyles.chatMessage('moderator');
      }
      if (msg.type === 'gift') {
        return streamingStyles.chatMessage('gift');
      }
      return streamingStyles.chatMessage();
    };

    return (
      <MotionBox
        variants={messageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        sx={{
          p: 1.5,
          mb: 0.5,
          borderRadius: 2,
          position: 'relative',
          transition: 'all 0.2s ease-in-out',
          ...getMessageStyles(),
          '&:hover': {
            bgcolor: alpha(theme.palette.action.hover, 0.05),
          },
        }}
      >
        {/* Pin indicator */}
        {msg.isPinned && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Pin size={12} color={theme.palette.warning.main} />
            <Typography variant="caption" color="warning.main" sx={{ ml: 0.5, fontWeight: 600 }}>
              Pinned by moderator
            </Typography>
          </Box>
        )}

        <Stack direction="row" spacing={1}>
          {/* Avatar */}
          <Avatar
            src={msg.avatar}
            sx={{ 
              width: 32, 
              height: 32,
              border: msg.isStreamer ? `2px solid ${theme.palette.warning.main}` 
                     : msg.isModerator ? `2px solid ${theme.palette.info.main}`
                     : 'none'
            }}
          >
            {msg.displayName.charAt(0).toUpperCase()}
          </Avatar>

          {/* Message content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* User info */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  color: msg.isStreamer ? 'warning.main' 
                        : msg.isModerator ? 'info.main'
                        : 'text.primary'
                }}
              >
                {msg.displayName}
              </Typography>
              
              {msg.isVerified && <Verified size={12} color={theme.palette.primary.main} />}
              {msg.isStreamer && <Crown size={12} color={theme.palette.warning.main} />}
              {msg.isModerator && <Shield size={12} color={theme.palette.info.main} />}
              
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
              </Typography>
            </Stack>

            {/* Gift message */}
            {msg.type === 'gift' && msg.giftData && (
              <Box sx={{ mb: 1 }}>
                <Chip
                  icon={<span style={{ fontSize: '1.2em' }}>{msg.giftData.emoji}</span>}
                  label={`sent ${msg.giftData.giftType} worth $${msg.giftData.value}`}
                  variant="filled"
                  sx={{
                    bgcolor: alpha(theme.palette.success.main, 0.2),
                    color: 'success.main',
                    fontWeight: 600,
                  }}
                />
              </Box>
            )}

            {/* Message text */}
            <Typography 
              variant="body2" 
              sx={{ 
                wordBreak: 'break-word',
                lineHeight: 1.4,
                '& .mention': {
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  px: 0.5,
                  borderRadius: 0.5,
                },
              }}
              dangerouslySetInnerHTML={{
                __html: msg.message.replace(
                  /@(\w+)/g,
                  '<span class="mention">@$1</span>'
                )
              }}
            />

            {/* Attachments */}
            {msg.attachments && msg.attachments.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {msg.attachments.map((attachment, index) => (
                  <Box key={index} sx={{ mb: 1 }}>
                    {attachment.type === 'image' && (
                      <Box
                        component="img"
                        src={attachment.url}
                        alt="Attachment"
                        sx={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          borderRadius: 1,
                          cursor: 'pointer',
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {/* Reactions */}
            {msg.reactions && (msg.reactions.likes > 0 || msg.reactions.hearts > 0) && (
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                {msg.reactions.likes > 0 && (
                  <Chip
                    icon={<ThumbsUp size={12} />}
                    label={msg.reactions.likes}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.625rem' }}
                  />
                )}
                {msg.reactions.hearts > 0 && (
                  <Chip
                    icon={<Heart size={12} />}
                    label={msg.reactions.hearts}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.625rem' }}
                  />
                )}
              </Stack>
            )}
          </Box>
        </Stack>

        {/* Action buttons (shown on hover) */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
              }}
            >
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Like">
                  <IconButton
                    size="small"
                    onClick={() => setReactionCount(prev => prev + 1)}
                    sx={{ 
                      bgcolor: alpha(theme.palette.background.paper, 0.8),
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <ThumbsUp size={12} />
                  </IconButton>
                </Tooltip>
                
                {(isStreamer || isModerator) && (
                  <>
                    <Tooltip title="Pin message">
                      <IconButton
                        size="small"
                        onClick={() => onPinMessage?.(msg.id)}
                        sx={{ 
                          bgcolor: alpha(theme.palette.background.paper, 0.8),
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        <Pin size={12} />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="More actions">
                      <IconButton
                        size="small"
                        sx={{ 
                          bgcolor: alpha(theme.palette.background.paper, 0.8),
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        <MoreVertical size={12} />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Stack>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionBox>
    );
  });
  
  MessageComponent.displayName = 'MessageComponent';

  // Emoji picker component
  const EmojiPicker = () => (
    <MotionPaper
      ref={emojiPickerRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      sx={{
        position: 'absolute',
        bottom: '100%',
        right: 0,
        width: 320,
        maxHeight: 300,
        overflow: 'auto',
        p: 2,
        mb: 1,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[8],
        zIndex: 1000,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Choose an emoji
      </Typography>
      
      {Object.entries(emojiCategories).map(([category, emojis]) => (
        <Box key={category} sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            {category}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {emojis.map((emoji) => (
              <IconButton
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '1.2rem',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    transform: 'scale(1.2)',
                  },
                  transition: 'all 0.1s ease-in-out',
                }}
              >
                {emoji}
              </IconButton>
            ))}
          </Box>
        </Box>
      ))}
    </MotionPaper>
  );

  return (
    <Card sx={{ height, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <MessageCircle size={20} />
            <Typography variant="h6" fontWeight={600}>
              Live Chat
            </Typography>
          </Stack>
          
          <Stack direction="row" spacing={0.5}>
            {/* Message filter */}
            <Tooltip title="Filter messages">
              <IconButton size="small">
                <Settings size={16} />
              </IconButton>
            </Tooltip>
            
            {/* Sound toggle */}
            <Tooltip title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}>
              <IconButton 
                size="small" 
                onClick={() => setSoundEnabled(!soundEnabled)}
                color={soundEnabled ? 'primary' : 'default'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </IconButton>
            </Tooltip>
            
            {/* Online users */}
            <Tooltip title="Online users">
              <IconButton 
                size="small"
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                color={showOnlineUsers ? 'primary' : 'default'}
              >
                <Users size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        
        {/* Pinned message */}
        <AnimatePresence>
          {pinnedMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <Box
                sx={{
                  mt: 1,
                  p: 1,
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Pin size={14} color={theme.palette.warning.main} />
                <Typography variant="caption" sx={{ flex: 1 }}>
                  <strong>{pinnedMessage.displayName}:</strong> {pinnedMessage.message}
                </Typography>
                {(isStreamer || isModerator) && (
                  <IconButton size="small" onClick={() => setPinnedMessage(null)}>
                    <PinOff size={12} />
                  </IconButton>
                )}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Chat disabled banner */}
        {!allowChat && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Chat is currently disabled by the streamer
          </Alert>
        )}
      </Box>

      {/* Messages area */}
      <Box 
        ref={messagesContainerRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 1,
          background: `linear-gradient(to bottom, ${alpha(theme.palette.background.default, 0.5)}, ${alpha(theme.palette.background.paper, 0.8)})`,
        }}
      >
        {isLoading ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {[...Array(5)].map((_, i) => (
              <Stack key={i} direction="row" spacing={1}>
                <CircularProgress size={32} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">Loading messages...</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        ) : (
          <AnimatePresence>
            {messages.map((msg, index) => (
              <MessageComponent 
                key={msg.id} 
                message={msg} 
                isLast={index === messages.length - 1}
              />
            ))}
          </AnimatePresence>
        )}
        
        {/* Typing indicators */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Box sx={{ p: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                <Typography variant="caption">
                  {typingUsers.map(u => u.displayName).join(', ')} 
                  {typingUsers.length === 1 ? ' is' : ' are'} typing...
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Input area */}
      {allowChat && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', position: 'relative' }}>
          <Stack component="form" onSubmit={handleSendMessage} direction="row" spacing={1}>
            <TextField
              ref={chatInputRef}
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              disabled={sendMessageMutation.isPending}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.background.paper, 0.8),
                  backdropFilter: 'blur(10px)',
                },
              }}
              InputProps={{
                startAdornment: enableEmojis && (
                  <InputAdornment position="start">
                    <IconButton
                      size="small"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      color={showEmojiPicker ? 'primary' : 'default'}
                    >
                      <Smile size={16} />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Stack direction="row" spacing={0.5}>
                      {enableGifts && (
                        <IconButton size="small">
                          <Gift size={16} />
                        </IconButton>
                      )}
                      <IconButton size="small">
                        <AtSign size={16} />
                      </IconButton>
                    </Stack>
                  </InputAdornment>
                ),
              }}
            />
            
            <IconButton
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending}
              sx={{
                bgcolor: theme.palette.primary.main,
                color: 'white',
                '&:hover': {
                  bgcolor: theme.palette.primary.dark,
                },
                '&:disabled': {
                  bgcolor: alpha(theme.palette.action.disabled, 0.3),
                },
              }}
            >
              {sendMessageMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Send size={16} />
              )}
            </IconButton>
          </Stack>

          {/* Emoji picker */}
          <AnimatePresence>
            {showEmojiPicker && <EmojiPicker />}
          </AnimatePresence>
        </Box>
      )}
    </Card>
  );
};

export default EnhancedLiveChat;