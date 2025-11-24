import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Wallet,
  Shield,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWallet from '@/hooks/useWallet';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface WalletConnectDialogProps {
  open: boolean;
  onClose: () => void;
}

const WalletConnectDialog: React.FC<WalletConnectDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { connect, isConnected, address, loading } = useWallet();
  const { user } = useAuth();
  const [step, setStep] = useState<'select' | 'connecting' | 'signing' | 'success'>('select');
  const [error, setError] = useState<string | null>(null);

  const handleConnectMetaMask = async () => {
    try {
      setStep('connecting');
      setError(null);

      // Connect to MetaMask
      await connect();
      
      if (!isConnected) {
        setError('Failed to connect to MetaMask');
        setStep('select');
        return;
      }

      setStep('signing');

      // Create message to sign for authentication
      const message = `Welcome to TalkCart!

Please sign this message to verify your wallet ownership.

Wallet: ${address}
Timestamp: ${Date.now()}`;

      // Mock signing - in real app, this would use web3 to sign
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update user with wallet address
      if (address && user) {
        // Call backend to associate wallet with user
        try {
          const response = await fetch('/api/auth/wallet', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify({
              walletAddress: address,
              message,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to associate wallet with account');
          }

          const data = await response.json();
          if (!data.success) {
            throw new Error(data.message || 'Failed to associate wallet');
          }
        } catch (err) {
          console.error('Error associating wallet:', err);
          toast.error('Wallet connected but failed to associate with account');
        }
      }

      setStep('success');
      toast.success('Wallet connected successfully!');
      
      // Close dialog after a delay
      setTimeout(() => {
        onClose();
        setStep('select');
      }, 2000);

    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      setStep('select');
    }
  };

  const handleClose = () => {
    if (step !== 'connecting' && step !== 'signing') {
      onClose();
      setStep('select');
      setError(null);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
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
            <Wallet size={24} color={theme.palette.primary.main} />
          </motion.div>
          <Typography variant="h6">Connect Your Wallet</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <AnimatePresence mode="wait">
          {/* Step 1: Select Wallet */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Box display="flex" flexDirection="column" gap={3}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Connect your wallet to access Web3 features, manage your crypto assets, and interact with NFTs.
                </Typography>

                {error && (
                  <Alert severity="error" icon={<AlertTriangle size={20} />}>
                    {error}
                  </Alert>
                )}

                {/* MetaMask Option */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      border: '2px solid transparent',
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        boxShadow: theme.shadows[8],
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                    onClick={handleConnectMetaMask}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={3}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #f6851b, #e2761b)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                          }}
                        >
                          🦊
                        </Box>
                        <Box flex={1}>
                          <Typography variant="h6" gutterBottom>
                            MetaMask
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Connect using browser wallet
                          </Typography>
                        </Box>
                        <ExternalLink size={20} color={theme.palette.text.secondary} />
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Security Notice */}
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    borderRadius: 1,
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  }}
                >
                  <Box display="flex" alignItems="start" gap={2}>
                    <Shield size={20} color={theme.palette.info.main} />
                    <Box>
                      <Typography variant="subtitle2" color="info.main" gutterBottom>
                        Security Notice
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        TalkCart will never ask for your private keys or seed phrase. 
                        Only connect wallets you trust and verify the URL before signing any transactions.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </motion.div>
          )}

          {/* Step 2: Connecting */}
          {step === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Box display="flex" flexDirection="column" alignItems="center" gap={3} py={4}>
                <CircularProgress size={64} />
                <Typography variant="h6">Connecting to MetaMask</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Please check your MetaMask extension and approve the connection request.
                </Typography>
              </Box>
            </motion.div>
          )}

          {/* Step 3: Signing */}
          {step === 'signing' && (
            <motion.div
              key="signing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Box display="flex" flexDirection="column" alignItems="center" gap={3} py={4}>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Shield size={64} color={theme.palette.primary.main} />
                </motion.div>
                <Typography variant="h6">Sign Message</Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Please sign the message in your wallet to verify ownership. 
                  This is free and doesn&apos;t require any gas fees.
                </Typography>
              </Box>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <Box display="flex" flexDirection="column" alignItems="center" gap={3} py={4}>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1 }}
                >
                  <CheckCircle size={64} color={theme.palette.success.main} />
                </motion.div>
                <Typography variant="h6" color="success.main">
                  Wallet Connected!
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Your wallet has been successfully connected to TalkCart. 
                  You can now access all Web3 features.
                </Typography>
                {address && (
                  <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </Typography>
                )}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        {step === 'select' && (
          <Button onClick={handleClose} disabled={step !== 'select'}>
            Cancel
          </Button>
        )}
        {(step === 'connecting' || step === 'signing') && (
          <Typography variant="body2" color="text.secondary">
            Please complete the action in your wallet...
          </Typography>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WalletConnectDialog;