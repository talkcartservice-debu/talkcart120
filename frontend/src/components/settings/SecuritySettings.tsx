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
  useMediaQuery,
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
import { useTheme } from '@mui/material/styles';

export const SecuritySettings: React.FC = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
      <Typography 
        variant="h6" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem' }
        }}
      >
        Security Settings
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        paragraph
        sx={{
          fontSize: { xs: '0.875rem', sm: '1rem' }
        }}
      >
        Manage your account security and privacy settings.
      </Typography>

      {/* Security Overview */}
      <Card sx={{ mb: 3, bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography 
            variant="subtitle2" 
            fontWeight={600} 
            gutterBottom
            sx={{
              fontSize: { xs: '1rem', sm: '1.125rem' }
            }}
          >
            <Shield size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Security Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={securitySettings.twoFactorEnabled ? '2FA Enabled' : '2FA Disabled'}
              color={securitySettings.twoFactorEnabled ? 'success' : 'warning'}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
            <Chip 
              label={`Timeout: ${securitySettings.sessionTimeout} min`}
              icon={<Clock size={14} />}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
            <Chip 
              label={securitySettings.loginNotifications ? 'Notifications On' : 'Notifications Off'}
              color={securitySettings.loginNotifications ? 'success' : 'default'}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.75rem' }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Key size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Two-Factor Authentication
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Smartphone size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Two-Factor Authentication"
            secondary="Add an extra layer of security to your account"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
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
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Shield size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Login Notifications"
            secondary="Receive notifications when your account is accessed"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={securitySettings.loginNotifications}
            onChange={(e) => handleSecuritySettingChange('loginNotifications', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Session Management */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Monitor size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Session Management
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Session Timeout"
            secondary="Automatically log out after inactivity"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <ButtonGroup 
            size="small" 
            sx={{ 
              flexWrap: 'wrap',
              gap: { xs: 0.5, sm: 0 },
              '& .MuiButton-root': {
                fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                minWidth: { xs: 60, sm: 'auto' },
                px: { xs: 0.75, sm: 1 }
              }
            }}
          >
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

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Monitor size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Active Sessions"
            secondary="Manage devices currently logged into your account"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Button 
            variant="outlined" 
            onClick={() => setShowSessionDialog(true)}
            size="small"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              alignSelf: { xs: 'flex-end', sm: 'auto' }
            }}
          >
            View
          </Button>
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Account Management */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <LogOut size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Account Management
      </Typography>

      <List>
        <ListItem disablePadding sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemButton onClick={handleChangePassword} sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}>
            <ListItemIcon>
              <Key size={24} />
            </ListItemIcon>
            <ListItemText
              primary="Change Password"
              secondary="Update your account password"
            />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemButton onClick={handleExportData} sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}>
            <ListItemIcon>
              <Download size={24} />
            </ListItemIcon>
            <ListItemText
              primary="Export Data"
              secondary="Download a copy of your account data"
            />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemButton onClick={handleDeleteAccount} sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}>
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
        <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          Deleting your account is permanent and cannot be undone.
        </Typography>
      </Alert>

      {/* 2FA Dialog */}
      <Dialog 
        open={show2FADialog} 
        onClose={() => setShow2FADialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle 
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' }
          }}
        >
          Enable Two-Factor Authentication
        </DialogTitle>
        <DialogContent>
          <Typography 
            variant="body2" 
            paragraph
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Scan the QR code with your authenticator app and enter the code below:
          </Typography>
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <Box 
              sx={{ 
                width: { xs: 120, sm: 150 }, 
                height: { xs: 120, sm: 150 }, 
                bgcolor: 'grey.200', 
                display: 'inline-block',
                borderRadius: 1
              }}
            >
              {/* QR Code would be displayed here */}
              <Typography 
                variant="body2" 
                sx={{ 
                  pt: { xs: 4, sm: 6 },
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              >
                QR CODE
              </Typography>
            </Box>
          </Box>
          <TextField
            fullWidth
            label="Authentication Code"
            placeholder="Enter 6-digit code"
            margin="normal"
            size="small"
            sx={{
              '& .MuiInputBase-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              },
              '& .MuiFormLabel-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
          />
        </DialogContent>
        <DialogActions 
          sx={{
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}
        >
          <Button 
            onClick={() => setShow2FADialog(false)}
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm2FA} 
            variant="contained"
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Enable 2FA
          </Button>
        </DialogActions>
      </Dialog>

      {/* Session Dialog */}
      <Dialog 
        open={showSessionDialog} 
        onClose={() => setShowSessionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle 
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' }
          }}
        >
          Active Sessions
        </DialogTitle>
        <DialogContent>
          <Typography 
            variant="body2" 
            paragraph
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            These devices are currently logged into your account:
          </Typography>
          {securitySettings.recentDevices && securitySettings.recentDevices.length > 0 ? (
            <List>
              {securitySettings.recentDevices.map((device: any, index: number) => (
                <ListItem key={index} divider sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
                  <ListItemText
                    primary={device.deviceName || 'Unknown Device'}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          {device.ipAddress}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" color="textSecondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                          Last active: {new Date(device.lastLogin).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  <Button 
                    size="small" 
                    color="error"
                    sx={{
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      alignSelf: { xs: 'flex-end', sm: 'auto' }
                    }}
                  >
                    Logout
                  </Button>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography 
              variant="body2" 
              color="textSecondary"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              No active sessions found
            </Typography>
          )}
        </DialogContent>
        <DialogActions 
          sx={{
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}
        >
          <Button 
            onClick={() => setShowSessionDialog(false)}
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Close
          </Button>
          <Button 
            color="error"
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Logout All Devices
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Data Dialog */}
      <Dialog 
        open={showExportDialog} 
        onClose={() => setShowExportDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle 
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' }
          }}
        >
          Export Account Data
        </DialogTitle>
        <DialogContent>
          <Typography 
            variant="body2" 
            paragraph
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            To export your data, please confirm your password:
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="Current Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            size="small"
            sx={{
              '& .MuiInputBase-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              },
              '& .MuiFormLabel-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteAccount}
                onChange={(e) => setDeleteAccount(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography 
                variant="body2" 
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }}
              >
                I understand this is for data export only
              </Typography>
            }
          />
        </DialogContent>
        <DialogActions 
          sx={{
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}
        >
          <Button 
            onClick={() => setShowExportDialog(false)}
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmExport} 
            variant="contained"
            disabled={!confirmPassword || !deleteAccount}
            fullWidth={isMobile}
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            Export Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};