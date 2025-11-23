import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Button,
  ButtonGroup,
  Divider,
  Card,
  CardContent,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  TextField,
} from '@mui/material';
import {
  Wallet,
  Eye,
  Wifi,
  Zap,
  Network,
  Key,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const WalletSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || '');
  const [isEditing, setIsEditing] = useState(false);

  // Default wallet settings from user model
  const walletSettings = {
    showBalance: true,
    autoConnect: true,
    defaultNetwork: 'ethereum',
    gasPreference: 'standard'
  };

  const handleWalletSettingChange = (key: string, value: any) => {
    if (!user) return;
    
    const updatedSettings = {
      ...user.settings,
      wallet: {
        ...walletSettings,
        [key]: value
      }
    };
    
    updateUser({ settings: updatedSettings });
  };

  const handleConnectWallet = () => {
    // In a real implementation, this would trigger wallet connection
    alert('Wallet connection functionality would be implemented here');
  };

  const handleSaveWalletAddress = () => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      walletAddress: walletAddress
    };
    
    updateUser(updatedUser);
    setIsEditing(false);
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Wallet Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Manage your wallet preferences and connection settings.
      </Typography>

      {/* Wallet Overview */}
      <Card sx={{ mb: 3, bgcolor: 'action.hover' }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            <Wallet size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Wallet Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {user?.walletAddress ? (
              <>
                <Chip 
                  label="Connected"
                  color="success"
                  size="small"
                />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}
                </Typography>
              </>
            ) : (
              <Chip 
                label="Not Connected"
                color="warning"
                size="small"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Wallet Connection */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <Wallet size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Wallet Connection
      </Typography>

      <List>
        <ListItem>
          <ListItemText
            primary="Wallet Address"
            secondary={user?.walletAddress ? 
              `${user.walletAddress.substring(0, 12)}...${user.walletAddress.substring(user.walletAddress.length - 8)}` : 
              "No wallet connected"
            }
          />
          {user?.walletAddress ? (
            <Button 
              variant="outlined" 
              color="error"
              onClick={() => handleWalletSettingChange('walletAddress', '')}
            >
              Disconnect
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleConnectWallet}
            >
              Connect Wallet
            </Button>
          )}
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <Eye size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Wallet Balance"
            secondary="Display your wallet balance in the interface"
          />
          <Switch
            checked={walletSettings.showBalance}
            onChange={(e) => handleWalletSettingChange('showBalance', e.target.checked)}
          />
        </ListItem>

        <ListItem>
          <ListItemIcon>
            <Wifi size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Auto Connect"
            secondary="Automatically connect to your wallet on page load"
          />
          <Switch
            checked={walletSettings.autoConnect}
            onChange={(e) => handleWalletSettingChange('autoConnect', e.target.checked)}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Network Settings */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        <Network size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Network Settings
      </Typography>

      <List>
        <ListItem>
          <ListItemText
            primary="Default Network"
            secondary="Select your preferred blockchain network"
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={walletSettings.defaultNetwork}
              onChange={(e) => handleWalletSettingChange('defaultNetwork', e.target.value)}
            >
              <MenuItem value="ethereum">Ethereum</MenuItem>
              <MenuItem value="polygon">Polygon</MenuItem>
              <MenuItem value="bsc">Binance Smart Chain</MenuItem>
              <MenuItem value="arbitrum">Arbitrum</MenuItem>
            </Select>
          </FormControl>
        </ListItem>

        <ListItem>
          <ListItemText
            primary="Gas Preference"
            secondary="Select your preferred gas fee speed"
          />
          <ButtonGroup size="small">
            <Button
              variant={walletSettings.gasPreference === 'slow' ? 'contained' : 'outlined'}
              onClick={() => handleWalletSettingChange('gasPreference', 'slow')}
            >
              Slow
            </Button>
            <Button
              variant={walletSettings.gasPreference === 'standard' ? 'contained' : 'outlined'}
              onClick={() => handleWalletSettingChange('gasPreference', 'standard')}
            >
              Standard
            </Button>
            <Button
              variant={walletSettings.gasPreference === 'fast' ? 'contained' : 'outlined'}
              onClick={() => handleWalletSettingChange('gasPreference', 'fast')}
            >
              Fast
            </Button>
          </ButtonGroup>
        </ListItem>
      </List>

      <Alert severity="info" sx={{ mt: 3 }}>
        Wallet settings are securely stored and only used for platform interactions.
      </Alert>
    </Box>
  );
};