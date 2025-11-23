import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  useTheme
} from '@mui/material';
import { CreditCard, ArrowLeft } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyAmount } from '@/utils/currencyConverter';

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
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  // Initialize email from user data
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Generate unique transaction reference
  const generateReference = () => {
    return `talkcart-product-${product._id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
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
      
      const response = await fetch('/api/payments/paystack/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: product.price * 100, // Convert to kobo (smallest currency unit)
          email,
          currency: product.currency?.toUpperCase() || 'NGN',
          reference,
          metadata: {
            productId: product._id,
            productName: product.name,
            userId: user?.id, // Use 'id' instead of 'userId' to match User type definition
          }
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // For demo purposes, we'll simulate a successful payment
      // In a real implementation, you would redirect to Paystack's payment page
      // or use their inline payment widget
      
      // Simulate successful payment after a short delay
      setTimeout(async () => {
        await onCompleted({
          reference: data.data.reference || reference,
          amount: product.price,
          currency: product.currency?.toUpperCase() || 'NGN',
        });
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

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
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
        <Box>
          <Typography variant="h6" fontWeight={600}>
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatCurrencyAmount(product.price, product.currency)}
          </Typography>
        </Box>
      </Box>

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
            {formatCurrencyAmount(product.price, product.currency)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          startIcon={<ArrowLeft />}
          onClick={onClose}
          variant="outlined"
          disabled={loading}
        >
          Back
        </Button>
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
    </Box>
  );
};

export default PaystackProductCheckout;