import React from 'react';
import { Button } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material';

const PWAInstallButton: React.FC = () => {
  const { isInstallable, installPWA } = usePWAInstall();
  const theme = useTheme();

  if (!isInstallable) {
    return null;
  }

  return (
    <Button
      variant="outlined"
      size="small"
      onClick={installPWA}
      startIcon={<DownloadIcon />}
      sx={{
        mt: 1,
        borderRadius: 2,
        textTransform: 'none',
        fontSize: '0.8rem',
        fontWeight: 600,
        borderColor: alpha(theme.palette.primary.main, 0.3),
        color: theme.palette.primary.main,
        '&:hover': {
          borderColor: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
        },
      }}
    >
      Install App
    </Button>
  );
};

export default PWAInstallButton;