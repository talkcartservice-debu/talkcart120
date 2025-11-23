// @ts-nocheck
import React, { ReactNode } from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class MediaErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MediaErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      
      // Default error UI
      return (
        <Card sx={{ m: 2 }}>
          <CardContent>
            <Typography variant="h6" color="error" gutterBottom>
              Media Component Error
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {this.state.error?.message || 'An error occurred in the media component'}
            </Typography>
            <Button variant="outlined" onClick={this.handleRetry}>
              Retry Component
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default MediaErrorBoundary;