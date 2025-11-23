import React, { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Avatar from '@mui/material/Avatar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Pagination from '@mui/material/Pagination';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Visibility as ViewIcon,
  PersonOff as SuspendIcon,
  PersonAdd as UnsuspendIcon,
  Verified as VerifiedIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';
import { AdminExtraApi } from '@/services/adminExtra';
import VendorDashboard from '../components/VendorDashboard';
import VendorChatInterface from '../components/VendorChatInterface';

interface Vendor {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  kycStatus: string;
  isSuspended: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  productCount: number;
  activeProductCount: number;
  totalSales: number;
  totalRevenue: number;
  avgOrderValue: number;
}

interface VendorStats {
  totalSales: number;
  totalRevenue: number;
}

interface VendorFees {
  fees: number;
  revenue: number;
  feeRate: number;
}

const KYC_STATUSES = ['none', 'pending', 'approved', 'rejected'];
const KYC_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  none: 'default',
  pending: 'warning',
  approved: 'success',
  rejected: 'error'
};

const VENDOR_STATUSES = ['all', 'active', 'suspended'];

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vendor-tabpanel-${index}`}
      aria-labelledby={`vendor-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function VendorsAdmin() {
  const router = useRouter();
  const guard = useAdminGuard();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [newKycStatus, setNewKycStatus] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [vendorStats, setVendorStats] = useState<Record<string, VendorStats>>({});
  const [vendorFees, setVendorFees] = useState<Record<string, VendorFees>>({});
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [tabValue, setTabValue] = useState(0);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      // Use listUsers with role filter instead of non-existent listVendors
      if (!AdminApi || typeof AdminApi.listUsers !== 'function') {
        console.error('AdminApi.listUsers is not available');
        return;
      }
      const res = await AdminApi.listUsers({
        page,
        limit,
        search: search || undefined,
        kycStatus: kycFilter || undefined,
        status: statusFilter || undefined,
        role: 'vendor' // Filter for vendors only
      });
      if (res?.success) {
        setVendors(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Guard checks within useEffect
    if (!guard || guard.loading || !guard.allowed) {
      return;
    }
    
    fetchVendors();
  }, [page, limit, guard.allowed, guard.loading]);

  const handleKycUpdate = async () => {
    if (!selectedVendor || !newKycStatus) return;
    
    try {
      // Use setKyc from AdminExtraApi instead of non-existent updateUserKyc
      if (!AdminExtraApi || typeof AdminExtraApi.setKyc !== 'function') {
        console.error('AdminExtraApi.setKyc is not available');
        return;
      }
      const res = await AdminExtraApi.setKyc(selectedVendor._id, newKycStatus as 'approved'|'rejected'|'pending'|'none');
      if (res?.success) {
        setKycDialogOpen(false);
        setSelectedVendor(null);
        setNewKycStatus('');
        fetchVendors();
      }
    } catch (error) {
      console.error('Failed to update KYC status:', error);
    }
  };

  const handleSuspendToggle = async (vendor: Vendor) => {
    try {
      // Use suspendUser/unsuspendUser from AdminExtraApi instead of non-existent suspend/unsuspend methods
      if (!AdminExtraApi || typeof AdminExtraApi.suspendUser !== 'function' || typeof AdminExtraApi.unsuspendUser !== 'function') {
        console.error('AdminExtraApi suspend/unsuspend methods are not available');
        return;
      }
      const res = vendor.isSuspended
        ? await AdminExtraApi.unsuspendUser(vendor._id)
        : await AdminExtraApi.suspendUser(vendor._id);

      if (res?.success) {
        fetchVendors();
        setSuspendDialogOpen(false);
        setSuspendReason('');
      }
    } catch (error) {
      console.error('Failed to toggle suspension:', error);
    }
  };

  const openSuspendDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setSuspendDialogOpen(true);
  };

  const openKycDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setNewKycStatus(vendor.kycStatus);
    setKycDialogOpen(true);
  };

  const openChatDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setChatDialogOpen(true);
  };

  const closeChatDialog = () => {
    setChatDialogOpen(false);
    setSelectedVendor(null);
  };

  const handleViewVendor = (vendorId: string) => {
    router.push(`/vendors/${vendorId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Guard checks in the render function
  if (!guard) {
    return <div style={{ padding: 20 }}>Initializing...</div>;
  }

  if (guard.loading) {
    return <div style={{ padding: 20 }}>Checking access…</div>;
  }

  if (!guard.allowed) {
    return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;
  }

  // Calculate summary stats
  const totalVendors = pagination.total;
  const approvedVendors = vendors.filter(v => v.kycStatus === 'approved').length;
  const suspendedVendors = vendors.filter(v => v.isSuspended).length;
  const totalRevenue = Object.values(vendorStats).reduce((sum, stats) => sum + (stats.totalRevenue || 0), 0);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>Vendor Management</Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Dashboard" />
          <Tab label="Vendor List" />
        </Tabs>
      </Box>

      {/* Dashboard Tab */}
      <TabPanel value={tabValue} index={0}>
        <VendorDashboard onRefresh={fetchVendors} />
      </TabPanel>

      {/* Vendor List Tab */}
      <TabPanel value={tabValue} index={1}>
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              label="Search Vendors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <TextField
              label="KYC Status"
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              select
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {KYC_STATUSES.map(status => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              select
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </TextField>
            <Button variant="contained" onClick={() => { setPage(1); fetchVendors(); }}>
              Apply Filters
            </Button>
          </Stack>
        </Paper>

        {/* Vendors Table */}
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor</TableCell>
                <TableCell>Products</TableCell>
                <TableCell>KYC Status</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Sales</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No vendors found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow key={vendor._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                          {vendor.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {vendor.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {vendor.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={vendor.kycStatus} 
                        color={KYC_COLORS[vendor.kycStatus] || 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={vendor.isSuspended ? 'Suspended' : 'Active'} 
                        color={vendor.isSuspended ? 'error' : 'success'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {vendor.totalSales || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(vendor.totalRevenue || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(vendor.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" onClick={() => handleViewVendor(vendor._id)}>
                          <ViewIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => openKycDialog(vendor)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => openChatDialog(vendor)}>
                          <ChatIcon />
                        </IconButton>
                        <Tooltip title={vendor.isSuspended ? 'Unsuspend' : 'Suspend'}>
                          <IconButton
                            size="small"
                            onClick={() => openSuspendDialog(vendor)}
                            color={vendor.isSuspended ? 'success' : 'error'}
                          >
                            {vendor.isSuspended ? <UnsuspendIcon /> : <SuspendIcon />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <Pagination
            count={pagination.pages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
        </Paper>
      </TabPanel>

      {/* KYC Update Dialog */}
      <Dialog open={kycDialogOpen} onClose={() => setKycDialogOpen(false)}>
        <DialogTitle>Update KYC Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              Vendor: {selectedVendor?.username}
            </Typography>
            <TextField
              label="KYC Status"
              value={newKycStatus}
              onChange={(e) => setNewKycStatus(e.target.value)}
              select
              fullWidth
              sx={{ mt: 2 }}
            >
              {KYC_STATUSES.map(status => (
                <MenuItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKycDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleKycUpdate}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)}>
        <DialogTitle>
          {selectedVendor?.isSuspended ? 'Unsuspend Vendor' : 'Suspend Vendor'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              Vendor: {selectedVendor?.username}
            </Typography>
            {!selectedVendor?.isSuspended && (
              <TextField
                label="Suspension Reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                fullWidth
                multiline
                rows={3}
                sx={{ mt: 2 }}
                placeholder="Enter reason for suspension..."
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={selectedVendor?.isSuspended ? 'success' : 'error'}
            onClick={() => selectedVendor && handleSuspendToggle(selectedVendor)}
          >
            {selectedVendor?.isSuspended ? 'Unsuspend' : 'Suspend'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chat Dialog */}
      {selectedVendor && (
        <VendorChatInterface
          vendor={selectedVendor}
          open={chatDialogOpen}
          onClose={closeChatDialog}
        />
      )}
    </Container>
  );
}