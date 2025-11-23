import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  Stack,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminExtraApi } from '@/services/adminExtra';

export default function PaymentDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const guard = useAdminGuard();
  
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (guard.allowed && id && typeof id === 'string') {
      loadPaymentDetails(id);
    }
  }, [guard.allowed, id]);

  const loadPaymentDetails = async (paymentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await AdminExtraApi.getPaymentDetails(paymentId);
      if (res?.success) {
        setPayment(res.data);
      } else {
        setError(res?.message || 'Failed to load payment details');
      }
    } catch (err) {
      console.error('Failed to load payment details:', err);
      setError('Failed to load payment details');
    } finally {
      setLoading(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded': return <CheckCircleIcon />;
      case 'pending':
      case 'requires_payment_method':
      case 'requires_confirmation': return <ScheduleIcon />;
      case 'payment_failed': return <ErrorIcon />;
      case 'canceled': return <CancelIcon />;
      default: return <PaymentIcon />;
    }
  };

  const handleCancel = async () => {
    if (!payment?.payment || !['requires_payment_method', 'requires_confirmation'].includes(payment.payment.status)) return;
    if (!confirm('Are you sure you want to cancel this payment?')) return;
    
    try {
      setCanceling(true);
      const res = await AdminExtraApi.cancelPayment(payment.payment.id);
      if (res?.success) {
        setPayment({ ...payment, payment: res.data });
      } else {
        setError(res?.message || 'Failed to cancel payment');
      }
    } catch (err) {
      console.error('Failed to cancel payment:', err);
      setError('Failed to cancel payment');
    } finally {
      setCanceling(false);
    }
  };

  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!payment?.payment) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Payment not found</Alert>
      </Container>
    );
  }

  const paymentData = payment.payment;
  const charges = payment.charges || [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link 
          color="inherit" 
          href="/payments" 
          onClick={(e) => { e.preventDefault(); router.push('/payments'); }}
          sx={{ cursor: 'pointer' }}
        >
          Payments
        </Link>
        <Typography color="text.primary">
          {paymentData.id}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/payments')}
            variant="outlined"
          >
            Back to Payments
          </Button>
          <Typography variant="h4">
            Payment Details
          </Typography>
        </Box>
        
        {['requires_payment_method', 'requires_confirmation'].includes(paymentData.status) && (
          <Button
            variant="outlined"
            color="error"
            onClick={handleCancel}
            disabled={canceling}
            startIcon={canceling ? <CircularProgress size={16} /> : <CancelIcon />}
          >
            {canceling ? 'Canceling...' : 'Cancel Payment'}
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Main Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                {getStatusIcon(paymentData.status)}
                <Typography variant="h5">
                  {formatCurrency(paymentData.amount, paymentData.currency)}
                </Typography>
                <Chip 
                  label={paymentData.status.replace('_', ' ')} 
                  color={getStatusColor(paymentData.status) as any}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">Payment ID:</Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {paymentData.id}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">Amount:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(paymentData.amount, paymentData.currency)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">Currency:</Typography>
                  <Typography variant="body2">
                    {paymentData.currency?.toUpperCase()}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">Customer:</Typography>
                  <Typography variant="body2">
                    {paymentData.customer || 'Guest'}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">Created:</Typography>
                  <Typography variant="body2">
                    {new Date(paymentData.created * 1000).toLocaleString()}
                  </Typography>
                </Box>

                {paymentData.description && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Description:
                      </Typography>
                      <Typography variant="body2">
                        {paymentData.description}
                      </Typography>
                    </Box>
                  </>
                )}

                {paymentData.payment_method && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Payment Method:
                      </Typography>
                      <Typography variant="body2">
                        {paymentData.payment_method.type || 'Unknown'}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Charges */}
          {charges.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Associated Charges
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Charge ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {charges.map((charge: any) => (
                      <TableRow key={charge.id}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {charge.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={charge.status} 
                            color={charge.status === 'succeeded' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(charge.amount, charge.currency)}
                        </TableCell>
                        <TableCell>
                          {new Date(charge.created * 1000).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Status Information */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Information
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Current Status
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(paymentData.status)}
                    <Typography variant="body1" fontWeight="bold">
                      {paymentData.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </Typography>
                  </Box>
                </Box>

                {paymentData.status === 'succeeded' && (
                  <Alert severity="success">
                    This payment has been successfully processed.
                  </Alert>
                )}

                {paymentData.status === 'requires_payment_method' && (
                  <Alert severity="info">
                    This payment is waiting for a payment method to be attached.
                  </Alert>
                )}

                {paymentData.status === 'requires_confirmation' && (
                  <Alert severity="warning">
                    This payment requires confirmation from the customer.
                  </Alert>
                )}

                {paymentData.status === 'payment_failed' && (
                  <Alert severity="error">
                    This payment failed to process. Check the payment method or try again.
                  </Alert>
                )}

                {paymentData.status === 'canceled' && (
                  <Alert severity="warning">
                    This payment was canceled and will not be processed.
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Metadata */}
          {paymentData.metadata && Object.keys(paymentData.metadata).length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Metadata
                </Typography>
                <Stack spacing={1}>
                  {Object.entries(paymentData.metadata).map(([key, value]) => (
                    <Box key={key} display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="textSecondary">
                        {key}:
                      </Typography>
                      <Typography variant="body2">
                        {String(value)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
