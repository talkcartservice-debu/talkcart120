import React from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  severity?: 'error' | 'warning' | 'info';
  fullWidth?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Error',
  message,
  onRetry,
  severity = 'error',
  fullWidth = false,
}) => {
  return (
    <Box width={fullWidth ? '100%' : 'auto'}>
      <Alert severity={severity} variant="outlined">
        <AlertTitle>{title}</AlertTitle>
        {message}
        {onRetry && (
          <Box mt={2}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshCw size={16} />}
              onClick={onRetry}
            >
              Try Again
            </Button>
          </Box>
        )}
      </Alert>
    </Box>
  );
};

export default ErrorMessage;