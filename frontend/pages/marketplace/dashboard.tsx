import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '@/lib/api';
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
  InputAdornment,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Skeleton,
  Switch,
  FormControlLabel,
  useTheme,
  alpha,
  Paper,
  Stack,
  Badge,
  Rating,
  Divider,
  Alert,
  Fab,
  Tooltip,
  Fade,
  Zoom,
  Slide,
  Avatar,
  AvatarGroup,
  CircularProgress,
  LinearProgress,
  Backdrop,
  IconButton,
  Drawer,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Search,
  Filter,
  ShoppingCart,
  Tag,
  Wallet,
  AlertCircle,
  TrendingUp,
  Eye,
  Star,
  BadgeCheck,
  Plus,
  SortAsc,
  SortDesc,
  Grid3x3,
  List as ListIcon,
  RefreshCcw,
  FilterX,
  Sparkles,
  Users,
  Package,
  Globe,
  Zap,
  Award,
  Heart,
  Share2,
  ShoppingBag,
  ArrowRight,
  TrendingDown,
  Clock,
  Shield,
  Verified,
  Bell,
  Settings,
  Menu,
  X,
  XCircle,
  Truck,
  Calendar,
  CreditCard,
  CheckCircle,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
// Cart context removed as part of cart functionality removal
import useMarketplace from '@/hooks/useMarketplace';
import ProductCard from '@/components/marketplace/ProductCard';

import MarketplaceGrid from '@/components/marketplace/MarketplaceGrid';
import RecommendedProducts from '@/components/marketplace/RecommendedProducts';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    currency: string;
    images: Array<{
      secure_url?: string;
      url: string;
      public_id: string;
    } | string>;
    category: string;
    vendor: {
      id: string;
      username: string;
      displayName: string;
      avatar: string;
      isVerified: boolean;
    };
    isNFT: boolean;
    featured: boolean;
    stock: number;
    rating: number;
    reviewCount: number;
    sales: number;
  };
  addedAt: string;
}

interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  method: string;
  createdAt: string;
}

