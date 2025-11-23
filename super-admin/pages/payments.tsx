import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Chip,
  Box,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminExtraApi } from '@/services/adminExtra';
import { downloadCsvWithAuth } from '@/services/download';
import PaymentsDashboard from '../components/PaymentsDashboard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`payments-tabpanel-${index}`}
      aria-labelledby={`payments-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PaymentsAdmin() {
  const guard = useAdminGuard();

  // Tab management
  const [tabValue, setTabValue] = useState(0);

  // Payments list state
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageInfo, setPageInfo] = useState<any>({});
  const [after, setAfter] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [limit, setLimit] = useState(25);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [timeRangeFilter, setTimeRangeFilter] = useState('');

  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // Test intent state
  const [testAmount, setTestAmount] = useState('');
  const [testCurrency, setTestCurrency] = useState('usd');
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string>('');
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    if (guard.allowed && tabValue === 1) {
      fetchData();
    }
  }, [guard.allowed, tabValue, after, before, limit, statusFilter, customerFilter, paymentMethodFilter, timeRangeFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { limit };
      if (after) params.after = after;
      if (before) params.before = before;
      if (statusFilter) params.status = statusFilter;
      if (customerFilter) params.customer = customerFilter;
      if (paymentMethodFilter) params.paymentMethod = paymentMethodFilter;
      if (timeRangeFilter) {
        const now = new Date();
        let startDate;
        switch (timeRangeFilter) {
          case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
          case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        }
        if (startDate) {
          params.created = JSON.stringify({ gte: Math.floor(startDate.getTime() / 1000) });
        }
      }

      const res = await AdminExtraApi.getPayments(params);
      if (res?.success) {
        setItems(res.data || []);
        setPageInfo(res.page_info || {});
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (payment: any) => {
    try {
      const res = await AdminExtraApi.getPaymentDetails(payment.id);
      if (res?.success) {
        setSelectedPayment(res.data);
        setDetailsDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch payment details:', error);
    }
  };

  const cancelPayment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this payment?')) return;

    try {
      const res = await AdminExtraApi.cancelPayment(id);
      if (res?.success) {
        fetchData(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to cancel payment:', error);
    }
  };

  const exportPayments = () => {
    const params: any = {};
    if (statusFilter) params.status = statusFilter;
    if (customerFilter) params.customer = customerFilter;
    if (paymentMethodFilter) params.paymentMethod = paymentMethodFilter;
    if (timeRangeFilter) params.timeRange = timeRangeFilter;

    const url = AdminExtraApi.exportPaymentsUrl(params);
    downloadCsvWithAuth(url, `payments-${Date.now()}.csv`);
  };

  const createTestIntent = async () => {
    setTestError('');
    setTestResult(null);
    setTestLoading(true);

    try {
      const res = await AdminExtraApi.createTestPaymentIntent({
        amount: Number(testAmount || 0),
        currency: testCurrency
      });

      if (res?.success) {
        setTestResult(res.data);
      } else {
        setTestError(res?.error || 'Failed to create test intent');
      }
    } catch (e: any) {
      setTestError(e.message || 'Request failed');
    } finally {
      setTestLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'success';
      case 'pending':
      case 'requires_payment_method':
      case 'requires_confirmation': return 'warning';
      case 'payment_failed':
      case 'canceled': return 'error';
      default: return 'default';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'flutterwave': return 'Flutterwave';
      case 'mobile_money': return 'Mobile Money';
      case 'airtel_money': return 'Airtel Money';
      case 'paystack': return 'Paystack';
      case 'card_payment': return 'Card Payment';
      default: return method.replace('_', ' ');
    }
  };

  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Payments Management</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => tabValue === 1 ? fetchData() : window.location.reload()}
          >
            Refresh
          </Button>
          {tabValue === 1 && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportPayments}
            >
              Export CSV
            </Button>
          )}
        </Stack>
      </Box>

      <Paper>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Dashboard" />
          <Tab label="Payments List" />
          <Tab label="Test Tools" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <PaymentsDashboard />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Filters */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <TextField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              select
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="succeeded">Succeeded</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="requires_payment_method">Requires Payment Method</MenuItem>
              <MenuItem value="requires_confirmation">Requires Confirmation</MenuItem>
              <MenuItem value="payment_failed">Failed</MenuItem>
              <MenuItem value="canceled">Canceled</MenuItem>
            </TextField>

            <TextField
              label="Payment Method"
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              select
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Methods</MenuItem>
              <MenuItem value="flutterwave">Flutterwave</MenuItem>
              <MenuItem value="mobile_money">Mobile Money</MenuItem>
              <MenuItem value="airtel_money">Airtel Money</MenuItem>
              <MenuItem value="paystack">Paystack</MenuItem>
              <MenuItem value="card_payment">Card Payment</MenuItem>
            </TextField>

            <TextField
              label="Customer ID"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              size="small"
              placeholder="cus_..."
              sx={{ minWidth: 200 }}
            />

            <TextField
              label="Time Range"
              value={timeRangeFilter}
              onChange={(e) => setTimeRangeFilter(e.target.value)}
              select
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Time</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </TextField>
          </Stack>

          {/* Payments Table */}
          <Paper>
            {loading ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Currency</TableCell>
                      <TableCell>Payment Method</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {payment.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status.replace('_', ' ')}
                            color={getStatusColor(payment.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(payment.amount, payment.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {payment.currency?.toUpperCase()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getPaymentMethodLabel(payment.payment_method || payment.paymentMethod)}
                            color="primary"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {payment.customer || 'Guest'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(payment.created * 1000).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => viewDetails(payment)}>
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            {(payment.status === 'requires_payment_method' || payment.status === 'requires_confirmation') && (
                              <Tooltip title="Cancel Payment">
                                <IconButton size="small" color="error" onClick={() => cancelPayment(payment.id)}>
                                  <CancelIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="textSecondary" py={4}>
                            No payments found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      disabled={!pageInfo.before}
                      onClick={() => {
                        setBefore(pageInfo.first_id);
                        setAfter(null);
                        setHistory((h) => h.slice(0, -1));
                        fetchData();
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outlined"
                      disabled={!pageInfo.has_more}
                      onClick={() => {
                        if (pageInfo.last_id) setHistory((h) => [...h, pageInfo.first_id]);
                        setAfter(pageInfo.last_id);
                        setBefore(null);
                        fetchData();
                      }}
                    >
                      Next
                    </Button>
                  </Stack>
                  <TextField
                    label="Limit"
                    type="number"
                    size="small"
                    value={limit}
                    onChange={(e) => setLimit(Math.max(1, Math.min(100, Number(e.target.value) || 25)))}
                    sx={{ width: 120 }}
                  />
                </Stack>
              </>
            )}
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create Test Payment Intent
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Create a test PaymentIntent to verify connectivity and functionality.
              </Typography>

              <Stack spacing={3} sx={{ mt: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    type="number"
                    label="Amount (major units)"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="10.50"
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  <TextField
                    label="Currency"
                    value={testCurrency}
                    onChange={(e) => setTestCurrency(e.target.value)}
                    select
                  >
                    <MenuItem value="usd">USD</MenuItem>
                    <MenuItem value="eur">EUR</MenuItem>
                    <MenuItem value="gbp">GBP</MenuItem>
                    <MenuItem value="ugx">UGX</MenuItem>
                    <MenuItem value="kes">KES</MenuItem>
                    <MenuItem value="rwf">RWF</MenuItem>
                    <MenuItem value="tzs">TZS</MenuItem>
                    <MenuItem value="ngn">NGN</MenuItem>
                    <MenuItem value="ghs">GHS</MenuItem>
                  </TextField>
                  <Button
                    variant="contained"
                    onClick={createTestIntent}
                    disabled={testLoading || !testAmount}
                    startIcon={testLoading ? <CircularProgress size={16} /> : <PaymentIcon />}
                  >
                    {testLoading ? 'Creating...' : 'Create Test Intent'}
                  </Button>
                </Stack>

                {testError && <Alert severity="error">{testError}</Alert>}

                {testResult && (
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      PaymentIntent Created Successfully
                    </Typography>
                    <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </Paper>
                )}
              </Stack>
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>

      {/* Payment Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Payment Information</Typography>
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">ID:</Typography>
                      <Typography variant="body2" fontFamily="monospace">{selectedPayment.payment?.id}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Status:</Typography>
                      <Chip
                        label={selectedPayment.payment?.status?.replace('_', ' ') || 'Unknown'}
                        color={getStatusColor(selectedPayment.payment?.status) as any}
                        size="small"
                      />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Amount:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {selectedPayment.payment?.amount && selectedPayment.payment?.currency 
                          ? formatCurrency(selectedPayment.payment.amount, selectedPayment.payment.currency)
                          : 'N/A'}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Currency:</Typography>
                      <Typography variant="body2">
                        {selectedPayment.payment?.currency?.toUpperCase() || 'N/A'}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Payment Method:</Typography>
                      <Chip
                        label={getPaymentMethodLabel(selectedPayment.payment?.payment_method || selectedPayment.payment?.paymentMethod || 'Unknown')}
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Customer:</Typography>
                      <Typography variant="body2">
                        {selectedPayment.payment?.customer || 'Guest'}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Created:</Typography>
                      <Typography variant="body2">
                        {selectedPayment.payment?.created 
                          ? new Date(selectedPayment.payment.created * 1000).toLocaleString()
                          : 'N/A'}
                      </Typography>
                    </Box>
                    {selectedPayment.payment?.description && (
                      <Box>
                        <Typography variant="body2" color="textSecondary">Description:</Typography>
                        <Typography variant="body2">{selectedPayment.payment.description}</Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {selectedPayment.charges && selectedPayment.charges.length > 0 && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Associated Charges</Typography>
                    <Stack spacing={1}>
                      {selectedPayment.charges.map((charge: any) => (
                        <Box key={charge.id} p={1} border={1} borderColor="grey.300" borderRadius={1}>
                          <Typography variant="body2" fontFamily="monospace">{charge.id}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {charge.status} • {charge.amount && charge.currency ? formatCurrency(charge.amount, charge.currency) : 'N/A'}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}