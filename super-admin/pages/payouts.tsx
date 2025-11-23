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
  Add as AddIcon,
  Visibility as ViewIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminExtraApi } from '@/services/adminExtra';
import { downloadCsvWithAuth } from '@/services/download';
import PayoutsDashboard from '../components/PayoutsDashboard';

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
      id={`payouts-tabpanel-${index}`}
      aria-labelledby={`payouts-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PayoutsAdmin() {
  const guard = useAdminGuard();
  const [tabValue, setTabValue] = useState(0);

  // List state
  const [status, setStatus] = useState('');
  const [destination, setDestination] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [pageInfo, setPageInfo] = useState<any>({ has_more: false, first_id: null, last_id: null, next_after: null, before: null });
  const [after, setAfter] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]); // stack of before cursors

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    amount: '',
    currency: 'USD',
    destination: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await AdminExtraApi.getPayoutsCursor({ status, destination, timeRange }, { limit, after, before });
      if (res?.success) {
        setItems(res.data || []);
        setPageInfo(res.page_info || {});
      } else {
        setError(res?.message || 'Failed to fetch payouts');
      }
    } catch (err) {
      console.error('Failed to fetch payouts:', err);
      setError('Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (guard.allowed && tabValue === 1) {
      fetchData();
    }
  }, [guard.allowed, tabValue]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'canceled': return 'default';
      default: return 'default';
    }
  };

  const exportCsv = async () => {
    try {
      const url = AdminExtraApi.payoutsExportUrl({ status, destination, timeRange });
      await downloadCsvWithAuth(url, `payouts-${Date.now()}.csv`);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      setError('Failed to export CSV');
    }
  };

  const cancel = async (id: string) => {
    if (!confirm('Cancel this payout?')) return;
    try {
      const res = await AdminExtraApi.cancelPayout(id);
      if (res?.success) {
        fetchData();
      } else {
        setError(res?.message || 'Failed to cancel payout');
      }
    } catch (err) {
      console.error('Failed to cancel payout:', err);
      setError('Failed to cancel payout');
    }
  };

  const viewDetails = async (payout: any) => {
    try {
      const res = await AdminExtraApi.getPayoutDetails(payout.id);
      if (res?.success) {
        setSelectedPayout(res.data);
        setDetailsDialogOpen(true);
      } else {
        setError(res?.message || 'Failed to fetch payout details');
      }
    } catch (err) {
      console.error('Failed to fetch payout details:', err);
      setError('Failed to fetch payout details');
    }
  };

  const createPayout = async () => {
    try {
      setCreating(true);
      const res = await AdminExtraApi.createPayout({
        amount: parseFloat(createForm.amount),
        currency: createForm.currency,
        destination: createForm.destination || undefined,
        description: createForm.description || undefined
      });

      if (res?.success) {
        setCreateDialogOpen(false);
        setCreateForm({ amount: '', currency: 'USD', destination: '', description: '' });
        fetchData();
      } else {
        setError(res?.message || 'Failed to create payout');
      }
    } catch (err) {
      console.error('Failed to create payout:', err);
      setError('Failed to create payout');
    } finally {
      setCreating(false);
    }
  };

  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Payouts Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Payout
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Dashboard" />
          <Tab label="All Payouts" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <PayoutsDashboard />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} alignItems="center">
            <TextField
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              select
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="canceled">Canceled</MenuItem>
            </TextField>

            <TextField
              label="Time Range"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              select
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All Time</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </TextField>

            <TextField
              label="Destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              sx={{ minWidth: 240 }}
              placeholder="Filter by destination..."
            />

            <Button
              variant="contained"
              onClick={() => { setAfter(null); setBefore(null); setHistory([]); fetchData(); }}
              startIcon={<RefreshIcon />}
            >
              Apply
            </Button>

            <Button
              variant="outlined"
              onClick={exportCsv}
              startIcon={<DownloadIcon />}
            >
              Export CSV
            </Button>
          </Stack>
        </Paper>
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
                    <TableCell>Destination</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Arrival Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {p.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={p.status}
                          color={getStatusColor(p.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(p.amount, p.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {p.currency?.toUpperCase?.() || p.currency}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                          {p.destination || 'Default'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date((p.created||0)*1000).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {p.arrival_date ? new Date(p.arrival_date*1000).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => viewDetails(p)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          {p.status === 'pending' && (
                            <Tooltip title="Cancel Payout">
                              <IconButton size="small" color="error" onClick={() => cancel(p.id)}>
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
                          No payouts found
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
                      setHistory((h)=>h.slice(0,-1));
                      fetchData();
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={!pageInfo.has_more}
                    onClick={() => {
                      if (pageInfo.last_id) setHistory((h)=>[...h, pageInfo.first_id]);
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
                  onChange={(e)=> setLimit(Math.max(1, Math.min(100, Number(e.target.value)||25)))}
                  sx={{ width: 120 }}
                />
              </Stack>
            </>
          )}
        </Paper>
      </TabPanel>

      {/* Create Payout Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Payout</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Amount"
              type="number"
              value={createForm.amount}
              onChange={(e) => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
              fullWidth
              required
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Amount in major currency units (e.g., dollars)"
            />
            <TextField
              label="Currency"
              value={createForm.currency}
              onChange={(e) => setCreateForm(prev => ({ ...prev, currency: e.target.value }))}
              select
              fullWidth
              required
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
              <MenuItem value="GBP">GBP</MenuItem>
            </TextField>
            <TextField
              label="Destination"
              value={createForm.destination}
              onChange={(e) => setCreateForm(prev => ({ ...prev, destination: e.target.value }))}
              fullWidth
              helperText="Optional: Specific destination account"
            />
            <TextField
              label="Description"
              value={createForm.description}
              onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              helperText="Optional: Description for the payout"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={createPayout}
            variant="contained"
            disabled={creating || !createForm.amount || !createForm.currency}
          >
            {creating ? <CircularProgress size={20} /> : 'Create Payout'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payout Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Payout Details</DialogTitle>
        <DialogContent>
          {selectedPayout && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>Basic Information</Typography>
                  <Stack spacing={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">ID:</Typography>
                      <Typography variant="body2" fontFamily="monospace">{selectedPayout.id}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Status:</Typography>
                      <Chip label={selectedPayout.status} color={getStatusColor(selectedPayout.status) as any} size="small" />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Amount:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(selectedPayout.amount, selectedPayout.currency)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Currency:</Typography>
                      <Typography variant="body2">{selectedPayout.currency?.toUpperCase()}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Destination:</Typography>
                      <Typography variant="body2">{selectedPayout.destination || 'Default'}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">Created:</Typography>
                      <Typography variant="body2">
                        {new Date(selectedPayout.created * 1000).toLocaleString()}
                      </Typography>
                    </Box>
                    {selectedPayout.arrival_date && (
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="textSecondary">Arrival Date:</Typography>
                        <Typography variant="body2">
                          {new Date(selectedPayout.arrival_date * 1000).toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                    {selectedPayout.description && (
                      <Box>
                        <Typography variant="body2" color="textSecondary">Description:</Typography>
                        <Typography variant="body2">{selectedPayout.description}</Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
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