import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  TextField
} from '@mui/material';
import { CreditCard, ArrowLeft, Phone } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyAmount } from '@/utils/currencyConverter';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface PaystackProductCheckoutProps {
  product: any;
  paymentMethod?: string;
  phoneNumber?: string;
  email?: string;
  onCompleted: (paymentDetails: any) => Promise<void>;
  onError: (error: string) => void;
  onClose: () => void;
}

const PaystackProductCheckout: React.FC<PaystackProductCheckoutProps> = ({ 
  product, 
  paymentMethod,
  phoneNumber,
  email: initialEmail,
  onCompleted, 
  onError,
  onClose
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail || '');
  const [phone, setPhone] = useState(phoneNumber || '');

  // Initialize email from user data if not provided
  useEffect(() => {
    if (user?.email && !initialEmail) {
      setEmail(user.email);
    }
    if (!phone && (user as any)?.phoneNumber) {
      setPhone((user as any).phoneNumber);
    }
  }, [user, phone, initialEmail]);

  const handlePay = () => {
    if (!email) {
      const emailError = 'Email address is required for payment processing.';
      setError(emailError);
      onError(emailError);
      return;
    }

    if (['mobile_money', 'airtel_money'].includes(paymentMethod || '') && !phone) {
      const phoneError = 'Mobile number is required for this payment method.';
      setError(phoneError);
      return;
    }

    setLoading(true);
    setError(null);

    const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

    if (!paystackPublicKey) {
      const configError = 'Paystack public key is not configured.';
      setError(configError);
      onError(configError);
      setLoading(false);
      return;
    }

    // Determine channels based on paymentMethod
    let channels = ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'];
    if (paymentMethod === 'mobile_money' || paymentMethod === 'airtel_money') {
      channels = ['mobile_money'];
    } else if (paymentMethod === 'card_payment') {
      channels = ['card'];
    }

    try {
      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: email,
        phone: phone,
        amount: Math.round(product.price * 100), // amount in kobo/cents
        currency: product.currency?.toUpperCase() || 'NGN',
        channels: channels,
        callback: (response: any) => {
          setLoading(true);
          onCompleted({
            reference: response.reference,
            amount: product.price,
            currency: product.currency?.toUpperCase() || 'NGN',
          }).catch((e: any) => {
            setError(e.message || 'Payment confirmation failed.');
            onError(e.message || 'Payment confirmation failed.');
          }).finally(() => {
            setLoading(false);
          });
        },
        onClose: () => {
          setLoading(false);
        },
        metadata: {
          custom_fields: [
            {
              display_name: "Product ID",
              variable_name: "product_id",
              value: product._id || product.id
            },
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: user?.id || "anonymous"
            }
          ]
        }
      });

      handler.openIframe();
    } catch (e: any) {
      console.error('Paystack initialization error:', e);
      setError('Could not open payment window. Please try again.');
      onError('Could not open payment window. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
        Payment with Card
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'left' }}>
        {product.images && product.images.length > 0 && (
          <Box
            component="img"
            src={
              typeof product.images[0] === 'string' 
                ? product.images[0] 
                : product.images[0]?.secure_url || product.images[0]?.url
            }
            alt={product.name}
            sx={{ 
              width: 60, 
              height: 60, 
              objectFit: 'contain',
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`
            }}
          />
        )}
        <Box>
          <Typography variant="h6" fontWeight={600} noWrap sx={{ maxWidth: 200 }}>
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatCurrencyAmount(product.price, product.currency)}
          </Typography>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CreditCard fontSize="small" color="primary" />
          Email Address
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          variant="outlined"
          required
          helperText="Where your receipt will be sent"
        />
      </Box>

      {['mobile_money', 'airtel_money'].includes(paymentMethod || '') && (
        <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
          <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Phone fontSize="small" color="primary" />
            Payment Phone Number
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Mobile Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 07..."
            variant="outlined"
            required
            helperText="The mobile money account to be charged"
          />
        </Box>
      )}

      <Box sx={{ mb: 4, p: 3, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.1) }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">Total Amount</Typography>
        <Typography variant="h4" fontWeight={700} color="primary.main">
          {formatCurrencyAmount(product.price, product.currency)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          startIcon={<ArrowLeft />}
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          sx={{ py: 1.5, borderRadius: 2, flex: 1 }}
        >
          Cancel
        </Button>
        <Button
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CreditCard />}
          onClick={handlePay}
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading}
          sx={{ py: 1.5, borderRadius: 2, flex: 2, fontWeight: 600 }}
        >
          {loading ? 'Processing...' : 'Pay Now'}
        </Button>
      </Box>
      
      <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary' }}>
        Secured by Paystack. Your card details are never stored on our servers.
      </Typography>
    </Box>
  );
};

export default PaystackProductCheckout;