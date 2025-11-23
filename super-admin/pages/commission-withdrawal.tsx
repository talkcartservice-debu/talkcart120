import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  TextField,
  Button,
  Alert,
  Snackbar,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  History as HistoryIcon,
  Send as SendIcon,
  AttachMoney as AttachMoneyIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';

interface CommissionData {
  totalRevenue: number;
  totalCommission: number;
  commissionRate: number;
  orderCount: number;
}

interface WithdrawalHistoryItem {
  _id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string;
  processedAt: string;
  details: Record<string, any>;
}

export default function CommissionWithdrawal() {
  const guard = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistoryItem[]>([]);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchCommissionData = async () => {
    try {
      setCommissionLoading(true);
      const result = await AdminApi.getTotalCommission();
      
      if (result?.success) {
        setCommissionData(result.data);
      } else {
        throw new Error(result?.message || 'Failed to fetch commission data');
      }
    } catch (error: any) {
      console.error('Failed to fetch commission data:', error);
      showSnackbar('Failed to fetch commission data: ' + (error.message || ''), 'error');
    } finally {
      setCommissionLoading(false);
    }
  };

  const fetchWithdrawalHistory = async () => {
    try {
      setHistoryLoading(true);
      const result = await AdminApi.getCommissionHistory();
      
      if (result?.success) {
        setWithdrawalHistory(result.data || []);
      } else {
        throw new Error(result?.message || 'Failed to fetch withdrawal history');
      }
    } catch (error: any) {
      console.error('Failed to fetch withdrawal history:', error);
      showSnackbar('Failed to fetch withdrawal history: ' + (error.message || ''), 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setSaving(true);
      const amount = parseFloat(withdrawAmount);
      
      if (!amount || amount <= 0) {
        showSnackbar('Please enter a valid amount', 'error');
        return;
      }
      
      if (!commissionData || amount > commissionData.totalCommission) {
        showSnackbar('Withdrawal amount exceeds available commission', 'error');
        return;
      }
      
      const result = await AdminApi.withdrawCommission(amount);
      
      if (result?.success) {
        showSnackbar('Commission withdrawal request submitted successfully', 'success');
        setWithdrawDialogOpen(false);
        setWithdrawAmount('');
        fetchCommissionData();
        fetchWithdrawalHistory();
      } else {
        throw new Error(result?.message || 'Failed to process withdrawal');
      }
    } catch (error: any) {
      console.error('Failed to process withdrawal:', error);
      showSnackbar('Failed to process withdrawal: ' + (error.message || ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchCommissionData(),
      fetchWithdrawalHistory()
    ]);
  };

  useEffect(() => {
    if (guard.allowed) {
      refreshAll();
    }
  }, [guard.allowed]);

  // Guard checks after all hooks are defined
  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'pending_manual': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Commission Withdrawal
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refreshAll}
          disabled={commissionLoading || historyLoading}
        >
          Refresh
        </Button>
      </Box>

      {/* Commission Summary */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Commission</Typography>
              </Box>
              {commissionLoading ? (
                <CircularProgress size={24} />
              ) : (
                <>
                  <Typography variant="h4" fontWeight="bold">
                    {commissionData ? formatCurrency(commissionData.totalCommission) : '$0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {commissionData ? `${(commissionData.commissionRate * 100).toFixed(1)}% of ${formatCurrency(commissionData.totalRevenue)}` : 'No data'}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalanceIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Available for Withdrawal</Typography>
              </Box>
              {commissionLoading ? (
                <CircularProgress size={24} />
              ) : (
                <>
                  <Typography variant="h4" fontWeight="bold">
                    {commissionData ? formatCurrency(commissionData.totalCommission) : '$0.00'}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    onClick={() => setWithdrawDialogOpen(true)}
                    disabled={!commissionData || commissionData.totalCommission <= 0}
                    sx={{ mt: 1 }}
                  >
                    Withdraw Funds
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HistoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Withdrawal History</Typography>
              </Box>
              {historyLoading ? (
                <CircularProgress size={24} />
              ) : (
                <>
                  <Typography variant="h4" fontWeight="bold">
                    {withdrawalHistory.length}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={fetchWithdrawalHistory}
                    sx={{ mt: 1 }}
                  >
                    Refresh
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawDialogOpen} onClose={() => setWithdrawDialogOpen(false)}>
        <DialogTitle>Withdraw Commission</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Amount"
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              fullWidth
              helperText={`Available: ${commissionData ? formatCurrency(commissionData.totalCommission) : '$0.00'}`}
            />
            <Alert severity="info">
              Your withdrawal will be processed to your default payment method.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleWithdraw} 
            variant="contained" 
            disabled={saving || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
          >
            {saving ? 'Processing...' : 'Withdraw'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Withdrawal History */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Withdrawal History</Typography>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : withdrawalHistory.length === 0 ? (
            <Typography color="text.secondary">No withdrawal history found</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Transaction ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {withdrawalHistory.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      {new Date(item.processedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell>
                      {item.method}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={item.status.replace('_', ' ')} 
                        color={getStatusColor(item.status)} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {item.transactionId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}