import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Stack,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  PersonAdd as PersonAddIcon,
  AttachMoney as MoneyIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { AdminApi } from '../src/services/api';

interface VendorSummary {
  total_vendors: number;
  active_vendors: number;
  kyc_approved: number;
  recent_signups: number;
  suspended_vendors: number;
}

interface VendorDashboardProps {
  timeRange?: string;
  onRefresh?: () => void;
}

export default function VendorDashboard({ timeRange = '30d', onRefresh }: VendorDashboardProps) {
  const [summary, setSummary] = useState<VendorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch vendors with different filters to get summary data
      const [allVendorsRes, activeVendorsRes, suspendedVendorsRes, kycApprovedRes] = await Promise.all([
        AdminApi.listUsers({ role: 'vendor' }),
        AdminApi.listUsers({ role: 'vendor', status: 'active' }),
        AdminApi.listUsers({ role: 'vendor', status: 'suspended' }),
        AdminApi.listUsers({ role: 'vendor', kycStatus: 'approved' })
      ]);

      if (allVendorsRes?.success && activeVendorsRes?.success && suspendedVendorsRes?.success && kycApprovedRes?.success) {
        const totalVendors = allVendorsRes.data?.length || 0;
        const activeVendors = activeVendorsRes.data?.length || 0;
        const suspendedVendors = suspendedVendorsRes.data?.length || 0;
        const kycApproved = kycApprovedRes.data?.length || 0;
        
        // Calculate recent signups (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentSignups = allVendorsRes.data?.filter((vendor: any) => 
          new Date(vendor.createdAt) > oneDayAgo
        ).length || 0;

        setSummary({
          total_vendors: totalVendors,
          active_vendors: activeVendors,
          kyc_approved: kycApproved,
          recent_signups: recentSignups,
          suspended_vendors: suspendedVendors
        });
      }
    } catch (err) {
      console.error('Failed to fetch vendor dashboard data:', err);
      setError('Failed to load vendor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const handleRefresh = () => {
    fetchData();
    onRefresh?.();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Vendor Analytics Dashboard
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  if (!summary) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Vendor Analytics Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {/* Total Vendors */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'primary.main',
                    color: 'white'
                  }}
                >
                  <PeopleIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Vendors
                  </Typography>
                  <Typography variant="h4">
                    {summary.total_vendors || 0}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    +{summary.recent_signups} new (24h)
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Vendors */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'success.main',
                    color: 'white'
                  }}
                >
                  <CheckCircleIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Active Vendors
                  </Typography>
                  <Typography variant="h4">
                    {summary.active_vendors || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.total_vendors > 0 
                      ? formatPercentage((summary.active_vendors / summary.total_vendors) * 100)
                      : '0%'} of total
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* KYC Approved */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'info.main',
                    color: 'white'
                  }}
                >
                  <AssessmentIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    KYC Approved
                  </Typography>
                  <Typography variant="h4">
                    {summary.kyc_approved || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.total_vendors > 0 
                      ? formatPercentage((summary.kyc_approved / summary.total_vendors) * 100)
                      : '0%'} approval rate
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Suspended Vendors */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: 'error.main',
                    color: 'white'
                  }}
                >
                  <BlockIcon />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Suspended
                  </Typography>
                  <Typography variant="h4">
                    {summary.suspended_vendors || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.total_vendors > 0 
                      ? formatPercentage((summary.suspended_vendors / summary.total_vendors) * 100)
                      : '0%'} of total
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PersonAddIcon color="success" />
                  <Typography variant="body2" color="text.secondary">
                    Recent Signups (24h)
                  </Typography>
                </Stack>
                <Typography variant="h5">
                  {summary.recent_signups}
                </Typography>
                <Chip 
                  label={summary.recent_signups > 0 ? 'Active Growth' : 'No New Signups'}
                  color={summary.recent_signups > 0 ? 'success' : 'default'}
                  size="small"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}