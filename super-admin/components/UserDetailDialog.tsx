// Fixed syntax errors and type issues
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  CircularProgress,
  Stack,
  TextField,
  Tab,
  Tabs
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  ShoppingCart as OrderIcon,
  Store as ProductIcon,
  AttachMoney as RevenueIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Send as SendIcon,
  History as HistoryIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { AdminApi } from '../src/services/api';

interface User {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  bio?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  role: string;
  kycStatus: string;
  isSuspended: boolean;
  isVerified: boolean;
  isDeleted?: boolean;
  createdAt: string;
  lastLoginAt?: string;
  productCount: number;
  activeProductCount: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}

interface UserDetailDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  onUserUpdated?: () => void;
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-detail-tabpanel-${index}`}
      aria-labelledby={`user-detail-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export default function UserDetailDialog({ open, onClose, userId, onUserUpdated }: UserDetailDialogProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<User>>({});
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', message: '' });
  const [activity, setActivity] = useState<any[]>([]);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);

  useEffect(() => {
    if (open && userId) {
      fetchUserDetails();
    }
  }, [open, userId]);

  const fetchUserDetails = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      // Use the available getUser method instead of getUserDetails
      const [userRes, emailRes] = await Promise.all([
        AdminApi.getUser(userId),
        AdminApi.getUserEmailHistory(userId, 10)
      ]);

      if (userRes?.success) {
        setUser(userRes.data);
        setEditData(userRes.data);
      }
      
      if (emailRes?.success) {
        setEmailHistory(emailRes.data || []);
      }
      
      // Set activity to empty array since there's no getUserActivity method
      setActivity([]);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      const res = await AdminApi.updateUser(user._id, editData);
      if (res?.success) {
        setUser(res.data);
        setEditMode(false);
        onUserUpdated?.();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    try {
      const res = await AdminApi.deleteUser(user._id);
      if (res?.success) {
        onUserUpdated?.();
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleRestore = async () => {
    if (!user) return;
    
    try {
      const res = await AdminApi.restoreUser(user._id);
      if (res?.success) {
        setUser(res.data);
        onUserUpdated?.();
      }
    } catch (error) {
      console.error('Failed to restore user:', error);
    }
  };

  const handleSendEmail = async () => {
    if (!user) return;
    
    try {
      const res = await AdminApi.sendUserEmail(user._id, emailData);
      if (res?.success) {
        setEmailDialogOpen(false);
        setEmailData({ subject: '', message: '' });
        // Refresh email history
        const emailRes = await AdminApi.getUserEmailHistory(user._id, 10);
        if (emailRes?.success) {
          setEmailHistory(emailRes.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to send email:', error);
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

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">User Details</Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : user ? (
            <>
              {/* User Header */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ width: 64, height: 64, mr: 2 }}>
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{user.username}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip label={user.role} color="primary" size="small" />
                        <Chip 
                          label={user.kycStatus || 'none'} 
                          color={user.kycStatus === 'approved' ? 'success' : 'default'} 
                          size="small" 
                        />
                        {user.isSuspended && (
                          <Chip label="Suspended" color="error" size="small" />
                        )}
                        {user.isDeleted && (
                          <Chip label="Deleted" color="error" size="small" />
                        )}
                      </Stack>
                    </Box>
                    <Box>
                      <Tooltip title="Send Email">
                        <IconButton onClick={() => setEmailDialogOpen(true)}>
                          <SendIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit User">
                        <IconButton onClick={() => setEditMode(!editMode)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {user.isDeleted ? (
                        <Tooltip title="Restore User">
                          <IconButton onClick={handleRestore} color="success">
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Delete User">
                          <IconButton onClick={() => handleDelete()} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {/* Quick Stats */}
                  <Grid container spacing={2}>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6">{user.totalOrders}</Typography>
                        <Typography variant="caption">Orders</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6">{user.productCount}</Typography>
                        <Typography variant="caption">Products</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6">{formatCurrency(user.totalRevenue)}</Typography>
                        <Typography variant="caption">Revenue</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h6">{formatDate(user.createdAt)}</Typography>
                        <Typography variant="caption">Joined</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                  <Tab label="Profile" />
                  <Tab label="Activity" />
                  <Tab label="Email History" />
                </Tabs>
              </Box>

              {/* Profile Tab */}
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Personal Information</Typography>
                    {editMode ? (
                      <Stack spacing={2}>
                        <TextField
                          label="Username"
                          value={editData.username || ''}
                          onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                          fullWidth
                        />
                        <TextField
                          label="Email"
                          value={editData.email || ''}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          fullWidth
                        />
                        <TextField
                          label="Full Name"
                          value={editData.fullName || ''}
                          onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                          fullWidth
                        />
                        <TextField
                          label="Phone"
                          value={editData.phone || ''}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          fullWidth
                        />
                        <TextField
                          label="Bio"
                          value={editData.bio || ''}
                          onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                          multiline
                          rows={3}
                          fullWidth
                        />
                      </Stack>
                    ) : (
                      <List>
                        <ListItem>
                          <ListItemIcon><PersonIcon /></ListItemIcon>
                          <ListItemText 
                            primary="Full Name" 
                            secondary={user.fullName || 'Not provided'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><EmailIcon /></ListItemIcon>
                          <ListItemText primary="Email" secondary={user.email} />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><PhoneIcon /></ListItemIcon>
                          <ListItemText 
                            primary="Phone" 
                            secondary={user.phone || 'Not provided'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CalendarIcon /></ListItemIcon>
                          <ListItemText 
                            primary="Last Login" 
                            secondary={user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'} 
                          />
                        </ListItem>
                      </List>
                    )}
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Activity Tab */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" gutterBottom>Recent Activity</Typography>
                <List>
                  {activity.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {item.type === 'order' ? <OrderIcon /> : <ProductIcon />}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.description}
                        secondary={formatDate(item.createdAt)}
                      />
                    </ListItem>
                  ))}
                  {activity.length === 0 && (
                    <ListItem>
                      <ListItemText primary="No recent activity" />
                    </ListItem>
                  )}
                </List>
              </TabPanel>

              {/* Email History Tab */}
              <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" gutterBottom>Email History</Typography>
                <List>
                  {emailHistory.map((email, index) => (
                    <ListItem key={index}>
                      <ListItemIcon><EmailIcon /></ListItemIcon>
                      <ListItemText
                        primary={email.subject}
                        secondary={`Sent: ${formatDate(email.sentAt)} • Status: ${email.status}`}
                      />
                    </ListItem>
                  ))}
                  {emailHistory.length === 0 && (
                    <ListItem>
                      <ListItemText primary="No email history" />
                    </ListItem>
                  )}
                </List>
              </TabPanel>
            </>
          ) : (
            <Typography>User not found</Typography>
          )}
        </DialogContent>

        <DialogActions>
          {editMode && (
            <>
              <Button onClick={() => setEditMode(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleSave}>Save Changes</Button>
            </>
          )}
          {!editMode && (
            <Button onClick={onClose}>Close</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Email to {user?.username}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Subject"
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
              fullWidth
            />
            <TextField
              label="Message"
              value={emailData.message}
              onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
              multiline
              rows={6}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSendEmail}
            disabled={!emailData.subject || !emailData.message}
          >
            Send Email
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
