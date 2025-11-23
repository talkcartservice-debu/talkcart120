import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class ReactChildrenErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Children Error Boundary caught an error:', error, errorInfo);
    
    // Check if this is the specific object children error
    if (error.message.includes('Objects are not valid as a React child')) {
      console.error('OBJECT CHILDREN ERROR DETECTED:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
      
      // Try to extract the problematic object from the error message
      const match = error.message.match(/found: object with keys \{([^}]+)\}/);
      if (match) {
        console.error('Problematic object keys:', match[1]);
      }
    }
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    });
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Box sx={{ p: 2, border: '2px solid red', borderRadius: 1, m: 1 }}>
          <Alert severity="error">
            <Typography variant="h6">React Children Error</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {this.state.error?.message || 'Unknown error'}
            </Typography>
            {process.env.NODE_ENV === 'development' && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" component="pre">
                  {this.state.error?.stack}
                </Typography>
              </Box>
            )}
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ReactChildrenErrorBoundary;