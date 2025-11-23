import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Typography,
  Button,
  Skeleton,
  useTheme,
  alpha,
  Fade,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Send,
  Repeat,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWallet, { TokenBalance } from '@/hooks/useWallet';

interface TokenListProps {
  onSendToken: (token: TokenBalance) => void;
  onSwapToken: (token: TokenBalance) => void;
}

const TokenList: React.FC<TokenListProps> = ({ onSendToken, onSwapToken }) => {
  const theme = useTheme();
  const { portfolio, loading } = useWallet();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const getChangeColor = (change: number) => {
    return change >= 0 ? theme.palette.success.main : theme.palette.error.main;
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  };

  if (loading && !portfolio) {
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Asset</TableCell>
              <TableCell align="right">Balance</TableCell>
              <TableCell align="right">Value</TableCell>
              <TableCell align="right">24h Change</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(3)].map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Box>
                      <Skeleton variant="text" width={60} />
                      <Skeleton variant="text" width={100} />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Skeleton variant="text" width={80} />
                </TableCell>
                <TableCell align="right">
                  <Skeleton variant="text" width={80} />
                </TableCell>
                <TableCell align="right">
                  <Skeleton variant="text" width={60} />
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    <Skeleton variant="rectangular" width={60} height={32} />
                    <Skeleton variant="rectangular" width={60} height={32} />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (!portfolio || portfolio.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Tokens Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your token balances will appear here once detected
        </Typography>
      </Box>
    );
  }

  // Include ETH as the first token
  const allTokens = [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      balance: '0',
      value: 0,
      change24h: 0,
      icon: '⟠',
    },
    ...portfolio,
  ];

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Asset</TableCell>
            <TableCell align="right">Balance</TableCell>
            <TableCell align="right">Value</TableCell>
            <TableCell align="right">24h Change</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <AnimatePresence>
            {allTokens.map((token, index) => (
              <TableRow
                key={token.symbol}
                component={motion.tr}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onMouseEnter={() => setHoveredRow(token.symbol)}
                onMouseLeave={() => setHoveredRow(null)}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        }}
                      >
                        {token.icon}
                      </Box>
                    </motion.div>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {token.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {token.name}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <motion.div
                    animate={hoveredRow === token.symbol ? { scale: 1.05 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {parseFloat(token.balance).toLocaleString(undefined, {
                        minimumFractionDigits: token.symbol === 'ETH' ? 4 : 2,
                        maximumFractionDigits: token.symbol === 'ETH' ? 4 : 2,
                      })}
                    </Typography>
                  </motion.div>
                </TableCell>
                <TableCell align="right">
                  <motion.div
                    animate={hoveredRow === token.symbol ? { scale: 1.05 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      ${token.value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      $0.00
                    </Typography>
                  </motion.div>
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                    <motion.div
                      animate={hoveredRow === token.symbol ? { scale: 1.2 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                      style={{ color: getChangeColor(token.change24h) }}
                    >
                      {getChangeIcon(token.change24h)}
                    </motion.div>
                    <Typography
                      variant="body2"
                      color={getChangeColor(token.change24h)}
                      fontWeight={600}
                    >
                      {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Fade in={hoveredRow === token.symbol} timeout={200}>
                    <Box display="flex" gap={1} justifyContent="flex-end">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Send size={14} />}
                          onClick={() => onSendToken(token)}
                          sx={{
                            minWidth: 'auto',
                            px: 1.5,
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: theme.shadows[4],
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
                          size="small"
                          variant="outlined"
                          startIcon={<Repeat size={14} />}
                          onClick={() => onSwapToken(token)}
                          sx={{
                            minWidth: 'auto',
                            px: 1.5,
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: theme.shadows[4],
                            },
                            transition: 'all 0.2s ease-in-out',
                          }}
                        >
                          Swap
                        </Button>
                      </motion.div>
                    </Box>
                  </Fade>
                </TableCell>
              </TableRow>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TokenList;