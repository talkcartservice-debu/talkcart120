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
      <Typography 
        variant="h6" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem' }
        }}
      >
        Wallet Settings
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        paragraph
        sx={{
          fontSize: { xs: '0.875rem', sm: '1rem' }
        }}
      >
        Manage your wallet preferences and connection settings.
      </Typography>

      {/* Wallet Overview */}
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
                  sx={{
                    fontSize: { xs: '0.7rem', sm: '0.75rem' }
                  }}
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    ml: 1,
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                >
                  {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}
                </Typography>
              </>
            ) : (
              <Chip 
                label="Not Connected"
                color="warning"
                size="small"
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Wallet Connection */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Wallet size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Wallet Connection
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Wallet Address"
            secondary={user?.walletAddress ? 
              `${user.walletAddress.substring(0, 12)}...${user.walletAddress.substring(user.walletAddress.length - 8)}` : 
              "No wallet connected"
            }
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          {user?.walletAddress ? (
            <Button 
              variant="outlined" 
              color="error"
              onClick={() => handleWalletSettingChange('walletAddress', '')}
              size="small"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                alignSelf: { xs: 'flex-end', sm: 'auto' }
              }}
            >
              Disconnect
            </Button>
          ) : (
            <Button 
              variant="contained" 
              onClick={handleConnectWallet}
              size="small"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                alignSelf: { xs: 'flex-end', sm: 'auto' }
              }}
            >
              Connect Wallet
            </Button>
          )}
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Eye size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Show Wallet Balance"
            secondary="Display your wallet balance in the interface"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={walletSettings.showBalance}
            onChange={(e) => handleWalletSettingChange('showBalance', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemIcon>
            <Wifi size={24} />
          </ListItemIcon>
          <ListItemText
            primary="Auto Connect"
            secondary="Automatically connect to your wallet on page load"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <Switch
            checked={walletSettings.autoConnect}
            onChange={(e) => handleWalletSettingChange('autoConnect', e.target.checked)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'auto' } }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 3 }} />

      {/* Network Settings */}
      <Typography 
        variant="subtitle1" 
        fontWeight={600} 
        gutterBottom
        sx={{
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}
      >
        <Network size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Network Settings
      </Typography>

      <List>
        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Default Network"
            secondary="Select your preferred blockchain network"
            sx={{ flex: 1, mb: { xs: 1, sm: 0 } }}
          />
          <FormControl size="small" sx={{ minWidth: 150, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
            <Select
              value={walletSettings.defaultNetwork}
              onChange={(e) => handleWalletSettingChange('defaultNetwork', e.target.value)}
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              <MenuItem value="ethereum">Ethereum</MenuItem>
              <MenuItem value="polygon">Polygon</MenuItem>
              <MenuItem value="bsc">Binance Smart Chain</MenuItem>
              <MenuItem value="arbitrum">Arbitrum</MenuItem>
            </Select>
          </FormControl>
        </ListItem>

        <ListItem sx={{ flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 } }}>
          <ListItemText
            primary="Gas Preference"
            secondary="Select your preferred gas fee speed"
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
        <Typography variant="body2" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          Wallet settings are securely stored and only used for platform interactions.
        </Typography>
      </Alert>
    </Box>
  );
};