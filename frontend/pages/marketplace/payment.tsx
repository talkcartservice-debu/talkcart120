import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Home,
  ShoppingCart,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import PaystackProductCheckout from '@/components/marketplace/PaystackProductCheckout';

interface Order {
  id: string;
  orderNumber: string;
  items: any[];
  totalAmount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  shippingAddress: any;
}

const PaymentPage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { orderId } = router.query;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showPaystack, setShowPaystack] = useState(false);

  useEffect(() => {
    if (!user) {
      // Prevent multiple rapid redirects
      const now = Date.now();
      const lastRedirect = (window as any).lastPaymentLoginRedirectClick || 0;
      if (now - lastRedirect < 1000) {
        // Ignore redirects within 1 second
        return;
      }
      (window as any).lastPaymentLoginRedirectClick = now;
      
      router.push('/login').catch((error) => {
        // Handle navigation errors gracefully
        console.error('Navigation to login failed:', error);
      });
      return;
    }

    if (orderId) {
      fetchOrderDetails(orderId as string);
    }
  }, [user, orderId, router]);

  const fetchOrderDetails = async (orderId: string) => {
    try {
      setLoading(true);
      // Use the admin.getOrder method which calls the correct marketplace endpoint
      const response: any = await api.marketplace.getOrder(orderId);
      
      if (response.success) {
        setOrder(response.data);
      } else {
        setError(response.error || 'Failed to load order details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackSuccess = async (paymentDetails: any) => {
    if (!order) return;
    
    setConfirming(true);
    try {
      // Confirm payment with Paystack transaction details
      const response: any = await api.marketplace.confirmPayment(
        order.id, 
        'paystack', 
        paymentDetails.reference
      );
      
      if (response?.success) {
        // Redirect to order details page
        router.push(`/marketplace/orders/${order.id}`);
      } else {
        setError(response?.error || 'Failed to confirm payment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to confirm payment');
    } finally {
      setConfirming(false);
      setShowPaystack(false);
    }
  };

  const handlePaystackError = (errorMessage: string) => {
    setError(errorMessage);
    setShowPaystack(false);
  };

  const handleConfirmPayment = async () => {
    if (!order) return;
    
    // Use the payment method that was already selected during checkout
    const paymentMethod = order.paymentMethod;
    
    // For mobile money and card payments, show Paystack checkout
    if (paymentMethod === 'mobile_money' || paymentMethod === 'card_payment' || paymentMethod === 'paystack') {
      setShowPaystack(true);
      return;
    }
    
    // For COD, use confirmCODPayment method
    if (paymentMethod === 'cash_on_delivery') {
      setConfirming(true);
      try {
        const response: any = await api.marketplace.confirmCODPayment(order.id);
        
        if (response?.success) {
          // Redirect to order details page
          router.push(`/marketplace/orders/${order.id}`);
        } else {
          setError(response?.error || 'Failed to confirm payment');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to confirm payment');
      } finally {
        setConfirming(false);
      }
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
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

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
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
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button
            startIcon={<ArrowLeft size={16} />}
            onClick={() => {
              // Prevent multiple rapid clicks
              const now = Date.now();
              const lastClick = (window as any).lastPaymentErrorBackToCartClick || 0;
              if (now - lastClick < 1000) {
                // Ignore clicks within 1 second
                return;
              }
              (window as any).lastPaymentErrorBackToCartClick = now;
              
              router.push('/marketplace/cart').catch((error) => {
                // Handle navigation errors gracefully
                console.error('Navigation to cart failed:', error);
              });
            }}
            variant="outlined"
          >
            Back to Cart
          </Button>
        </Container>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Order not found
          </Alert>
          <Button
            startIcon={<ArrowLeft size={16} />}
            onClick={() => {
              // Prevent multiple rapid clicks
              const now = Date.now();
              const lastClick = (window as any).lastPaymentNotFoundBackToCartClick || 0;
              if (now - lastClick < 1000) {
                // Ignore clicks within 1 second
                return;
              }
              (window as any).lastPaymentNotFoundBackToCartClick = now;
              
              router.push('/marketplace/cart').catch((error) => {
                // Handle navigation errors gracefully
                console.error('Navigation to cart failed:', error);
              });
            }}
            variant="outlined"
          >
            Back to Cart
          </Button>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowLeft size={20} />}
            onClick={() => {
              // Prevent multiple rapid clicks
              const now = Date.now();
              const lastClick = (window as any).lastPaymentTopBackToCartClick || 0;
              if (now - lastClick < 1000) {
                // Ignore clicks within 1 second
                return;
              }
              (window as any).lastPaymentTopBackToCartClick = now;
              
              router.push('/marketplace/cart').catch((error) => {
                // Handle navigation errors gracefully
                console.error('Navigation to cart failed:', error);
              });
            }}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            Back to Cart
          </Button>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Confirm Payment
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Order Summary */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardHeader title="Order Summary" />
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Order #{order.orderNumber}
                </Typography>
                
                {order.items.map((item: any) => (
                  <Box key={item.productId} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">
                      {item.name} × {item.quantity}
                    </Typography>
                    <Typography variant="body2">
                      {formatPrice(item.price * item.quantity, order.currency)}
                    </Typography>
                  </Box>
                ))}
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight={700}>
                    Total
                  </Typography>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    {formatPrice(order.totalAmount, order.currency)}
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    Shipping Address
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress?.address}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.shippingAddress?.country}
                  </Typography>
                  {order.shippingAddress?.phone && (
                    <Typography variant="body2" color="text.secondary">
                      Phone: {order.shippingAddress?.phone}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Confirmation */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardHeader title={`Confirm ${order.paymentMethod.replace('_', ' ')} Payment`} />
              <CardContent>
                <Box sx={{ mb: 3 }}>
                  {order.paymentMethod === 'mobile_money' && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Mobile Money Payment
                      </Typography>
                      <Typography variant="body2">
                        You will be redirected to Paystack to complete your payment securely.
                        Payment will be confirmed instantly.
                      </Typography>
                    </Alert>
                  )}

                  {order.paymentMethod === 'card_payment' && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Debit/Credit Card Payment
                      </Typography>
                      <Typography variant="body2">
                        You will be redirected to Paystack to complete your payment securely.
                        Payment will be confirmed instantly.
                      </Typography>
                    </Alert>
                  )}

                  {order.paymentMethod === 'cash_on_delivery' && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        Cash on Delivery
                      </Typography>
                      <Typography variant="body2">
                        You will pay for your order when it is delivered to your address.
                        Our delivery agent will contact you before delivery.
                        Please have the exact amount ready.
                      </Typography>
                    </Alert>
                  )}
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowLeft size={16} />}
                    onClick={() => {
                      // Prevent multiple rapid clicks
                      const now = Date.now();
                      const lastClick = (window as any).lastPaymentBottomBackToCartClick || 0;
                      if (now - lastClick < 1000) {
                        // Ignore clicks within 1 second
                        return;
                      }
                      (window as any).lastPaymentBottomBackToCartClick = now;
                      
                      router.push('/marketplace/cart').catch((error) => {
                        // Handle navigation errors gracefully
                        console.error('Navigation to cart failed:', error);
                      });
                    }}
                  >
                    Back to Cart
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    startIcon={confirming ? <CircularProgress size={20} /> : <CreditCard size={20} />}
                    onClick={handleConfirmPayment}
                    disabled={confirming}
                  >
                    {confirming ? 'Processing...' : 'Confirm Payment'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Paystack Payment Dialog */}
        <Dialog 
          open={showPaystack} 
          onClose={() => setShowPaystack(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogContent>
            <PaystackProductCheckout
              product={{
                _id: order.id,
                name: `Order #${order.orderNumber}`,
                price: order.totalAmount,
                currency: order.currency
              }}
              onCompleted={handlePaystackSuccess}
              onError={handlePaystackError}
              onClose={() => setShowPaystack(false)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPaystack(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default PaymentPage;