import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  Typography, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  FormLabel, 
  Alert, 
  CircularProgress, 
  useTheme,
  TextField,
  alpha
} from '@mui/material';
import { CreditCard, Phone, ArrowLeft, AccountBalanceWallet } from '@mui/icons-material';
import { useWeb3 } from '@/contexts/Web3Context';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyAmount } from '@/utils/currencyConverter';
import PaystackProductCheckout from './PaystackProductCheckout';

interface BuyModalProps {
  open: boolean;
  onClose: () => void;
  product: any;
  onPurchase: (paymentMethod: 'crypto' | 'nft' | 'paystack' | 'mobile_money' | 'airtel_money' | 'bank_transfer' | 'cash_on_delivery' | 'card_payment', paymentDetails?: any) => Promise<void>;
  purchasing: boolean;
}

const BuyModal: React.FC<BuyModalProps> = ({ open, onClose, product, onPurchase, purchasing }) => {
  const theme = useTheme();
  const { connected, account } = useWeb3();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'nft' | 'paystack' | 'mobile_money' | 'airtel_money' | 'bank_transfer' | 'cash_on_delivery' | 'card_payment'>('card_payment');
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState((user as any)?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');

  // Update fields if user data becomes available
  React.useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
    if ((user as any)?.phoneNumber && !phoneNumber) {
      setPhoneNumber((user as any).phoneNumber);
    }
  }, [user, email, phoneNumber]);

  const handlePurchase = async () => {
    try {
      setError(null);
      
      // For NFTs, we need wallet connection
      if (product.isNFT) {
        if (!connected) {
          setError('Please connect your wallet to buy NFTs');
          return;
        }
        await onPurchase('nft');
      } else {
        // For regular products, use the selected payment method
        if (['card_payment', 'mobile_money', 'airtel_money', 'paystack'].includes(paymentMethod)) {
          // Validation for card payment
          if (paymentMethod === 'card_payment' && !email) {
            setError('Please provide your email address for payment');
            return;
          }
          // Validation for mobile money
          if (['mobile_money', 'airtel_money'].includes(paymentMethod)) {
            if (!phoneNumber) {
              setError('Please provide your mobile number for payment');
              return;
            }
            if (!email) {
              setError('Please provide your email address for payment');
              return;
            }
          }
          // For Paystack payments, we need to initialize the payment and process it
          setProcessing(true);
          await processPaystackPayment();
        } else if (paymentMethod === 'crypto') {
          if (!txHash || !senderAddress) {
            setError('Please provide transaction hash and sender address for crypto payment');
            return;
          }
          await onPurchase('crypto', { txHash, from: senderAddress });
        } else {
          // For other payment methods, proceed directly
          await onPurchase(paymentMethod);
        }
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || 'Failed to process purchase. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const processPaystackPayment = async () => {
    try {
      // Set the payment data to trigger the Paystack checkout component
      setPaymentData({
        productId: product._id,
        product: product,
        paymentMethod: paymentMethod,
        phoneNumber: phoneNumber,
        email: email
      });
    } catch (err: any) {
      console.error('Paystack payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    }
  };

  const handlePaystackCompleted = async (paymentDetails: any) => {
    try {
      // For Paystack, we need to pass the payment details to complete the purchase
      await onPurchase('paystack', paymentDetails);
      // Close the modal
      onClose();
    } catch (err: any) {
      console.error('Paystack completion error:', err);
      const errorMessage = err.message || 'Failed to complete payment. Please try again.';
      setError(errorMessage);
    } finally {
      setPaymentData(null);
    }
  };

  const handlePaystackError = (error: string) => {
    setError(error);
    setPaymentData(null);
  };

  // If we're processing a payment, show the appropriate checkout component
  if (paymentData) {
    return (
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="sm" 
        fullWidth
        disableEnforceFocus  // Prevents focus trapping issues
        hideBackdrop={false}  // Ensure backdrop is properly handled
      >
        <DialogContent>
          <PaystackProductCheckout
            product={paymentData.product}
            paymentMethod={paymentData.paymentMethod}
            phoneNumber={paymentData.phoneNumber}
            email={paymentData.email}
            onCompleted={handlePaystackCompleted}
            onError={handlePaystackError}
            onClose={() => setPaymentData(null)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      disableEnforceFocus  // Prevents focus trapping issues
      hideBackdrop={false}  // Ensure backdrop is properly handled
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight={600}>
          Complete Your Purchase
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
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
            <Typography variant="h6" fontWeight={600}>
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

        <FormControl component="fieldset" sx={{ width: '100%' }}>
          <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
            Payment Method
          </FormLabel>
          <RadioGroup
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
          >
            {!product.isNFT && (
              <>
                <FormControlLabel
                  value="card_payment"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CreditCard fontSize="small" />
                      <span>Card Payment</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="mobile_money"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" />
                      <span>Mobile Money</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="airtel_money"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone fontSize="small" />
                      <span>Airtel Money</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="crypto"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalanceWallet fontSize="small" />
                      <span>Crypto Payment</span>
                    </Box>
                  }
                />
              </>
            )}
            {product.isNFT && (
              <FormControlLabel
                value="nft"
                control={<Radio />}
                label="NFT Purchase (Wallet Required)"
              />
            )}
          </RadioGroup>
        </FormControl>

        {['card_payment', 'mobile_money', 'airtel_money'].includes(paymentMethod) && (
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2, p: 2, border: `1px solid ${theme.palette.primary.main}`, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <Typography variant="subtitle2" fontWeight={600} color="primary">
              {paymentMethod === 'card_payment' ? 'Payment Details Required' : 'Mobile Money Details Required'}
            </Typography>
            
            <TextField
              fullWidth
              label="Email Address"
              variant="outlined"
              size="small"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              helperText="Required for payment receipt"
              sx={{ bgcolor: 'background.paper' }}
            />

            {['mobile_money', 'airtel_money'].includes(paymentMethod) && (
              <TextField
                fullWidth
                label="Mobile Number"
                variant="outlined"
                size="small"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 07..."
                required
                helperText="Enter the number to be charged"
                sx={{ bgcolor: 'background.paper' }}
              />
            )}
          </Box>
        )}

        {paymentMethod === 'crypto' && (
          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              Crypto Payment Details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Please send {formatCurrencyAmount(product.price, product.currency)} to our corporate wallet and provide the details below.
            </Typography>
            <TextField
              fullWidth
              label="Transaction Hash"
              variant="outlined"
              size="small"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x..."
              required
            />
            <TextField
              fullWidth
              label="Your Wallet Address"
              variant="outlined"
              size="small"
              value={senderAddress}
              onChange={(e) => setSenderAddress(e.target.value)}
              placeholder="0x..."
              required
            />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={processing || purchasing}>
          Cancel
        </Button>
        <Button 
          onClick={handlePurchase} 
          variant="contained" 
          color="primary"
          disabled={processing || purchasing}
          startIcon={processing || purchasing ? <CircularProgress size={20} /> : null}
        >
          {processing || purchasing ? 'Processing...' : 'Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BuyModal;