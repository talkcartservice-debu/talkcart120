import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Badge,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  ButtonBase,
} from '@mui/material';
import {
  ShoppingCart,
  Heart,
  MessageCircle,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Plus,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import useMessages from '@/hooks/useMessages';
import useChatbot from '@/hooks/useChatbot';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ChatbotConversation, ChatbotMessage } from '@/services/chatbotApi';
import { proxyCloudinaryUrl } from '@/utils/cloudinaryProxy';

interface Order {
  id: string;
  orderNumber: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    currency: string;
  }>;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  vendorId?: string;
  vendor?: {
    id: string;
  };
  images: Array<{
    secure_url?: string;
    url: string;
  }>;
}

interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt: string;
}

const MyDashboard: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState({
    orders: true,
    wishlist: true,
  });
  const [error, setError] = useState<string | null>(null);

  // Vendor chat states
  const {
    conversations,
    activeConversation,
    messages,
    loading: messagesLoading,
    error: messagesError,
    fetchConversations,
    setActiveConversation,
    openConversation,
    sendMessage,
    createConversation,
  } = useMessages();
  
  const [messageText, setMessageText] = useState('');
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [openVendorDialog, setOpenVendorDialog] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Chatbot states
  const {
    conversations: chatbotConversations,
    activeConversation: activeChatbotConversation,
    messages: chatbotMessages,
    loading: chatbotLoading,
    error: chatbotError,
    fetchConversations: fetchChatbotConversations,
    setActiveConversation: setActiveChatbotConversation,
    sendMessage: sendChatbotMessage,
    createConversation: createChatbotConversation,
  } = useChatbot();
  
  const [chatbotMessageText, setChatbotMessageText] = useState('');
  const chatbotMessagesEndRef = React.useRef<HTMLDivElement>(null);

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, orders: true }));
      console.log('Fetching orders from: api.orders.getAll');
      const response: any = await api.orders.getAll({ page: 1, limit: 10 });
      console.log('Orders response:', response);
      
      if (response.success) {
        setOrders(response.data.orders || []);
      } else {
        console.error('Orders API error:', response.error);
        setError(response.error || 'Failed to load orders');
      }
    } catch (err: any) {
      // Don't set error if it's an abort error due to navigation
      if (err.name !== 'AbortError' && !err.message?.includes('Abort')) {
        console.error('Fetch orders exception:', err);
        setError(`Orders fetch error: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(prev => ({ ...prev, orders: false }));
    }
  }, []);

  const fetchWishlist = React.useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, wishlist: true }));
      console.log('Fetching wishlist from: api.marketplace.getWishlist');
      const response: any = await api.marketplace.getWishlist();
      console.log('Wishlist response:', response);
      
      if (response.success) {
        // Extract vendorId from product.vendor.id or product.vendorId
        const wishlistWithVendorId = (response.data.wishlist || []).map((item: any) => {
          if (item.product) {
            return {
              ...item,
              product: {
                ...item.product,
                vendorId: item.product.vendor?.id || item.product.vendorId || ''
              }
            };
          }
          return item;
        });
        setWishlistItems(wishlistWithVendorId);
      } else {
        console.error('Wishlist API error:', response.error);
        setError(response.error || 'Failed to load wishlist');
      }
    } catch (err: any) {
      // Don't set error if it's an abort error due to navigation
      if (err.name !== 'AbortError' && !err.message?.includes('Abort')) {
        console.error('Fetch wishlist exception:', err);
        setError(`Wishlist fetch error: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(prev => ({ ...prev, wishlist: false }));
    }
  }, []);

  const fetchVendors = React.useCallback(async () => {
    try {
      const response: any = await api.marketplace.getVendors({ limit: 100 });
      if (response.success) {
        setVendors(response.data.vendors || []);
      }
    } catch (err: any) {
      // Don't log error if it's an abort error due to navigation
      if (err.name !== 'AbortError' && !err.message?.includes('Abort')) {
        console.error('Error fetching vendors:', err);
      }
    }
  }, []);

  // Handle authentication and data fetching
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (user) {
      fetchOrders();
      fetchWishlist();
      fetchConversations();
      fetchChatbotConversations();
      fetchVendors();
    }
  }, [isAuthenticated, user, router, fetchOrders, fetchWishlist, fetchVendors, fetchConversations, fetchChatbotConversations]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Scroll to bottom of chatbot messages
  useEffect(() => {
    if (chatbotMessagesEndRef.current) {
      chatbotMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatbotMessages]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'shipped':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle color="success" />;
      case 'pending':
      case 'processing':
        return <Clock size={18} color="orange" />;
      case 'cancelled':
        return <XCircle size={18} color="red" />;
      default:
        return <Clock size={18} />;
    }
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/marketplace/orders/${orderId}`);
  };

  const handleViewProduct = (productId: string) => {
    router.push(`/marketplace/${productId}`);
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      const response: any = await api.marketplace.removeFromWishlist(productId);
      if (response.success) {
        setWishlistItems(prev => prev.filter(item => item.productId !== productId));
        toast.success('Removed from wishlist');
      } else {
        toast.error(response.error || 'Failed to remove from wishlist');
      }
    } catch (err: any) {
      // Don't show error toast if it's an abort error due to navigation
      if (err.name !== 'AbortError' && !err.message?.includes('Abort')) {
        console.error('Error removing from wishlist:', err);
        toast.error(err.message || 'Failed to remove from wishlist');
      }
    }
  };

  const handleChatWithVendor = async (vendorId: string) => {
    // Find existing conversation with this vendor or create a new one
    const existingConversation = conversations.find(conv => 
      conv.participants.some(p => p.id === vendorId) && 
      conv.participants.length === 2 // Direct message
    );
    
    if (existingConversation) {
      await openConversation(existingConversation);
      setActiveTab(2); // Switch to chat tab
    } else {
      // Open dialog to create new conversation
      const vendor = vendors.find(v => v.id === vendorId);
      if (vendor) {
        setSelectedVendor(vendor);
        setOpenVendorDialog(true);
      }
    }
  };

  const handleCreateConversation = async () => {
    if (!selectedVendor) return;
    
    try {
      const newConversation = await createConversation([selectedVendor.id]);
      if (newConversation) {
        await openConversation(newConversation);
        setActiveTab(2); // Switch to chat tab
        setOpenVendorDialog(false);
        setSelectedVendor(null);
      }
    } catch (err: any) {
      // Don't show error toast if it's an abort error due to navigation
      if (err.name !== 'AbortError' && !err.message?.includes('Abort')) {
        toast.error(err.message || 'Failed to start conversation');
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !activeConversation) return;
    
    try {
      const success = await sendMessage(messageText);
      if (success) {
        setMessageText('');
      } else {
        toast.error('Failed to send message');
      }
    } catch (err: any) {
      // Don't show error toast if it's an abort error due to navigation
      if (err.name !== 'AbortError' && !err.message?.includes('Abort')) {
        toast.error(err.message || 'Failed to send message');
      }
    }
  };

  const handleChatbotSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chatbotMessageText.trim() || !activeChatbotConversation) return;
    
    try {
      const success = await sendChatbotMessage(chatbotMessageText);
      if (success) {
        setChatbotMessageText('');
      } else {
        toast.error('Failed to send message');
      }
    } catch (err: any) {
      // Don't show error toast if it's an abort error due to navigation
      if (err.name !== 'AbortError' && !err.message?.includes('Abort')) {
        toast.error(err.message || 'Failed to send message');
      }
    }
  };

  const handleStartChatbotConversation = async (vendorId: string, productId: string, productName: string) => {
    // Validate that we have a vendorId
    if (!vendorId) {
      toast.error('Unable to start chat - vendor information missing');
      return;
    }
    
    try {
      // Check if conversation already exists
      const existingConversation = chatbotConversations.find(conv => 
        conv.vendorId === vendorId && conv.productId === productId
      );
      
      if (existingConversation) {
        setActiveChatbotConversation(existingConversation);
      } else {
        // Create new conversation
        const newConversation = await createChatbotConversation(vendorId, productId);
        if (newConversation) {
          setActiveChatbotConversation(newConversation);
        }
      }
      
      // Switch to chatbot tab
      setActiveTab(3);
    } catch (err: any) {
      // Don't show error toast if it's an abort error due to navigation
      if (err.name !== 'AbortError' && !err.message?.includes('Abort')) {
        toast.error(err.message || 'Failed to start conversation');
      }
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Redirecting to login...
          </Typography>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout maxWidth="xl">
      <Box sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2 } }}>
        <Box sx={{ mb: { xs: 2, sm: 4 } }}>
          <Typography variant="h4" component="h1" sx={{ 
            fontWeight: 600, 
            mb: 1,
            fontSize: { xs: '1.75rem', sm: '2.125rem' }
          }}>
            My Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            Manage your orders, wishlist, and chat with vendors
          </Typography>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ 
            mb: { xs: 2, sm: 3 }, 
            borderBottom: 1, 
            borderColor: 'divider',
            minHeight: { xs: 48, sm: 64 },
            '& .MuiTabs-scrollButtons': {
              '&.Mui-disabled': { opacity: 0.3 },
            },
            '& .MuiTab-root': {
              minHeight: { xs: 48, sm: 64 },
              px: { xs: 1, sm: 2 },
              fontSize: { xs: '0.8rem', sm: '0.875rem' }
            }
          }}
        >
          <Tab icon={<ShoppingCart size={18} />} iconPosition="start" label="Orders" />
          <Tab icon={<Heart size={18} />} iconPosition="start" label="Wishlist" />
          <Tab icon={<MessageCircle size={18} />} iconPosition="start" label="Vendor" />
          <Tab 
            icon={
              <Badge 
                badgeContent={chatbotConversations.filter(c => !c.isResolved).length} 
                color="primary"
              >
                <MessageCircle size={18} />
              </Badge>
            } 
            iconPosition="start" 
            label="Product" 
          />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* My Orders Tab */}
        {activeTab === 0 && (
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <CardHeader
              title="Recent Orders"
              subheader="Track your recent purchases"
              sx={{ 
                p: { xs: 1.5, sm: 2 },
                '& .MuiCardHeader-title': { fontSize: { xs: '1.1rem', sm: '1.25rem' } },
                '& .MuiCardHeader-subheader': { fontSize: { xs: '0.75rem', sm: '0.875rem' } }
              }}
            />
            <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
              {loading.orders ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : orders.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ShoppingCart size={40} color={theme.palette.text.secondary} />
                  <Typography variant="h6" sx={{ mt: 1, mb: 0.5, fontSize: '1rem' }}>
                    No orders yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Start shopping to see your orders
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => router.push('/marketplace')}
                  >
                    Browse Marketplace
                  </Button>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {orders.map((order) => (
                    <React.Fragment key={order.id}>
                      <ListItem 
                        alignItems="flex-start"
                        sx={{ 
                          flexDirection: 'column',
                          position: 'relative',
                          px: { xs: 1, sm: 2 },
                          py: 1.5,
                          gap: 1
                        }}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          width: '100%',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 0.5
                        }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            Order #{order.orderNumber}
                          </Typography>
                          <Chip
                            icon={getStatusIcon(order.status)}
                            label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            size="small"
                            color={getStatusColor(order.status) as any}
                            variant="outlined"
                            sx={{ height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.65rem' } }}
                          />
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          width: '100%',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end'
                        }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {new Date(order.createdAt).toLocaleDateString()} • {order.items.length} items
                            </Typography>
                            <Typography variant="body2" fontWeight={700} color="primary">
                              {order.totalAmount} {order.currency}
                            </Typography>
                          </Box>
                          
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleViewOrder(order.id)}
                            sx={{ py: 0.5, fontSize: '0.75rem' }}
                          >
                            Details
                          </Button>
                        </Box>
                      </ListItem>
                      {order !== orders[orders.length - 1] && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Paper>
        )}

        {/* Wishlist Tab */}
        {activeTab === 1 && (
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
            <CardHeader
              title="My Wishlist"
              subheader="Products you&apos;ve saved"
              sx={{ 
                p: { xs: 1.5, sm: 2 },
                '& .MuiCardHeader-title': { fontSize: { xs: '1.1rem', sm: '1.25rem' } },
                '& .MuiCardHeader-subheader': { fontSize: { xs: '0.75rem', sm: '0.875rem' } }
              }}
            />
            <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
              {loading.wishlist ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : wishlistItems.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Heart size={40} color={theme.palette.text.secondary} />
                  <Typography variant="h6" sx={{ mt: 1, mb: 0.5, fontSize: '1rem' }}>
                    Wishlist is empty
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Save products to see them here
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => router.push('/marketplace')}
                  >
                    Browse
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={1.5}>
                  {wishlistItems.map((item) => {
                    // Check if this is a known missing file pattern
                    const mediaUrl = item.product.images[0]?.secure_url || item.product.images[0]?.url;
                    const isKnownMissingFile = mediaUrl && typeof mediaUrl === 'string' && (
                      mediaUrl.includes('file_1760168733155_lfhjq4ik7ht') ||
                      mediaUrl.includes('file_1760163879851_tt3fdqqim9') ||
                      mediaUrl.includes('file_1760263843073_w13593s5t8l') ||
                      mediaUrl.includes('file_1760276276250_3pqeekj048s')
                    );
                    
                    if (isKnownMissingFile) return null;
                    
                    const imageUrl = proxyCloudinaryUrl(mediaUrl || '/images/placeholder-image.png');
                      
                    return (
                      <Grid item xs={12} sm={6} md={4} key={item.productId}>
                        <Card elevation={0} sx={{ 
                          borderRadius: 2, 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          border: '1px solid', 
                          borderColor: 'divider' 
                        }}>
                          <CardContent sx={{ p: 1.5, pb: 1, flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                              <Box
                                component="img"
                                src={imageUrl}
                                alt={item.product.name}
                                sx={{
                                  width: 80,
                                  height: 80,
                                  minWidth: 80,
                                  objectFit: 'cover',
                                  borderRadius: 1,
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/images/placeholder-image.png';
                                }}
                              />
                              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: '0.9rem' }}>
                                  {item.product.name}
                                </Typography>
                                <Typography variant="body2" color="primary" fontWeight={700} sx={{ mt: 0.5 }}>
                                  {item.product.price} {item.product.currency}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.5 }}>
                                  {new Date(item.addedAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                          <Box sx={{ p: 1, pt: 0, mt: 'auto', display: 'flex', gap: 0.5 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              fullWidth
                              onClick={() => handleViewProduct(item.productId)}
                              sx={{ fontSize: '0.7rem', py: 0.5 }}
                            >
                              View
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              fullWidth
                              onClick={() => handleRemoveFromWishlist(item.productId)}
                              sx={{ fontSize: '0.7rem', py: 0.5 }}
                            >
                              Remove
                            </Button>
                            {item.product.vendorId && (
                              <Button
                                size="small"
                                variant="outlined"
                                fullWidth
                                onClick={() => handleStartChatbotConversation(
                                  item.product.vendorId!, 
                                  item.productId, 
                                  item.product.name
                                )}
                                sx={{ fontSize: '0.7rem', py: 0.5 }}
                              >
                                Chat
                              </Button>
                            )}
                          </Box>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </CardContent>
          </Paper>
        )}

        {/* Vendor Chat Tab */}
        {activeTab === 2 && (
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <CardHeader
              title="Vendor Chat"
              subheader="Chat with vendors"
              sx={{ 
                p: { xs: 1.5, sm: 2 },
                '& .MuiCardHeader-title': { fontSize: { xs: '1.1rem', sm: '1.25rem' } },
                '& .MuiCardHeader-subheader': { fontSize: { xs: '0.75rem', sm: '0.875rem' } }
              }}
              action={
                <IconButton
                  color="primary"
                  size="small"
                  onClick={() => setOpenVendorDialog(true)}
                  sx={{ mt: 0.5 }}
                >
                  <Plus size={20} />
                </IconButton>
              }
            />
            <CardContent sx={{ p: { xs: 0, sm: 2 } }}>
              {activeConversation ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: { xs: '60vh', sm: '65vh' },
                  minHeight: { xs: 400, sm: 550 },
                  maxHeight: { xs: '70vh', sm: '80vh' }
                }}>
                  {/* Chat header */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: { xs: 1, sm: 2 },
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'grey.50'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar 
                        src={activeConversation.participants.find(p => p.id !== user?.id)?.avatar || ''}
                        alt={activeConversation.participants.find(p => p.id !== user?.id)?.displayName}
                        sx={{ width: 32, height: 32 }}
                      />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: { xs: '150px', sm: 'none' } }}>
                          {activeConversation.participants.find(p => p.id !== user?.id)?.displayName || 
                           activeConversation.participants.find(p => p.id !== user?.id)?.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Vendor
                        </Typography>
                      </Box>
                    </Box>
                    <Button 
                      size="small" 
                      onClick={() => setActiveConversation(null)}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Back
                    </Button>
                  </Box>

                  {/* Messages area */}
                  <Box sx={{ 
                    flexGrow: 1, 
                    overflow: 'auto', 
                    p: { xs: 1, sm: 2 },
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'grey.50'
                  }}>
                    {messagesLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : messagesError ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="error" variant="caption">{messagesError}</Typography>
                      </Box>
                    ) : messages.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">No messages yet</Typography>
                      </Box>
                    ) : (
                      messages.map((message) => (
                        <Box
                          key={message.id}
                          sx={{
                            display: 'flex',
                            justifyContent: message.senderId === user?.id ? 'flex-end' : 'flex-start',
                            mb: 1
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: '85%',
                              p: { xs: 1, sm: 1.5 },
                              borderRadius: 2,
                              bgcolor: message.senderId === user?.id 
                                ? 'primary.main' 
                                : 'background.paper',
                              color: message.senderId === user?.id 
                                ? 'primary.contrastText' 
                                : 'text.primary',
                              boxShadow: message.senderId === user?.id ? 0 : 1,
                              border: message.senderId === user?.id ? 'none' : '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                              {message.content}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'block', 
                                textAlign: 'right',
                                mt: 0.25,
                                fontSize: '0.65rem',
                                opacity: 0.7
                              }}
                            >
                              {formatMessageTime(message.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </Box>

                  {/* Message input */}
                  <Box 
                    component="form" 
                    onSubmit={handleSendMessage}
                    sx={{ 
                      p: { xs: 1, sm: 2 }, 
                      borderTop: 1, 
                      borderColor: 'divider',
                      display: 'flex',
                      gap: 1,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      multiline
                      maxRows={2}
                      sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem' } }}
                    />
                    <IconButton 
                      type="submit"
                      disabled={!messageText.trim()}
                      color="primary"
                      size="small"
                    >
                      <Send size={20} />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <MessageCircle size={48} color={theme.palette.text.secondary} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Vendor Chat
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Select a conversation or start a new chat with a vendor
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={() => setOpenVendorDialog(true)}
                  >
                    Start New Chat
                  </Button>
                  
                  {/* List of recent conversations */}
                  {conversations.length > 0 && (
                    <Box sx={{ mt: 4, textAlign: 'left' }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Recent Conversations
                      </Typography>
                      <List>
                        {conversations.map((conversation) => {
                          const vendor = conversation.participants.find(p => p.id !== user?.id);
                          return (
                            <ButtonBase 
                              key={conversation.id}
                              onClick={() => {
                                setActiveConversation(conversation);
                              }}
                              sx={{
                                width: '100%',
                                borderRadius: 2,
                                mb: 1,
                                '&:hover': {
                                  bgcolor: 'action.hover'
                                }
                              }}
                            >
                            <ListItem 
                              sx={{
                                width: '100%',
                                borderRadius: 2,
                              }}
                            >
                              <Avatar src={vendor?.avatar || ''} sx={{ mr: 2 }}>
                                {vendor?.displayName?.[0] || vendor?.username?.[0]}
                              </Avatar>
                              <ListItemText
                                primary={vendor?.displayName || vendor?.username}
                                secondary={conversation.lastMessage?.content || 'No messages yet'}
                                sx={{
                                  '& .MuiListItemText-primary': {
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  },
                                  '& .MuiListItemText-secondary': {
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }
                                }}
                              />
                            </ListItem>
                            </ButtonBase>
                          );
                        })}
                      </List>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Paper>
        )}

        {/* Product Chatbot Tab */}
        {activeTab === 3 && (
          <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <CardHeader
              title="Product Chat"
              subheader="Product inquiries"
              sx={{ 
                p: { xs: 1.5, sm: 2 },
                '& .MuiCardHeader-title': { fontSize: { xs: '1.1rem', sm: '1.25rem' } },
                '& .MuiCardHeader-subheader': { fontSize: { xs: '0.75rem', sm: '0.875rem' } }
              }}
            />
            <CardContent sx={{ p: { xs: 0, sm: 2 } }}>
              {activeChatbotConversation ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: { xs: '60vh', sm: '65vh' },
                  minHeight: { xs: 400, sm: 550 },
                  maxHeight: { xs: '70vh', sm: '80vh' }
                }}>
                  {/* Chat header */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: { xs: 1, sm: 2 },
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'grey.50'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {activeChatbotConversation.productName?.[0] || 'P'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: { xs: '150px', sm: 'none' } }}>
                          {activeChatbotConversation.productName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Product Inquiry
                        </Typography>
                      </Box>
                    </Box>
                    <Button 
                      size="small" 
                      onClick={() => setActiveChatbotConversation(null)}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Back
                    </Button>
                  </Box>

                  {/* Messages area */}
                  <Box sx={{ 
                    flexGrow: 1, 
                    overflow: 'auto', 
                    p: { xs: 1, sm: 2 },
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'grey.50'
                  }}>
                    {chatbotLoading.messages ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : chatbotError ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="error" variant="caption">{chatbotError}</Typography>
                      </Box>
                    ) : chatbotMessages.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">No messages yet</Typography>
                      </Box>
                    ) : (
                      chatbotMessages.map((message) => (
                        <Box
                          key={message._id}
                          sx={{
                            display: 'flex',
                            justifyContent: message.senderId === user?.id ? 'flex-end' : 'flex-start',
                            mb: 1
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: '85%',
                              p: { xs: 1, sm: 1.5 },
                              borderRadius: 2,
                              bgcolor: message.senderId === user?.id 
                                ? 'primary.main' 
                                : message.isBotMessage 
                                  ? 'secondary.light' 
                                  : 'background.paper',
                              color: message.senderId === user?.id 
                                ? 'primary.contrastText' 
                                : 'text.primary',
                              boxShadow: message.senderId === user?.id ? 0 : 1,
                              border: message.senderId === user?.id ? 'none' : '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>{message.content}</Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'block', 
                                textAlign: 'right',
                                mt: 0.25,
                                fontSize: '0.65rem',
                                opacity: 0.7
                              }}
                            >
                              {formatMessageTime(message.createdAt)}
                              {message.isBotMessage && (
                                <Chip 
                                  label="Bot" 
                                  size="small" 
                                  sx={{ ml: 1, height: 14, fontSize: '0.6rem' }} 
                                />
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      ))
                    )}
                    <div ref={chatbotMessagesEndRef} />
                  </Box>

                  {/* Message input */}
                  <Box 
                    component="form" 
                    onSubmit={handleChatbotSendMessage}
                    sx={{ 
                      p: { xs: 1, sm: 2 }, 
                      borderTop: 1, 
                      borderColor: 'divider',
                      display: 'flex',
                      gap: 1,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Ask..."
                      value={chatbotMessageText}
                      onChange={(e) => setChatbotMessageText(e.target.value)}
                      multiline
                      maxRows={2}
                      disabled={chatbotLoading.send}
                      sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem' } }}
                    />
                    <IconButton 
                      type="submit"
                      disabled={!chatbotMessageText.trim() || chatbotLoading.send}
                      color="primary"
                      size="small"
                    >
                      {chatbotLoading.send ? <CircularProgress size={18} /> : <Send size={20} />}
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <MessageCircle size={48} color={theme.palette.text.secondary} />
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Product Chat
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Select a conversation or start a new chat about a product
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={() => router.push('/marketplace')}
                  >
                    Browse Products
                  </Button>
                  
                  {/* List of recent chatbot conversations */}
                  {chatbotConversations.length > 0 && (
                    <Box sx={{ mt: 4, textAlign: 'left' }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Recent Product Conversations
                      </Typography>
                      <List>
                        {chatbotConversations.map((conversation) => (
                          <ButtonBase 
                            key={conversation._id}
                            onClick={() => {
                              setActiveChatbotConversation(conversation);
                            }}
                            sx={{
                              width: '100%',
                              borderRadius: 2,
                              mb: 1,
                              '&:hover': {
                                bgcolor: 'action.hover'
                              }
                            }}
                          >
                            <ListItem 
                              sx={{
                                width: '100%',
                                borderRadius: 2,
                              }}
                            >
                              <Avatar sx={{ mr: 2 }}>
                                {conversation.productName?.[0] || 'P'}
                              </Avatar>
                              <ListItemText
                                primary={conversation.productName}
                                secondary={
                                  <React.Fragment>
                                    <Typography variant="body2" color="text.secondary" component="span" sx={{ 
                                      display: 'inline-block',
                                      maxWidth: { xs: '120px', sm: '200px', md: '300px' },
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      verticalAlign: 'middle'
                                    }}>
                                      {conversation.lastMessage?.content || 'No messages yet'}
                                    </Typography>
                                    {!conversation.isResolved && (
                                      <Chip label="Active" size="small" color="primary" sx={{ ml: 1 }} />
                                    )}
                                  </React.Fragment>
                                }
                                sx={{
                                  '& .MuiListItemText-primary': {
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: { xs: '150px', sm: '250px' }
                                  }
                                }}
                              />
                              <Chip 
                                label={conversation.isResolved ? 'Resolved' : 'Active'} 
                                size="small" 
                                color={conversation.isResolved ? 'default' : 'primary'} 
                              />
                            </ListItem>
                          </ButtonBase>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Paper>
        )}

        {/* Vendor Selection Dialog */}
        <Dialog open={openVendorDialog} onClose={() => setOpenVendorDialog(false)}>
          <DialogTitle>Select a Vendor to Chat With</DialogTitle>
          <DialogContent sx={{ minWidth: { xs: 'auto', sm: 400 }, width: '100%' }}>
            <Autocomplete
              options={vendors}
              getOptionLabel={(option) => option.displayName || option.username}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <li key={key} {...otherProps}>
                    <Avatar src={option.avatar || ''} sx={{ mr: 2 }}>
                      {option.displayName?.[0] || option.username?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body1">
                        {option.displayName || option.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vendor
                      </Typography>
                    </Box>
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search vendors"
                  placeholder="Type to search for vendors..."
                  fullWidth
                />
              )}
              value={selectedVendor}
              onChange={(event, newValue) => setSelectedVendor(newValue)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenVendorDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateConversation}
              variant="contained"
              disabled={!selectedVendor}
            >
              Start Chat
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default MyDashboard;