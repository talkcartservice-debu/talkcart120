import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Wallet,
  Send,
  Download,
  Plus,
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  QrCode,
  History,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import useWallet, { TokenBalance } from '@/hooks/useWallet';
import WalletOverview from '@/components/wallet/WalletOverview';
import TokenList from '@/components/wallet/TokenList';
import SendDialog from '@/components/wallet/SendDialog';
import WalletConnectDialog from '@/components/wallet/WalletConnectDialog';
import toast from 'react-hot-toast';

export default function EnhancedWalletPage() {
  const theme = useTheme();
  const { user } = useAuth();
  const { portfolio, transactions, nfts, loading, error, hasWallet, address } = useWallet();
  const [activeTab, setActiveTab] = useState(0);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenBalance | undefined>();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Ensure newValue is always a number and within valid range
    const tabValue = typeof newValue === 'string' ? parseInt(newValue, 10) : newValue;
    const validTabValue = isNaN(tabValue) ? 0 : Math.max(0, Math.min(3, tabValue)); // 0-3 for 4 tabs
    setActiveTab(validTabValue);
  };

  const handleSendClick = () => {
    setSelectedToken(undefined);
    setSendDialogOpen(true);
  };

  const handleReceiveClick = () => {
    setReceiveDialogOpen(true);
  };

  const handleSendToken = (token: TokenBalance) => {
    setSelectedToken(token);
    setSendDialogOpen(true);
  };

  const handleSwapToken = (token: TokenBalance) => {
    toast('Swap functionality coming soon!', { icon: 'ℹ️' });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard!');
  };

  // Show error state
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" icon={<AlertTriangle size={20} />}>
          {error}
        </Alert>
      </Container>
    );
  }

  // Show no wallet state
  if (!hasWallet && !loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Head>
          <title>Wallet - TalkCart</title>
          <meta name="description" content="Manage your crypto assets and NFTs on TalkCart." />
        </Head>

        <Box textAlign="center" py={8}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Wallet size={80} color={theme.palette.text.secondary} />
            <Typography variant="h4" gutterBottom sx={{ mt: 3 }}>
              No Wallet Connected
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Connect your wallet to manage your crypto assets and NFTs
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => setConnectDialogOpen(true)}
            >
              Connect Wallet
            </Button>
          </motion.div>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Wallet - TalkCart</title>
        <meta name="description" content="Manage your crypto assets and NFTs on TalkCart." />
      </Head>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box mb={4}>
            <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
              Wallet
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Manage your digital assets securely
            </Typography>
          </Box>
        </motion.div>

        {/* Wallet Overview */}
        <WalletOverview
          onSendClick={handleSendClick}
          onReceiveClick={handleReceiveClick}
        />

        {/* Wallet Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange}>
                <Tab value={0} label="Tokens" />
                <Tab value={1} label="NFTs" />
                <Tab value={2} label="Transactions" />
                <Tab value={3} label="DeFi" />
              </Tabs>
            </Box>

            <CardContent>
              <AnimatePresence mode="wait">
                {/* Tokens Tab */}
                {activeTab === 0 && (
                  <motion.div
                    key="tokens"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TokenList
                      onSendToken={handleSendToken}
                      onSwapToken={handleSwapToken}
                    />
                  </motion.div>
                )}

                {/* NFTs Tab */}
                {activeTab === 1 && (
                  <motion.div
                    key="nfts"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {loading ? (
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
                        {[...Array(4)].map((_, index) => (
                          <Card key={index}>
                            <Skeleton variant="rectangular" height={200} />
                            <CardContent>
                              <Skeleton variant="text" />
                              <Skeleton variant="text" width="60%" />
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    ) : nfts.length > 0 ? (
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
                        {nfts.map((nft, index) => (
                          <motion.div
                            key={nft.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                          >
                            <Card sx={{ '&:hover': { transform: 'translateY(-4px)', boxShadow: theme.shadows[8] }, transition: 'all 0.2s ease-in-out' }}>
                              <Box
                                sx={{
                                  height: 200,
                                  backgroundImage: `url(${nft.image})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '4rem',
                                  bgcolor: 'grey.100',
                                }}
                              >
                                {!nft.image && '🎨'}
                              </Box>
                              <CardContent>
                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                  {nft.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" gutterBottom>
                                  {nft.collection}
                                </Typography>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {nft.value} ETH
                                  </Typography>
                                  <Button size="small" variant="outlined">
                                    Sell
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}

                        {/* Import NFT Card */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: nfts.length * 0.1 }}
                        >
                          <Card
                            sx={{
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              border: '2px dashed',
                              borderColor: 'grey.300',
                              '&:hover': {
                                borderColor: 'primary.main',
                                bgcolor: alpha(theme.palette.primary.main, 0.04),
                                transform: 'translateY(-4px)',
                              },
                              transition: 'all 0.2s ease-in-out',
                            }}
                          >
                            <Box textAlign="center" p={4}>
                              <Plus size={48} color="#ccc" />
                              <Typography variant="body2" color="text.secondary" mt={2}>
                                Import NFT
                              </Typography>
                            </Box>
                          </Card>
                        </motion.div>
                      </Box>
                    ) : (
                      <Box textAlign="center" py={6}>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No NFTs Found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Your NFT collection will appear here
                        </Typography>
                      </Box>
                    )}
                  </motion.div>
                )}

                {/* Transactions Tab */}
                {activeTab === 2 && (
                  <motion.div
                    key="transactions"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {loading ? (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Type</TableCell>
                              <TableCell>Amount</TableCell>
                              <TableCell>Address</TableCell>
                              <TableCell>Time</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {[...Array(5)].map((_, index) => (
                              <TableRow key={index}>
                                <TableCell><Skeleton variant="text" width={60} /></TableCell>
                                <TableCell><Skeleton variant="text" width={80} /></TableCell>
                                <TableCell><Skeleton variant="text" width={100} /></TableCell>
                                <TableCell><Skeleton variant="text" width={120} /></TableCell>
                                <TableCell><Skeleton variant="text" width={80} /></TableCell>
                                <TableCell><Skeleton variant="text" width={40} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : transactions.length > 0 ? (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Type</TableCell>
                              <TableCell>Amount</TableCell>
                              <TableCell>Address</TableCell>
                              <TableCell>Time</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {transactions.map((tx, index) => (
                              <TableRow
                                key={tx.hash}
                                component={motion.tr}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                  },
                                }}
                              >
                                <TableCell>
                                  <Chip
                                    label={tx.type}
                                    color={tx.type === 'receive' ? 'success' : 'primary'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>
                                    {tx.type === 'receive' ? '+' : '-'}{tx.amount} {tx.token}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontFamily="monospace">
                                    {formatAddress(tx.from || tx.to || '')}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {tx.timestamp.toLocaleString()}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={tx.status}
                                    color={tx.status === 'confirmed' ? 'success' : tx.status === 'failed' ? 'error' : 'warning'}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <IconButton
                                    size="small"
                                    onClick={() => window.open(`https://etherscan.io/tx/${tx.hash}`, '_blank')}
                                  >
                                    <ExternalLink size={16} />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Box textAlign="center" py={6}>
                        <History size={64} color="#ccc" />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No Transactions Found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Your transaction history will appear here
                        </Typography>
                      </Box>
                    )}
                  </motion.div>
                )}

                {/* DeFi Tab */}
                {activeTab === 3 && (
                  <motion.div
                    key="defi"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Box textAlign="center" py={6}>
                      <TrendingUp size={64} color="#ccc" />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        DeFi Integration Coming Soon
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Stake, lend, and earn yield on your crypto assets
                      </Typography>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Send Dialog */}
        <SendDialog
          open={sendDialogOpen}
          onClose={() => {
            setSendDialogOpen(false);
            setSelectedToken(undefined);
          }}
          selectedToken={selectedToken}
        />

        {/* Receive Dialog */}
        <Dialog 
          open={receiveDialogOpen} 
          onClose={() => setReceiveDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
          disableEnforceFocus  // Prevents focus trapping issues
          hideBackdrop={false}  // Ensure backdrop is properly handled
        >
          <DialogTitle>Receive Crypto</DialogTitle>
          <DialogContent>
            <Box textAlign="center" py={3}>
              <Box
                sx={{
                  width: 200,
                  height: 200,
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <QrCode size={120} />
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Your Wallet Address
              </Typography>
              {portfolio && (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={1}
                  p={2}
                  bgcolor="grey.50"
                  borderRadius={1}
                >
                  <Typography variant="body2" fontFamily="monospace">
                    {address}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => copyToClipboard(address || '')}
                  >
                    <Copy size={16} />
                  </IconButton>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReceiveDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Wallet Connect Dialog */}
        <WalletConnectDialog
          open={connectDialogOpen}
          onClose={() => setConnectDialogOpen(false)}
        />
      </Container>
    </>
  );
}

// Add getStaticPaths to fix prerendering errors
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  };
}
