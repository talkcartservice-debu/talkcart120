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
  Grid
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AccountBalance as AccountBalanceIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminExtraApi } from '@/services/adminExtra';

export default function PayoutDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const guard = useAdminGuard();
  
  const [payout, setPayout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (guard.allowed && id && typeof id === 'string') {
      loadPayoutDetails(id);
    }
  }, [guard.allowed, id]);

  const loadPayoutDetails = async (payoutId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await AdminExtraApi.getPayoutDetails(payoutId);
      if (res?.success) {
        setPayout(res.data);
      } else {
        setError(res?.message || 'Failed to load payout details');
      }
    } catch (err) {
      console.error('Failed to load payout details:', err);
      setError('Failed to load payout details');
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
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'canceled': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon />;
      case 'pending': return <ScheduleIcon />;
      case 'failed': return <ErrorIcon />;
      case 'canceled': return <CancelIcon />;
      default: return <AccountBalanceIcon />;
    }
  };

  const handleCancel = async () => {
    if (!payout || payout.status !== 'pending') return;
    if (!confirm('Are you sure you want to cancel this payout?')) return;
    
    try {
      setCanceling(true);
      const res = await AdminExtraApi.cancelPayout(payout.id);
      if (res?.success) {
        setPayout(res.data);
      } else {
        setError(res?.message || 'Failed to cancel payout');
      }
    } catch (err) {
      console.error('Failed to cancel payout:', err);
      setError('Failed to cancel payout');
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

  if (!payout) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Payout not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link 
          color="inherit" 
          href="/payouts" 
          onClick={(e) => { e.preventDefault(); router.push('/payouts'); }}
          sx={{ cursor: 'pointer' }}
        >
          Payouts
        </Link>
        <Typography color="text.primary">
          {payout.id}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/payouts')}
            variant="outlined"
          >
            Back to Payouts
          </Button>
          <Typography variant="h4">
            Payout Details
          </Typography>
        </Box>
        
        {payout.status === 'pending' && (
          <Button
            variant="outlined"
            color="error"
            onClick={handleCancel}
            disabled={canceling}
            startIcon={canceling ? <CircularProgress size={16} /> : <CancelIcon />}
          >
            {canceling ? 'Canceling...' : 'Cancel Payout'}
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Main Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                {getStatusIcon(payout.status)}
                <Typography variant="h5">
                  {formatCurrency(payout.amount, payout.currency)}
                </Typography>
                <Chip 
                  label={payout.status} 
                  color={getStatusColor(payout.status) as any}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">Payout ID:</Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {payout.id}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">Amount:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(payout.amount, payout.currency)}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">Currency:</Typography>
                  <Typography variant="body2">
                    {payout.currency?.toUpperCase()}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">Method:</Typography>
                  <Typography variant="body2">
                    {payout.method || 'Standard'}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">Destination:</Typography>
                  <Typography variant="body2">
                    {payout.destination || 'Default Account'}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="textSecondary">Created:</Typography>
                  <Typography variant="body2">
                    {new Date(payout.created * 1000).toLocaleString()}
                  </Typography>
                </Box>

                {payout.arrival_date && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="textSecondary">Expected Arrival:</Typography>
                    <Typography variant="body2">
                      {new Date(payout.arrival_date * 1000).toLocaleString()}
                    </Typography>
                  </Box>
                )}

                {payout.description && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Description:
                      </Typography>
                      <Typography variant="body2">
                        {payout.description}
                      </Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
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
                    {getStatusIcon(payout.status)}
                    <Typography variant="body1" fontWeight="bold">
                      {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                    </Typography>
                  </Box>
                </Box>

                {payout.status === 'pending' && (
                  <Alert severity="info">
                    This payout is being processed and should arrive within 1-2 business days.
                  </Alert>
                )}

                {payout.status === 'paid' && (
                  <Alert severity="success">
                    This payout has been successfully processed and sent.
                  </Alert>
                )}

                {payout.status === 'failed' && (
                  <Alert severity="error">
                    This payout failed to process. Please check the destination account details.
                  </Alert>
                )}

                {payout.status === 'canceled' && (
                  <Alert severity="warning">
                    This payout was canceled and will not be processed.
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Metadata */}
          {payout.metadata && Object.keys(payout.metadata).length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Metadata
                </Typography>
                <Stack spacing={1}>
                  {Object.entries(payout.metadata).map(([key, value]) => (
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
