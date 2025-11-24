import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Paper,
} from '@mui/material';
import {
  ArrowLeft,
  Package,
  Calendar,
  DollarSign,
  CreditCard,
  Coins,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  currency: string;
  isNFT: boolean;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

const OrdersPage: NextPage = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Prevent multiple rapid redirects
      const now = Date.now();
      const lastRedirect = (window as any).lastOrdersLoginRedirectClick || 0;
      if (now - lastRedirect < 1000) {
        // Ignore redirects within 1 second
        return;
      }
      (window as any).lastOrdersLoginRedirectClick = now;
      
      router.push('/auth/login?next=' + encodeURIComponent('/orders')).catch((error) => {
        // Handle navigation errors gracefully
        console.error('Navigation to login failed:', error);
      });
    }
  }, [isAuthenticated, router]);

  // Fetch orders
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.orders.getAll() as any;
      
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'USD') => {
    if (currency === 'USD') {
      return `$${price.toFixed(2)}`;
    }
    return `${price.toFixed(4)} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} />;
      case 'processing':
        return <Clock size={16} />;
      case 'cancelled':
        return <XCircle size={16} />;
      case 'pending':
        return <Clock size={16} />;
      default:
        return <Package size={16} />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'crypto':
      case 'nft':
        return <Coins size={16} />;
      default:
        return <DollarSign size={16} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress />
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Button
            startIcon={<ArrowLeft size={20} />}
            onClick={() => {
              // Prevent multiple rapid clicks
              const now = Date.now();
              const lastClick = (window as any).lastOrdersBackToMarketplaceClick || 0;
              if (now - lastClick < 1000) {
                // Ignore clicks within 1 second
                return;
              }
              (window as any).lastOrdersBackToMarketplaceClick = now;
              
              router.push('/marketplace').catch((error) => {
                // Handle navigation errors gracefully
                console.error('Navigation to marketplace failed:', error);
              });
            }}
            variant="outlined"
          >
            Back to Marketplace
          </Button>
          <Typography variant="h4" sx={{ flex: 1 }}>
            Order History
          </Typography>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && orders.length === 0 && (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <Package size={64} style={{ color: '#ccc', marginBottom: '16px' }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              No orders found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              You haven&apos;t placed any orders yet.
            </Typography>
            <Button
              component={Link}
              href="/marketplace"
              variant="contained"
              size="large"
            >
              Browse Marketplace
            </Button>
          </Paper>
        )}

        {!loading && !error && orders.length > 0 && (
          <Grid container spacing={3}>
            {orders.map((order) => (
              <Grid item xs={12} key={order._id}>
                <Card>
                  <CardContent>
                    {/* Order Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Order #{order.orderNumber}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Chip
                            size="small"
                            label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            color={getStatusColor(order.status) as any}
                            icon={getStatusIcon(order.status)}
                          />
                          <Chip
                            size="small"
                            label={order.paymentMethod.toUpperCase()}
                            variant="outlined"
                            icon={getPaymentMethodIcon(order.paymentMethod)}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                          <Calendar size={14} />
                          <Typography variant="caption">
                            {formatDate(order.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" color="primary">
                          {formatPrice(order.totalAmount, order.currency)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Order Items */}
                    <List dense>
                      {order.items.map((item, index) => (
                        <React.Fragment key={`${item.productId}-${index}`}>
                          <ListItem sx={{ px: 0 }}>
                            <ListItemAvatar>
                              <Avatar variant="rounded" sx={{ bgcolor: 'primary.main' }}>
                                <Package size={20} />
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="subtitle2">
                                    {item.name}
                                  </Typography>
                                  {item.isNFT && (
                                    <Chip
                                      size="small"
                                      label="NFT"
                                      color="primary"
                                      sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Typography variant="body2" color="text.secondary">
                                  Qty: {item.quantity} × {formatPrice(item.price, item.currency)} = {formatPrice(item.price * item.quantity, item.currency)}
                                </Typography>
                              }
                            />
                          </ListItem>
                          {index < order.items.length - 1 && <Divider variant="inset" component="li" />}
                        </React.Fragment>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Layout>
  );
};

export default OrdersPage;