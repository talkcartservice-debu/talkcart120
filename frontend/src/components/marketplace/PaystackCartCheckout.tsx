import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  useTheme
} from '@mui/material';
import { CreditCard } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface PaystackCartCheckoutProps {
  amount: number;
  currency: string;
  email: string;
  onSuccess: (reference: string) => Promise<void>;
  onError: (error: string) => void;
}

const PaystackCartCheckout: React.FC<PaystackCartCheckoutProps> = ({ 
  amount,
  currency,
  email: initialEmail,
  onSuccess,
  onError
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail);

  // Initialize email from user data
  useEffect(() => {
    if (user?.email && !initialEmail) {
      setEmail(user.email);
    }
  }, [user, initialEmail]);

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
        amount: Math.round(amount * 100), // amount in kobo/cents
        currency: currency?.toUpperCase() || 'NGN',
        callback: (response: any) => {
          setLoading(true);
          onSuccess(response.reference)
            .catch((e: any) => {
              setError(e.message || 'Payment confirmation failed.');
              onError(e.message || 'Payment confirmation failed.');
            })
            .finally(() => {
              setLoading(false);
            });
        },
        onClose: () => {
          setLoading(false);
          toast.info('Payment window closed.');
        },
        metadata: {
          custom_fields: [
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
      
      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
        You will be redirected to Paystack&apos;s secure payment page to complete your transaction.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 4, p: 3, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.1) }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">Total Amount</Typography>
        <Typography variant="h4" fontWeight={700} color="primary.main">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
          }).format(amount)}
        </Typography>
      </Box>

      <Button
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CreditCard />}
        onClick={handlePay}
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        disabled={loading}
        sx={{ py: 1.5, borderRadius: 2, fontSize: '1.1rem', fontWeight: 600 }}
      >
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </Button>
      
      <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary' }}>
        Secured by Paystack. Your card details are never stored on our servers.
      </Typography>
    </Box>
  );
};

// Helper for alpha colors since it's not imported
const alpha = (color: string, opacity: number) => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// Mock toast if not imported
const toast = {
  info: (msg: string) => console.log('Toast Info:', msg)
};

export default PaystackCartCheckout;