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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { Edit as EditIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';

interface Order {
  _id: string;
  orderNumber: string;
  user: {
    _id: string;
    username: string;
    email: string;
  };
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    currency: string;
  }>;
  totalAmount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

const ORDER_STATUSES = [
  'pending',
  'processing', 
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded'
];

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  pending: 'warning',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  completed: 'success',
  cancelled: 'error',
  refunded: 'error'
};

export default function OrdersAdmin() {
  const guard = useAdminGuard();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [orderDetailsDialogOpen, setOrderDetailsDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await AdminApi.listOrders({ 
        page, 
        limit, 
        status: status || undefined,
        search: search || undefined,
        paymentMethod: paymentMethod || undefined,
        vendorId: vendorId || undefined,
        from: fromDate || undefined,
        to: toDate || undefined
      });
      if (res?.success) {
        setOrders(res.data?.orders || []);
        setPagination(res.data?.pagination || { total: 0, pages: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, limit, status, search, paymentMethod]);

  // Guard checks after all hooks are defined
  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !newStatus) return;
    
    try {
      const res = await AdminApi.updateOrderStatus(selectedOrder._id, newStatus);
      if (res?.success) {
        setStatusDialogOpen(false);
        setSelectedOrder(null);
        setNewStatus('');
        fetchOrders();
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const openStatusDialog = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusDialogOpen(true);
  };

  const openOrderDetailsDialog = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailsDialogOpen(true);
  };

  const closeOrderDetailsDialog = () => {
    setOrderDetailsDialogOpen(false);
    setSelectedOrder(null);
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toFixed(2)}`;
    }
    return `${amount.toFixed(4)} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate summary stats
  const totalRevenue = orders.reduce((sum, order) => {
    if (order.status === 'completed' && order.currency === 'USD') {
      return sum + order.totalAmount;
    }
    return sum;
  }, 0);

  const completedOrders = orders.filter(order => order.status === 'completed').length;
  const pendingOrders = orders.filter(order => order.status === 'pending').length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>Orders Management</Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Orders
              </Typography>
              <Typography variant="h4">
                {pagination.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed Orders
              </Typography>
              <Typography variant="h4" color="success.main">
                {completedOrders}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Orders
              </Typography>
              <Typography variant="h4" color="warning.main">
                {pendingOrders}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Revenue (USD)
              </Typography>
              <Typography variant="h4" color="primary">
                ${totalRevenue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
          <TextField 
            label="Search Order Number" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            sx={{ minWidth: 200 }} 
          />
          <TextField 
            label="Status" 
            value={status} 
            onChange={(e) => setStatus(e.target.value)} 
            select 
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {ORDER_STATUSES.map(s => (
              <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
            ))}
          </TextField>
          <TextField 
            label="Payment Method" 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)} 
            select 
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Methods</MenuItem>

            <MenuItem value="crypto">Crypto</MenuItem>
          </TextField>
          <TextField 
            label="Vendor ID" 
            value={vendorId} 
            onChange={(e) => setVendorId(e.target.value)} 
            sx={{ minWidth: 150 }} 
          />
          <TextField
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          <Button variant="contained" onClick={() => { setPage(1); fetchOrders(); }}>
            Apply Filters
          </Button>
        </Stack>
      </Paper>

      {/* Orders Table */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order Number</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Loading...</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">No orders found</TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {order.orderNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.user?.username || 'Unknown'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {order.user?.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.items?.length || 0} item(s)
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatCurrency(order.totalAmount, order.currency)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={order.status} 
                      color={STATUS_COLORS[order.status] || 'default'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.paymentMethod || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(order.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openOrderDetailsDialog(order)}>
                      <ViewIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => openStatusDialog(order)}>
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              Order: {selectedOrder?.orderNumber}
            </Typography>
            <TextField
              label="Status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              select
              fullWidth
              sx={{ mt: 2 }}
            >
              {ORDER_STATUSES.map(s => (
                <MenuItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusUpdate}>Update</Button>
        </DialogActions>
      </Dialog>
      
      {/* Order Details Dialog */}
      <Dialog open={orderDetailsDialogOpen} onClose={closeOrderDetailsDialog} maxWidth="md" fullWidth>
        <DialogTitle>Order Details: {selectedOrder?.orderNumber}</DialogTitle>
        <DialogContent dividers>
          {selectedOrder && (
            <Box sx={{ py: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Order Number</Typography>
                  <Typography variant="body1">{selectedOrder.orderNumber}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip 
                    label={selectedOrder.status} 
                    color={STATUS_COLORS[selectedOrder.status] || 'default'} 
                    size="small" 
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Total Amount</Typography>
                  <Typography variant="body1">{formatCurrency(selectedOrder.totalAmount, selectedOrder.currency)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Payment Method</Typography>
                  <Typography variant="body1">{selectedOrder.paymentMethod || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Customer</Typography>
                  <Typography variant="body1">{selectedOrder.user?.username || 'Unknown'}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedOrder.user?.email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">{formatDate(selectedOrder.createdAt)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>Items</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{formatCurrency(item.price, item.currency)}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.price * item.quantity, item.currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeOrderDetailsDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
