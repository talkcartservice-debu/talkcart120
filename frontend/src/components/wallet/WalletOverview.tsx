import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Button,
  Skeleton,
  Fade,
  Grow,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Wallet,
  Send,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  Copy,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWallet from '@/hooks/useWallet';
import toast from 'react-hot-toast';

interface WalletOverviewProps {
  onSendClick: () => void;
  onReceiveClick: () => void;
}

const WalletOverview: React.FC<WalletOverviewProps> = ({
  onSendClick,
  onReceiveClick,
}) => {
  const theme = useTheme();
  const { portfolio, loading, address } = useWallet();
  const [showBalance, setShowBalance] = useState(true);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard!');
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? theme.palette.success.main : theme.palette.error.main;
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  };

  if (loading && !portfolio) {
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="text" width="60%" height={48} sx={{ my: 2 }} />
          <Skeleton variant="text" width="30%" height={24} />
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
            <Skeleton variant="text" width="50%" height={24} />
            <Box display="flex" gap={2}>
              <Skeleton variant="rectangular" width={80} height={36} />
              <Skeleton variant="rectangular" width={80} height={36} />
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!portfolio) {
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Wallet size={64} color={theme.palette.text.secondary} />
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
            No Wallet Connected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect your wallet to view your portfolio
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card 
        sx={{ 
          mb: 4, 
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            backgroundImage: `radial-gradient(circle at 20% 50%, ${theme.palette.common.white} 1px, transparent 1px),
                             radial-gradient(circle at 80% 50%, ${theme.palette.common.white} 1px, transparent 1px)`,
            backgroundSize: '100px 100px',
          }}
        />

        <CardContent sx={{ color: 'white', p: 4, position: 'relative' }}>
          <Box display="flex" justifyContent="space-between" alignItems="start" mb={3}>
            <Box>
              <Typography variant="h6" sx={{ opacity: 0.9 }} gutterBottom>
                Total Portfolio Value
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={showBalance ? 'visible' : 'hidden'}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Typography variant="h3" fontWeight={700}>
                      {showBalance 
                        ? `$${portfolio.reduce((sum, token) => sum + token.value, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                        : '••••••'
                      }
                    </Typography>
                  </motion.div>
                </AnimatePresence>
                <IconButton
                  onClick={() => setShowBalance(!showBalance)}
                  sx={{ color: 'white' }}
                >
                  {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
                </IconButton>
              </Box>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {showBalance ? `${portfolio.reduce((sum, token) => sum + parseFloat(token.balance), 0).toFixed(4)} ETH` : '•••• ETH'}
                </Typography>
                <Box 
                  display="flex" 
                  alignItems="center" 
                  gap={0.5}
                  sx={{ color: getChangeColor(0) }}
                >
                  {getChangeIcon(0)}
                  <Typography variant="caption" fontWeight={600}>
                    0.00%
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Box display="flex" gap={1}>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <IconButton 
                  sx={{ color: 'white' }}
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw size={20} />
                </IconButton>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <IconButton sx={{ color: 'white' }}>
                  <Shield size={20} />
                </IconButton>
              </motion.div>
            </Box>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <Wallet size={16} />
              <Typography variant="body2">
                {address ? formatAddress(address) : 'No wallet connected'}
              </Typography>
              <motion.div
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
              >
                <IconButton
                  size="small"
                  onClick={() => address && copyToClipboard(address)}
                  sx={{ color: 'white' }}
                  disabled={!address}
                >
                  <Copy size={14} />
                </IconButton>
              </motion.div>
            </Box>

            <Box display="flex" gap={2}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="contained"
                  startIcon={<Send size={16} />}
                  onClick={onSendClick}
                  sx={{
                    bgcolor: alpha(theme.palette.common.white, 0.2),
                    color: 'white',
                    '&:hover': { 
                      bgcolor: alpha(theme.palette.common.white, 0.3),
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[8],
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  Send
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="contained"
                  startIcon={<Download size={16} />}
                  onClick={onReceiveClick}
                  sx={{
                    bgcolor: alpha(theme.palette.common.white, 0.2),
                    color: 'white',
                    '&:hover': { 
                      bgcolor: alpha(theme.palette.common.white, 0.3),
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[8],
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  Receive
                </Button>
              </motion.div>
            </Box>
          </Box>

          {/* Last Updated */}
          <Box mt={2} display="flex" justifyContent="center">
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Last updated: {new Date().toLocaleTimeString()}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default WalletOverview;