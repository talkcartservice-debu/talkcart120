import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Stack,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminExtraApi } from '@/services/adminExtra';

interface CommissionReport {
  vendors: Array<{
    _id: string;
    vendorName: string;
    vendorEmail: string;
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
  }>;
  totals: {
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
  };
  commissionRate: number;
  period: string;
}

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' }
];

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`commission-tabpanel-${index}`}
      aria-labelledby={`commission-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function CommissionReportAdmin() {
  const guard = useAdminGuard();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<CommissionReport | null>(null);
  const [period, setPeriod] = useState('30d');
  const [error, setError] = useState('');

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await AdminExtraApi.getCommissionReport({ period });
      
      if (result?.success) {
        setReport(result.data);
      } else {
        throw new Error(result?.message || 'Failed to fetch commission report');
      }
    } catch (err: any) {
      console.error('Failed to fetch commission report:', err);
      setError(err.message || 'Failed to fetch commission report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period]);

  // Guard checks after all hooks are defined
  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Commission Report</Typography>
        <Typography>Loading commission report...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Commission Report</Typography>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!report) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" gutterBottom>Commission Report</Typography>
        <Typography color="error">Failed to load commission report</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Commission Report
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchReport}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Revenue</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(report.totals.totalRevenue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {report.totals.totalOrders} orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MoneyIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Commission</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(report.totals.totalCommission)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatPercentage(report.commissionRate)} commission rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Avg. Order Value</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {report.totals.totalOrders > 0 
                  ? formatCurrency(report.totals.totalRevenue / report.totals.totalOrders) 
                  : formatCurrency(0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across all vendors
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Commission Rate</Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                {formatPercentage(report.commissionRate)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Platform commission
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Controls */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body1">Time Period:</Typography>
              <TextField
                select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                size="small"
                sx={{ minWidth: 150 }}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Paper>
        </Grid>

        {/* Vendor Commission Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vendor Commission Breakdown
              </Typography>
              {report.vendors.length === 0 ? (
                <Typography color="textSecondary">No vendor data available</Typography>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Vendor</TableCell>
                      <TableCell align="right">Orders</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Commission Rate</TableCell>
                      <TableCell align="right">Commission Earned</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.vendors.map((vendor) => (
                      <TableRow key={vendor._id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {vendor.vendorName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {vendor.vendorEmail}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {vendor.totalOrders}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatCurrency(vendor.totalRevenue)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={formatPercentage(report.commissionRate)} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold">
                            {formatCurrency(vendor.totalCommission)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow sx={{ borderTop: '2px solid #ccc' }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          TOTAL
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {report.totals.totalOrders}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(report.totals.totalRevenue)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={formatPercentage(report.commissionRate)} 
                          size="small" 
                          color="primary" 
                          variant="filled" 
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(report.totals.totalCommission)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
