import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import { CreditCard, ArrowLeft } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyAmount } from '@/utils/currencyConverter';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface PaystackProductCheckoutProps {
  product: any;
  onCompleted: (paymentDetails: any) => Promise<void>;
  onError: (error: string) => void;
  onClose: () => void;
}

const PaystackProductCheckout: React.FC<PaystackProductCheckoutProps> = ({ 
  product, 
  onCompleted, 
  onError,
  onClose
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  // Initialize email from user data
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const handlePay = () => {
    if (!email) {
      const emailError = 'Email address is required for payment processing.';
      setError(emailError);
      onError(emailError);
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

    try {
      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: email,
        amount: Math.round(product.price * 100), // amount in kobo/cents
        currency: product.currency?.toUpperCase() || 'NGN',
        callback: async (response: any) => {
          setLoading(true);
          try {
            await onCompleted({
              reference: response.reference,
              amount: product.price,
              currency: product.currency?.toUpperCase() || 'NGN',
            });
          } catch (e: any) {
            setError(e.message || 'Payment confirmation failed.');
            onError(e.message || 'Payment confirmation failed.');
          } finally {
            setLoading(false);
          }
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
        Payment with Paystack
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