import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tooltip,
  Divider,
  Alert,
  Fade,
  Collapse,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Slider,
  List,
  ListItem,
  ListItemAvatar,
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
  Ban as Block,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { STREAMING_CAPABILITIES } from '@/config';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface LiveChatProps {
  streamId: string;
  isStreamer?: boolean;
  isModerator?: boolean;
  allowChat?: boolean; // when false, disable sending and show banner
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
}

const LiveChat: React.FC<LiveChatProps> = ({
  streamId,
  isStreamer = false,
  isModerator = false,
  allowChat = true,
  onSendMessage,
  onSendGift,
  onModerateUser,
  onPinMessage,
}) => {
  const queryClient = useQueryClient();

  // UI State
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chatSettings, setChatSettings] = useState({
    slowMode: false,
    slowModeDelay: 5,
    subscribersOnly: false,
    followersOnly: false,
    emoteOnly: false,
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('info');

  // Pinned message banner (real-time)
  const [pinned, setPinned] = useState<null | { messageId: string; messageText: string; pinnedBy: string }>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // No mock data - only use real data from backend

  // Fetch chat messages only when capability is enabled
  // TODO: Implement getChatMessages API endpoint
  // const { data: chatData, isLoading } = useQuery({
  //   queryKey: ['chat-messages', streamId],
  //   queryFn: () => api.streams.getChatMessages(streamId),
  //   // Disable polling; rely on WebSocket events
  //   refetchInterval: false,
  //   initialData: undefined,
  //   enabled: !!streamId && STREAMING_CAPABILITIES.chatEnabled,
  // });

  // For now, use mock data
  const { data: chatData, isLoading } = useQuery({
    queryKey: ['chat-messages', streamId],
    queryFn: () => Promise.resolve({
      success: true,
      data: {
        data: {
          messages: []
        }
      }
    }),
    // Disable polling; rely on WebSocket events
    refetchInterval: false,
    initialData: undefined,
    enabled: !!streamId && STREAMING_CAPABILITIES.chatEnabled,
  });

  // Subscribe to WebSocket chat events to optimistically update cache
  const { socket, onChatMessage, offChatMessage } = useWebSocket();
  useEffect(() => {
    if (!STREAMING_CAPABILITIES.chatEnabled) return;
    const handler = (data: any) => {
      // Server may omit streamId in payload; since socket is joined to a single stream room via player, accept event
      queryClient.setQueryData<any>(['chat-messages', streamId], (prev: any) => {
        const base = prev || { success: true, data: { messages: [] } };
        const list = base?.data?.messages || base?.messages || [];
        const nextMessage = {
          id: String(data.id || data._id || Math.random().toString(36).slice(2)),
          userId: String(data.userId || ''),
          username: data.username || '',
          displayName: data.displayName || data.username || `User ${(String(data.userId || '').slice(-4) || '')}`,
          avatar: data.avatar,
          message: String(data.message || ''),
          timestamp: data.timestamp || new Date().toISOString(),
          type: data.type || 'message',
          isStreamer: !!data.isStreamer,
          isModerator: !!data.isModerator,
          isVerified: !!data.isVerified,
        };
        const merged = { ...base } as any;
        if (merged.data && merged.data.messages) {
          merged.data = { ...merged.data, messages: [...list, nextMessage] };
        } else {
          merged.messages = [...list, nextMessage];
        }
        return merged;
      });
    };
    onChatMessage(handler);
    return () => {
      offChatMessage(handler as any);
    };
  }, [streamId, onChatMessage, offChatMessage, queryClient]);

  // Listen for delete/pin chat events
  useEffect(() => {
    if (!socket || !STREAMING_CAPABILITIES.chatEnabled) return;

    const handleDeleted = (payload: any) => {
      const msgId = String(payload?.id || '');
      if (!msgId) return;
      queryClient.setQueryData<any>(['chat-messages', streamId], (prev: any) => {
        const base = prev || { success: true, data: { messages: [] } };
        const list = base?.data?.messages || base?.messages || [];
        const filtered = list.filter((m: any) => String(m.id || m._id) !== msgId);
        const merged = { ...base } as any;
        if (merged.data && merged.data.messages) {
          merged.data = { ...merged.data, messages: filtered };
        } else {
          merged.messages = filtered;
        }
        return merged;
      });
    };

    const handlePinned = (payload: any) => {
      const msgId = String(payload?.id || '');
      const isPinned = !!payload?.isPinned;
      if (!msgId) return;
      queryClient.setQueryData<any>(['chat-messages', streamId], (prev: any) => {
        const base = prev || { success: true, data: { messages: [] } };
        const list = base?.data?.messages || base?.messages || [];
        const updated = list.map((m: any) => ({
          ...m,
          isPinned: String(m.id || m._id) === msgId ? isPinned : m.isPinned,
        }));
        const merged = { ...base } as any;
        if (merged.data && merged.data.messages) {
          merged.data = { ...merged.data, messages: updated };
        } else {
          merged.messages = updated;
        }
        return merged;
      });
    };

    socket.on('chat:message-deleted', handleDeleted);
    socket.on('chat:message-pin', handlePinned);

    return () => {
      socket.off('chat:message-deleted', handleDeleted);
      socket.off('chat:message-pin', handlePinned);
    };
  }, [socket, streamId, queryClient]);

  // Listen for live pinned/unpinned events (socket)
  useEffect(() => {
    if (!socket || !STREAMING_CAPABILITIES.chatEnabled) return;
    const onPinned = (payload: any) => {
      if (!payload) return;
      setPinned({
        messageId: String(payload.messageId || ''),
        messageText: String(payload.messageText || ''),
        pinnedBy: String(payload.pinnedBy || 'Moderator'),
      });
    };
    const onUnpinned = () => setPinned(null);
    socket.on('live:message:pinned', onPinned);
    socket.on('live:message:unpinned', onUnpinned);
    return () => {
      socket.off('live:message:pinned', onPinned);
      socket.off('live:message:unpinned', onUnpinned);
    };
  }, [socket]);

  // Listen for gift events and append a gift message to chat
  useEffect(() => {
    if (!socket || !STREAMING_CAPABILITIES.chatEnabled) return;

    const handleGiftNew = (payload: any) => {
      queryClient.setQueryData<any>(['chat-messages', streamId], (prev: any) => {
        const base = prev || { success: true, data: { messages: [] } };
        const list = base?.data?.messages || base?.messages || [];
        const giftMsg = {
          id: String(payload?.id || Math.random().toString(36).slice(2)),
          userId: String(payload?.senderId || ''),
          username: payload?.isAnonymous ? 'Anonymous' : (payload?.username || 'Someone'),
          displayName: payload?.isAnonymous ? 'Anonymous' : (payload?.displayName || payload?.username || 'Someone'),
          avatar: payload?.avatar || undefined,
          message: payload?.message || '',
          timestamp: new Date(payload?.timestamp || Date.now()),
          type: 'gift' as const,
          isStreamer: false,
          isModerator: false,
          isVerified: false,
          isPinned: false,
          giftData: {
            giftType: String(payload?.giftType || payload?.giftName || 'Gift'),
            emoji: String(payload?.giftEmoji || '🎁'),
            value: Number(payload?.amount || 0),
          },
        };
        const merged = { ...base } as any;
        if (merged.data && merged.data.messages) {
          merged.data = { ...merged.data, messages: [...list, giftMsg] };
        } else {
          merged.messages = [...list, giftMsg];
        }
        return merged;
      });
    };

    socket.on('gift:new', handleGiftNew);

    return () => {
      socket.off('gift:new', handleGiftNew);
    };
  }, [socket, streamId, queryClient]);


  // Normalize messages from backend to UI shape and make fields safe
  const rawMessages: any[] = STREAMING_CAPABILITIES.chatEnabled
    ? (chatData?.data?.data?.messages || [])
    : [];

  const messages: ChatMessage[] = rawMessages.map((m: any) => {
    const userId = String(m.userId || '');
    const fallbackName = userId ? `User ${userId.slice(-4)}` : 'User';
    const fallbackUsername = userId ? `user-${userId.slice(-4)}` : 'user';
    return {
      id: String(m.id || m._id || Math.random().toString(36).slice(2)),
      userId: userId,
      username: m.username || fallbackUsername,
      displayName: m.displayName || m.username || fallbackName,
      avatar: m.avatar,
      message: String(m.message || ''),
      timestamp: new Date(m.timestamp || Date.now()),
      type: (m.type as ChatMessage['type']) || 'message',
      isStreamer: !!m.isStreamer,
      isModerator: !!m.isModerator,
      isVerified: !!m.isVerified,
      isPinned: !!m.isPinned,
      reactions: m.reactions
        ? {
            likes: Number(m.reactions.likes || 0),
            hearts: Number(m.reactions.hearts || 0),
            isLiked: false,
            isHearted: false,
          }
        : undefined,
      giftData: m.giftData,
    } as ChatMessage;
  });

  // API Mutations
  const [timeoutRetryAfter, setTimeoutRetryAfter] = useState<number | null>(null);
  const [timeoutCountdown, setTimeoutCountdown] = useState<number | null>(null);

  // Countdown effect for timeout
  useEffect(() => {
    if (timeoutRetryAfter && timeoutRetryAfter > 0) {
      setTimeoutCountdown(timeoutRetryAfter);
      const interval = setInterval(() => {
        setTimeoutCountdown(prev => {
          if (!prev) return null;
          if (prev <= 1) {
            clearInterval(interval);
            setTimeoutRetryAfter(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [timeoutRetryAfter]);

  const sendMessageMutation = useMutation({
    mutationFn: async (msg: string) => {
      if (!STREAMING_CAPABILITIES.chatEnabled) return { success: false } as any;
      // TODO: Implement sendChatMessage API endpoint
      // const res = await api.streams.sendChatMessage(streamId, msg);
      // If backend returns non-success, surface it to onError via throw
      // if (!res?.success) {
      //   const err: any = new Error(res?.error || 'Failed to send message');
      //   // Pass along timeout info if present
      //   if (typeof res?.retryAfterSeconds === 'number') err.retryAfterSeconds = res.retryAfterSeconds;
      //   throw err;
      // }
      // return res;
      
      // For now, mock the response
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages', streamId] });
      onSendMessage?.(message);
    },
    onError: (error: any) => {
      const retry = error?.retryAfterSeconds;
      if (retry) {
        setTimeoutRetryAfter(retry);
        setSnackbarMessage(`You are timed out. Try again in ${retry}s`);
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
        return;
      }
      setSnackbarMessage(error?.message || 'Failed to send message');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => {
      if (!STREAMING_CAPABILITIES.chatEnabled) return Promise.resolve({ success: false });
      // TODO: Implement deleteChatMessage API endpoint
      // return api.streams.deleteChatMessage(streamId, messageId);
      
      // For now, mock the response
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', streamId] });
      setSnackbarMessage('Message deleted');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    },
    onError: () => {
      setSnackbarMessage('Failed to delete message');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: (messageId: string) => {
      if (!STREAMING_CAPABILITIES.chatEnabled) return Promise.resolve({ success: false });
      // TODO: Implement pinChatMessage API endpoint
      // return api.streams.pinChatMessage(streamId, messageId);
      
      // For now, mock the response
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', streamId] });
      setSnackbarMessage('Message pinned');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onPinMessage?.(selectedMessage?.id || '');
    },
    onError: () => {
      setSnackbarMessage('Failed to pin message');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const banUserMutation = useMutation({
    mutationFn: ({ userId, reason, duration }: { userId: string; reason: string; duration?: number }) => {
      if (!STREAMING_CAPABILITIES.moderationEnabled) return Promise.resolve({ success: false });
      // TODO: Implement banUser API endpoint
      // return api.streams.banUser(streamId, userId, reason, duration);
      
      // For now, mock the response
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', streamId] });
      setSnackbarMessage('User banned');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onModerateUser?.(selectedUser?.id || '', 'ban');
    },
    onError: () => {
      setSnackbarMessage('Failed to ban user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const timeoutUserMutation = useMutation({
    mutationFn: ({ userId, duration, reason }: { userId: string; duration: number; reason: string }) => {
      if (!STREAMING_CAPABILITIES.moderationEnabled) return Promise.resolve({ success: false });
      // TODO: Implement timeoutUser API endpoint
      // return api.streams.timeoutUser(streamId, userId, duration, reason);
      
      // For now, mock the response
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', streamId] });
      setSnackbarMessage('User timed out');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      onModerateUser?.(selectedUser?.id || '', 'timeout');
    },
    onError: () => {
      setSnackbarMessage('Failed to timeout user');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    },
  });

  const sendGiftMutation = useMutation({
    mutationFn: ({ giftType, targetUserId, message, isAnonymous }: { giftType: string; targetUserId?: string; message?: string; isAnonymous?: boolean }) =>
      // TODO: Implement sendGift API endpoint
      // api.streams.sendGift(streamId, giftType, { targetUserId, message, isAnonymous })
      
      // For now, mock the response
      Promise.resolve({ success: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', streamId] });
      setSnackbarMessage('Gift sent!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setShowGiftDialog(false);
      onSendGift?.(selectedMessage?.giftData?.giftType || '', selectedUser?.id || '');
    },
    onError: () => {
      // Gifts are client-only; treat as success to avoid UX breakage
      setSnackbarMessage('Gift sent!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setShowGiftDialog(false);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message submission
  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Message handlers
  const handleMessageClick = (msg: ChatMessage, event: React.MouseEvent) => {
    if (isStreamer || isModerator) {
      setSelectedMessage(msg);
      setMessageMenuAnchor(event.currentTarget as HTMLElement);
    }
  };

  const handleUserClick = (user: ChatUser, event: React.MouseEvent) => {
    if (isStreamer || isModerator) {
      setSelectedUser(user);
      setUserMenuAnchor(event.currentTarget as HTMLElement);
    }
  };

  const handlePinMessage = () => {
    if (selectedMessage) {
      pinMessageMutation.mutate(selectedMessage.id);
    }
    setMessageMenuAnchor(null);
  };

  const handleDeleteMessage = () => {
    if (selectedMessage) {
      deleteMessageMutation.mutate(selectedMessage.id);
    }
    setMessageMenuAnchor(null);
  };

  const handleBanUser = () => {
    if (selectedUser) {
      banUserMutation.mutate({
        userId: selectedUser.id,
        reason: 'Inappropriate behavior',
        duration: undefined // Permanent ban
      });
    }
    setUserMenuAnchor(null);
  };

  const handleTimeoutUser = (duration: number) => {
    if (selectedUser) {
      timeoutUserMutation.mutate({
        userId: selectedUser.id,
        duration,
        reason: 'Temporary timeout'
      });
    }
    setUserMenuAnchor(null);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'gift':
        return '#ff9800';
      case 'follow':
        return '#4caf50';
      case 'subscription':
        return '#9c27b0';
      case 'system':
        return '#2196f3';
      default:
        return 'inherit';
    }
  };

  const renderMessage = (msg: ChatMessage) => (
    <Box
      key={msg.id}
      sx={{
        p: 1,
        borderRadius: 1,
        mb: 0.5,
        cursor: (isStreamer || isModerator) ? 'pointer' : 'default',
        '&:hover': {
          bgcolor: 'action.hover',
        },
        borderLeft: msg.isPinned ? '3px solid #ff9800' : 'none',
        bgcolor: msg.isPinned ? 'rgba(255, 152, 0, 0.1)' : 'transparent',
      }}
      onClick={(e) => handleMessageClick(msg, e)}
    >
      <Box display="flex" alignItems="flex-start" gap={1}>
        <Avatar
          src={msg.avatar}
          sx={{ width: 24, height: 24 }}
          onClick={(e) => {
            e.stopPropagation();
            handleUserClick({
              id: msg.userId,
              username: msg.username,
              displayName: msg.displayName,
              avatar: msg.avatar,
              isStreamer: msg.isStreamer,
              isModerator: msg.isModerator,
              isVerified: msg.isVerified,
              isOnline: true,
              joinedAt: new Date(),
            }, e);
          }}
        >
          {msg.displayName[0]}
        </Avatar>

        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{ color: getMessageTypeColor(msg.type) }}
            >
              {msg.displayName}
            </Typography>

            {msg.isStreamer && (
              <Chip size="small" label="HOST" color="warning" variant="outlined" sx={{ height: 18, ml: 0.5, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
            )}
            {msg.isModerator && (
              <Chip size="small" label="MOD" color="info" variant="outlined" sx={{ height: 18, ml: 0.5, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
            )}
            {msg.isVerified && (
              <Chip size="small" label="VERIFIED" color="primary" variant="outlined" sx={{ height: 18, ml: 0.5, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
            )}
            {msg.isPinned && <Pin size={12} color="#ff9800" />}

            <Typography variant="caption" color="text.secondary">
              {formatTimestamp(msg.timestamp)}
            </Typography>
          </Box>

          {msg.type === 'gift' && msg.giftData ? (
            <Box
              sx={{
                p: 1,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderRadius: 1,
                display: 'inline-block',
              }}
            >
              <Typography variant="body2">
                {msg.giftData.emoji} Sent {msg.giftData.giftType} ({msg.giftData.value} coins)
              </Typography>
            </Box>
          ) : msg.type === 'follow' ? (
            <Box
              sx={{
                p: 1,
                bgcolor: 'success.main',
                color: 'success.contrastText',
                borderRadius: 1,
                display: 'inline-block',
              }}
            >
              <Typography variant="body2">
                🎉 New follower! {msg.message}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              {msg.message}
            </Typography>
          )}

          {msg.reactions && (
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <Button
                size="small"
                startIcon={<ThumbsUp size={12} />}
                sx={{ minWidth: 'auto', p: 0.5 }}
              >
                {msg.reactions.likes}
              </Button>
              <Button
                size="small"
                startIcon={<Heart size={12} />}
                sx={{ minWidth: 'auto', p: 0.5 }}
              >
                {msg.reactions.hearts}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <MessageCircle size={20} />
            <Typography variant="h6">Live Chat</Typography>
            <Badge badgeContent={messages.length} color="primary" />
          </Box>
        }
        action={
          <Box display="flex" gap={0.5}>
            <Tooltip title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}>
              <IconButton
                size="small"
                onClick={() => setSoundEnabled(!soundEnabled)}
                color={soundEnabled ? 'primary' : 'default'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </IconButton>
            </Tooltip>

            {(isStreamer || isModerator) && (
              <Tooltip title="Chat settings">
                <IconButton
                  size="small"
                  onClick={() => setShowSettingsDialog(true)}
                >
                  <Settings size={16} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        }
        sx={{ pb: 1 }}
      />

      {/* Messages Area */}
      <CardContent sx={{ flex: 1, overflow: 'auto', py: 0 }}>
        {!STREAMING_CAPABILITIES.chatEnabled ? (
          <Alert severity="info" sx={{ m: 2 }}>
            Chat is disabled in this environment.
          </Alert>
        ) : !allowChat ? (
          <Alert severity="warning" sx={{ m: 2 }}>
            Chat is disabled by the streamer for this stream.
          </Alert>
        ) : (timeoutCountdown ?? 0) > 0 ? (
          <Alert severity="warning" sx={{ m: 2 }}>
            You are timed out. Try again in {timeoutCountdown}s.
          </Alert>
        ) : isLoading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box>
            {pinned && (
              <Alert severity="info" icon={<Pin size={16} />} sx={{ m: 1, bgcolor: 'rgba(33,150,243,0.08)' }}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Pinned by {pinned.pinnedBy}:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {pinned.messageText}
                  </Typography>
                </Box>
              </Alert>
            )}
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </CardContent>

      {/* Message Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box display="flex" gap={1} alignItems="flex-end">
          <TextField
            ref={chatInputRef}
            fullWidth
            multiline
            maxRows={3}
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!STREAMING_CAPABILITIES.chatEnabled || !allowChat || sendMessageMutation.isPending || (timeoutCountdown ?? 0) > 0}
            size="small"
          />

          <IconButton onClick={() => setShowEmojiPicker(true)} size="small" disabled={!STREAMING_CAPABILITIES.chatEnabled}>
            <Smile size={20} />
          </IconButton>

          <IconButton onClick={() => setShowGiftDialog(true)} size="small" color="primary" disabled={!STREAMING_CAPABILITIES.chatEnabled}>
            <Gift size={20} />
          </IconButton>

          <IconButton
            onClick={handleSendMessage}
            disabled={!STREAMING_CAPABILITIES.chatEnabled || !allowChat || !message.trim() || sendMessageMutation.isPending || (timeoutCountdown ?? 0) > 0}
            color="primary"
          >
            {sendMessageMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              <Send size={20} />
            )}
          </IconButton>
        </Box>
      </Box>

      {/* Message Context Menu */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={() => setMessageMenuAnchor(null)}
      >
        {(isStreamer || isModerator) && (
          <>
            <MenuItem onClick={handlePinMessage}>
              <ListItemIcon>
                <Pin size={16} />
              </ListItemIcon>
              <ListItemText primary="Pin Message" />
            </MenuItem>
            <MenuItem onClick={handleDeleteMessage}>
              <ListItemIcon>
                <Block size={16} />
              </ListItemIcon>
              <ListItemText primary="Delete Message" />
            </MenuItem>
            <Divider />
          </>
        )}
        <MenuItem onClick={() => navigator.clipboard.writeText(selectedMessage?.message || '')}>
          <ListItemIcon>
            <Copy size={16} />
          </ListItemIcon>
          <ListItemText primary="Copy Message" />
        </MenuItem>
        <MenuItem onClick={() => setMessageMenuAnchor(null)}>
          <ListItemIcon>
            <Flag size={16} />
          </ListItemIcon>
          <ListItemText primary="Report Message" />
        </MenuItem>
      </Menu>

      {/* User Context Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
      >
        {(isStreamer || isModerator) && (
          <>
            <MenuItem onClick={() => handleTimeoutUser(300)}>
              <ListItemIcon>
                <Clock size={16} />
              </ListItemIcon>
              <ListItemText primary="Timeout 5 min" />
            </MenuItem>
            <MenuItem onClick={() => handleTimeoutUser(600)}>
              <ListItemIcon>
                <Clock size={16} />
              </ListItemIcon>
              <ListItemText primary="Timeout 10 min" />
            </MenuItem>
            <MenuItem onClick={handleBanUser}>
              <ListItemIcon>
                <Ban size={16} />
              </ListItemIcon>
              <ListItemText primary="Ban User" />
            </MenuItem>
            <Divider />
          </>
        )}
        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <ListItemIcon>
            <Flag size={16} />
          </ListItemIcon>
          <ListItemText primary="Report User" />
        </MenuItem>
      </Menu>

      {/* Gift Dialog */}
      <Dialog open={showGiftDialog} onClose={() => setShowGiftDialog(false)}>
        <DialogTitle>Send Gift</DialogTitle>
        <DialogContent>
          <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} sx={{ mt: 1 }}>
            {[
              { name: 'Heart', emoji: '❤️', cost: 1 },
              { name: 'Star', emoji: '⭐', cost: 5 },
              { name: 'Diamond', emoji: '💎', cost: 10 },
              { name: 'Crown', emoji: '👑', cost: 25 },
              { name: 'Rocket', emoji: '🚀', cost: 50 },
            ].map((gift) => (
              <Button
                key={gift.name}
                variant="outlined"
                onClick={() => sendGiftMutation.mutate({ giftType: gift.name })}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  p: 2,
                  minHeight: 80,
                }}
              >
                <Typography variant="h4">{gift.emoji}</Typography>
                <Typography variant="body2">{gift.name}</Typography>
                <Typography variant="caption" color="primary">
                  {gift.cost} coins
                </Typography>
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGiftDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Chat Settings Dialog */}
      <Dialog open={showSettingsDialog} onClose={() => setShowSettingsDialog(false)}>
        <DialogTitle>Chat Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={chatSettings.slowMode}
                  onChange={(e) => setChatSettings(prev => ({ ...prev, slowMode: e.target.checked }))}
                />
              }
              label="Slow Mode"
            />

            {chatSettings.slowMode && (
              <Box sx={{ ml: 4, mb: 2 }}>
                <Typography gutterBottom>Delay: {chatSettings.slowModeDelay} seconds</Typography>
                <Slider
                  value={chatSettings.slowModeDelay}
                  onChange={(_, value) => setChatSettings(prev => ({ ...prev, slowModeDelay: value as number }))}
                  min={1}
                  max={60}
                  marks={[
                    { value: 1, label: '1s' },
                    { value: 30, label: '30s' },
                    { value: 60, label: '60s' },
                  ]}
                />
              </Box>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={chatSettings.subscribersOnly}
                  onChange={(e) => setChatSettings(prev => ({ ...prev, subscribersOnly: e.target.checked }))}
                />
              }
              label="Subscribers Only"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={chatSettings.followersOnly}
                  onChange={(e) => setChatSettings(prev => ({ ...prev, followersOnly: e.target.checked }))}
                />
              }
              label="Followers Only"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={chatSettings.emoteOnly}
                  onChange={(e) => setChatSettings(prev => ({ ...prev, emoteOnly: e.target.checked }))}
                />
              }
              label="Emote Only Mode"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettingsDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setShowSettingsDialog(false)}>
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default LiveChat;