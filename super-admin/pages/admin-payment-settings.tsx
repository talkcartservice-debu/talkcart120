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
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
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
  CircularProgress
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  History as HistoryIcon,
  Send as SendIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';

interface PaymentPreferences {
  mobileMoney: {
    enabled: boolean;
    provider: string;
    phoneNumber: string;
    country: string;
  };
  bankAccount: {
    enabled: boolean;
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
    routingNumber: string;
    swiftCode: string;
    iban: string;
    country: string;
  };
  paypal: {
    enabled: boolean;
    email: string;
  };
  cryptoWallet: {
    enabled: boolean;
    walletAddress: string;
    network: string;
  };
  defaultPaymentMethod: string;
  withdrawalPreferences: {
    minimumAmount: number;
    frequency: string;
  };
  taxInformation: {
    taxId: string;
    taxCountry: string;
  };
  payoutSchedule: string;
  autoPayoutEnabled: boolean;
  payoutNotifications: boolean;
}

// Add this helper function to create default preferences
const createDefaultPreferences = (): PaymentPreferences => ({
  mobileMoney: {
    enabled: false,
    provider: '',
    phoneNumber: '',
    country: ''
  },
  bankAccount: {
    enabled: false,
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    routingNumber: '',
    swiftCode: '',
    iban: '',
    country: ''
  },
  paypal: {
    enabled: false,
    email: ''
  },
  cryptoWallet: {
    enabled: false,
    walletAddress: '',
    network: ''
  },
  defaultPaymentMethod: 'mobileMoney',
  withdrawalPreferences: {
    minimumAmount: 1000,
    frequency: 'weekly'
  },
  taxInformation: {
    taxId: '',
    taxCountry: ''
  },
  payoutSchedule: 'weekly',
  autoPayoutEnabled: false,
  payoutNotifications: true
});

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

