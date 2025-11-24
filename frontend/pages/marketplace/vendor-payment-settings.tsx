import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Chip,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Save,
  CreditCard,
  Phone,
  AccountBalance,
  Payment,
  Verified,
  Warning,
  CheckCircle,
  Store as StoreIcon,
  History,
  AccessTime,
  Done,
  Error,
} from '@mui/icons-material';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import PaymentMethodSelector from '@/components/marketplace/PaymentMethodSelector';

interface PaymentMethod {
  enabled: boolean;
  [key: string]: any;
}

interface PaymentPreferences {
  mobileMoney: PaymentMethod & {
    provider: string;
    phoneNumber: string;
    country: string;
  };
  bankAccount: PaymentMethod & {
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
    routingNumber: string;
    swiftCode: string;
    iban: string;
    country: string;
  };
  paypal: PaymentMethod & {
    email: string;
  };
  cryptoWallet: PaymentMethod & {
    walletAddress: string;
    network: string;
  };
  defaultPaymentMethod: string;
  withdrawalPreferences: {
    minimumAmount: number;
    frequency: string;
  };
}

interface PayoutHistoryItem {
  _id: string;
  orderId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string;
  processedAt: string;
  details: any;
}

const WITHDRAWAL_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'manual', label: 'Manual Request' },
];

const VendorPaymentSettings: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<PaymentPreferences>({
    mobileMoney: {
      enabled: false,
      provider: 'other',
      phoneNumber: '',
      country: '',
    },
    bankAccount: {
      enabled: false,
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      routingNumber: '',
      swiftCode: '',
      iban: '',
      country: '',
    },
    paypal: {
      enabled: false,
      email: '',
    },
    cryptoWallet: {
      enabled: false,
      walletAddress: '',
      network: 'ethereum',
    },
    defaultPaymentMethod: 'mobileMoney',
    withdrawalPreferences: {
      minimumAmount: 10,
      frequency: 'weekly',
    },
  });
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch current payment preferences
  const fetchPaymentPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response: any = await api.marketplace.getMyPaymentPreferences();
      if (response.success) {
        setPreferences({
          ...preferences,
          ...response.data,
        });
      } else {
        setError(response.error || 'Failed to load payment preferences');
      }
    } catch (err: any) {
      console.error('Error fetching payment preferences:', err);
      setError(err.message || 'Failed to load payment preferences');
    } finally {
      setLoading(false);
    }
  }, [preferences]);

  const fetchPayoutHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const response: any = await api.marketplace.getMyPayoutHistory({ limit: 20 });
      if (response.success) {
        setPayoutHistory(response.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching payout history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPaymentPreferences();
      fetchPayoutHistory();
    }
  }, [isAuthenticated, user, fetchPaymentPreferences, fetchPayoutHistory]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response: any = await api.marketplace.updateMyPaymentPreferences(preferences);
      if (response.success) {
        toast.success('Payment preferences updated successfully');
        setPreferences(response.data);
      } else {
        toast.error(response.error || 'Failed to update payment preferences');
      }
    } catch (err: any) {
      console.error('Error updating payment preferences:', err);
      toast.error(err.message || 'Failed to update payment preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    setPreferences(prev => {
      const updatedPreferences = { ...prev };
      const sectionData = { ...(prev[section as keyof PaymentPreferences] as any) };
      sectionData[field] = value;
      updatedPreferences[section as keyof PaymentPreferences] = sectionData as any;
      return updatedPreferences;
    });
  };

  const handleToggleChange = (section: string, field: string, checked: boolean) => {
    setPreferences(prev => {
      const updatedPreferences = { ...prev };
      const sectionData = { ...(prev[section as keyof PaymentPreferences] as any) };
      sectionData[field] = checked;
      updatedPreferences[section as keyof PaymentPreferences] = sectionData as any;
      return updatedPreferences;
    });
  };

  const handleWithdrawalChange = (field: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      withdrawalPreferences: {
        ...prev.withdrawalPreferences,
        [field]: value,
      },
    }));
  };

  const handleDefaultMethodChange = (method: string) => {
    setPreferences(prev => ({
      ...prev,
      defaultPaymentMethod: method,
    }));
  };

  const handleManageStore = () => {
    router.push('/marketplace/vendor-store-registration');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'failed':
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Done color="success" />;
      case 'pending':
      case 'processing':
        return <AccessTime color="warning" />;
      case 'failed':
      case 'cancelled':
        return <Error color="error" />;
      default:
        return <AccessTime />;
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'mobileMoney':
        return 'Mobile Money';
      case 'bankAccount':
        return 'Bank Transfer';
      case 'paypal':
        return 'PayPal';
      case 'cryptoWallet':
        return 'Crypto Wallet';
      default:
        return method;
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Redirecting to login...
          </Typography>
        </Container>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading payment preferences...
          </Typography>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
                Payment Settings
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Configure how you want to receive payments for your products
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<StoreIcon />}
                onClick={handleManageStore}
              >
                Manage Store
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>

          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Payment Methods */}
          <Grid item xs={12} lg={8}>
            <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', mb: 4 }}>
              <CardHeader
                title="Payment Methods"
                subheader="Set up multiple payment methods to receive earnings from your sales"
              />
              <CardContent>
                <PaymentMethodSelector
                  preferences={preferences}
                  onPreferenceChange={handleInputChange}
                  onToggleChange={handleToggleChange}
                  onDefaultMethodChange={handleDefaultMethodChange}
                />
              </CardContent>
            </Paper>

            {/* Payout History */}
            <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <CardHeader
                title="Payout History"
                subheader="View your recent payment transactions"
                avatar={<History />}
              />
              <CardContent>
                {historyLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : payoutHistory.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <History sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No payout history yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your payout history will appear here once you start receiving payments.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
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
                        {payoutHistory.map((payout) => (
                          <TableRow key={payout._id}>
                            <TableCell>
                              {new Date(payout.processedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {payout.amount} {payout.currency}
                            </TableCell>
                            <TableCell>
                              {getMethodName(payout.method)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(payout.status)}
                                label={payout.status}
                                size="small"
                                color={getStatusColor(payout.status) as any}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {payout.transactionId || 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Paper>
          </Grid>

          {/* Withdrawal Settings */}
          <Grid item xs={12} lg={4}>
            <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', mb: 4 }}>
              <CardHeader
                title="Withdrawal Settings"
                subheader="Configure how and when you want to receive your earnings"
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Minimum Withdrawal Amount"
                      type="number"
                      value={preferences.withdrawalPreferences.minimumAmount}
                      onChange={(e) => handleWithdrawalChange('minimumAmount', parseFloat(e.target.value) || 0)}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Withdrawal Frequency</InputLabel>
                      <Select
                        value={preferences.withdrawalPreferences.frequency}
                        onChange={(e) => handleWithdrawalChange('frequency', e.target.value)}
                        label="Withdrawal Frequency"
                      >
                        {WITHDRAWAL_FREQUENCIES.map(frequency => (
                          <MenuItem key={frequency.value} value={frequency.value}>
                            {frequency.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              
                <Box sx={{ mt: 3, p: 2, bgcolor: theme.palette.grey[50], borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    How It Works
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    • Earnings are automatically processed based on your frequency setting
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    • Withdrawals below your minimum amount are held until threshold is met
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Manual withdrawals can be requested at any time
                  </Typography>
                </Box>
              </CardContent>
            </Paper>

            {/* Save Button */}
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
              onClick={handleSave}
              disabled={saving}
              fullWidth
              size="large"
            >
              {saving ? 'Saving...' : 'Save Payment Preferences'}
            </Button>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default VendorPaymentSettings;