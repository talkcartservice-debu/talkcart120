import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Rating,
  Tabs,
  Tab,
  Collapse,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  ArrowLeft,
  Banknote,
  Plus,
  Minus,
  Phone,
  Trash2,
  ShoppingCart,
  CreditCard,
  Package,
  MapPin,
  User,
  X,
  Eye,
  Star,
  BarChart,
  Package as PackageIcon,
  Calendar,
  Globe,
  Award,
  Users,
  Bell,
  Settings,
  Building,
  Share2,
  Heart,
  ExternalLink,
  Shield,
  Tag,
  Truck,
  Zap,
  CheckCircle,
  Lock,
  RotateCcw,
  Store,
  ThumbsUp,
  Edit,
  Info,
  Home,
  DollarSign,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import OptimizedImage from '@/components/media/OptimizedImage';
import api from '@/lib/api';
import FlutterwaveProductCheckout from '@/components/marketplace/FlutterwaveProductCheckout';
import PaystackCartCheckout from '@/components/marketplace/PaystackCartCheckout';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  image: string;
  vendorId: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  sales?: number;
  views?: number;
  category?: string;
  tags?: string[];
  attributes?: Record<string, any>;
  stock?: number;
}

const CartPage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { cart, loading, error, fetchCart, addToCart, removeFromCart, updateQuantity } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [openCheckoutDialog, setOpenCheckoutDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('mobile_money');
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    phone: '',
  });
  const [showFlutterwave, setShowFlutterwave] = useState(false);
  const [showPaystack, setShowPaystack] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [productDetails, setProductDetails] = useState<Record<string, any>>({});
  const [comparisonList, setComparisonList] = useState<string[]>([]);
  const [vendorPaymentPreferences, setVendorPaymentPreferences] = useState<Record<string, any>>({});
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>(['mobile_money', 'card_payment', 'cash_on_delivery']);

  // Add a force update mechanism
  const [, updateState] = React.useState<object>();
  const forceUpdate = React.useCallback(() => updateState({}), []);

  const steps = ['Cart', 'Shipping', 'Payment', 'Confirmation'];

  // Fetch vendor payment preferences
  const fetchVendorPaymentPreferences = async (vendorIds: string[]) => {
    try {
      const preferences: Record<string, any> = {};
      const methodsAvailability: Record<string, boolean> = {
        'mobile_money': true,
        'card_payment': true,
        'cash_on_delivery': true
      };

      // Fetch preferences for each vendor
      for (const vendorId of vendorIds) {
        try {
          const response: any = await api.marketplace.getVendorPaymentPreferences(vendorId);
          if (response?.success) {
            preferences[vendorId] = response.data;
            
            // Check which payment methods are enabled for this vendor
            if (!response.data.mobileMoney?.enabled) {
              methodsAvailability['mobile_money'] = false;
            }
            if (!response.data.bankAccount?.enabled && !response.data.paypal?.enabled && !response.data.cryptoWallet?.enabled) {
              methodsAvailability['card_payment'] = false;
            }
          }
        } catch (error) {
          console.error(`Error fetching payment preferences for vendor ${vendorId}:`, error);
        }
      }

      setVendorPaymentPreferences(preferences);
      
      // Update available payment methods based on all vendors' preferences
      const availableMethods = Object.entries(methodsAvailability)
        .filter(([method, enabled]) => enabled)
        .map(([method]) => method);
      
      setAvailablePaymentMethods(availableMethods);
      
      // If the currently selected payment method is no longer available, select the first available one
      if (!availableMethods.includes(selectedPaymentMethod) && availableMethods.length > 0) {
        setSelectedPaymentMethod(availableMethods[0] || 'mobile_money');
      }
    } catch (error) {
      console.error('Error fetching vendor payment preferences:', error);
    }
  };

  // Load comparison list from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedComparison = localStorage.getItem('productComparison');
      if (storedComparison) {
        try {
          setComparisonList(JSON.parse(storedComparison));
        } catch (e) {
          console.error('Error parsing comparison list:', e);
        }
      }
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      // Prevent multiple rapid clicks
      const now = Date.now();
      const lastClick = (window as any).lastCartLoginRedirectClick || 0;
      if (now - lastClick < 1000) {
        // Ignore clicks within 1 second
        return;
      }
      (window as any).lastCartLoginRedirectClick = now;
      // Use replace instead of push to avoid back navigation issues
      router.replace('/login').catch((error) => {
        // Handle navigation errors gracefully
        console.error('Navigation to login failed:', error);
      });
    }
  }, [user, router]);

  // Fetch cart data when user is available
  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user]);

  // Fetch vendor payment preferences when cart items change
  useEffect(() => {
    if (cart?.items && cart.items.length > 0) {
      // Get unique vendor IDs from cart items
      const vendorIds = [...new Set(cart.items.map(item => item.vendorId))];
      fetchVendorPaymentPreferences(vendorIds);
    }
  }, [cart?.items]);

  // Initialize shipping address with user info
  useEffect(() => {
    if (user && !shippingAddress.name) {
      setShippingAddress({
        name: user.displayName || user.username || '',
        email: user.email || '',
        address: '',
        city: '',
        state: '',
        country: '',
        zipCode: '',
        phone: (user as any).phoneNumber || (user as any).phoneNum || '', // Safely access phone number if available
      });
    }
  }, [user]);

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeFromCart(productId);
    } else {
      await updateQuantity(productId, newQuantity);
    }
  };

  const handleCheckout = async () => {
    // Debug log to help identify issues
    console.log('Checkout initiated with shipping address:', shippingAddress);
    
    const missingFields = [];
    if (!shippingAddress.name) missingFields.push('Full Name');
    if (!shippingAddress.address) missingFields.push('Address');
    if (!shippingAddress.city) missingFields.push('City');
    if (!shippingAddress.country) missingFields.push('Country');
    if (!shippingAddress.phone) missingFields.push('Phone Number');
    
    if (missingFields.length > 0) {
      console.log('Validation failed. Missing fields:', missingFields);
      toast.error(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    // Show payment method selection dialog
    console.log('Opening checkout dialog');
    setOpenCheckoutDialog(true);
  };

  const handleDirectCheckout = async (paymentMethod: string) => {
    console.log('Direct checkout initiated with payment method:', paymentMethod);
    console.log('Shipping address:', shippingAddress);
    
    setCheckoutLoading(true);
    try {
      const response: any = await api.marketplace.checkoutCart({
        shippingAddress,
        paymentMethod
      });
      
      console.log('Checkout API response:', response);
      
      if (response?.success && response?.data) {
        // For mobile money, we need to process payment through Flutterwave
        if (paymentMethod === 'mobile_money') {
          setCreatedOrderId(response.data._id || null);
          setShowFlutterwave(true);
        } 
        // For card payments, we need to process payment through Paystack
        else if (paymentMethod === 'card_payment') {
          setCreatedOrderId(response.data._id || null);
          setShowPaystack(true);
        }
        else {
          // For other payment methods or COD, redirect to order details page
          await fetchCart();
          toast.success(response.message || 'Order created successfully');
          // Prevent multiple rapid clicks
          const now = Date.now();
          const lastClick = (window as any).lastCheckoutRedirectClick || 0;
          if (now - lastClick < 1000) {
            // Ignore clicks within 1 second
            return;
          }
          (window as any).lastCheckoutRedirectClick = now;
          router.push(response.redirect || `/marketplace/orders/${response.data._id || ''}`).catch((error) => {
            // Handle navigation errors gracefully
            console.error('Navigation to order details failed:', error);
          });
        }
      } else {
        console.error('Checkout failed with response:', response);
        toast.error(response?.error || 'Checkout failed');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
      setOpenCheckoutDialog(false);
    }
  };

  // New function to handle direct checkout without payment method selection
  const handleQuickCheckout = async () => {
    if (!shippingAddress.name || !shippingAddress.address || !shippingAddress.city || 
        !shippingAddress.country || !shippingAddress.phone) {
      toast.error('Please fill in all required shipping address fields');
      return;
    }
    
    // Default to mobile money for quick checkout
    handleDirectCheckout('mobile_money');
  };

  const handleFlutterwaveSuccess = async (paymentDetails: any) => {
    if (!createdOrderId) return;
    
    try {
      // Confirm payment with Flutterwave transaction details
      const response: any = await api.marketplace.confirmPayment(
        createdOrderId, 
        'mobile_money', 
        paymentDetails.flw_tx_id
      );
      
      if (response?.success) {
        await fetchCart();
        toast.success('Order created and payment confirmed successfully');
        // Redirect to order details page
        router.push(`/marketplace/orders/${createdOrderId}`);
      } else {
        toast.error(response?.error || 'Failed to confirm payment');
      }
    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      toast.error(err.message || 'Failed to confirm payment');
    } finally {
      setShowFlutterwave(false);
      setCreatedOrderId(null);
    }
  };

  const handleFlutterwaveError = (errorMessage: string) => {
    toast.error(errorMessage);
    setShowFlutterwave(false);
    setCreatedOrderId(null);
  };

  const handlePaystackSuccess = async (reference: string) => {
    if (!createdOrderId) return;
    
    try {
      // Confirm payment with Paystack transaction reference
      const response: any = await api.marketplace.confirmPayment(
        createdOrderId, 
        'card_payment', 
        reference
      );
      
      if (response?.success) {
        await fetchCart();
        toast.success('Order created and payment confirmed successfully');
        // Redirect to order details page
        router.push(`/marketplace/orders/${createdOrderId}`);
      } else {
        toast.error(response?.error || 'Failed to confirm payment');
      }
    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      toast.error(err.message || 'Failed to confirm payment');
    } finally {
      setShowPaystack(false);
      setCreatedOrderId(null);
    }
  };

  const handlePaystackError = (errorMessage: string) => {
    toast.error(errorMessage);
    setShowPaystack(false);
    setCreatedOrderId(null);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const toggleItemExpansion = (productId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const fetchProductDetails = async (productId: string) => {
    try {
      const response: any = await api.marketplace.getProduct(productId);
      if (response?.success) {
        setProductDetails(prev => ({
          ...prev,
          [productId]: response.data
        }));
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    }
  };

  const handleAddToComparison = (productId: string) => {
    const newComparisonList = [...comparisonList];
    const index = newComparisonList.indexOf(productId);
    
    if (index > -1) {
      // Remove from comparison
      newComparisonList.splice(index, 1);
      toast.success('Removed from comparison', { 
        icon: '🗑️',
        duration: 2000 
      });
    } else {
      // Add to comparison
      if (newComparisonList.length >= 10) {
        toast.error('You can compare up to 10 products', { 
          icon: '⚠️',
          duration: 3000 
        });
        return;
      }
      newComparisonList.push(productId);
      toast.success('Added to comparison', { 
        icon: '📊',
        duration: 2000 
      });
    }
    
    setComparisonList(newComparisonList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('productComparison', JSON.stringify(newComparisonList));
    }
  };

  const handleViewComparison = () => {
    if (comparisonList.length < 2) {
      toast.error('Please select at least 2 products to compare');
      return;
    }
    router.push(`/marketplace/compare?ids=${comparisonList.join(',')}`);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        fill={i < Math.floor(rating) ? theme.palette.warning.main : 'none'}
        color={i < Math.floor(rating) ? theme.palette.warning.main : theme.palette.grey[400]}
      />
    ));
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
            Loading cart...
          </Typography>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowLeft size={20} />}
            onClick={() => {
              // Prevent multiple rapid clicks
              const now = Date.now();
              const lastClick = (window as any).lastContinueShoppingClick || 0;
              if (now - lastClick < 1000) {
                // Ignore clicks within 1 second
                return;
              }
              (window as any).lastContinueShoppingClick = now;
              // Use replace instead of push to avoid back navigation issues
              router.replace('/marketplace').catch((error) => {
                // Handle navigation errors gracefully
                console.error('Navigation to marketplace failed:', error);
              });
            }}
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
            Continue Shopping
          </Button>
          
          <Typography variant="h3" component="h1" fontWeight={800} sx={{ mb: 2 }}>
            Your Shopping Cart
          </Typography>
          
          {/* Progress Indicator */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              mb: 3, 
              backgroundColor: theme.palette.background.default,
              borderRadius: 2 
            }}
          >
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {cart?.items.length === 0 ? (
          <Card sx={{ 
            borderRadius: 3,
            boxShadow: 3,
            p: 4 
          }}>
            <CardContent sx={{ py: 8, textAlign: 'center' }}>
              <ShoppingCart size={64} color={theme.palette.text.secondary} />
              <Typography variant="h4" sx={{ mt: 2, mb: 1, fontWeight: 700 }}>
                Your cart is empty
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                Add some products to your cart and they will appear here
              </Typography>
              <Button
                variant="contained"
                size="large"
                sx={{ 
                  py: 1.5, 
                  px: 4,
                  borderRadius: 2,
                  boxShadow: 2,
                  '&:hover': {
                    boxShadow: 4,
                  }
                }}
                onClick={() => {
                  // Prevent multiple rapid clicks
                  const now = Date.now();
                  const lastClick = (window as any).lastBrowseMarketplaceClick || 0;
                  if (now - lastClick < 1000) {
                    // Ignore clicks within 1 second
                    return;
                  }
                  (window as any).lastBrowseMarketplaceClick = now;
                  // Use replace instead of push to avoid back navigation issues
                  router.replace('/marketplace').catch((error) => {
                    // Handle navigation errors gracefully
                    console.error('Navigation to marketplace failed:', error);
                  });
                }}
              >
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={4}>
            {/* Cart Items */}
            <Grid item xs={12} lg={8}>
              <Card sx={{ 
                borderRadius: 3,
                boxShadow: 3,
              }}>
                <CardHeader
                  title={
                    <Typography variant="h5" fontWeight={700}>
                      Cart Items
                    </Typography>
                  }
                  subheader={
                    <Typography variant="body1" color="text.secondary">
                      {cart?.totalItems || 0} items in cart
                      {comparisonList.length > 0 && (
                        <span> • {comparisonList.length} selected for comparison</span>
                      )}
                    </Typography>
                  }
                  sx={{ pb: 0 }}
                  action={
                    comparisonList.length > 0 && (
                      <Badge 
                        badgeContent={comparisonList.length} 
                        color="primary"
                        sx={{ mr: 2 }}
                      >
                        <Button
                          variant="outlined"
                          startIcon={<BarChart size={20} />}
                          onClick={handleViewComparison}
                          sx={{ 
                            borderRadius: 2,
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            }
                          }}
                        >
                          Compare
                        </Button>
                      </Badge>
                    )
                  }
                />
                <CardContent sx={{ pt: 0 }}>
                  {cart?.items.map((item) => (
                    <Box 
                      key={item.productId} 
                      sx={{ 
                        p: 3, 
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        '&:last-child': {
                          borderBottom: 'none'
                        }
                      }}
                    >
                      <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} sm={3} md={2}>
                          <Box sx={{ 
                            position: 'relative',
                            borderRadius: 2,
                            overflow: 'hidden',
                            boxShadow: 2,
                          }}>
                            <OptimizedImage
                              src={item.image || '/images/placeholder-image.png'}
                              alt={item.name || 'Product image'}
                              width={120}
                              height={120}
                              style={{ 
                                width: '100%', 
                                height: '120px', 
                                objectFit: 'cover',
                                display: 'block'
                              }}
                            />
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={9} md={10}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Box>
                              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                                {item.name}
                              </Typography>
                              <Chip 
                                label={formatPrice(item.price, item.currency)} 
                                color="primary" 
                                variant="outlined" 
                                size="small"
                                sx={{ fontWeight: 700 }}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title={comparisonList.includes(item.productId) ? "Remove from comparison" : "Add to comparison"}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleAddToComparison(item.productId)}
                                  sx={{ 
                                    backgroundColor: comparisonList.includes(item.productId) 
                                      ? theme.palette.primary.main 
                                      : theme.palette.grey[100],
                                    color: comparisonList.includes(item.productId) 
                                      ? theme.palette.primary.contrastText 
                                      : theme.palette.text.primary,
                                    '&:hover': {
                                      backgroundColor: comparisonList.includes(item.productId) 
                                        ? theme.palette.primary.dark 
                                        : theme.palette.grey[200],
                                    }
                                  }}
                                >
                                  <BarChart size={16} />
                                </IconButton>
                              </Tooltip>
                              <IconButton
                                size="small"
                                onClick={() => removeFromCart(item.productId)}
                                sx={{ 
                                  backgroundColor: theme.palette.error.light,
                                  color: theme.palette.error.contrastText,
                                  '&:hover': {
                                    backgroundColor: theme.palette.error.main,
                                  }
                                }}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                                sx={{ 
                                  borderRadius: 0,
                                  borderRight: `1px solid ${theme.palette.divider}`,
                                }}
                              >
                                <Minus size={16} />
                              </IconButton>
                              <TextField
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                                size="small"
                                sx={{ width: 60, mx: 1, textAlign: 'center' }}
                                inputProps={{ 
                                  min: 1, 
                                  style: { textAlign: 'center' },
                                  inputMode: 'numeric',
                                  pattern: '[0-9]*'
                                }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                sx={{ 
                                  borderRadius: 0,
                                  borderLeft: `1px solid ${theme.palette.divider}`,
                                }}
                              >
                                <Plus size={16} />
                              </IconButton>
                            </Box>
                            <Typography variant="h6" fontWeight={800} sx={{ ml: 'auto' }}>
                              {formatPrice(item.price * item.quantity, item.currency)}
                            </Typography>
                          </Box>
                          
                          {/* Product Details Button */}
                          <Button
                            size="small"
                            onClick={() => toggleItemExpansion(item.productId)}
                            sx={{ 
                              mt: 1,
                              textTransform: 'none',
                              color: theme.palette.primary.main,
                              fontWeight: 500
                            }}
                            endIcon={expandedItems[item.productId] ? <Minus size={16} /> : <Plus size={16} />}
                          >
                            {expandedItems[item.productId] ? 'Hide Details' : 'Show Details'}
                          </Button>
                          
                          {/* Expanded Product Details */}
                          <Collapse in={expandedItems[item.productId]} timeout="auto" unmountOnExit>
                            <Box sx={{ mt: 2, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 2 }}>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                    Product Information
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Category:</strong> {(item as any).category || 'N/A'}
                                  </Typography>
                                  {item.color && (
                                    <Typography variant="body2" sx={{ mb: 1 }}>
                                      <strong>Color:</strong> {Array.isArray(item.color) ? item.color.join(', ') : item.color}
                                    </Typography>
                                  )}
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Stock:</strong> {(item as any).stock !== undefined ? `${(item as any).stock} available` : 'N/A'}
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Sales:</strong> {(item as any).sales || 0}
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    <strong>Views:</strong> {(item as any).views || 0}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                    Ratings & Reviews
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    {(item as any).rating ? (
                                      <>
                                        {renderStars((item as any).rating)}
                                        <Typography variant="body2" sx={{ ml: 1 }}>
                                          {(item as any).rating.toFixed(1)} ({(item as any).reviewCount || 0} reviews)
                                        </Typography>
                                      </>
                                    ) : (
                                      <Typography variant="body2">No ratings yet</Typography>
                                    )}
                                  </Box>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<Star size={16} />}
                                    onClick={() => router.push(`/marketplace/${item.productId}`)}
                                    sx={{ mt: 1 }}
                                  >
                                    View Product & Reviews
                                  </Button>
                                </Grid>
                              </Grid>
                              
                              {(item as any).tags && (item as any).tags.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                    Tags
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {(item as any).tags.map((tag: any, index: any) => (
                                      <Chip
                                        key={index}
                                        label={tag}
                                        size="small"
                                        variant="outlined"
                                        icon={<Tag size={14} />}
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Order Summary and Shipping */}
            <Grid item xs={12} lg={4}>
              <Card sx={{ 
                mb: 3,
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
                      Order Summary
                    </Typography>
                  } 
                  sx={{ 
                    pb: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`
                  }}
                />
                <CardContent sx={{ pt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, py: 1, px: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                    <Typography variant="body1" fontWeight={600}>Subtotal</Typography>
                    <Typography variant="body1" fontWeight={700}>
                      {formatPrice(cart?.totalPrice || 0, cart?.items?.[0]?.currency || 'USD')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, py: 1, px: 2, borderRadius: 2 }}>
                    <Typography variant="body1" fontWeight={500}>Shipping</Typography>
                    <Typography variant="body1" fontWeight={600} color="success.main">
                      Free
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, py: 1, px: 2, borderRadius: 2 }}>
                    <Typography variant="body1" fontWeight={500}>Tax</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatPrice(0, cart?.items?.[0]?.currency || 'USD')}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 3, borderColor: alpha(theme.palette.primary.main, 0.2) }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, p: 2, borderRadius: 3, backgroundColor: alpha(theme.palette.primary.main, 0.1) }}>
                    <Typography variant="h5" fontWeight={800}>
                      Total
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color="primary" sx={{
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      {formatPrice(cart?.totalPrice || 0, cart?.items?.[0]?.currency || 'USD')}
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleCheckout}
                    disabled={checkoutLoading || !cart?.items.length || 
                      !shippingAddress.name || !shippingAddress.address || 
                      !shippingAddress.city || !shippingAddress.country || 
                      !shippingAddress.phone}
                    sx={{ 
                      py: 2,
                      borderRadius: 3,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      textTransform: 'none',
                      '&:hover': {
                        boxShadow: '0 6px 25px rgba(0,0,0,0.2)',
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s ease'
                      },
                      '&:disabled': {
                        background: alpha(theme.palette.primary.main, 0.5),
                        boxShadow: 'none'
                      }
                    }}
                  >
                    {checkoutLoading ? (
                      <CircularProgress size={28} color="inherit" thickness={4} />
                    ) : (
                      <>
                        <Banknote size={24} style={{ marginRight: '12px' }} />
                        Proceed to Secure Checkout
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Shipping Information */}
              <Card sx={{ 
                borderRadius: 4,
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                border: `1px solid ${theme.palette.divider}`,
                background: `linear-gradient(145deg, ${theme.palette.background.paper}, ${alpha(theme.palette.background.paper, 0.8)})`,
              }}>
                <CardHeader 
                  title={
                    <Typography variant="h4" fontWeight={800}>
                      Shipping Information
                    </Typography>
                  }
                  subheader={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Please fill in all required fields before proceeding to checkout
                      </Typography>
                      <Chip 
                        label="Required fields marked with *" 
                        size="small" 
                        color="primary" 
                        variant="outlined" 
                        sx={{ height: '20px' }}
                      />
                    </Box>
                  }
                  avatar={<MapPin size={24} />}
                  sx={{ 
                    pb: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`
                  }}
                />
                <CardContent>
                  <TextField
                    label="Full Name *"
                    fullWidth
                    margin="normal"
                    value={shippingAddress.name}
                    onChange={(e) => setShippingAddress({...shippingAddress, name: e.target.value})}
                    required
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                    helperText={!shippingAddress.name ? "This field is required" : ""}
                    error={!shippingAddress.name}
                  />
                  <TextField
                    label="Email"
                    fullWidth
                    margin="normal"
                    type="email"
                    value={shippingAddress.email}
                    onChange={(e) => setShippingAddress({...shippingAddress, email: e.target.value})}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  />
                  <TextField
                    label="Address *"
                    fullWidth
                    margin="normal"
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                    required
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                    helperText={!shippingAddress.address ? "This field is required" : ""}
                    error={!shippingAddress.address}
                  />
                  <TextField
                    label="City *"
                    fullWidth
                    margin="normal"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                    required
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                    helperText={!shippingAddress.city ? "This field is required" : ""}
                    error={!shippingAddress.city}
                  />
                  <TextField
                    label="State/Province"
                    fullWidth
                    margin="normal"
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  />
                  <TextField
                    label="Country *"
                    fullWidth
                    margin="normal"
                    value={shippingAddress.country}
                    onChange={(e) => setShippingAddress({...shippingAddress, country: e.target.value})}
                    required
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                    helperText={!shippingAddress.country ? "This field is required" : ""}
                    error={!shippingAddress.country}
                  />
                  <TextField
                    label="ZIP/Postal Code"
                    fullWidth
                    margin="normal"
                    value={shippingAddress.zipCode}
                    onChange={(e) => setShippingAddress({...shippingAddress, zipCode: e.target.value})}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  />
                  <TextField
                    label="Phone Number *"
                    fullWidth
                    margin="normal"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                    required
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                    helperText={!shippingAddress.phone ? "This field is required" : ""}
                    error={!shippingAddress.phone}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>

      {/* Order Confirmation Dialog */}
      <Dialog 
        open={openCheckoutDialog} 
        onClose={() => setOpenCheckoutDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{ borderRadius: 3 }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" fontWeight={700}>
              Select Payment Method
            </Typography>
            <IconButton onClick={() => setOpenCheckoutDialog(false)}>
              <X size={24} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Choose your preferred payment method to complete your order.
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              >
                <FormControlLabel
                  value="mobile_money"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone size={18} />
                      <Typography>Mobile Money (MTN, Airtel)</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="card_payment"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CreditCard size={18} />
                      <Typography>Debit/Credit Card</Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="cash_on_delivery"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Home size={18} />
                      <Typography>Cash on Delivery</Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Box>
          
          <Box sx={{ mt: 3, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Secure Payment:</strong> Your payment information is encrypted and processed securely.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setOpenCheckoutDialog(false)}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              py: 1,
              px: 3
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleDirectCheckout(selectedPaymentMethod)} 
            variant="contained"
            disabled={checkoutLoading}
            sx={{ 
              borderRadius: 2,
              py: 1,
              px: 3,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
              }
            }}
          >
            {checkoutLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Confirm Order'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Flutterwave Payment Dialog */}
      <Dialog 
        open={showFlutterwave && !!createdOrderId} 
        onClose={() => setShowFlutterwave(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" fontWeight={700}>
              Complete Payment
            </Typography>
            <IconButton onClick={() => setShowFlutterwave(false)}>
              <X size={24} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {createdOrderId ? (
            <FlutterwaveProductCheckout
              product={{
                _id: createdOrderId,
                name: 'Cart Order',
                price: cart?.totalPrice || 0,
                currency: cart?.items?.[0]?.currency || 'USD'
              }}
              onCompleted={handleFlutterwaveSuccess}
              onError={handleFlutterwaveError}
            />
          ) : (
            <Typography>Loading payment information...</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setShowFlutterwave(false)}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              py: 1,
              px: 3
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Paystack Payment Dialog */}
      <Dialog 
        open={showPaystack && !!createdOrderId} 
        onClose={() => setShowPaystack(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" fontWeight={700}>
              Complete Payment
            </Typography>
            <IconButton onClick={() => setShowPaystack(false)}>
              <X size={24} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {createdOrderId ? (
            <PaystackCartCheckout
              amount={cart?.totalPrice || 0}
              currency={cart?.items?.[0]?.currency || 'USD'}
              email={shippingAddress.email || user?.email || ''}
              onSuccess={handlePaystackSuccess}
              onError={handlePaystackError}
            />
          ) : (
            <Typography>Loading payment information...</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setShowPaystack(false)}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              py: 1,
              px: 3
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default CartPage;