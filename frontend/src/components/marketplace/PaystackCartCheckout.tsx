import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  useTheme
} from '@mui/material';
import { CreditCard, ArrowLeft } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface PaystackCartCheckoutProps {
  amount: number;
  currency: string;
  email: string;
  onSuccess: (reference: string) => Promise<void>;
  onError: (error: string) => void;
}

interface PaymentResponse {
  success: boolean;
  error?: string;
  data?: {
    reference: string;
  };
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
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  // Initialize email from user data
  useEffect(() => {
    if (user?.email && !initialEmail) {
      setEmail(user.email);
    }
  }, [user, initialEmail]);

  // Generate unique transaction reference
  const generateReference = () => {
    return `talkcart-cart-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  };

  const handlePay = async () => {
    // Validate inputs
    if (!email) {
      const emailError = 'Email address is required for payment processing.';
      setError(emailError);
      onError(emailError);
      return;
    }

    if (!cardNumber || !expiryDate || !cvv) {
      const cardError = 'Please fill in all card details.';
      setError(cardError);
      onError(cardError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Initialize Paystack payment
      const reference = generateReference();
      
      const response = await api.post('/payments/paystack/init', {
        amount: amount * 100, // Convert to kobo (smallest currency unit)
        email,
        currency: currency?.toUpperCase() || 'NGN',
        reference,
        metadata: {
          cartPayment: true,
          userId: user?.id,
        }
      }) as PaymentResponse;

      if (!response.success) {
        throw new Error(response.error || 'Failed to initialize payment');
      }

      // For demo purposes, we'll simulate a successful payment
      // In a real implementation, you would redirect to Paystack's payment page
      // or use their inline payment widget
      
      // Simulate successful payment after a short delay
      setTimeout(async () => {
        await onSuccess(response.data?.reference || reference);
        setLoading(false);
      }, 2000);
      
    } catch (e: any) {
      console.error('Paystack payment error:', e);
      const errorMessage = e?.message || 'Failed to initialize payment. Please try again.';
      setError(errorMessage);
      onError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
        Card Payment
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        label="Email"
        type="email"
        fullWidth
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
        disabled={!!user?.email}
      />

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Card Details
        </Typography>
        <TextField
          label="Card Number"
          fullWidth
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
          sx={{ mb: 2 }}
        />
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Expiry Date"
            placeholder="MM/YY"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value.replace(/\D/g, '').slice(0, 4))}
            sx={{ flex: 1 }}
          />
          <TextField
            label="CVV"
            placeholder="123"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
            sx={{ flex: 1 }}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
        <Box>
          <Typography variant="subtitle2">Total Amount</Typography>
          <Typography variant="h6" color="primary">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency || 'USD',
            }).format(amount)}
          </Typography>
        </Box>
      </Box>

      <Button
        startIcon={loading ? <CircularProgress size={20} /> : <CreditCard />}
        onClick={handlePay}
        variant="contained"
        color="primary"
        fullWidth
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </Button>
    </Box>
  );
};

export default PaystackCartCheckout;