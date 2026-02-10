import React, { useEffect, useState } from 'react';
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
  Chip,
  Box,
  Card,
  CardContent,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  TablePagination,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  AccountBalance as RefundIcon,
  TrendingUp as AnalyticsIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';
import { downloadCsvWithAuth } from '@/services/download';

export default function RefundsAdmin() {
  const guard = useAdminGuard();
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [status, setStatus] = useState('');
  const [currency, setCurrency] = useState('');
  const [transactionReference, setPaymentIntentId] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<any>(null);
  const [selectedRefund, setSelectedRefund] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processForm, setProcessForm] = useState({
    transactionReference: '',
    amount: '',
    currency: 'USD',
    reason: ''
  });
  const [processing, setProcessing] = useState(false);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit, status, currency, transactionReference, userId };
      if (since) params.since = new Date(since).getTime();
      if (until) params.until = new Date(until).getTime();

      const res = await AdminApi.refundsRecent(params);
      if (res?.success) {
        setItems(res.data || []);
        setMeta(res.meta || null);
      }
    } catch (error) {
      console.error('Failed to fetch refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const params: any = {};
      if (since) params.from = new Date(since).getTime();
      if (until) params.to = new Date(until).getTime();

      const res = await AdminApi.refundsAnalytics(params);
      if (res?.success) {
        setAnalytics(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Fallback to local calculation
      if (items.length > 0) {
        const totalRefunds = items.length;
        const submittedRefunds = items.filter(r => r.type === 'submitted').length;
        const failedRefunds = items.filter(r => r.type === 'failed').length;
        const totalAmount = items.reduce((sum, r) => sum + (r.amountCents || 0), 0) / 100;
        const currencies = [...new Set(items.map(r => r.currency))];

        setAnalytics({
          totalRefunds,
          submittedRefunds,
          failedRefunds,
          totalAmount,
          currencies,
          successRate: totalRefunds > 0 ? ((submittedRefunds / totalRefunds) * 100).toFixed(1) : '0'
        });
      }
    }
  };

  useEffect(() => {
    if (guard.allowed) {
      fetchRefunds();
    }
  }, [guard.allowed, page, limit]);

  useEffect(() => {
    if (items.length > 0) {
      fetchAnalytics();
    }
  }, [items]);

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage + 1);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLimit(parseInt(event.target.value, 10));
    setPage(1);
  };

  const handleViewRefund = (refund: any) => {
    setSelectedRefund(refund);
    setViewDialogOpen(true);
  };

  const formatAmount = (amountCents: number, currency: string) => {
    return `${currency} ${(amountCents / 100).toFixed(2)}`;
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'submitted': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const resetFilters = () => {
    setStatus('');
    setCurrency('');
    setPaymentIntentId('');
    setUserId('');
    setSince('');
    setUntil('');
    setPage(1);
  };

  const handleProcessRefund = async () => {
    if (!processForm.transactionReference || !processForm.amount || !processForm.currency) {
      return;
    }

    setProcessing(true);
    try {
      const res = await AdminApi.processRefund({
        transactionReference: processForm.transactionReference,
        amount: parseFloat(processForm.amount),
        currency: processForm.currency,
        reason: processForm.reason
      });

      if (res?.success) {
        setProcessDialogOpen(false);
        setProcessForm({ transactionReference: '', amount: '', currency: 'USD', reason: '' });
        fetchRefunds(); // Refresh the list
        fetchAnalytics(); // Refresh analytics
      }
    } catch (error) {
      console.error('Failed to process refund:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const exportCsv = async () => {
    const url = AdminApi.refundsExportUrl({ status, currency, transactionReference, userId });
    await downloadCsvWithAuth(url, `refunds-${Date.now()}.csv`);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RefundIcon color="primary" />
          Refund Management
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<RefundIcon />}
            onClick={() => setProcessDialogOpen(true)}
            color="primary"
          >
            Process Refund
          </Button>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchRefunds} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>
            Export CSV
          </Button>
        </Stack>
      </Box>

      {/* Analytics Cards */}
      {analytics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Total Refunds
                </Typography>
                <Typography variant="h4">
                  {analytics.totalRefunds}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Success Rate
                </Typography>
                <Typography variant="h4" color="success.main">
                  {analytics.successRate}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Total Amount
                </Typography>
                <Typography variant="h4">
                  ${analytics.totalAmount.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Currencies
                </Typography>
                <Typography variant="h4">
                  {analytics.currencies.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {analytics.currencies.join(', ')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Filters</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              select
              fullWidth
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              fullWidth
              size="small"
              placeholder="USD, EUR, BTC..."
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Transaction Reference"
              value={transactionReference}
              onChange={(e) => setPaymentIntentId(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Since"
              type="datetime-local"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              label="Until"
              type="datetime-local"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => { setPage(1); fetchRefunds(); }} disabled={loading}>
            Apply Filters
          </Button>
          <Button variant="outlined" onClick={resetFilters}>
            Reset
          </Button>
        </Stack>
      </Paper>
      {/* Refunds Table */}
      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              No refunds found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Try adjusting your filters or check back later
            </Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Payment Intent</TableCell>
                  <TableCell>User ID</TableCell>
                  <TableCell>Error</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((refund) => (
                  <TableRow key={refund._id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(refund.at).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(refund.at).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={refund.type.toUpperCase()}
                        color={getStatusColor(refund.type) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {formatAmount(refund.amountCents || 0, refund.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {refund.transactionReference || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {refund.userId || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {refund.error ? (
                        <Tooltip title={refund.error}>
                          <Chip label="Error" color="error" size="small" />
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          None
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewRefund(refund)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {meta && (
              <TablePagination
                component="div"
                count={meta.total || 0}
                page={(meta.page || 1) - 1}
                onPageChange={handlePageChange}
                rowsPerPage={meta.limit || 50}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[25, 50, 100, 200]}
              />
            )}
          </>
        )}
      </Paper>

      {/* View Refund Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RefundIcon />
            Refund Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRefund && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Refund ID</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                  {selectedRefund._id}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={selectedRefund.type.toUpperCase()}
                    color={getStatusColor(selectedRefund.type) as any}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Date & Time</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {new Date(selectedRefund.at).toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">Amount</Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ mb: 2 }}>
                  {formatAmount(selectedRefund.amountCents || 0, selectedRefund.currency)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Transaction Reference</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                  {selectedRefund.transactionReference || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">User ID</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                  {selectedRefund.userId || 'N/A'}
                </Typography>
              </Grid>
              {selectedRefund.error && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Error Details</Typography>
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {selectedRefund.error}
                  </Alert>
                </Grid>
              )}
              {selectedRefund.metadata && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Metadata</Typography>
                  <Paper sx={{ p: 2, mt: 1, backgroundColor: 'grey.50' }}>
                    <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                      {JSON.stringify(selectedRefund.metadata, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Process Refund Dialog */}
      <Dialog open={processDialogOpen} onClose={() => setProcessDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RefundIcon />
            Process Manual Refund
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Transaction Reference"
              value={processForm.transactionReference}
              onChange={(e) => setProcessForm({ ...processForm, transactionReference: e.target.value })}
              fullWidth
              required
              placeholder="pi_1234567890abcdef"
              helperText="The Transaction Reference to refund"
            />
            <Grid container spacing={2}>
              <Grid item xs={8}>
                <TextField
                  label="Amount"
                  type="number"
                  value={processForm.amount}
                  onChange={(e) => setProcessForm({ ...processForm, amount: e.target.value })}
                  fullWidth
                  required
                  inputProps={{ min: 0.01, step: 0.01 }}
                  helperText="Amount to refund"
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Currency"
                  value={processForm.currency}
                  onChange={(e) => setProcessForm({ ...processForm, currency: e.target.value.toUpperCase() })}
                  fullWidth
                  required
                  placeholder="USD"
                />
              </Grid>
            </Grid>
            <TextField
              label="Reason (Optional)"
              value={processForm.reason}
              onChange={(e) => setProcessForm({ ...processForm, reason: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Reason for refund..."
              helperText="Optional reason for the refund"
            />
            <Alert severity="warning">
              <Typography variant="body2">
                This will process a manual refund. Make sure the Transaction Reference is correct and the amount is accurate.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessDialogOpen(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleProcessRefund}
            variant="contained"
            disabled={processing || !processForm.transactionReference || !processForm.amount}
            startIcon={processing ? <CircularProgress size={16} /> : <RefundIcon />}
          >
            {processing ? 'Processing...' : 'Process Refund'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}