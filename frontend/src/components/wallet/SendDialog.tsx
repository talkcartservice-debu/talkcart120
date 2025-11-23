import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  MenuItem,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Fade,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Send,
  AlertTriangle,
  CheckCircle,
  Loader,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWallet, { TokenBalance, GasEstimate } from '@/hooks/useWallet';
import toast from 'react-hot-toast';

interface SendDialogProps {
  open: boolean;
  onClose: () => void;
  selectedToken?: TokenBalance;
}

const SendDialog: React.FC<SendDialogProps> = ({ open, onClose, selectedToken }) => {
  const theme = useTheme();
  const { portfolio, balance, estimateGas, sendTransaction, loading } = useWallet();
  
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    to: '',
    amount: '',
    token: selectedToken?.symbol || 'ETH',
  });
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [estimatingGas, setEstimatingGas] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = ['Enter Details', 'Review Transaction', 'Confirm & Send'];

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setFormData({
        to: '',
        amount: '',
        token: selectedToken?.symbol || 'ETH',
      });
      setGasEstimate(null);
      setErrors({});
    }
  }, [open, selectedToken]);

  // Get available tokens
  const availableTokens = portfolio ? [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      balance: parseFloat(balance || '0'),
      value: 0,
      change24h: 0,
      icon: '⟠',
    },
    ...portfolio.map(token => ({
      symbol: token.symbol,
      name: token.name,
      balance: parseFloat(token.balance),
      value: token.value,
      change24h: token.change24h,
      icon: token.icon,
    })),
  ] : [];

  const selectedTokenData = availableTokens.find(token => token.symbol === formData.token);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.to) {
      newErrors.to = 'Recipient address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.to)) {
      newErrors.to = 'Invalid Ethereum address';
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      } else if (selectedTokenData && amount > selectedTokenData.balance) {
        newErrors.amount = 'Insufficient balance';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = async () => {
    if (activeStep === 0) {
      if (!validateForm()) return;
      
      // Estimate gas
      setEstimatingGas(true);
      try {
        const estimate = await estimateGas(
          formData.to,
          formData.amount,
          formData.token
        );
        setGasEstimate(estimate);
        setActiveStep(1);
      } catch (error) {
        toast.error('Failed to estimate gas fees');
      } finally {
        setEstimatingGas(false);
      }
    } else if (activeStep === 1) {
      setActiveStep(2);
    }
  };

  // Handle back step
  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  // Handle send transaction
  const handleSend = async () => {
    try {
      const success = await sendTransaction(
        formData.to,
        formData.amount,
        formData.token
      );

      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Send transaction error:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)}, ${alpha(theme.palette.background.default, 0.95)})`,
          backdropFilter: 'blur(10px)',
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Send size={24} color={theme.palette.primary.main} />
          </motion.div>
          <Typography variant="h6">Send Cryptocurrency</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <AnimatePresence mode="wait">
          {/* Step 1: Enter Details */}
          {activeStep === 0 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Box display="flex" flexDirection="column" gap={3}>
                <TextField
                  fullWidth
                  label="Recipient Address"
                  placeholder="0x..."
                  value={formData.to}
                  onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                  error={!!errors.to}
                  helperText={errors.to}
                />

                <TextField
                  fullWidth
                  select
                  label="Token"
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                >
                  {availableTokens.map((token) => (
                    <MenuItem key={token.symbol} value={token.symbol}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography fontSize="1.2rem">{token.icon}</Typography>
                        <Box>
                          <Typography variant="body2">{token.symbol}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Balance: {token.balance.toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  error={!!errors.amount}
                  helperText={errors.amount || (selectedTokenData && `Available: ${selectedTokenData.balance.toLocaleString()} ${formData.token}`)}
                  InputProps={{
                    endAdornment: (
                      <Typography variant="body2" color="text.secondary">
                        {formData.token}
                      </Typography>
                    ),
                  }}
                />

                {selectedTokenData && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Available Balance
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setFormData({ ...formData, amount: selectedTokenData.balance.toString() })}
                    >
                      Use Max
                    </Button>
                  </Box>
                )}
              </Box>
            </motion.div>
          )}

          {/* Step 2: Review Transaction */}
          {activeStep === 1 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Box display="flex" flexDirection="column" gap={3}>
                <Alert severity="info" icon={<AlertTriangle size={20} />}>
                  Please review your transaction details carefully before proceeding.
                </Alert>

                <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Transaction Summary</Typography>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">To:</Typography>
                    <Typography variant="body2" fontFamily="monospace">
                      {formatAddress(formData.to)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2" color="text.secondary">Amount:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formData.amount} {formData.token}
                    </Typography>
                  </Box>

                  {gasEstimate && (
                    <>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">Gas Fee:</Typography>
                        <Typography variant="body2">
                          {parseFloat(gasEstimate.estimatedFee).toFixed(6)} ETH
                        </Typography>
                      </Box>
                      
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Gas Fee (USD):</Typography>
                        <Typography variant="body2">
                          ~${(parseFloat(gasEstimate.estimatedFee) * 2000).toFixed(2)}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>

                {estimatingGas && (
                  <Box display="flex" alignItems="center" gap={2} justifyContent="center" py={2}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Estimating gas fees...</Typography>
                  </Box>
                )}
              </Box>
            </motion.div>
          )}

          {/* Step 3: Confirm & Send */}
          {activeStep === 2 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Box display="flex" flexDirection="column" gap={3} textAlign="center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <CheckCircle size={64} color={theme.palette.success.main} />
                </motion.div>
                
                <Typography variant="h6">Ready to Send</Typography>
                <Typography variant="body2" color="text.secondary">
                  Click the button below to broadcast your transaction to the blockchain.
                  This action cannot be undone.
                </Typography>

                {loading && (
                  <Box display="flex" alignItems="center" gap={2} justifyContent="center">
                    <Loader className="animate-spin" size={20} />
                    <Typography variant="body2">Broadcasting transaction...</Typography>
                  </Box>
                )}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        
        {activeStep < 2 ? (
          <Button 
            variant="contained" 
            onClick={handleNext}
            disabled={estimatingGas}
          >
            {estimatingGas ? 'Estimating...' : 'Next'}
          </Button>
        ) : (
          <Button 
            variant="contained" 
            onClick={handleSend}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <Send size={16} />}
          >
            {loading ? 'Sending...' : 'Send Transaction'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SendDialog;