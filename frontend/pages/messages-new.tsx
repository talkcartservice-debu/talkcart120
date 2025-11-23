import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  IconButton,
  Divider,
  Badge,
  InputAdornment,
  CircularProgress,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  Send,
  Image,
  Smile,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Info,
  AlertCircle,
  Mic,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import useMessages from '@/hooks/useMessages';
import { Message, Conversation } from '@/types/message';
import debounce from 'lodash.debounce';

const NewMessagesPage: React.FC = () => {
  const theme = useTheme();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    fetchMessages,
    sendMessage,
    createConversation,
    setActiveConversation,
    markAllAsRead,
    sendTypingIndicator,
    typingUsers,
  } = useMessages();

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commonEmojis = ['😀', '😂', '😍', '👍', '🎉', '🙏', '🔥', '✨', '❤️'];

  // New conversation dialog state
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');

  // Reply state
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);

  // Filter conversations based on search query
  const filteredConversations = (conversations || []).filter(conversation => {
    const participantNames = conversation.participants.map(p =>
      (p.displayName || '').toLowerCase() + ' ' + (p.username || '').toLowerCase()
    ).join(' ');
    
    return (
      getConversationName(conversation).toLowerCase().includes(searchQuery.toLowerCase()) ||
      participantNames.includes(searchQuery.toLowerCase())
    );
  });

  // Handle conversation selection
  const handleSelectConversation = (conversation: any) => {
    setActiveConversation(conversation);
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!activeConversation) return;

    // Send typing indicator if not already typing
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(false);
    }, 2000);
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    try {
      const success = await sendMessage(newMessage);
      if (success) {
        setNewMessage('');
        setReplyToMessage(null);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  // Handle reply to message
  const handleReplyToMessage = (message: any) => {
    setReplyToMessage(message);
  };

  // Handle cancel reply
  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  // Emoji helpers
  const handleAddEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  // Handle user search with debouncing
  const searchUsers = useCallback(
    debounce(async (query: string) => {
      if (!query.trim() || query.trim().length < 2) {
        setSearchedUsers([]);
        return;
      }

      try {
        setSearchingUsers(true);
        const response: any = await api.search.users(query);
        if (response.success) {
          const users = Array.isArray(response.data) ? response.data : 
                       (response.data?.users || response.data || []);
          setSearchedUsers(users);
        } else {
          setSearchedUsers([]);
        }
      } catch (error: any) {
        console.error('Error searching users:', error);
        setSearchedUsers([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 300),
    []
  );

  // Handle user search input change
  const handleUserSearchChange = (value: string) => {
    setUserSearchQuery(value);
    searchUsers(value);
  };

  // Handle creating new conversation
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const participantIds = selectedUsers.map(u => u.id);
      
      // If creating a group conversation
      if (isCreatingGroup) {
        if (!groupName.trim()) {
          alert('Please enter a group name');
          return;
        }
        
        const newConversation = await createConversation(participantIds, {
          isGroup: true,
          groupName: groupName.trim()
        });
        
        if (newConversation) {
          setActiveConversation(newConversation);
          setNewConversationOpen(false);
          setSelectedUsers([]);
          setUserSearchQuery('');
          setSearchedUsers([]);
          setIsCreatingGroup(false);
          setGroupName('');
        }
      } else {
        // Direct message
        const newConversation = await createConversation(participantIds);
        
        if (newConversation) {
          setActiveConversation(newConversation);
          setNewConversationOpen(false);
          setSelectedUsers([]);
          setUserSearchQuery('');
          setSearchedUsers([]);
        }
      }
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      const errorMessage = error.message || 'Failed to create conversation. Please try again.';
      alert(errorMessage);
    }
  };

  // Get other participant(s) for display
  const getConversationName = (conversation: any) => {
    if (conversation.isGroup && conversation.groupName) {
      return conversation.groupName;
    }

    // For direct messages, show the other person's name
    const otherParticipant = conversation.participants?.find((p: any) => p.id !== user?.id);
    return otherParticipant?.displayName || otherParticipant?.username || 'Unknown User';
  };

  // Get avatar for conversation
  const getConversationAvatar = (conversation: any) => {
    if (conversation.isGroup && conversation.groupAvatar) {
      return conversation.groupAvatar;
    }

    // For direct messages, show the other person's avatar
    const otherParticipant = conversation.participants?.find((p: any) => p.id !== user?.id);
    return otherParticipant?.avatar;
  };

  // Check if user is online
  const isUserOnline = (conversation: any) => {
    if (conversation.isGroup) return false;

    const otherParticipant = conversation.participants?.find((p: any) => p.id !== user?.id);
    return otherParticipant?.isOnline || false;
  };

  // Format time
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date for conversation
  const formatConversationDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark messages as read when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      markAllAsRead();
    }
  }, [activeConversation, markAllAsRead]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/auth/login?redirect=/messages-new';
    }
  }, [authLoading, isAuthenticated]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4, height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>Loading...</Typography>
            <Typography variant="body2" color="text.secondary">Checking authentication</Typography>
          </Box>
        </Container>
      </Layout>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4, height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>Authentication Required</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Please log in to access messages
            </Typography>
            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 1, mb: 2 }}>
                {error}
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={() => window.location.href = '/auth/login?redirect=/messages-new'}
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Box>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4, height: 'calc(100vh - 64px)' }}>
        <Paper
          elevation={0}
          sx={{
            height: '100%',
            display: 'flex',
            borderRadius: 3,
            overflow: 'hidden',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          {/* Conversations List */}
          <Box
            sx={{
              width: 320,
              borderRight: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Messages
              </Typography>
              <TextField
                fullWidth
                placeholder="Search conversations..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Box>

            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {loading && !activeConversation ? (
                <Box sx={{ p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : error ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <AlertCircle size={24} color={theme.palette.error.main} />
                  <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    {error}
                  </Typography>
                </Box>
              ) : filteredConversations.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="body2">
                    No conversations found
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {filteredConversations.map((conversation) => (
                    <ListItem
                      key={conversation.id}
                      alignItems="flex-start"
                      onClick={() => handleSelectConversation(conversation)}
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        backgroundColor: activeConversation?.id === conversation.id
                          ? alpha(theme.palette.primary.main, 0.08)
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        },
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          variant="dot"
                          color="success"
                          invisible={!isUserOnline(conversation)}
                        >
                          <Avatar
                            src={getConversationAvatar(conversation)}
                            alt={getConversationName(conversation)}
                            sx={{ width: 48, height: 48 }}
                          />
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
                            component="div"
                            variant="subtitle1"
                            fontWeight={600}
                            noWrap
                            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <span>{getConversationName(conversation)}</span>
                            <Typography component="span" variant="caption" color="text.secondary">
                              {conversation.lastMessage && formatConversationDate(conversation.lastMessage.createdAt)}
                            </Typography>
                          </Typography>
                        }
                        secondary={
                          <Typography
                            component="div"
                            variant="body2"
                            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.secondary"
                              noWrap
                              sx={{
                                maxWidth: 180,
                                fontWeight: conversation.unreadCount > 0 ? 600 : 400,
                                color: conversation.unreadCount > 0 ? 'text.primary' : 'text.secondary',
                              }}
                            >
                              {conversation.lastMessage?.content || 'No messages yet'}
                            </Typography>
                            {conversation.unreadCount > 0 && (
                              <Chip
                                label={conversation.unreadCount}
                                color="primary"
                                size="small"
                                sx={{
                                  height: 20,
                                  minWidth: 20,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              />
                            )}
                          </Typography>
                        }
                        sx={{ ml: 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={() => setNewConversationOpen(true)}
                sx={{ borderRadius: 2 }}
              >
                New Conversation
              </Button>
            </Box>
          </Box>

          {/* Messages Area */}
          {activeConversation ? (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Conversation Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    color="success"
                    invisible={!isUserOnline(activeConversation)}
                  >
                    <Avatar
                      src={getConversationAvatar(activeConversation)}
                      alt={getConversationName(activeConversation)}
                      sx={{ width: 40, height: 40 }}
                    />
                  </Badge>
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {getConversationName(activeConversation)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(() => {
                        const typingUsersList = (typingUsers?.[activeConversation.id] || [])
                          .map(userId => {
                            const participant = activeConversation.participants?.find(p => p.id === userId);
                            return participant?.displayName || participant?.username || 'Someone';
                          })
                          .filter(name => name !== 'Someone');

                        if (typingUsersList.length > 0) {
                          return `${typingUsersList.join(', ')} ${typingUsersList.length === 1 ? 'is' : 'are'} typing...`;
                        }

                        return isUserOnline(activeConversation) ? 'Online' : 'Offline';
                      })()}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton>
                    <Info size={20} />
                  </IconButton>
                  <IconButton>
                    <MoreVertical size={20} />
                  </IconButton>
                </Box>
              </Box>

              {/* Messages */}
              <Box
                sx={{
                  flexGrow: 1,
                  p: 3,
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress size={32} />
                  </Box>
                ) : error ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <AlertCircle size={48} color={theme.palette.error.main} />
                    <Typography color="error" variant="body1" sx={{ mt: 2 }}>
                      {error}
                    </Typography>
                  </Box>
                ) : messages.length === 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary" variant="body1">
                      No messages yet
                    </Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                      Send a message to start the conversation
                    </Typography>
                  </Box>
                ) : (
                  messages.map((message) => {
                    const isCurrentUser = message.senderId === user?.id;
                    const sender = activeConversation?.participants.find((p: any) => p.id === message.senderId);

                    return (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                          mb: 2,
                        }}
                      >
                        {!isCurrentUser && activeConversation?.isGroup && (
                          <Avatar
                            src={sender?.avatar && sender.avatar !== null ? sender.avatar : undefined}
                            sx={{ width: 32, height: 32, mr: 1, mt: 1 }}
                          />
                        )}
                        <Box
                          sx={{
                            maxWidth: '70%',
                            p: 2,
                            borderRadius: 3,
                            bgcolor: isCurrentUser 
                              ? alpha(theme.palette.primary.main, 0.1) 
                              : alpha(theme.palette.grey[500], 0.1),
                            border: `1px solid ${isCurrentUser 
                              ? alpha(theme.palette.primary.main, 0.2) 
                              : alpha(theme.palette.grey[500], 0.2)}`,
                          }}
                        >
                          {activeConversation?.isGroup && !isCurrentUser && (
                            <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                              {sender?.displayName || sender?.username}
                            </Typography>
                          )}
                          {message.replyTo && (
                            <Box
                              sx={{
                                p: 1,
                                mb: 1,
                                bgcolor: alpha(theme.palette.grey[500], 0.1),
                                borderRadius: 2,
                                borderLeft: `3px solid ${theme.palette.grey[500]}`,
                              }}
                            >
                              <Typography variant="caption" fontWeight={600}>
                                {message.replyTo.sender?.displayName || 'Unknown'}
                              </Typography>
                              <Typography variant="body2" noWrap>
                                {message.replyTo.content}
                              </Typography>
                            </Box>
                          )}
                          <Typography variant="body1">{message.content}</Typography>
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                            {formatMessageTime(message.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Message Input */}
              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{
                  p: 2,
                  borderTop: `1px solid ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {/* Reply Preview */}
                {replyToMessage && (
                  <Box sx={{ mx: 2, mb: 1 }}>
                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="primary" fontWeight={600}>
                          Replying to {replyToMessage.sender?.displayName || 'Unknown'}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%'
                          }}
                        >
                          {replyToMessage.content}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={handleCancelReply}
                        sx={{ color: 'text.secondary' }}
                      >
                        <X size={16} />
                      </IconButton>
                    </Paper>
                  </Box>
                )}

                <TextField
                  fullWidth
                  placeholder={replyToMessage ? "Type your reply..." : "Type a message..."}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  variant="outlined"
                  size="small"
                  multiline
                  maxRows={4}
                  sx={{
                    mx: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                    }
                  }}
                />
                <IconButton onClick={() => setShowEmojiPicker(v => !v)}>
                  <Smile size={20} />
                </IconButton>
                <IconButton
                  color="primary"
                  type="submit"
                  disabled={!newMessage.trim()}
                >
                  <Send size={20} />
                </IconButton>
              </Box>
            </Box>
          ) : (
            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 4,
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <ChevronRight size={40} color={theme.palette.primary.main} />
              </Box>
              <Typography variant="h6" gutterBottom>
                Select a conversation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                Choose a conversation from the list or start a new one to begin messaging
              </Typography>
            </Box>
          )}
        </Paper>

        {/* New Conversation Dialog */}
        <Dialog
          open={newConversationOpen}
          onClose={() => setNewConversationOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Start New Conversation</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Autocomplete
                multiple
                options={searchedUsers}
                value={selectedUsers}
                onChange={(event, newValue) => setSelectedUsers(newValue)}
                inputValue={userSearchQuery}
                onInputChange={(event, newInputValue) => handleUserSearchChange(newInputValue)}
                getOptionLabel={(option) => option?.displayName || option?.username || ''}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      src={option?.avatar}
                      sx={{ width: 32, height: 32 }}
                    >
                      {option?.displayName?.[0] || option?.username?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {option?.displayName || option?.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        @{option?.username}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option?.id}
                      avatar={<Avatar src={option?.avatar}>{option?.displayName?.[0] || option?.username?.[0]}</Avatar>}
                      label={option?.displayName || option?.username}
                      size="small"
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search users"
                    placeholder="Type to search for users..."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {searchingUsers && <CircularProgress size={20} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                loading={searchingUsers}
                noOptionsText={userSearchQuery ? "No users found" : "Type to search for users"}
              />
            </Box>
            <Box sx={{ mt: 2 }}>
              <Button
                onClick={() => setIsCreatingGroup(prev => !prev)}
                variant={isCreatingGroup ? 'contained' : 'outlined'}
                fullWidth
              >
                {isCreatingGroup ? 'Create Group' : 'Start Direct Message'}
              </Button>
              {isCreatingGroup && (
                <TextField
                  fullWidth
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewConversationOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateConversation}
              variant="contained"
              disabled={selectedUsers.length === 0 || (isCreatingGroup && !groupName.trim())}
            >
              Start Conversation
            </Button>
          </DialogActions>
        </Dialog>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <Paper 
            elevation={3} 
            style={{ 
              position: 'absolute', 
              bottom: 80, 
              right: 20, 
              zIndex: 1000,
              borderRadius: 16,
              overflow: 'hidden'
            }}
          >
            <Picker
              data={data}
              onEmojiSelect={(e: any) => {
                const native = e?.native || e?.unified ? String.fromCodePoint(...e.unified.split('-').map((u: string) => parseInt(u, 16))) : '';
                if (native) handleAddEmoji(native);
                setShowEmojiPicker(false);
              }}
              theme={theme.palette.mode === 'dark' ? 'dark' : 'light'}
              previewPosition="none"
            />
            <Box sx={{ display: 'flex', gap: 1, p: 1, bgcolor: theme.palette.background.paper }}>
              {commonEmojis.map((e) => (
                <Button 
                  key={e} 
                  size="small" 
                  onClick={() => {
                    handleAddEmoji(e);
                    setShowEmojiPicker(false);
                  }}
                  sx={{ minWidth: 'auto', p: 0.5 }}
                >
                  {e}
                </Button>
              ))}
            </Box>
          </Paper>
        )}
      </Container>
    </Layout>
  );
};

export default NewMessagesPage;
