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
    fetchMessages,
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
      <Box sx={{ py: { xs: 0, sm: 4 }, px: { xs: 0, sm: 2 } }}>
        <Box sx={{ mb: { xs: 2, sm: 4 }, px: { xs: 2, sm: 0 }, mt: { xs: 2, sm: 0 } }}>
          <Typography variant="h4" component="h1" sx={{ 
            fontWeight: 800, 
            mb: 0.5,
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            letterSpacing: '-0.02em'
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
            mb: { xs: 0, sm: 4 }, 
            borderBottom: 1, 
            borderColor: 'divider',
            minHeight: { xs: 56, sm: 64 },
            bgcolor: { xs: 'background.paper', sm: 'transparent' },
            position: { xs: 'sticky', sm: 'relative' },
            top: { xs: 0, sm: 'auto' },
            zIndex: { xs: 10, sm: 'auto' },
            '& .MuiTabs-scrollButtons': {
              '&.Mui-disabled': { opacity: 0.3 },
            },
            '& .MuiTab-root': {
              minHeight: { xs: 56, sm: 64 },
              px: { xs: 2, sm: 4 },
              fontSize: { xs: '0.9rem', sm: '1rem' },
              fontWeight: 700,
              textTransform: 'none',
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main'
              }
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0'
            }
          }}
        >
          <Tab icon={<ShoppingCart size={20} />} iconPosition="start" label="Orders" />
          <Tab icon={<Heart size={20} />} iconPosition="start" label="Wishlist" />
          <Tab icon={<MessageCircle size={20} />} iconPosition="start" label="Vendor Chat" />
          <Tab 
            icon={
              <Badge 
                badgeContent={chatbotConversations.filter(c => !c.isResolved).length} 
                color="error"
                sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: 18, minWidth: 18, fontWeight: 800 } }}
              >
                <MessageCircle size={20} />
              </Badge>
            } 
            iconPosition="start" 
            label="Product Support" 
          />
        </Tabs>

        {error && (
          <Box sx={{ px: { xs: 2, sm: 0 }, my: 2 }}>
            <Alert 
              severity="error" 
              sx={{ borderRadius: 2 }}
              action={
                <Button color="inherit" size="small" onClick={() => {
                  setError(null);
                  fetchOrders();
                  fetchWishlist();
                }}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        )}

        {/* My Orders Tab */}
        {activeTab === 0 && (
          <Paper elevation={0} sx={{ 
            borderRadius: { xs: 0, sm: 3 }, 
            overflow: 'hidden', 
            border: '1px solid', 
            borderColor: 'divider',
            borderLeft: { xs: 'none', sm: '1px solid' },
            borderRight: { xs: 'none', sm: '1px solid' },
            mx: { xs: 0, sm: 0 },
            boxShadow: { xs: 'none', sm: '0 4px 20px rgba(0,0,0,0.05)' }
          }}>
            <CardHeader
              title="Recent Orders"
              subheader="Track your recent purchases"
              sx={{ 
                p: { xs: 2, sm: 3 },
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: { xs: 'background.paper', sm: 'transparent' },
                '& .MuiCardHeader-title': { fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 800 },
                '& .MuiCardHeader-subheader': { fontSize: { xs: '0.8rem', sm: '0.875rem' } }
              }}
            />
            <CardContent sx={{ p: 0 }}>
              {loading.orders ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress size={32} thickness={5} />
                </Box>
              ) : orders.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 10, px: 3 }}>
                  <Box sx={{ 
                    width: 80, 
                    height: 80, 
                    borderRadius: '50%', 
                    bgcolor: 'grey.100', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2
                  }}>
                    <ShoppingCart size={40} color={theme.palette.text.secondary} />
                  </Box>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                    No orders yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 320, mx: 'auto' }}>
                    You haven&apos;t placed any orders yet. Explore our marketplace to find amazing products!
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => router.push('/marketplace')}
                    sx={{ borderRadius: 2.5, px: 4, py: 1.25, fontWeight: 700 }}
                  >
                    Start Shopping
                  </Button>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {orders.map((order) => (
                    <React.Fragment key={order.id}>
                      <ListItem 
                        sx={{ 
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          px: { xs: 2, sm: 3 },
                          py: { xs: 2.5, sm: 3 },
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          width: '100%',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 2
                        }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ fontSize: { xs: '0.95rem', sm: '1.05rem' } }}>
                              Order #{order.orderNumber}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </Typography>
                          </Box>
                          <Chip
                            icon={getStatusIcon(order.status)}
                            label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            size="small"
                            color={getStatusColor(order.status) as any}
                            sx={{ 
                              height: 28, 
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              borderRadius: 1.5,
                              '& .MuiChip-label': { px: 1.5 } 
                            }}
                          />
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          width: '100%',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'grey.50',
                          border: '1px solid',
                          borderColor: 'grey.100'
                        }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                              {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                            </Typography>
                            <Typography variant="h6" fontWeight={800} color="primary.main" sx={{ fontSize: '1.1rem' }}>
                              {order.totalAmount.toLocaleString()} {order.currency}
                            </Typography>
                          </Box>
                          
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleViewOrder(order.id)}
                            sx={{ 
                              borderRadius: 2, 
                              px: 2.5,
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              height: 36,
                              boxShadow: 'none'
                            }}
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
          <Box sx={{ px: { xs: 0, sm: 0 } }}>
            <Paper elevation={0} sx={{ 
              borderRadius: { xs: 0, sm: 3 }, 
              overflow: 'hidden', 
              border: '1px solid', 
              borderColor: 'divider',
              borderLeft: { xs: 'none', sm: '1px solid' },
              borderRight: { xs: 'none', sm: '1px solid' },
              boxShadow: { xs: 'none', sm: '0 4px 20px rgba(0,0,0,0.05)' }
            }}>
              <CardHeader
                title="My Wishlist"
                subheader="Products you&apos;ve saved"
                sx={{ 
                  p: { xs: 2, sm: 3 },
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: { xs: 'background.paper', sm: 'transparent' },
                  '& .MuiCardHeader-title': { fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 800 },
                  '& .MuiCardHeader-subheader': { fontSize: { xs: '0.8rem', sm: '0.875rem' } }
                }}
              />
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                {loading.wishlist ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} thickness={5} />
                  </Box>
                ) : wishlistItems.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 10, px: 3 }}>
                    <Box sx={{ 
                      width: 80, 
                      height: 80, 
                      borderRadius: '50%', 
                      bgcolor: 'grey.100', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2
                    }}>
                      <Heart size={40} color={theme.palette.text.secondary} />
                    </Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                      Wishlist is empty
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 320, mx: 'auto' }}>
                      You haven&apos;t saved any products yet. Tap the heart icon on any product to save it here!
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => router.push('/marketplace')}
                      sx={{ borderRadius: 2.5, px: 4, py: 1.25, fontWeight: 700 }}
                    >
                      Browse Products
                    </Button>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
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
                            borderRadius: 2.5, 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            border: '1px solid', 
                            borderColor: 'divider',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
                            }
                          }}>
                            <CardContent sx={{ p: 2, flexGrow: 1 }}>
                              <Box sx={{ display: 'flex', gap: 2 }}>
                                <Box
                                  component="img"
                                  src={imageUrl}
                                  alt={item.product.name}
                                  sx={{
                                    width: { xs: 85, sm: 100 },
                                    height: { xs: 85, sm: 100 },
                                    minWidth: { xs: 85, sm: 100 },
                                    borderRadius: 2,
                                    objectFit: 'cover',
                                    bgcolor: 'grey.100',
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/images/placeholder-image.png';
                                  }}
                                />
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                  <Typography 
                                    variant="subtitle1" 
                                    fontWeight={800} 
                                    noWrap 
                                    sx={{ 
                                      mb: 0.5,
                                      fontSize: { xs: '0.95rem', sm: '1rem' }
                                    }}
                                  >
                                    {item.product.name}
                                  </Typography>
                                  <Typography 
                                    variant="h6" 
                                    color="primary.main" 
                                    fontWeight={800}
                                    sx={{ mb: 1, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                                  >
                                    {item.product.price.toLocaleString()} {item.product.currency}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => handleViewProduct(item.productId)}
                                      sx={{ 
                                        borderRadius: 1.5, 
                                        fontSize: '0.75rem', 
                                        fontWeight: 700,
                                        px: 2,
                                        height: 32,
                                        boxShadow: 'none'
                                      }}
                                    >
                                      View
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      onClick={() => handleRemoveFromWishlist(item.productId)}
                                      sx={{ 
                                        borderRadius: 1.5, 
                                        fontSize: '0.75rem', 
                                        fontWeight: 700,
                                        px: 2,
                                        height: 32
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  </Box>
                                </Box>
                              </Box>
                            </CardContent>
                            {item.product.vendorId && (
                              <Box sx={{ px: 2, pb: 2 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  fullWidth
                                  color="secondary"
                                  startIcon={<MessageCircle size={16} />}
                                  onClick={() => handleStartChatbotConversation(
                                    item.product.vendorId!, 
                                    item.productId, 
                                    item.product.name
                                  )}
                                  sx={{ borderRadius: 2, fontSize: '0.8rem', fontWeight: 700, height: 36, boxShadow: 'none' }}
                                >
                                  Chat with AI Support
                                </Button>
                              </Box>
                            )}
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </CardContent>
            </Paper>
          </Box>
        )}

        {/* Vendor Chat Tab */}
        {activeTab === 2 && (
          <Paper elevation={0} sx={{ 
            borderRadius: { xs: 0, sm: 3 }, 
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            borderLeft: { xs: 'none', sm: '1px solid' },
            borderRight: { xs: 'none', sm: '1px solid' },
            boxShadow: { xs: 'none', sm: '0 4px 20px rgba(0,0,0,0.05)' }
          }}>
            <CardHeader
              title="Vendor Chat"
              subheader="Direct messaging with sellers"
              sx={{ 
                p: { xs: 2, sm: 3 },
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: { xs: 'background.paper', sm: 'transparent' },
                '& .MuiCardHeader-title': { fontSize: { xs: '1.1rem', sm: '1.25rem' }, fontWeight: 800 },
                '& .MuiCardHeader-subheader': { fontSize: { xs: '0.8rem', sm: '0.875rem' } }
              }}
              action={
                <IconButton
                  color="primary"
                  size="small"
                  onClick={() => setOpenVendorDialog(true)}
                  sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}
                >
                  <Plus size={20} />
                </IconButton>
              }
            />
            <CardContent sx={{ p: 0 }}>
              {activeConversation ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: { xs: 'calc(100vh - 200px)', sm: '65vh' },
                  minHeight: { xs: 400, sm: 550 }
                }}>
                  {/* Chat header */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: { xs: 1.5, sm: 2 },
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'grey.50'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar 
                        src={activeConversation.participants.find(p => p.id !== user?.id)?.avatar || ''}
                        alt={activeConversation.participants.find(p => p.id !== user?.id)?.displayName}
                        sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 }, border: '2px solid white', boxShadow: 1 }}
                      />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ 
                          maxWidth: { xs: '160px', sm: '300px' },
                          fontSize: { xs: '0.9rem', sm: '1rem' }
                        }}>
                          {activeConversation.participants.find(p => p.id !== user?.id)?.displayName || 
                           activeConversation.participants.find(p => p.id !== user?.id)?.username}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            Vendor
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => setActiveConversation(null)}
                      sx={{ fontSize: '0.75rem', fontWeight: 700, borderRadius: 1.5 }}
                    >
                      Back
                    </Button>
                  </Box>

                  {/* Messages area */}
                  <Box sx={{ 
                    flexGrow: 1, 
                    overflow: 'auto', 
                    p: { xs: 2, sm: 3 },
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'grey.50',
                    gap: 2
                  }}>
                    {messagesLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={28} thickness={5} />
                      </Box>
                    ) : messagesError ? (
                      <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                        <Typography color="error" variant="body2" fontWeight={600}>{messagesError}</Typography>
                        <Button size="small" onClick={() => fetchMessages()} sx={{ mt: 1 }}>Retry</Button>
                      </Box>
                    ) : messages.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 8 }}>
                        <MessageCircle size={48} color={theme.palette.divider} style={{ marginBottom: 12 }} />
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                          No messages yet. Send a greeting to start!
                        </Typography>
                      </Box>
                    ) : (
                      messages.map((message) => (
                        <Box
                          key={message.id}
                          sx={{
                            display: 'flex',
                            justifyContent: message.senderId === user?.id ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: { xs: '85%', sm: '70%' },
                              p: { xs: 1.5, sm: 2 },
                              borderRadius: message.senderId === user?.id 
                                ? '16px 16px 4px 16px' 
                                : '16px 16px 16px 4px',
                              bgcolor: message.senderId === user?.id 
                                ? 'primary.main' 
                                : 'background.paper',
                              color: message.senderId === user?.id 
                                ? 'primary.contrastText' 
                                : 'text.primary',
                              boxShadow: message.senderId === user?.id ? '0 4px 12px rgba(0,0,0,0.1)' : 1,
                              border: message.senderId === user?.id ? 'none' : '1px solid',
                              borderColor: 'divider',
                              position: 'relative'
                            }}
                          >
                            <Typography variant="body2" sx={{ 
                              fontSize: { xs: '0.9rem', sm: '0.95rem' },
                              lineHeight: 1.5,
                              wordBreak: 'break-word'
                            }}>
                              {message.content}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'block', 
                                textAlign: 'right',
                                mt: 0.75,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                opacity: 0.8
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
                      p: { xs: 1.5, sm: 2 }, 
                      borderTop: 1, 
                      borderColor: 'divider',
                      display: 'flex',
                      gap: 1.5,
                      bgcolor: 'background.paper',
                      alignItems: 'center'
                    }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Type your message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      multiline
                      maxRows={4}
                      sx={{ 
                        '& .MuiInputBase-root': { 
                          fontSize: '0.95rem',
                          borderRadius: 3,
                          bgcolor: 'grey.50',
                          px: 2
                        } 
                      }}
                    />
                    <IconButton 
                      type="submit"
                      disabled={!messageText.trim()}
                      color="primary"
                      sx={{ 
                        bgcolor: messageText.trim() ? 'primary.main' : 'grey.100',
                        color: messageText.trim() ? 'white' : 'action.disabled',
                        '&:hover': {
                          bgcolor: messageText.trim() ? 'primary.dark' : 'grey.200',
                        },
                        width: 44,
                        height: 44,
                        boxShadow: messageText.trim() ? 2 : 0,
                        transition: 'all 0.2s'
                      }}
                    >
                      <Send size={20} />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: { xs: 8, sm: 12 }, px: 3 }}>
                  <Box sx={{ 
                    width: 100, 
                    height: 100, 
                    borderRadius: '50%', 
                    bgcolor: 'primary.50', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3
                  }}>
                    <MessageCircle size={50} color={theme.palette.primary.main} />
                  </Box>
                  <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 800 }}>
                    Vendor Messaging
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 5, maxWidth: 450, mx: 'auto', lineHeight: 1.6 }}>
                    Connect directly with our verified vendors. Ask about products, shipping, or custom requests.
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Plus size={20} />}
                    onClick={() => setOpenVendorDialog(true)}
                    sx={{ borderRadius: 3, px: 5, py: 1.5, fontWeight: 800, fontSize: '1rem' }}
                  >
                    Start New Chat
                  </Button>
                  
                  {/* List of recent conversations */}
                  {conversations.length > 0 && (
                    <Box sx={{ mt: 8, textAlign: 'left', maxWidth: 650, mx: 'auto' }}>
                      <Typography variant="subtitle1" sx={{ mb: 2.5, fontWeight: 800, px: 1, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.75rem', color: 'text.secondary' }}>
                        Your Recent Conversations
                      </Typography>
                      <List sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                        {conversations.map((conversation, index) => {
                          const vendor = conversation.participants.find(p => p.id !== user?.id);
                          return (
                            <React.Fragment key={conversation.id}>
                              <ButtonBase 
                                onClick={() => setActiveConversation(conversation)}
                                sx={{
                                  width: '100%',
                                  textAlign: 'left',
                                  transition: 'all 0.2s',
                                  '&:hover': { bgcolor: 'action.hover' }
                                }}
                              >
                                <ListItem sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
                                  <Badge
                                    overlap="circular"
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                    variant="dot"
                                    color={vendor?.isOnline ? "success" : "default"}
                                    sx={{ mr: 2.5 }}
                                  >
                                    <Avatar 
                                      src={vendor?.avatar || ''} 
                                      sx={{ width: 52, height: 52, border: '1px solid', borderColor: 'divider', boxShadow: 1 }}
                                    >
                                      {vendor?.displayName?.[0] || vendor?.username?.[0]}
                                    </Avatar>
                                  </Badge>
                                  <ListItemText
                                    primary={
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle1" fontWeight={800} sx={{ fontSize: '1rem' }}>
                                          {vendor?.displayName || vendor?.username}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                          {conversation.lastActivity ? formatMessageTime(conversation.lastActivity) : ''}
                                        </Typography>
                                      </Box>
                                    }
                                    secondary={conversation.lastMessage?.content || 'No messages yet'}
                                    primaryTypographyProps={{ component: 'div' }}
                                    secondaryTypographyProps={{ 
                                      noWrap: true, 
                                      fontSize: '0.9rem',
                                      sx: { mt: 0.5, color: conversation.unreadCount > 0 ? 'text.primary' : 'text.secondary', fontWeight: conversation.unreadCount > 0 ? 700 : 400 }
                                    }}
                                  />
                                  {conversation.unreadCount > 0 && (
                                    <Badge badgeContent={conversation.unreadCount} color="primary" sx={{ ml: 2 }} />
                                  )}
                                </ListItem>
                              </ButtonBase>
                              {index < conversations.length - 1 && <Divider />}
                            </React.Fragment>
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
          <Paper elevation={0} sx={{ 
            borderRadius: { xs: 0, sm: 2 }, 
            overflow: 'hidden',
            border: { xs: 'none', sm: '1px solid' },
            borderColor: 'divider'
          }}>
            <CardHeader
              title="Product Support"
              subheader="AI-powered product assistance"
              sx={{ 
                p: { xs: 1.5, sm: 2.5 },
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiCardHeader-title': { fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 700 },
                '& .MuiCardHeader-subheader': { fontSize: { xs: '0.75rem', sm: '0.875rem' } }
              }}
            />
            <CardContent sx={{ p: 0 }}>
              {activeChatbotConversation ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: { xs: 'calc(100vh - 240px)', sm: '65vh' },
                  minHeight: { xs: 350, sm: 550 }
                }}>
                  {/* Chat header */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: { xs: 1.25, sm: 2 },
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'grey.50'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: { xs: 28, sm: 36 }, height: { xs: 28, sm: 36 }, bgcolor: 'secondary.main' }}>
                        {activeChatbotConversation.productName?.[0] || 'P'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ 
                          maxWidth: { xs: '140px', sm: '300px' },
                          fontSize: { xs: '0.85rem', sm: '0.95rem' }
                        }}>
                          {activeChatbotConversation.productName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          Product Assistant
                        </Typography>
                      </Box>
                    </Box>
                    <Button 
                      size="small" 
                      variant="text"
                      onClick={() => setActiveChatbotConversation(null)}
                      sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      Back
                    </Button>
                  </Box>

                  {/* Messages area */}
                  <Box sx={{ 
                    flexGrow: 1, 
                    overflow: 'auto', 
                    p: { xs: 1.5, sm: 2.5 },
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'grey.50',
                    gap: 1.5
                  }}>
                    {chatbotLoading.messages ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={24} thickness={5} color="secondary" />
                      </Box>
                    ) : chatbotError ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="error" variant="caption">{chatbotError}</Typography>
                      </Box>
                    ) : chatbotMessages.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Typography variant="body2" color="text.secondary">Ask anything about this product</Typography>
                      </Box>
                    ) : (
                      chatbotMessages.map((message) => (
                        <Box
                          key={message._id}
                          sx={{
                            display: 'flex',
                            justifyContent: message.senderId === user?.id ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: { xs: '88%', sm: '75%' },
                              p: { xs: 1.25, sm: 1.75 },
                              borderRadius: 2.5,
                              bgcolor: message.senderId === user?.id 
                                ? 'primary.main' 
                                : message.isBotMessage 
                                  ? 'secondary.soft' 
                                  : 'background.paper',
                              color: message.senderId === user?.id 
                                ? 'primary.contrastText' 
                                : 'text.primary',
                              boxShadow: message.senderId === user?.id ? '0 2px 4px rgba(0,0,0,0.1)' : 1,
                              border: message.senderId === user?.id ? 'none' : '1px solid',
                              borderColor: message.isBotMessage ? 'secondary.light' : 'divider',
                              position: 'relative'
                            }}
                          >
                            <Typography variant="body2" sx={{ 
                              fontSize: { xs: '0.85rem', sm: '0.9rem' },
                              lineHeight: 1.4,
                              wordBreak: 'break-word'
                            }}>
                              {message.content}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                mt: 0.5,
                                fontSize: '0.65rem',
                                opacity: 0.8
                              }}
                            >
                              {formatMessageTime(message.createdAt)}
                              {message.isBotMessage && (
                                <Chip 
                                  label="AI" 
                                  size="small" 
                                  variant="filled"
                                  color="secondary"
                                  sx={{ ml: 1, height: 16, fontSize: '0.55rem', fontWeight: 800 }} 
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
                      p: { xs: 1.25, sm: 2 }, 
                      borderTop: 1, 
                      borderColor: 'divider',
                      display: 'flex',
                      gap: 1,
                      bgcolor: 'background.paper',
                      alignItems: 'center'
                    }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Ask the AI assistant..."
                      value={chatbotMessageText}
                      onChange={(e) => setChatbotMessageText(e.target.value)}
                      multiline
                      maxRows={3}
                      disabled={chatbotLoading.send}
                      sx={{ 
                        '& .MuiInputBase-root': { 
                          fontSize: '0.9rem',
                          borderRadius: 2.5,
                          bgcolor: 'grey.50'
                        } 
                      }}
                    />
                    <IconButton 
                      type="submit"
                      disabled={!chatbotMessageText.trim() || chatbotLoading.send}
                      color="secondary"
                      sx={{ 
                        bgcolor: chatbotMessageText.trim() ? 'secondary.main' : 'transparent',
                        color: chatbotMessageText.trim() ? 'white' : 'action.disabled',
                        '&:hover': {
                          bgcolor: chatbotMessageText.trim() ? 'secondary.dark' : 'transparent',
                        },
                        width: 40,
                        height: 40
                      }}
                    >
                      {chatbotLoading.send ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: { xs: 6, sm: 10 }, px: 3 }}>
                  <MessageCircle size={64} color={theme.palette.secondary.main} style={{ opacity: 0.3, marginBottom: 16 }} />
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                    AI Product Inquiries
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                    Have questions about a specific item? Our AI assistants can provide instant answers about availability, specs, and more.
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => router.push('/marketplace')}
                    sx={{ borderRadius: 2, px: 4, py: 1 }}
                  >
                    Browse Products
                  </Button>
                  
                  {/* List of recent chatbot conversations */}
                  {chatbotConversations.length > 0 && (
                    <Box sx={{ mt: 6, textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, px: 1 }}>
                        Recent Inquiries
                      </Typography>
                      <List sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        {chatbotConversations.map((conversation, index) => (
                          <React.Fragment key={conversation._id}>
                            <ButtonBase 
                              onClick={() => setActiveChatbotConversation(conversation)}
                              sx={{
                                width: '100%',
                                textAlign: 'left',
                                '&:hover': { bgcolor: 'action.hover' }
                              }}
                            >
                              <ListItem sx={{ py: 1.5 }}>
                                <Avatar 
                                  sx={{ mr: 2, width: 44, height: 44, bgcolor: 'secondary.soft', color: 'secondary.main', border: '1px solid', borderColor: 'secondary.light' }}
                                >
                                  {conversation.productName?.[0] || 'P'}
                                </Avatar>
                                <ListItemText
                                  primary={conversation.productName}
                                  secondary={conversation.lastMessage?.content || 'Click to continue chat'}
                                  primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }}
                                  secondaryTypographyProps={{ 
                                    noWrap: true, 
                                    fontSize: '0.85rem',
                                    sx: { mt: 0.25 }
                                  }}
                                />
                                {!conversation.isResolved && (
                                  <Chip label="Active" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', ml: 1 }} />
                                )}
                              </ListItem>
                            </ButtonBase>
                            {index < chatbotConversations.length - 1 && <Divider />}
                          </React.Fragment>
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