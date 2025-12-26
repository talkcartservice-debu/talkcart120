import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete from '@mui/material/Autocomplete';
import {
  Chat as ChatIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Send as SendIcon,
  Search as SearchIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { AdminApi } from '../src/services/api';

interface ChatManagementDashboardProps {
  timeRange?: string;
  onRefresh?: () => void;
}

interface Vendor {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  productCount: number;
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

interface ChatAnalytics {
  total_conversations: number;
  active_conversations: number;
  resolved_conversations: number;
  closed_conversations: number;
  total_messages: number;
  vendor_response_rate: number;
  avg_response_time: number;
}

export default function ChatManagementDashboard({ timeRange = '30d', onRefresh }: ChatManagementDashboardProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<ChatAnalytics | null>(null);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  
  // Vendor search states
  const [vendorSearchOpen, setVendorSearchOpen] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState('');
  const [vendorSearchResults, setVendorSearchResults] = useState<Vendor[]>([]);
  const [vendorSearchLoading, setVendorSearchLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch chat analytics
      const analyticsRes = await AdminApi.getChatAnalytics({ timeRange });
      if (analyticsRes?.success) {
        setAnalytics(analyticsRes.data);
      }
      
      // Fetch recent conversations
      const conversationsRes = await AdminApi.getChatConversations({
        limit: 10,
        sortBy: 'lastActivity',
        sortOrder: 'desc'
      });
      
      if (conversationsRes?.success) {
        setConversations(conversationsRes.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch chat data:', err);
      setError('Failed to load chat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const handleRefresh = () => {
    fetchData();
    onRefresh?.();
  };

  const handleOpenChat = async (conversation: ChatConversation) => {
    try {
      setSelectedConversation(conversation);
      
      // Fetch messages for this conversation
      const messagesRes = await AdminApi.getChatMessages(conversation._id, {
        limit: 50
      });
      
      if (messagesRes?.success) {
        setMessages(messagesRes.data.messages || []);
      }
      
      setChatDialogOpen(true);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load conversation messages');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || sending) return;
    
    try {
      setSending(true);
      
      // Send the message to the backend
      const sendRes = await AdminApi.sendChatMessage(selectedConversation._id, {
        content: newMessage
      });
      
      if (sendRes?.success) {
        // Add the new message to the messages list
        const newMsg: ChatMessage = sendRes.data.message;
        setMessages([...messages, newMsg]);
        setNewMessage('');
        
        // Update the conversation's last message
        setConversations(conversations.map(conv => 
          conv._id === selectedConversation._id 
            ? { 
                ...conv, 
                lastMessage: { 
                  content: newMessage, 
                  senderId: 'admin', 
                  createdAt: new Date().toISOString() 
                },
                lastActivity: new Date().toISOString()
              } 
            : conv
        ));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Vendor search functions
  const handleSearchVendors = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setVendorSearchResults([]);
      return;
    }
    
    try {
      setVendorSearchLoading(true);
      const res = await AdminApi.searchVendorsForChat({
        search: searchTerm,
        limit: 10
      });
      
      if (res?.success) {
        setVendorSearchResults(res.data.vendors || []);
      }
    } catch (err) {
      console.error('Failed to search vendors:', err);
      setError('Failed to search vendors');
    } finally {
      setVendorSearchLoading(false);
    }
  };

  const handleCreateVendorConversation = async (vendor: Vendor) => {
    try {
      const res = await AdminApi.createVendorAdminConversation(vendor.id);
      
      if (res?.success) {
        // Close the search dialog
        setVendorSearchOpen(false);
        setVendorSearchTerm('');
        setVendorSearchResults([]);
        
        // Open the conversation (whether new or existing)
        if (res.data.conversation) {
          handleOpenChat(res.data.conversation);
        }
        
        // Refresh the conversations list
        fetchData();
      }
    } catch (err) {
      console.error('Failed to create vendor conversation:', err);
      setError('Failed to create conversation with vendor');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Chat Management Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Chat Management Dashboard
        </Typography>
        <Box>
          <Tooltip title="Start New Conversation">
            <IconButton onClick={() => setVendorSearchOpen(true)} size="small">
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Chat Analytics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'primary.main',
                    color: 'white'
                  }}
                >
                  <ChatIcon />
                </Box>
                <Typography variant="h6">Chat Analytics</Typography>
              </Stack>
              
              {analytics && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Conversations
                    </Typography>
                    <Typography variant="h4">
                      {analytics.total_conversations}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Active
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {analytics.active_conversations}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Resolved
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {analytics.resolved_conversations}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Response Rate
                    </Typography>
                    <Typography variant="h4">
                      {analytics.vendor_response_rate.toFixed(1)}%
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Conversations */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Conversations
              </Typography>
              
              {conversations.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No conversations found
                </Typography>
              ) : (
                <List>
                  {conversations.map((conversation) => (
                    <React.Fragment key={conversation._id}>
                      <ListItem
                        secondaryAction={
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleOpenChat(conversation)}
                          >
                            View Chat
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar>
                            <BusinessIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={conversation.productName}
                          secondary={
                            <React.Fragment>
                              <Typography component="span" variant="body2" color="text.primary">
                                {conversation.customer?.displayName || conversation.customer?.username || 'Vendor'}
                              </Typography>
                              {' — '}
                              {conversation.lastMessage?.content}
                            </React.Fragment>
                          }
                        />
                        <Box sx={{ ml: 2, textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary">
                            {conversation.lastMessage?.createdAt && formatTime(conversation.lastMessage.createdAt)}
                          </Typography>
                          <br />
                          <Chip
                            label={conversation.isResolved ? 'Resolved' : 'Active'}
                            size="small"
                            color={conversation.isResolved ? 'success' : 'warning'}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Chat Dialog */}
      <Dialog 
        open={chatDialogOpen} 
        onClose={() => setChatDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chat with {selectedConversation?.customer?.displayName || selectedConversation?.customer?.username || 'Vendor'}
          <Typography variant="body2" color="text.secondary">
            About: {selectedConversation?.productName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}>
            {/* Messages */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
              <List>
                {messages.map((message) => (
                  <ListItem
                    key={message._id}
                    sx={{
                      justifyContent: message.senderId === 'admin' ? 'flex-end' : 'flex-start',
                      flexDirection: 'column',
                      alignItems: message.senderId === 'admin' ? 'flex-end' : 'flex-start',
                      py: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: { xs: '85%', sm: '80%' },
                        backgroundColor: message.senderId === 'admin' ? 'primary.main' : 'grey.200',
                        color: message.senderId === 'admin' ? 'white' : 'text.primary',
                        borderRadius: 2,
                        p: 1.5,
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2">{message.content}</Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                        {message.sender?.displayName || message.sender?.username} • {formatTime(message.createdAt)}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </Box>
            
            {/* Message Input */}
            <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
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
                maxRows={3}
                sx={{
                  mb: { xs: 1, sm: 0 },
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                sx={{
                  alignSelf: 'flex-end',
                  mb: { xs: 1, sm: 0 },
                }}
              >
                {sending ? <CircularProgress size={24} /> : <SendIcon />}
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChatDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Vendor Search Dialog */}
      <Dialog 
        open={vendorSearchOpen} 
        onClose={() => {
          setVendorSearchOpen(false);
          setVendorSearchTerm('');
          setVendorSearchResults([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Start Conversation with Vendor
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Autocomplete
              freeSolo
              options={vendorSearchResults}
              getOptionLabel={(option) => 
                typeof option === 'string' ? option : (option.displayName || option.username)
              }
              loading={vendorSearchLoading}
              onInputChange={(event, newInputValue) => {
                setVendorSearchTerm(newInputValue);
                if (newInputValue.length > 2) {
                  handleSearchVendors(newInputValue);
                } else {
                  setVendorSearchResults([]);
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Vendors"
                  placeholder="Type to search vendors..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    endAdornment: (
                      <React.Fragment>
                        {vendorSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li 
                    key={key} 
                    {...otherProps}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (typeof option !== 'string') {
                        handleCreateVendorConversation(option);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Avatar 
                        src={typeof option !== 'string' ? option.avatar : undefined} 
                        sx={{ width: 32, height: 32, mr: 2 }}
                      >
                        <PersonIcon />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1">
                          {typeof option !== 'string' ? (option.displayName || option.username) : option}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {typeof option !== 'string' ? `${option.productCount} products` : ''}
                        </Typography>
                      </Box>
                      {typeof option !== 'string' && option.isVerified && (
                        <Chip label="Verified" size="small" color="primary" variant="outlined" />
                      )}
                    </Box>
                  </li>
                );
              }}
              onChange={(event, value) => {
                // Handle selection from dropdown
                if (value && typeof value !== 'string') {
                  handleCreateVendorConversation(value);
                }
              }}
              // Close the popup on selection
              onClose={() => setVendorSearchOpen(false)}
            />
            
            {vendorSearchResults.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Search Results
                </Typography>
                <List>
                  {vendorSearchResults.map((vendor) => (
                    <ListItem
                      key={vendor.id}
                      onClick={() => handleCreateVendorConversation(vendor)}
                      sx={{ borderRadius: 1, mb: 1, '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' } }}
                    >
                      <ListItemAvatar>
                        <Avatar src={vendor.avatar}>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={vendor.displayName || vendor.username}
                        secondary={`${vendor.productCount} products`}
                      />
                      {vendor.isVerified && (
                        <Chip label="Verified" size="small" color="primary" variant="outlined" />
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setVendorSearchOpen(false);
            setVendorSearchTerm('');
            setVendorSearchResults([]);
          }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}