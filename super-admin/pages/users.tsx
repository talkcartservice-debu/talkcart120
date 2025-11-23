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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import Toolbar from '@mui/material/Toolbar';
import {
  Edit as EditIcon,
  Visibility as ViewIcon,
  PersonOff as SuspendIcon,
  PersonAdd as UnsuspendIcon,
  Verified as VerifiedIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Delete as DeleteIcon,
  SelectAll as SelectAllIcon
} from '@mui/icons-material';
import { useAdminGuard } from '@/services/useAdminGuard';
import { AdminApi } from '@/services/api';
import UserDashboard from '../components/UserDashboard';
import UserDetailDialog from '../components/UserDetailDialog';
import BulkEmailDialog from '../components/BulkEmailDialog';

interface User {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  role: string;
  kycStatus: string;
  isSuspended: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  productCount: number;
  activeProductCount: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}

const ROLES = ['all', 'user', 'vendor', 'moderator', 'admin'];
const KYC_STATUSES = ['all', 'none', 'pending', 'approved', 'rejected'];
const USER_STATUSES = ['all', 'active', 'suspended'];

const KYC_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  none: 'default',
  pending: 'warning',
  approved: 'success',
  rejected: 'error'
};

const ROLE_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  user: 'default',
  vendor: 'primary',
  moderator: 'info',
  admin: 'error'
};

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function UsersAdmin() {
  const guard = useAdminGuard();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [tabValue, setTabValue] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [bulkEmailDialogOpen, setBulkEmailDialogOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await AdminApi.listUsers({
        role: roleFilter || undefined,
        kycStatus: kycFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      if (res?.success) {
        setUsers(res.data || []);
        setPagination(res.pagination || { total: 0, pages: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (guard.allowed) {
      fetchUsers();
    }
  }, [guard.allowed, page, limit, search, roleFilter, kycFilter, statusFilter]);

  if (guard.loading) return <div style={{ padding: 20 }}>Checking access…</div>;
  if (!guard.allowed) return <div style={{ padding: 20, color: 'crimson' }}>{guard.error || 'Access denied'}</div>;

  const handleSuspendToggle = async (user: User) => {
    try {
      const res = user.isSuspended
        ? await AdminApi.unsuspendUser(user._id)
        : await AdminApi.suspendUser(user._id);

      if (res?.success) {
        fetchUsers();
        setSuspendDialogOpen(false);
        setSuspendReason('');
      }
    } catch (error) {
      console.error('Failed to toggle user suspension:', error);
    }
  };

  const openSuspendDialog = (user: User) => {
    setSelectedUser(user);
    setSuspendDialogOpen(true);
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleDialogOpen(true);
  };

  const openVerifyDialog = (user: User) => {
    setSelectedUser(user);
    setVerifyDialogOpen(true);
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser) return;

    try {
      const res = await AdminApi.updateUserRole(selectedUser._id, newRole);
      if (res?.success) {
        setRoleDialogOpen(false);
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const handleVerificationToggle = async (isVerified: boolean) => {
    if (!selectedUser) return;

    try {
      const res = await AdminApi.updateUserVerification(selectedUser._id, isVerified);
      if (res?.success) {
        setVerifyDialogOpen(false);
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update verification status:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const openUserDetail = (userId: string) => {
    setSelectedUserId(userId);
    setDetailDialogOpen(true);
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user._id));
    } else {
      setSelectedUsers([]);
    }
  };

  const openBulkEmail = () => {
    setBulkEmailDialogOpen(true);
  };

  const getSelectedUsersData = () => {
    return users.filter(user => selectedUsers.includes(user._id));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>User Management</Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Dashboard" />
          <Tab label="User List" />
        </Tabs>
      </Box>

      {/* Dashboard Tab */}
      <TabPanel value={tabValue} index={0}>
        <UserDashboard onRefresh={fetchUsers} />
      </TabPanel>

      {/* User List Tab */}
      <TabPanel value={tabValue} index={1}>
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField
              label="Search Users"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                label="Role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                {ROLES.map(role => (
                  <MenuItem key={role} value={role === 'all' ? '' : role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>KYC Status</InputLabel>
              <Select
                value={kycFilter}
                label="KYC Status"
                onChange={(e) => setKycFilter(e.target.value)}
              >
                {KYC_STATUSES.map(status => (
                  <MenuItem key={status} value={status === 'all' ? '' : status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {USER_STATUSES.map(status => (
                  <MenuItem key={status} value={status === 'all' ? '' : status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={() => { setPage(1); fetchUsers(); }}>
              Apply Filters
            </Button>
          </Stack>
        </Paper>

        {/* Bulk Actions Toolbar */}
        {selectedUsers.length > 0 && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="body2">
                {selectedUsers.length} user(s) selected
              </Typography>
              <Button
                variant="contained"
                startIcon={<EmailIcon />}
                onClick={openBulkEmail}
              >
                Send Bulk Email
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedUsers([])}
              >
                Clear Selection
              </Button>
            </Stack>
          </Paper>
        )}

        {/* Users Table */}
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                    checked={users.length > 0 && selectedUsers.length === users.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>KYC Status</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Orders</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedUsers.includes(user._id)}
                        onChange={(e) => handleUserSelection(user._id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                          {user.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={ROLE_COLORS[user.role] || 'default'}
                        size="small"
                        icon={user.role === 'admin' ? <AdminIcon /> : <PersonIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.kycStatus || 'none'}
                        color={KYC_COLORS[user.kycStatus] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={user.isSuspended ? 'Suspended' : 'Active'}
                          color={user.isSuspended ? 'error' : 'success'}
                          size="small"
                        />
                        {user.isVerified && (
                          <VerifiedIcon color="primary" fontSize="small" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {user.totalOrders || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(user.totalRevenue || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(user.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => openUserDetail(user._id)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Send Email">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedUsers([user._id]);
                              setBulkEmailDialogOpen(true);
                            }}
                          >
                            <EmailIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Role">
                          <IconButton
                            size="small"
                            onClick={() => openRoleDialog(user)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Toggle Verification">
                          <IconButton
                            size="small"
                            onClick={() => openVerifyDialog(user)}
                            color={user.isVerified ? 'primary' : 'default'}
                          >
                            <VerifiedIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.isSuspended ? 'Unsuspend' : 'Suspend'}>
                          <IconButton
                            size="small"
                            color={user.isSuspended ? 'success' : 'error'}
                            onClick={() => openSuspendDialog(user)}
                          >
                            {user.isSuspended ? <UnsuspendIcon /> : <SuspendIcon />}
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

      {/* Role Update Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogTitle>Update User Role</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              User: {selectedUser?.username}
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={newRole}
                label="Role"
                onChange={(e) => setNewRole(e.target.value)}
              >
                {ROLES.filter(role => role !== 'all').map(role => (
                  <MenuItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRoleUpdate}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={verifyDialogOpen} onClose={() => setVerifyDialogOpen(false)}>
        <DialogTitle>Update Verification Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              User: {selectedUser?.username}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Current status: {selectedUser?.isVerified ? 'Verified' : 'Not Verified'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleVerificationToggle(true)}
            disabled={selectedUser?.isVerified}
          >
            Verify
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handleVerificationToggle(false)}
            disabled={!selectedUser?.isVerified}
          >
            Unverify
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)}>
        <DialogTitle>
          {selectedUser?.isSuspended ? 'Unsuspend User' : 'Suspend User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              User: {selectedUser?.username}
            </Typography>
            {!selectedUser?.isSuspended && (
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
            color={selectedUser?.isSuspended ? 'success' : 'error'}
            onClick={() => selectedUser && handleSuspendToggle(selectedUser)}
          >
            {selectedUser?.isSuspended ? 'Unsuspend' : 'Suspend'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Detail Dialog */}
      <UserDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        userId={selectedUserId}
        onUserUpdated={fetchUsers}
      />

      {/* Bulk Email Dialog */}
      <BulkEmailDialog
        open={bulkEmailDialogOpen}
        onClose={() => setBulkEmailDialogOpen(false)}
        selectedUsers={getSelectedUsersData()}
      />
    </Container>
  );
}