export default function AdminPaymentSettings() {
  const guard = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<PaymentPreferences | null>(null);
  const [editPreferences, setEditPreferences] = useState<PaymentPreferences>(createDefaultPreferences());
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistoryItem[]>([]);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [commissionLoading, setCommissionLoading] = useState(false);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const result = await AdminApi.getPaymentPreferences();
      
      if (result?.success) {
        // Merge the fetched data with default preferences to ensure all fields are present
        const mergedPreferences = {
          ...createDefaultPreferences(),
          ...result.data,
          mobileMoney: {
            ...createDefaultPreferences().mobileMoney,
            ...result.data?.mobileMoney
          },
          bankAccount: {
            ...createDefaultPreferences().bankAccount,
            ...result.data?.bankAccount
          },
          paypal: {
            ...createDefaultPreferences().paypal,
            ...result.data?.paypal
          },
          cryptoWallet: {
            ...createDefaultPreferences().cryptoWallet,
            ...result.data?.cryptoWallet
          },
          withdrawalPreferences: {
            ...createDefaultPreferences().withdrawalPreferences,
            ...result.data?.withdrawalPreferences
          },
          taxInformation: {
            ...createDefaultPreferences().taxInformation,
            ...result.data?.taxInformation
          }
        };
        
        setPreferences(mergedPreferences);
        setEditPreferences(mergedPreferences);
      } else {
        throw new Error(result?.message || 'Failed to fetch payment preferences');
      }
    } catch (error: any) {
      console.error('Failed to fetch payment preferences:', error);
      showSnackbar('Failed to fetch payment preferences: ' + (error.message || ''), 'error');
      // Initialize with default preferences even if fetch fails
      setPreferences(createDefaultPreferences());
      setEditPreferences(createDefaultPreferences());
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!editPreferences || !preferences) return;
      
      const result = await AdminApi.updatePaymentPreferences(editPreferences);
      
      if (result?.success) {
        setPreferences(editPreferences);
        showSnackbar('Payment preferences updated successfully', 'success');
      } else {
        throw new Error(result?.message || 'Failed to update payment preferences');
      }
    } catch (error: any) {
      console.error('Failed to save payment preferences:', error);
      showSnackbar('Failed to save payment preferences: ' + (error.message || ''), 'error');
    } finally {
      setSaving(false);
    }
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

  useEffect(() => {
    if (guard.allowed) {
      fetchPreferences();
      fetchCommissionData();
      fetchWithdrawalHistory();
    }
  }, [guard.allowed]);

  // Guard checks after all hooks are defined
  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Admin Payment Settings</Typography>
        <Typography>Loading payment preferences...</Typography>
      </Container>
    );
  }

  if (!preferences) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Admin Payment Settings</Typography>
        <Typography color="error">Failed to load payment preferences. Using default settings.</Typography>
      </Container>
    );
  }

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
          Admin Payment Settings
        </Typography>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
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
              Your withdrawal will be processed to your default payment method: {preferences?.defaultPaymentMethod || 'Not set'}
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
      <Card sx={{ mb: 3 }}>
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
      </Card>

      {/* Payment Methods Configuration */}
      {preferences && (
        <Grid container spacing={3}>
          {/* Default Payment Method */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Default Payment Method</Typography>
                <FormControl fullWidth>
                  <InputLabel>Default Payment Method</InputLabel>
                  <Select
                    value={editPreferences.defaultPaymentMethod}
                    onChange={(e) => setEditPreferences({
                      ...editPreferences,
                      defaultPaymentMethod: e.target.value
                    })}
                  >
                    <MenuItem value="mobileMoney">Mobile Money</MenuItem>
                    <MenuItem value="bankAccount">Bank Account</MenuItem>
                    <MenuItem value="paypal">PayPal</MenuItem>
                    <MenuItem value="cryptoWallet">Crypto Wallet</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          {/* Mobile Money Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Mobile Money</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editPreferences.mobileMoney.enabled}
                        onChange={(e) => setEditPreferences({
                          ...editPreferences,
                          mobileMoney: {
                            ...editPreferences.mobileMoney,
                            enabled: e.target.checked
                          }
                        })}
                      />
                    }
                    label="Enabled"
                  />
                </Box>
                
                {editPreferences.mobileMoney.enabled && (
                  <Stack spacing={2}>
                    <TextField
                      label="Provider"
                      value={editPreferences.mobileMoney.provider}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        mobileMoney: {
                          ...editPreferences.mobileMoney,
                          provider: e.target.value
                        }
                      })}
                      select
                    >
                      <MenuItem value="mtn">MTN</MenuItem>
                      <MenuItem value="airtel">Airtel</MenuItem>
                      <MenuItem value="vodacom">Vodacom</MenuItem>
                      <MenuItem value="tigo">Tigo</MenuItem>
                      <MenuItem value="orange">Orange</MenuItem>
                      <MenuItem value="ecocash">EcoCash</MenuItem>
                      <MenuItem value="flutterwave">Flutterwave</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </TextField>
                    
                    <TextField
                      label="Phone Number"
                      value={editPreferences.mobileMoney.phoneNumber}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        mobileMoney: {
                          ...editPreferences.mobileMoney,
                          phoneNumber: e.target.value
                        }
                      })}
                      placeholder="+1234567890"
                    />
                    
                    <TextField
                      label="Country"
                      value={editPreferences.mobileMoney.country}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        mobileMoney: {
                          ...editPreferences.mobileMoney,
                          country: e.target.value
                        }
                      })}
                    />
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Bank Account Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Bank Account</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editPreferences.bankAccount.enabled}
                        onChange={(e) => setEditPreferences({
                          ...editPreferences,
                          bankAccount: {
                            ...editPreferences.bankAccount,
                            enabled: e.target.checked
                          }
                        })}
                      />
                    }
                    label="Enabled"
                  />
                </Box>
                
                {editPreferences.bankAccount.enabled && (
                  <Stack spacing={2}>
                    <TextField
                      label="Account Holder Name"
                      value={editPreferences.bankAccount.accountHolderName}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        bankAccount: {
                          ...editPreferences.bankAccount,
                          accountHolderName: e.target.value
                        }
                      })}
                    />
                    
                    <TextField
                      label="Account Number"
                      value={editPreferences.bankAccount.accountNumber}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        bankAccount: {
                          ...editPreferences.bankAccount,
                          accountNumber: e.target.value
                        }
                      })}
                    />
                    
                    <TextField
                      label="Bank Name"
                      value={editPreferences.bankAccount.bankName}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        bankAccount: {
                          ...editPreferences.bankAccount,
                          bankName: e.target.value
                        }
                      })}
                    />
                    
                    <TextField
                      label="Routing Number"
                      value={editPreferences.bankAccount.routingNumber}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        bankAccount: {
                          ...editPreferences.bankAccount,
                          routingNumber: e.target.value
                        }
                      })}
                    />
                    
                    <TextField
                      label="SWIFT Code"
                      value={editPreferences.bankAccount.swiftCode}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        bankAccount: {
                          ...editPreferences.bankAccount,
                          swiftCode: e.target.value
                        }
                      })}
                    />
                    
                    <TextField
                      label="IBAN"
                      value={editPreferences.bankAccount.iban}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        bankAccount: {
                          ...editPreferences.bankAccount,
                          iban: e.target.value
                        }
                      })}
                    />
                    
                    <TextField
                      label="Country"
                      value={editPreferences.bankAccount.country}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        bankAccount: {
                          ...editPreferences.bankAccount,
                          country: e.target.value
                        }
                      })}
                    />
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* PayPal Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">PayPal</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editPreferences.paypal.enabled}
                        onChange={(e) => setEditPreferences({
                          ...editPreferences,
                          paypal: {
                            ...editPreferences.paypal,
                            enabled: e.target.checked
                          }
                        })}
                      />
                    }
                    label="Enabled"
                  />
                </Box>
                
                {editPreferences.paypal.enabled && (
                  <TextField
                    label="PayPal Email"
                    fullWidth
                    value={editPreferences.paypal.email}
                    onChange={(e) => setEditPreferences({
                      ...editPreferences,
                      paypal: {
                        ...editPreferences.paypal,
                        email: e.target.value
                      }
                    })}
                    type="email"
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Crypto Wallet Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Crypto Wallet</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editPreferences.cryptoWallet.enabled}
                        onChange={(e) => setEditPreferences({
                          ...editPreferences,
                          cryptoWallet: {
                            ...editPreferences.cryptoWallet,
                            enabled: e.target.checked
                          }
                        })}
                      />
                    }
                    label="Enabled"
                  />
                </Box>
                
                {editPreferences.cryptoWallet.enabled && (
                  <Stack spacing={2}>
                    <TextField
                      label="Wallet Address"
                      fullWidth
                      value={editPreferences.cryptoWallet.walletAddress}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        cryptoWallet: {
                          ...editPreferences.cryptoWallet,
                          walletAddress: e.target.value
                        }
                      })}
                    />
                    
                    <TextField
                      label="Network"
                      value={editPreferences.cryptoWallet.network}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        cryptoWallet: {
                          ...editPreferences.cryptoWallet,
                          network: e.target.value
                        }
                      })}
                      select
                    >
                      <MenuItem value="ethereum">Ethereum</MenuItem>
                      <MenuItem value="bitcoin">Bitcoin</MenuItem>
                      <MenuItem value="polygon">Polygon</MenuItem>
                      <MenuItem value="bsc">Binance Smart Chain</MenuItem>
                      <MenuItem value="solana">Solana</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </TextField>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Withdrawal Preferences */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Withdrawal Preferences</Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Minimum Withdrawal Amount"
                    type="number"
                    value={editPreferences.withdrawalPreferences.minimumAmount}
                    onChange={(e) => setEditPreferences({
                      ...editPreferences,
                      withdrawalPreferences: {
                        ...editPreferences.withdrawalPreferences,
                        minimumAmount: parseFloat(e.target.value) || 0
                      }
                    })}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel>Withdrawal Frequency</InputLabel>
                    <Select
                      value={editPreferences.withdrawalPreferences.frequency}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        withdrawalPreferences: {
                          ...editPreferences.withdrawalPreferences,
                          frequency: e.target.value
                        }
                      })}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="manual">Manual</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Tax Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Tax Information</Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Tax ID"
                    value={editPreferences.taxInformation.taxId}
                    onChange={(e) => setEditPreferences({
                      ...editPreferences,
                      taxInformation: {
                        ...editPreferences.taxInformation,
                        taxId: e.target.value
                      }
                    })}
                  />
                  
                  <TextField
                    label="Tax Country"
                    value={editPreferences.taxInformation.taxCountry}
                    onChange={(e) => setEditPreferences({
                      ...editPreferences,
                      taxInformation: {
                        ...editPreferences.taxInformation,
                        taxCountry: e.target.value
                      }
                    })}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Additional Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Additional Settings</Typography>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Payout Schedule</InputLabel>
                    <Select
                      value={editPreferences.payoutSchedule}
                      onChange={(e) => setEditPreferences({
                        ...editPreferences,
                        payoutSchedule: e.target.value
                      })}
                    >
                      <MenuItem value="immediate">Immediate</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="biweekly">Bi-weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editPreferences.autoPayoutEnabled}
                        onChange={(e) => setEditPreferences({
                          ...editPreferences,
                          autoPayoutEnabled: e.target.checked
                        })}
                      />
                    }
                    label="Enable Automatic Payouts"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editPreferences.payoutNotifications}
                        onChange={(e) => setEditPreferences({
                          ...editPreferences,
                          payoutNotifications: e.target.checked
                        })}
                      />
                    }
                    label="Enable Payout Notifications"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

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
