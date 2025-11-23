import React from 'react';
import {
  Alert,
  Box,
  Button,
  Typography,
  Stack,
  Link,
} from '@mui/material';
import { ExternalLink, Wallet } from 'lucide-react';

interface WalletInstallGuideProps {
  size?: 'small' | 'medium' | 'large';
  showTitle?: boolean;
  variant?: 'alert' | 'card';
}

const WalletInstallGuide: React.FC<WalletInstallGuideProps> = ({
  size = 'medium',
  showTitle = true,
  variant = 'alert'
}) => {
  const walletOptions = [
    {
      name: 'MetaMask',
      description: 'Most popular Ethereum wallet',
      url: 'https://metamask.io/download/',
      recommended: true
    },
    {
      name: 'Trust Wallet',
      description: 'Secure multi-chain wallet',
      url: 'https://trustwallet.com/browser-extension'
    },
    {
      name: 'Coinbase Wallet',
      description: 'Easy-to-use Web3 wallet',
      url: 'https://www.coinbase.com/wallet'
    }
  ];

  const handleInstallWallet = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const content = (
    <Stack spacing={size === 'small' ? 1 : 2}>
      {showTitle && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Wallet size={size === 'small' ? 16 : 20} />
          <Typography 
            variant={size === 'small' ? 'subtitle2' : 'subtitle1'} 
            fontWeight={600}
          >
            Install a Web3 Wallet
          </Typography>
        </Box>
      )}
      
      <Typography 
        variant={size === 'small' ? 'caption' : 'body2'} 
        color="text.secondary"
      >
        To make crypto payments, you need a Web3 wallet extension. Choose one of these popular options:
      </Typography>

      <Stack spacing={1}>
        {walletOptions.map((wallet) => (
          <Box
            key={wallet.name}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: size === 'small' ? 1 : 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              backgroundColor: 'background.paper',
            }}
          >
            <Box>
              <Typography 
                variant={size === 'small' ? 'body2' : 'subtitle2'} 
                fontWeight={600}
              >
                {wallet.name}
                {wallet.recommended && (
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{
                      ml: 1,
                      px: 1,
                      py: 0.5,
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: 0.5,
                      fontSize: '0.6rem',
                    }}
                  >
                    RECOMMENDED
                  </Typography>
                )}
              </Typography>
              <Typography 
                variant={size === 'small' ? 'caption' : 'body2'} 
                color="text.secondary"
              >
                {wallet.description}
              </Typography>
            </Box>
            <Button
              size={size === 'small' ? 'small' : 'medium'}
              variant="outlined"
              endIcon={<ExternalLink size={14} />}
              onClick={() => handleInstallWallet(wallet.url)}
            >
              Install
            </Button>
          </Box>
        ))}
      </Stack>

      {size !== 'small' && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          After installing a wallet, refresh this page to enable crypto payments.
        </Typography>
      )}
    </Stack>
  );

  if (variant === 'alert') {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        {content}
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        p: size === 'small' ? 2 : 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        backgroundColor: 'background.paper',
      }}
    >
      {content}
    </Box>
  );
};

export default WalletInstallGuide;