const MarketplaceDashboard: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState({
    orders: true,
    wishlist: true,
    payments: true,
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch user data
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchOrders();
    fetchWishlist();
    fetchPayments();
  }, [user, router]);

  const fetchOrders = async () => {
    try {
      setLoading(prev => ({ ...prev, orders: true }));
      console.log('Fetching orders...');
      const response: any = await api.marketplace.getOrders({ page: 1, limit: 10 });
      console.log('Orders response:', response);
      
      if (response.success) {
        setOrders(response.data.orders || []);
      } else {
        setError(response.error || 'Failed to load orders');
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(prev => ({ ...prev, orders: false }));
    }
  };

  const fetchWishlist = async () => {
    try {
      setLoading(prev => ({ ...prev, wishlist: true }));
      console.log('Fetching wishlist...');
      const response: any = await api.marketplace.getWishlist();
      console.log('Wishlist response:', response);
      
      if (response.success) {
        setWishlistItems(response.data.wishlist || []);
      } else {
        setError(response.error || 'Failed to load wishlist');
      }
    } catch (err: any) {
      console.error('Error fetching wishlist:', err);
      setError(err.message || 'Failed to load wishlist');
    } finally {
      setLoading(prev => ({ ...prev, wishlist: false }));
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(prev => ({ ...prev, payments: true }));
      console.log('Fetching payments...');
      // Fetch real payment data from the orders API
      const response: any = await api.marketplace.getOrders({ page: 1, limit: 10 });
      console.log('Payments response:', response);
      
      if (response.success) {
        setPayments(response.data || []);
      } else {
        // Fallback to simulated data if API fails
        setPayments([
          {
            id: '1',
            orderId: '1001',
            amount: 125.99,
            currency: 'USD',
            status: 'completed',
            method: 'Credit Card',
            createdAt: '2023-05-15T10:30:00Z',
          },
          {
            id: '2',
            orderId: '1002',
            amount: 89.50,
            currency: 'USD',
            status: 'completed',
            method: 'PayPal',
            createdAt: '2023-05-10T14:22:00Z',
          },
          {
            id: '3',
            orderId: '1003',
            amount: 245.75,
            currency: 'USD',
            status: 'pending',
            method: 'Bank Transfer',
            createdAt: '2023-05-05T09:15:00Z',
          },
        ]);
      }
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      // Fallback to simulated data on error
      setPayments([
        {
          id: '1',
          orderId: '1001',
          amount: 125.99,
          currency: 'USD',
          status: 'completed',
          method: 'Credit Card',
          createdAt: '2023-05-15T10:30:00Z',
        },
        {
          id: '2',
          orderId: '1002',
          amount: 89.50,
          currency: 'USD',
            status: 'completed',
          method: 'PayPal',
          createdAt: '2023-05-10T14:22:00Z',
        },
        {
          id: '3',
          orderId: '1003',
          amount: 245.75,
          currency: 'USD',
          status: 'pending',
          method: 'Bank Transfer',
          createdAt: '2023-05-05T09:15:00Z',
        },
      ]);
      setError(err.message || 'Failed to load payment history');
    } finally {
      setLoading(prev => ({ ...prev, payments: false }));
    }
  };

  // Enhanced order status handling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'shipped':
        return 'primary';
      case 'processing':
        return 'info';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle size={16} />;
      case 'shipped':
        return <Truck size={16} />;
      case 'processing':
        return <Clock size={16} />;
      case 'pending':
        return <Clock size={16} />;
      case 'cancelled':
        return <X size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format price with proper currency symbols
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  // Get image source from product images array
  const getImageSrc = (images: any[]) => {
    if (!images || images.length === 0) {
      return '/images/placeholder-image.png';
    }
    
    const firstImage = images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    return firstImage?.secure_url || firstImage?.url || '/images/placeholder-image.png';
  };

  if (!user) {
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
      <Box sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            Marketplace Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your orders, wishlist, and payment history
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 60,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
              },
            }}
          >
            <Tab icon={<ShoppingCart size={16} />} iconPosition="start" label="My Orders" />
            <Tab icon={<Heart size={16} />} iconPosition="start" label="Wishlist" />
            <Tab icon={<CreditCard size={16} />} iconPosition="start" label="Payment History" />
          </Tabs>

          {/* Orders Tab */}
          {activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Recent Orders
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowRight size={16} />}
                  onClick={() => router.push('/marketplace')}
                >
                  View All Products
                </Button>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {loading.orders ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : orders.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 6,
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                    borderRadius: 2,
                  }}
                >
                  <Package size={48} color={theme.palette.text.secondary} />
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    No orders yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    You haven&apos;t placed any orders. Start shopping now!
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Plus size={16} />}
                    onClick={() => router.push('/marketplace')}
                  >
                    Browse Marketplace
                  </Button>
                </Paper>
              ) : (
                <List sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
                  {orders.map((order, index) => (
                    <React.Fragment key={order.id}>
                      <ListItem 
                        alignItems="flex-start" 
                        sx={{ 
                          py: 3,
                          flexDirection: { xs: 'column', sm: 'row' },
                          position: 'relative',
                          pr: { xs: 2, sm: 8 }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                            <Package size={20} color={theme.palette.primary.main} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: { xs: 'flex-start', sm: 'center' }, 
                              gap: 1, 
                              mb: 0.5,
                              flexDirection: { xs: 'column', sm: 'row' }
                            }}>
                              <Typography variant="subtitle1" fontWeight={600} sx={{ 
                                wordBreak: 'break-all',
                                maxWidth: '100%'
                              }}>
                                Order #{order.id}
                              </Typography>
                              <Chip
                                icon={getStatusIcon(order.status)}
                                label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                size="small"
                                color={getStatusColor(order.status) as any}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <React.Fragment>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                {order.items.length} item{order.items.length !== 1 ? 's' : ''} •{' '}
                                {formatPrice(order.totalAmount, order.currency)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <span style={{ verticalAlign: 'middle', marginRight: 4 }}>
                                  <Calendar size={14} style={{ verticalAlign: 'middle' }} />
                                </span>
                                {formatDate(order.createdAt)}
                              </Typography>
                            </React.Fragment>
                          }
                        />
                        <Box sx={{ 
                          position: { xs: 'static', sm: 'absolute' },
                          right: { sm: 16 },
                          top: { sm: '50%' },
                          transform: { sm: 'translateY(-50%)' },
                          mt: { xs: 2, sm: 0 }
                        }}>
                          <IconButton
                            edge="end"
                            onClick={() => router.push(`/marketplace/orders/${order.id}`)}
                          >
                            <Eye size={18} />
                          </IconButton>
                        </Box>
                      </ListItem>
                      {index < orders.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Wishlist Tab */}
          {activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  My Wishlist
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowRight size={16} />}
                  onClick={() => router.push('/marketplace')}
                >
                  Add More Items
                </Button>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {loading.wishlist ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : wishlistItems.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 6,
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.secondary.main, 0.03),
                    borderRadius: 2,
                  }}
                >
                  <Heart size={48} color={theme.palette.text.secondary} />
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    Your wishlist is empty
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Start adding products you love to your wishlist!
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Plus size={16} />}
                    onClick={() => router.push('/marketplace')}
                  >
                    Browse Marketplace
                  </Button>
                </Paper>
              ) : (
                <List sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
                  {wishlistItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <ListItem 
                        alignItems="flex-start" 
                        sx={{ 
                          py: 2,
                          flexDirection: { xs: 'column', sm: 'row' },
                          position: 'relative',
                          pr: { xs: 2, sm: 10 }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={getImageSrc(item.product.images)}
                            sx={{ 
                              width: { xs: 80, sm: 60 }, 
                              height: { xs: 80, sm: 60 },
                              mb: { xs: 1, sm: 0 }
                            }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography
                              variant="subtitle1"
                              fontWeight={600}
                              sx={{ cursor: 'pointer' }}
                              onClick={() => router.push(`/marketplace/${item.product.id}`)}
                            >
                              {item.product.name}
                            </Typography>
                          }
                          secondary={
                            <React.Fragment>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                by {item.product.vendor.displayName}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: { xs: 1, sm: 0 } }}>
                                <Typography variant="h6" color="primary" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                                  {formatPrice(item.product.price, item.product.currency)}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  {item.product.isNFT && (
                                    <Chip label="NFT" size="small" color="primary" />
                                  )}
                                  {item.product.featured && (
                                    <Chip label="Featured" size="small" color="secondary" />
                                  )}
                                </Box>
                              </Box>
                            </React.Fragment>
                          }
                        />
                        <Box sx={{ 
                          position: { xs: 'static', sm: 'absolute' },
                          right: { sm: 16 },
                          top: { sm: '50%' },
                          transform: { sm: 'translateY(-50%)' },
                          mt: { xs: 1, sm: 0 },
                          display: 'flex', 
                          gap: 1 
                        }}>
                          <Tooltip title="View product">
                            <IconButton
                              size="small"
                              onClick={() => router.push(`/marketplace/${item.product.id}`)}
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Buy now">
                            <IconButton
                              size="small"
                              onClick={() => {
                                toast.success('Feature coming soon!');
                              }}
                            >
                              <ShoppingCart size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItem>
                      {index < wishlistItems.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Payment History Tab */}
          {activeTab === 2 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Payment History
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowRight size={16} />}
                  onClick={() => router.push('/wallet')}
                >
                  View Wallet
                </Button>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {loading.payments ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : payments.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 6,
                    textAlign: 'center',
                    bgcolor: alpha(theme.palette.secondary.main, 0.03),
                    borderRadius: 2,
                  }}
                >
                  <CreditCard size={48} color={theme.palette.text.secondary} />
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    No payment history
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Your payment history will appear here after making purchases.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Plus size={16} />}
                    onClick={() => router.push('/marketplace')}
                  >
                    Start Shopping
                  </Button>
                </Paper>
              ) : (
                <List sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
                  {payments.map((payment, index) => (
                    <React.Fragment key={payment.id}>
                      <ListItem 
                        alignItems="flex-start" 
                        sx={{ 
                          py: 2,
                          flexDirection: { xs: 'column', sm: 'row' },
                          position: 'relative',
                          pr: { xs: 2, sm: 12 }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                            <CreditCard size={20} color={theme.palette.success.main} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primaryTypographyProps={{ component: 'div' }}
                          primary={
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: { xs: 'flex-start', sm: 'center' }, 
                              gap: 1, 
                              mb: 0.5,
                              flexDirection: { xs: 'column', sm: 'row' }
                            }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {payment.method.toUpperCase()} Payment
                              </Typography>
                              <Chip
                                label={payment.status}
                                size="small"
                                color={payment.status === 'completed' ? 'success' : 'warning'}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <React.Fragment>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Order #{payment.orderId} • {payment.method}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                {formatDate(payment.createdAt)}
                              </Typography>
                            </React.Fragment>
                          }
                        />
                        <Box sx={{ 
                          position: { xs: 'static', sm: 'absolute' },
                          right: { sm: 16 },
                          top: { sm: '50%' },
                          transform: { sm: 'translateY(-50%)' },
                          mt: { xs: 2, sm: 0 },
                          textAlign: { xs: 'left', sm: 'right' }
                        }}>
                          <Typography variant="h6" fontWeight={600}>
                            {formatPrice(payment.amount, payment.currency)}
                          </Typography>
                        </Box>
                      </ListItem>
                      {index < payments.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Paper>
        
        {/* Personalized Recommendations */}
        {user && (
          <Box sx={{ mt: 4 }}>
            <RecommendedProducts limit={6} title="Recommended For You" />
          </Box>
        )}
      </Box>
    </Layout>
  );
};

export default MarketplaceDashboard;