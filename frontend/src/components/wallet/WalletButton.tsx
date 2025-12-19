import React, { useState } from 'react';
import { 
  Button, 
  Typography, 
  Box, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery,
  IconButton
} from '@mui/material';
import { Wallet, LogOut, Copy, Check, ExternalLink, AlertTriangle } from 'lucide-react';
import useWallet from '@/hooks/useWallet';
import { shortenAddress } from '@/utils/format';
import toast from 'react-hot-toast';

const WalletButton: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { 
    isConnected, 
    address, 
    balance, 
    connect, 
    disconnect, 
    chainId,
    isCorrectNetwork,
    switchToCorrectNetwork
  } = useWallet();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isConnected) {
      setAnchorEl(event.currentTarget);
    } else {
      connect();
    }
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        toast.success('Address copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy address');
      }
    }
  };
  
  const handleViewOnExplorer = () => {
    if (address) {
      // This is a simplified example - in a real app, you'd use the correct explorer URL based on chainId
      const explorerUrl = `https://etherscan.io/address/${address}`;
      window.open(explorerUrl, '_blank');
    }
  };
  
  const handleDisconnect = () => {
    disconnect();
    handleClose();
  };

  return (
    <>
      {isConnected ? (
        <>
          {isMobile ? (
            <IconButton
              onClick={handleClick}
              sx={{ 
                borderRadius: 2,
                border: isCorrectNetwork ? `1px solid ${theme.palette.divider}` : `1px solid ${theme.palette.warning.main}`,
                color: isCorrectNetwork ? 'text.primary' : 'warning.main',
                '&:hover': {
                  borderColor: isCorrectNetwork ? 'primary.main' : 'warning.main',
                },
              }}
            >
              <Wallet size={20} />
            </IconButton>
          ) : (
            <Button
              variant="outlined"
              size="small"
              onClick={handleClick}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                border: isCorrectNetwork ? `1px solid ${theme.palette.divider}` : `1px solid ${theme.palette.warning.main}`,
                color: isCorrectNetwork ? 'text.primary' : 'warning.main',
                '&:hover': {
                  borderColor: isCorrectNetwork ? 'primary.main' : 'warning.main',
                },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                padding: { xs: '4px 8px', sm: '6px 16px' },
                minWidth: { xs: 'auto', sm: 120 }
              }}
            >
              {isCorrectNetwork ? (
                shortenAddress(address || '')
              ) : (
                'Wrong Network'
              )}
            </Button>
          )}
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
                mt: 1.5,
                width: { xs: 200, sm: 220 },
                borderRadius: 2,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Connected Wallet
              </Typography>
              <Typography variant="subtitle1" fontWeight={600} sx={{ wordBreak: 'break-all', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {shortenAddress(address || '')}
              </Typography>
              
              {balance !== null && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  Balance: {balance} ETH
                </Typography>
              )}
            </Box>
            
            <Divider />
            
            {!isCorrectNetwork && (
              <MenuItem onClick={switchToCorrectNetwork}>
                <ListItemIcon>
                  <AlertTriangle size={18} color={theme.palette.warning.main} />
                </ListItemIcon>
                <ListItemText 
                  primary="Switch Network" 
                  secondary="Connect to the correct network"
                  primaryTypographyProps={{ 
                    color: 'warning.main',
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}
                  secondaryTypographyProps={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                  }}
                />
              </MenuItem>
            )}
            
            <MenuItem onClick={handleCopyAddress}>
              <ListItemIcon>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </ListItemIcon>
              <ListItemText 
                primary="Copy Address" 
                primaryTypographyProps={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} 
              />
            </MenuItem>
            
            <MenuItem onClick={handleViewOnExplorer}>
              <ListItemIcon>
                <ExternalLink size={18} />
              </ListItemIcon>
              <ListItemText 
                primary="View on Explorer" 
                primaryTypographyProps={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} 
              />
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleDisconnect}>
              <ListItemIcon>
                <LogOut size={18} />
              </ListItemIcon>
              <ListItemText 
                primary="Disconnect" 
                primaryTypographyProps={{ fontSize: { xs: '0.875rem', sm: '1rem' } }} 
              />
            </MenuItem>
          </Menu>
        </>
      ) : (
        isMobile ? (
          <Tooltip title="Connect your wallet">
            <IconButton
              onClick={connect}
              sx={{ 
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'primary.main',
                },
              }}
            >
              <Wallet size={20} />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Connect your wallet">
            <Button
              variant="outlined"
              size="small"
              onClick={connect}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                padding: { xs: '4px 8px', sm: '6px 16px' }
              }}
            >
              Connect Wallet
            </Button>
          </Tooltip>
        )
      )}
    </>
  );
};

export default WalletButton;