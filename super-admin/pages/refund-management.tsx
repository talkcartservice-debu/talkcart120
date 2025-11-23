import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Alert,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  AccountBalance as RefundIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  PlayArrow as ProcessIcon,
  CheckCircle as CompleteIcon,
  FilterList as FilterIcon,
  Analytics as AnalyticsIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  Message as MessageIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';
import { AdminExtraApi } from '@/services/adminExtra';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function RefundManagement() {
  const guard = useAdminGuard();
  const [tabValue, setTabValue] = useState(0);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [selectedRefunds, setSelectedRefunds] = useState<string[]>([]);
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    refundType: '',
    reason: '',
    priority: '',
    search: '',
    from: '',
    to: ''
  });

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [communicationDialogOpen, setCommunicationDialogOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<any>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    orderId: '',
    paymentIntentId: '',
    customerId: '',
    refundAmount: '',
    originalAmount: '',
    currency: 'USD',
    refundType: 'full',
    reason: 'customer_request',
    reasonDetails: '',
    priority: 'normal',
    requiresApproval: true
  });

  const [statusForm, setStatusForm] = useState({
    status: '',
    notes: '',
    externalRefundId: ''
  });

  const [communicationForm, setCommunicationForm] = useState({
    type: 'note',
    content: '',
    recipient: ''
  });

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const query = {
        page: page + 1,
        limit: rowsPerPage,
        ...filters
      };
      
      // TODO: Implement getRefunds functionality
      // For now, set empty data
      setRefunds([]);
      setTotal(0);
    } catch (error) {
      console.error('Failed to fetch refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const query: any = {};
      if (filters.from) query.from = filters.from;
      if (filters.to) query.to = filters.to;
      
      // TODO: Implement refund analytics
      // For now, set empty analytics data
      setAnalytics({
        totalRefunds: 0,
        submittedRefunds: 0,
        failedRefunds: 0,
        totalAmount: 0,
        currencies: [],
        successRate: '0'
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  useEffect(() => {
    if (guard.allowed) {
      fetchRefunds();
      fetchAnalytics();
    }
  }, [guard.allowed, page, rowsPerPage]);

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const applyFilters = () => {
    fetchRefunds();
    fetchAnalytics();
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      refundType: '',
      reason: '',
      priority: '',
      search: '',
      from: '',
      to: ''
    });
    setPage(0);
  };

  const handleCreateRefund = async () => {
    try {
      // TODO: Implement create refund functionality
      console.log('Create refund functionality not implemented yet');
      
      // For now, just close the dialog and reset the form
      setCreateDialogOpen(false);
      setCreateForm({
        orderId: '',
        paymentIntentId: '',
        customerId: '',
        refundAmount: '',
        originalAmount: '',
        currency: 'USD',
        refundType: 'full',
        reason: 'customer_request',
        reasonDetails: '',
        priority: 'normal',
        requiresApproval: true
      });
      
      // Refresh the data
      fetchRefunds();
      fetchAnalytics();
    } catch (error) {
      console.error('Failed to create refund:', error);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedRefund) return;
    
    try {
      // TODO: Implement update refund status functionality
      console.log('Update refund status functionality not implemented yet');
      
      // For now, just close the dialog and reset the form
      setStatusDialogOpen(false);
      setStatusForm({ status: '', notes: '', externalRefundId: '' });
      
      // Refresh the data
      fetchRefunds();
      fetchAnalytics();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddCommunication = async () => {
    if (!selectedRefund) return;
    
    try {
      // TODO: Implement add refund communication functionality
      console.log('Add refund communication functionality not implemented yet');
      
      // For now, just close the dialog and reset the form
      setCommunicationDialogOpen(false);
      setCommunicationForm({ type: 'note', content: '', recipient: '' });
      
      // Refresh the selected refund details
      // TODO: Implement getRefund functionality
      console.log('Get refund functionality not implemented yet');
    } catch (error) {
      console.error('Failed to add communication:', error);
    }
  };

  const handleBulkAction = async (action: string, data?: any) => {
    if (selectedRefunds.length === 0) return;
    
    try {
      // TODO: Implement bulk refund action functionality
      console.log('Bulk refund action functionality not implemented yet');
      
      // For now, just clear the selection and refresh the data
      setSelectedRefunds([]);
      fetchRefunds();
      fetchAnalytics();
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      pending: 'warning',
      approved: 'info',
      rejected: 'error',
      processing: 'primary',
      completed: 'success',
      failed: 'error',
      cancelled: 'default'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, any> = {
      low: 'default',
      normal: 'primary',
      high: 'warning',
      urgent: 'error'
    };
    return colors[priority] || 'default';
  };

  const formatAmount = (amountCents: number, currency: string) => {
    return `${currency} ${(amountCents / 100).toFixed(2)}`;
  };

  const reasonLabels: Record<string, string> = {
    customer_request: 'Customer Request',
    defective_product: 'Defective Product',
    wrong_item: 'Wrong Item',
    not_as_described: 'Not as Described',
    shipping_issue: 'Shipping Issue',
    duplicate_charge: 'Duplicate Charge',
    fraud_prevention: 'Fraud Prevention',
    admin_decision: 'Admin Decision',
    other: 'Other'
  };

  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RefundIcon color="primary" />
          Comprehensive Refund Management
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Refund
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => { fetchRefunds(); fetchAnalytics(); }}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Refund Management" />
          <Tab label="Analytics & Reports" />
          <Tab label="Approval Workflow" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {/* Analytics Cards */}
        {analytics?.basic && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Refunds
                  </Typography>
                  <Typography variant="h4">
                    {analytics.basic.totalRefunds}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Pending Approval
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {analytics.basic.pendingCount}
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
                    ${(analytics.basic.totalAmount / 100).toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Completion Rate
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {analytics.basic.totalRefunds > 0 
                      ? ((analytics.basic.completedCount / analytics.basic.totalRefunds) * 100).toFixed(1)
                      : '0'
                    }%
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
            <Typography variant="h6">Advanced Filters</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                select
                fullWidth
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Type"
                value={filters.refundType}
                onChange={(e) => handleFilterChange('refundType', e.target.value)}
                select
                fullWidth
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="full">Full Refund</MenuItem>
                <MenuItem value="partial">Partial Refund</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Reason"
                value={filters.reason}
                onChange={(e) => handleFilterChange('reason', e.target.value)}
                select
                fullWidth
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                {Object.entries(reasonLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Priority"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                select
                fullWidth
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="From Date"
                type="date"
                value={filters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="To Date"
                type="date"
                value={filters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Search (Refund ID, Payment Intent, Details)"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                fullWidth
                size="small"
                placeholder="Search refunds..."
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={applyFilters} disabled={loading}>
              Apply Filters
            </Button>
            <Button variant="outlined" onClick={resetFilters}>
              Reset
            </Button>
          </Stack>
        </Paper>

        {/* Bulk Actions */}
        {selectedRefunds.length > 0 && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body1">
                {selectedRefunds.length} refund(s) selected
              </Typography>
              <Button
                size="small"
                startIcon={<ApproveIcon />}
                onClick={() => handleBulkAction('approve', { notes: 'Bulk approval' })}
              >
                Approve All
              </Button>
              <Button
                size="small"
                startIcon={<RejectIcon />}
                onClick={() => handleBulkAction('reject', { reason: 'Bulk rejection' })}
              >
                Reject All
              </Button>
              <Button
                size="small"
                onClick={() => handleBulkAction('update-priority', { priority: 'high' })}
              >
                Set High Priority
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedRefunds([])}
              >
                Clear Selection
              </Button>
            </Stack>
          </Paper>
        )}

        {/* Refunds Table */}
        <Paper>
          {loading && <LinearProgress />}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedRefunds.length === refunds.length && refunds.length > 0}
                    indeterminate={selectedRefunds.length > 0 && selectedRefunds.length < refunds.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRefunds(refunds.map(r => r._id));
                      } else {
                        setSelectedRefunds([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>Refund ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refunds.map((refund) => (
                <TableRow key={refund._id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRefunds.includes(refund._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRefunds(prev => [...prev, refund._id]);
                        } else {
                          setSelectedRefunds(prev => prev.filter(id => id !== refund._id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {refund.refundId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {refund.customerId?.username || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {refund.customerId?.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {refund.orderId?.orderNumber || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {formatAmount(refund.refundAmount, refund.currency)}
                      </Typography>
                      {refund.isPartialRefund && (
                        <Typography variant="caption" color="textSecondary">
                          of {formatAmount(refund.originalAmount, refund.currency)}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={refund.refundType}
                      size="small"
                      color={refund.refundType === 'full' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {reasonLabels[refund.reason] || refund.reason}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={refund.status}
                      size="small"
                      color={getStatusColor(refund.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={refund.priority}
                      size="small"
                      color={getPriorityColor(refund.priority)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(refund.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            // TODO: Implement getRefund functionality
                            // For now, just set the selected refund and open the dialog
                            setSelectedRefund(refund);
                            setViewDialogOpen(true);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Update Status">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedRefund(refund);
                            setStatusForm({ status: refund.status, notes: '', externalRefundId: '' });
                            setStatusDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Add Communication">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedRefund(refund);
                            setCommunicationDialogOpen(true);
                          }}
                        >
                          <MessageIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Analytics Dashboard */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Refunds by Reason
                </Typography>
                {analytics?.byReason?.map((item: any) => (
                  <Box key={item._id} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        {reasonLabels[item._id] || item._id}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.count} ({formatAmount(item.totalAmount, 'USD')})
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(item.count / analytics.basic.totalRefunds) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Processing Time Analytics
                </Typography>
                {analytics?.processingTime && (
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Average
                      </Typography>
                      <Typography variant="h6">
                        {analytics.processingTime.avgProcessingTime?.toFixed(1) || '0'} hrs
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Minimum
                      </Typography>
                      <Typography variant="h6">
                        {analytics.processingTime.minProcessingTime?.toFixed(1) || '0'} hrs
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="textSecondary">
                        Maximum
                      </Typography>
                      <Typography variant="h6">
                        {analytics.processingTime.maxProcessingTime?.toFixed(1) || '0'} hrs
                      </Typography>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Approval Workflow */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pending Approvals
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Refund ID</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {refunds.filter(r => r.status === 'pending').map((refund) => (
                      <TableRow key={refund._id}>
                        <TableCell>{refund.refundId}</TableCell>
                        <TableCell>{refund.customerId?.username}</TableCell>
                        <TableCell>{formatAmount(refund.refundAmount, refund.currency)}</TableCell>
                        <TableCell>{reasonLabels[refund.reason]}</TableCell>
                        <TableCell>
                          <Chip
                            label={refund.priority}
                            size="small"
                            color={getPriorityColor(refund.priority)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              startIcon={<ApproveIcon />}
                              onClick={() => handleBulkAction('approve', { notes: 'Quick approval' })}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              startIcon={<RejectIcon />}
                              onClick={() => handleBulkAction('reject', { reason: 'Quick rejection' })}
                            >
                              Reject
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Approval Statistics
                </Typography>
                {analytics?.basic && (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Pending Approval
                      </Typography>
                      <Typography variant="h5" color="warning.main">
                        {analytics.basic.pendingCount}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Approved
                      </Typography>
                      <Typography variant="h5" color="success.main">
                        {analytics.basic.approvedCount}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Rejected
                      </Typography>
                      <Typography variant="h5" color="error.main">
                        {analytics.basic.rejectedCount}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Approval Rate
                      </Typography>
                      <Typography variant="h5" color="primary.main">
                        {analytics.basic.approvedCount + analytics.basic.rejectedCount > 0
                          ? ((analytics.basic.approvedCount / (analytics.basic.approvedCount + analytics.basic.rejectedCount)) * 100).toFixed(1)
                          : '0'
                        }%
                      </Typography>
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Create Refund Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Refund Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Order ID"
                value={createForm.orderId}
                onChange={(e) => setCreateForm({ ...createForm, orderId: e.target.value })}
                fullWidth
                required
                placeholder="Order MongoDB ObjectId"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Payment Intent ID"
                value={createForm.paymentIntentId}
                onChange={(e) => setCreateForm({ ...createForm, paymentIntentId: e.target.value })}
                fullWidth
                required
                placeholder="pi_1234567890abcdef"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Customer ID"
                value={createForm.customerId}
                onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                fullWidth
                required
                placeholder="Customer MongoDB ObjectId"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Currency"
                value={createForm.currency}
                onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value.toUpperCase() })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Refund Amount"
                type="number"
                value={createForm.refundAmount}
                onChange={(e) => setCreateForm({ ...createForm, refundAmount: e.target.value })}
                fullWidth
                required
                inputProps={{ min: 0.01, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Original Amount (Optional)"
                type="number"
                value={createForm.originalAmount}
                onChange={(e) => setCreateForm({ ...createForm, originalAmount: e.target.value })}
                fullWidth
                inputProps={{ min: 0.01, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Refund Type"
                value={createForm.refundType}
                onChange={(e) => setCreateForm({ ...createForm, refundType: e.target.value })}
                select
                fullWidth
                required
              >
                <MenuItem value="full">Full Refund</MenuItem>
                <MenuItem value="partial">Partial Refund</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Priority"
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                select
                fullWidth
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Reason"
                value={createForm.reason}
                onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                select
                fullWidth
                required
              >
                {Object.entries(reasonLabels).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Reason Details"
                value={createForm.reasonDetails}
                onChange={(e) => setCreateForm({ ...createForm, reasonDetails: e.target.value })}
                fullWidth
                multiline
                rows={3}
                placeholder="Additional details about the refund reason..."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={createForm.requiresApproval}
                    onChange={(e) => setCreateForm({ ...createForm, requiresApproval: e.target.checked })}
                  />
                }
                label="Requires Approval"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateRefund}
            variant="contained"
            disabled={!createForm.orderId || !createForm.paymentIntentId || !createForm.customerId || !createForm.refundAmount}
          >
            Create Refund
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Refund Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewIcon />
            Refund Details: {selectedRefund?.refundId}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRefund && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Basic Information</Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Refund ID</Typography>
                        <Typography variant="body1" fontFamily="monospace">{selectedRefund.refundId}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Status</Typography>
                        <Chip label={selectedRefund.status} color={getStatusColor(selectedRefund.status)} />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Amount</Typography>
                        <Typography variant="h6">{formatAmount(selectedRefund.refundAmount, selectedRefund.currency)}</Typography>
                        {selectedRefund.isPartialRefund && (
                          <Typography variant="body2" color="textSecondary">
                            of {formatAmount(selectedRefund.originalAmount, selectedRefund.currency)} ({selectedRefund.refundPercentage}%)
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Type & Priority</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip label={selectedRefund.refundType} size="small" />
                          <Chip label={selectedRefund.priority} size="small" color={getPriorityColor(selectedRefund.priority)} variant="outlined" />
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Reason & Details</Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Reason</Typography>
                        <Typography variant="body1">{reasonLabels[selectedRefund.reason] || selectedRefund.reason}</Typography>
                      </Box>
                      {selectedRefund.reasonDetails && (
                        <Box>
                          <Typography variant="body2" color="textSecondary">Details</Typography>
                          <Typography variant="body1">{selectedRefund.reasonDetails}</Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="body2" color="textSecondary">Processing Method</Typography>
                        <Typography variant="body1">{selectedRefund.processingMethod || 'manual'}</Typography>
                      </Box>
                      {selectedRefund.externalRefundId && (
                        <Box>
                          <Typography variant="body2" color="textSecondary">External Refund ID</Typography>
                          <Typography variant="body1" fontFamily="monospace">{selectedRefund.externalRefundId}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Status History</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Status</TableCell>
                          <TableCell>Changed By</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedRefund.statusHistory?.map((history: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip label={history.status} size="small" color={getStatusColor(history.status)} />
                            </TableCell>
                            <TableCell>{history.changedBy?.username || 'System'}</TableCell>
                            <TableCell>{new Date(history.changedAt).toLocaleString()}</TableCell>
                            <TableCell>{history.notes || history.reason || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
              {selectedRefund.communications?.length > 0 && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Communications</Typography>
                      <Stack spacing={2}>
                        {selectedRefund.communications.map((comm: any, index: number) => (
                          <Paper key={index} sx={{ p: 2, bgcolor: 'grey.50' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Chip label={comm.type} size="small" />
                              <Typography variant="caption" color="textSecondary">
                                {new Date(comm.sentAt).toLocaleString()}
                              </Typography>
                            </Box>
                            <Typography variant="body2">{comm.content}</Typography>
                            {comm.recipient && (
                              <Typography variant="caption" color="textSecondary">
                                To: {comm.recipient}
                              </Typography>
                            )}
                          </Paper>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Refund Status</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Status"
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
              select
              fullWidth
              required
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
            <TextField
              label="External Refund ID (Optional)"
              value={statusForm.externalRefundId}
              onChange={(e) => setStatusForm({ ...statusForm, externalRefundId: e.target.value })}
              fullWidth
              placeholder="Refund ID or other external reference"
              helperText="For processing/completed status, provide external refund ID"
            />
            <TextField
              label="Notes"
              value={statusForm.notes}
              onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Reason for status change or additional notes..."
            />
            {statusForm.status === 'rejected' && (
              <Alert severity="warning">
                Rejecting this refund will prevent further processing. Make sure to provide a clear reason.
              </Alert>
            )}
            {statusForm.status === 'completed' && (
              <Alert severity="success">
                Marking as completed indicates the refund has been successfully processed and funds returned.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleStatusUpdate}
            variant="contained"
            disabled={!statusForm.status}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Communication Dialog */}
      <Dialog open={communicationDialogOpen} onClose={() => setCommunicationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MessageIcon />
            Add Communication
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Communication Type"
              value={communicationForm.type}
              onChange={(e) => setCommunicationForm({ ...communicationForm, type: e.target.value })}
              select
              fullWidth
              required
            >
              <MenuItem value="note">Internal Note</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
              <MenuItem value="call">Phone Call</MenuItem>
            </TextField>
            {(communicationForm.type === 'email' || communicationForm.type === 'sms') && (
              <TextField
                label="Recipient"
                value={communicationForm.recipient}
                onChange={(e) => setCommunicationForm({ ...communicationForm, recipient: e.target.value })}
                fullWidth
                placeholder={communicationForm.type === 'email' ? 'customer@example.com' : '+1234567890'}
                helperText={`${communicationForm.type === 'email' ? 'Email address' : 'Phone number'} of the recipient`}
              />
            )}
            <TextField
              label="Content"
              value={communicationForm.content}
              onChange={(e) => setCommunicationForm({ ...communicationForm, content: e.target.value })}
              fullWidth
              multiline
              rows={4}
              required
              placeholder={`Enter ${communicationForm.type} content...`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommunicationDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddCommunication}
            variant="contained"
            disabled={!communicationForm.content}
          >
            Add Communication
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
