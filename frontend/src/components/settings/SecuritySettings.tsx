import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  Button,
  ButtonGroup,
  Divider,
  Card,
  CardContent,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Shield,
  Key,
  Smartphone,
  Clock,
  Monitor,
  LogOut,
  Download,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const SecuritySettings: React.FC = () => {
  const { user, logout } = useAuth();
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteAccount, setDeleteAccount] = useState(false);

  // Default security settings from user model
  const securitySettings = {
    twoFactorEnabled: false,
    loginNotifications: true,
    sessionTimeout: 30,
    recentDevices: []
  };

  const handleSecuritySettingChange = (key: string, value: any) => {
    if (!user) return;
    
    const updatedSettings = {
      ...user.settings,
      security: {
        ...securitySettings,
        [key]: value
      }
    };
    
    // In a real implementation, this would update the backend
    console.log('Updating security setting:', key, value);
    // updateUser({ settings: updatedSettings });
  };

  const handleEnable2FA = () => {
    setShow2FADialog(true);
  };

  const handleConfirm2FA = () => {
    handleSecuritySettingChange('twoFactorEnabled', true);
    setShow2FADialog(false);
  };

  const handleSessionTimeoutChange = (timeout: number) => {
    handleSecuritySettingChange('sessionTimeout', timeout);
  };

  const handleExportData = () => {
    setShowExportDialog(true);
  };

  const handleConfirmExport = () => {
    // In a real implementation, this would trigger data export
    alert('Data export functionality would be implemented here');
    setShowExportDialog(false);
  };

  const handleChangePassword = () => {
    // Redirect to password change page
    window.location.href = '/settings/account';
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // In a real implementation, this would delete the account
      alert('Account deletion functionality would be implemented here');
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Security Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Manage your account security and privacy settings.
      </Typography>

      {/* Security Overview */}
      <Card sx={{ mb: 3, bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            <Shield size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Security Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={securitySettings.twoFactorEnabled ? '2FA Enabled' : '2FA Disabled'}
              color={securitySettings.twoFactorEnabled ? 'success' : 'warning'}
              size="small"
            />
            <Chip 
              label={`Timeout: ${securitySettings.sessionTimeout} min`}
              icon={<Clock size={14} />}
              size="small"
            />
            <Chip 
              label={securitySettings.loginNotifications ? 'Notifications On' : 'Notifications Off'}
              color={securitySettings.loginNotifications ? 'success' : 'default'}
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <Key size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Two-Factor Authentication
      </Typography>

      <List>
        <ListItem>
          <ListItemIcon>
            <Smartphone size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Two-Factor Authentication"
            secondary="Add an extra layer of security to your account"
          />
          <Switch
            checked={securitySettings.twoFactorEnabled}
            onChange={(e) => {
              if (e.target.checked) {
                handleEnable2FA();
              } else {
                handleSecuritySettingChange('twoFactorEnabled', false);
              }
            }}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <Shield size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Login Notifications"
            secondary="Receive notifications when your account is accessed"
          />
          <Switch
            checked={securitySettings.loginNotifications}
            onChange={(e) => handleSecuritySettingChange('loginNotifications', e.target.checked)}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Session Management */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <Monitor size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Session Management
      </Typography>

      <List>
        <ListItem>
          <ListItemText
            primary="Session Timeout"
            secondary="Automatically log out after inactivity"
          />
          <ButtonGroup size="small">
            <Button
              variant={securitySettings.sessionTimeout === 15 ? 'contained' : 'outlined'}
              onClick={() => handleSessionTimeoutChange(15)}
            >
              15 min
            </Button>
            <Button
              variant={securitySettings.sessionTimeout === 30 ? 'contained' : 'outlined'}
              onClick={() => handleSessionTimeoutChange(30)}
            >
              30 min
            </Button>
            <Button
              variant={securitySettings.sessionTimeout === 60 ? 'contained' : 'outlined'}
              onClick={() => handleSessionTimeoutChange(60)}
            >
              1 hr
            </Button>
          </ButtonGroup>
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <Monitor size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Active Sessions"
            secondary="Manage devices currently logged into your account"
          />
          <Button 
            variant="outlined" 
            onClick={() => setShowSessionDialog(true)}
          >
            View
          </Button>
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Account Management */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <LogOut size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Account Management
      </Typography>

      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleChangePassword}>
          <ListItemIcon>
            <Key size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Change Password"
            secondary="Update your account password"
          />
        </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton onClick={handleExportData}>
          <ListItemIcon>
            <Download size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Export Data"
            secondary="Download a copy of your account data"
          />
        </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton onClick={handleDeleteAccount}>
          <ListItemIcon>
            <LogOut size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Delete Account"
            secondary="Permanently delete your account and all data"
          />
        </ListItemButton>
        </ListItem>
      </List>

      <Alert severity="warning" sx={{ mt: 3 }}>
        Deleting your account is permanent and cannot be undone.
      </Alert>

      {/* 2FA Dialog */}
      <Dialog open={show2FADialog} onClose={() => setShow2FADialog(false)}>
        <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Scan the QR code with your authenticator app and enter the code below:
          </Typography>
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <Box 
              sx={{ 
                width: 150, 
                height: 150, 
                bgcolor: 'grey.200', 
                display: 'inline-block',
                borderRadius: 1
              }}
            >
              {/* QR Code would be displayed here */}
              <Typography variant="body2" sx={{ pt: 6 }}>
                QR CODE
              </Typography>
            </Box>
          </Box>
          <TextField
            fullWidth
            label="Authentication Code"
            placeholder="Enter 6-digit code"
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShow2FADialog(false)}>Cancel</Button>
          <Button onClick={handleConfirm2FA} variant="contained">Enable 2FA</Button>
        </DialogActions>
      </Dialog>

      {/* Session Dialog */}
      <Dialog open={showSessionDialog} onClose={() => setShowSessionDialog(false)}>
        <DialogTitle>Active Sessions</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            These devices are currently logged into your account:
          </Typography>
          {securitySettings.recentDevices && securitySettings.recentDevices.length > 0 ? (
            <List>
              {securitySettings.recentDevices.map((device: any, index: number) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={device.deviceName || 'Unknown Device'}
                    secondary={
                      <>
                        <Typography component="span" variant="body2">
                          {device.ipAddress}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" color="textSecondary">
                          Last active: {new Date(device.lastLogin).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  <Button size="small" color="error">Logout</Button>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No active sessions found
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSessionDialog(false)}>Close</Button>
          <Button color="error">Logout All Devices</Button>
        </DialogActions>
      </Dialog>

      {/* Export Data Dialog */}
      <Dialog open={showExportDialog} onClose={() => setShowExportDialog(false)}>
        <DialogTitle>Export Account Data</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            To export your data, please confirm your password:
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="Current Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteAccount}
                onChange={(e) => setDeleteAccount(e.target.checked)}
              />
            }
            label="I understand this is for data export only"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmExport} 
            variant="contained"
            disabled={!confirmPassword || !deleteAccount}
          >
            Export Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};