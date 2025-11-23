import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  Grid
} from '@mui/material';
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Clock,
  Truck,
  User,
  MapPin,
  CreditCard,
  Calendar,
  Phone,
  ExternalLink,
  Shield
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  currency: string;
  image?: string;
  color?: string | string[];
}

interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentDetails: any;
  status: string;
  paymentStatus: string;
  shippingAddress: {
    name: string;
    email: string;
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    phone: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
  carrier?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

const OrderDetailsPage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?next=' + encodeURIComponent(`/marketplace/orders/${id}`));
    }
  }, [isAuthenticated, id, router]);

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      if (!id || typeof id !== 'string') return;
      
      try {
        setLoading(true);
        const response: any = await api.marketplace.getOrder(id);
        
        if (response?.success && response?.data) {
          setOrder(response.data);
        } else {
          setError('Order not found');
        }
      } catch (err: any) {
        console.error('Error fetching order:', err);
        setError(err.message || 'Failed to fetch order details');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && id) {
      fetchOrder();
    }
  }, [id, isAuthenticated]);

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
      case 'paid':
        return 'success';
      case 'processing':
        return 'warning';
      case 'shipped':
        return 'primary';
      case 'delivered':
        return 'info';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={16} />;
      case 'processing':
        return <Clock size={16} />;
      case 'shipped':
        return <Truck size={16} />;
      case 'delivered':
        return <CheckCircle size={16} />;
      case 'completed':
        return <CheckCircle size={16} />;
      case 'cancelled':
        return <Clock size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const getOrderStatusSteps = () => {
    return [
      { label: 'Order Placed', status: 'pending', date: order?.createdAt },
      { label: 'Payment Confirmed', status: 'paid', date: order?.paymentDetails?.confirmedAt },
      { label: 'Processing', status: 'processing', date: order?.status === 'processing' || order?.status === 'shipped' || order?.status === 'delivered' || order?.status === 'completed' ? order?.updatedAt : null },
      { label: 'Shipped', status: 'shipped', date: order?.shippedAt },
      { label: 'Delivered', status: 'delivered', date: order?.deliveredAt },
      { label: 'Completed', status: 'completed', date: order?.completedAt }
    ];
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading order details...
          </Typography>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            component={Link}
            href="/orders"
            variant="outlined"
            startIcon={<ArrowLeft size={20} />}
          >
            Back to Orders
          </Button>
        </Container>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Order not found
          </Alert>
          <Button
            component={Link}
            href="/orders"
            variant="outlined"
            startIcon={<ArrowLeft size={20} />}
          >
            Back to Orders
          </Button>
        </Container>
      </Layout>
    );
  }

  const isOwner = user && order.userId === user.id;
  const statusSteps = getOrderStatusSteps();
  const activeStep = statusSteps.findIndex(step => step.status === order.status);

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            component={Link}
            href="/orders"
            startIcon={<ArrowLeft size={20} />}
            variant="outlined"
            sx={{ 
              mb: 2,
              borderRadius: 2,
              borderColor: theme.palette.divider,
              color: theme.palette.text.primary,
              '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: theme.palette.action.hover,
              }
            }}
          >
            Back to Orders
          </Button>
          
          <Typography variant="h3" component="h1" fontWeight={800} sx={{ mb: 1 }}>
            Order Details
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h5" color="text.secondary">
              #{order.orderNumber}
            </Typography>
            <Chip
              icon={getStatusIcon(order.status)}
              label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              color={getStatusColor(order.status) as any}
              size="small"
              sx={{ fontWeight: 600 }}
            />
            <Typography variant="body1" color="text.secondary">
              Placed on {formatDate(order.createdAt)}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={4}>
          {/* Order Items */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ 
              borderRadius: 4,
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              border: `1px solid ${theme.palette.divider}`,
              background: `linear-gradient(145deg, ${theme.palette.background.paper}, ${alpha(theme.palette.background.paper, 0.8)})`,
            }}>
              <CardHeader
                title={
                  <Typography variant="h4" fontWeight={800} sx={{ 
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Order Items
                  </Typography>
                }
                subheader={`${order.items.length} item(s)`}
                sx={{ 
                  pb: 1,
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              />
              <CardContent sx={{ pt: 2 }}>
                <List>
                  {order.items.map((item, index) => (
                    <React.Fragment key={`${item.productId}-${index}`}>
                      <ListItem sx={{ px: 0, py: 2 }}>
                        <ListItemAvatar>
                          <Avatar 
                            variant="rounded" 
                            sx={{ 
                              bgcolor: theme.palette.primary.main,
                              width: 70,
                              height: 70,
                              borderRadius: 3
                            }}
                          >
                            <Package size={28} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box>
                              <Typography variant="h6" fontWeight={700}>
                                {item.name}
                              </Typography>
                              {item.color && (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  <strong>Color:</strong> {Array.isArray(item.color) ? item.color.join(', ') : item.color}
                                </Typography>
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                              Qty: {item.quantity} × {formatPrice(item.price, item.currency)} = {formatPrice(item.price * item.quantity, item.currency)}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < order.items.length - 1 && <Divider variant="fullWidth" sx={{ my: 1 }} />}
                    </React.Fragment>
                  ))}
                </List>
                
                <Divider sx={{ my: 3, borderColor: alpha(theme.palette.primary.main, 0.2) }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: 3, backgroundColor: alpha(theme.palette.primary.main, 0.1) }}>
                  <Typography variant="h5" fontWeight={700}>
                    Order Total
                  </Typography>
                  <Typography variant="h4" color="primary" fontWeight={800} sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {formatPrice(order.totalAmount, order.currency)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            {/* Tracking Information */}
            {(order.trackingNumber || order.carrier || order.estimatedDelivery) && (
              <Card sx={{ 
                borderRadius: 4,
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                border: `1px solid ${theme.palette.divider}`,
                background: `linear-gradient(145deg, ${theme.palette.background.paper}, ${alpha(theme.palette.background.paper, 0.8)})`,
                mt: 4
              }}>
                <CardHeader
                  title={
                    <Typography variant="h4" fontWeight={800}>
                      Tracking Information
                    </Typography>
                  }
                  sx={{ 
                    pb: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`
                  }}
                />
                <CardContent>
                  <Grid container spacing={3}>
                    {order.carrier && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Carrier
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          {order.carrier}
                        </Typography>
                      </Grid>
                    )}
                    {order.trackingNumber && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Tracking Number
                        </Typography>
                        <Typography variant="h6" fontWeight={600} color="primary">
                          {order.trackingNumber}
                        </Typography>
                      </Grid>
                    )}
                    {order.estimatedDelivery && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Estimated Delivery
                        </Typography>
                        <Typography variant="h6" fontWeight={600}>
                          {new Date(order.estimatedDelivery).toLocaleDateString()}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                  
                  {order.trackingNumber && (
                    <Button
                      variant="contained"
                      startIcon={<ExternalLink size={18} />}
                      sx={{ 
                        mt: 3,
                        py: 1.5,
                        px: 3,
                        borderRadius: 3,
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': {
                          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                          transform: 'translateY(-2px)',
                          transition: 'all 0.3s ease'
                        }
                      }}
                      onClick={() => {
                        // In a real implementation, this would link to the carrier's tracking page
                        toast.success('Tracking link would open in a new tab');
                      }}
                    >
                      Track Package
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
          
          {/* Order Information */}
          <Grid item xs={12} lg={4}>
            {/* Order Status Timeline */}
            <Card sx={{ 
              borderRadius: 4,
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              border: `1px solid ${theme.palette.divider}`,
              background: `linear-gradient(145deg, ${theme.palette.background.paper}, ${alpha(theme.palette.background.paper, 0.8)})`,
              mb: 4
            }}>
              <CardHeader
                title={
                  <Typography variant="h4" fontWeight={800}>
                    Order Status
                  </Typography>
                }
                sx={{ 
                  pb: 1,
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              />
              <CardContent sx={{ pt: 2 }}>
                <Stepper activeStep={activeStep} orientation="vertical" sx={{ 
                  '& .MuiStepConnector-line': {
                    borderColor: alpha(theme.palette.primary.main, 0.3)
                  }
                }}>
                  {statusSteps.map((step, index) => (
                    <Step key={step.label} active={index <= activeStep}>
                      <StepLabel
                        icon={getStatusIcon(step.status)}
                        optional={
                          step.date && (
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(step.date)}
                            </Typography>
                          )
                        }
                        sx={{
                          '& .MuiStepLabel-label': {
                            fontWeight: 600,
                            fontSize: '1.1rem'
                          },
                          '& .Mui-active .MuiStepLabel-label': {
                            color: theme.palette.primary.main,
                            fontWeight: 700
                          }
                        }}
                      >
                        <Typography variant="h6" fontWeight={index <= activeStep ? 700 : 500} color={index <= activeStep ? 'primary' : 'text.primary'}>
                          {step.label}
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        {step.date && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Completed on {formatDate(step.date)}
                          </Typography>
                        )}
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>
            
            {/* Payment Information */}
            <Card sx={{ 
              borderRadius: 4,
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              border: `1px solid ${theme.palette.divider}`,
              background: `linear-gradient(145deg, ${theme.palette.background.paper}, ${alpha(theme.palette.background.paper, 0.8)})`,
              mb: 4
            }}>
              <CardHeader
                title={
                  <Typography variant="h4" fontWeight={800}>
                    Payment Information
                  </Typography>
                }
                sx={{ 
                  pb: 1,
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <CreditCard size={24} />
                  <Typography variant="h6" fontWeight={600}>
                    {order.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.success.main, 0.1) }}>
                  <CheckCircle size={24} color={theme.palette.success.main} />
                  <Typography variant="h6" fontWeight={600} color="success.main">
                    Payment {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            {/* Shipping Address */}
            <Card sx={{ 
              borderRadius: 4,
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              border: `1px solid ${theme.palette.divider}`,
              background: `linear-gradient(145deg, ${theme.palette.background.paper}, ${alpha(theme.palette.background.paper, 0.8)})`
            }}>
              <CardHeader
                title={
                  <Typography variant="h4" fontWeight={800}>
                    Shipping Address
                  </Typography>
                }
                sx={{ 
                  pb: 1,
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3 }}>
                  <User size={24} />
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {order.shippingAddress.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.shippingAddress.email}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3 }}>
                  <MapPin size={24} />
                  <Typography variant="body1">
                    {order.shippingAddress.address}<br />
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}<br />
                    {order.shippingAddress.country}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Phone size={24} />
                  <Typography variant="body1">
                    {order.shippingAddress.phone}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default OrderDetailsPage;

// Add getStaticPaths and getStaticProps to fix prerendering errors
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  };
}

export async function getStaticProps() {
  return {
    props: {}
  };
}
