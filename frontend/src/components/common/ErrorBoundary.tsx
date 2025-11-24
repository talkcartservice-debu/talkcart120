import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Box, Typography, Button, Card, CardContent, Stack } from '@mui/material';
import { AlertTriangle, RefreshCw, SearchX } from 'lucide-react';
import { isAuthError } from '@/lib/authErrors';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  override render() {
    if (this.state.hasError) {
      // Check if this is an authentication-related error
      const authLike = isAuthError(this.state.error);
      
      // Check if this is an HttpError with specific status codes
      const isHttpError = this.state.error?.name === 'HttpError';
      const httpStatus = (this.state.error as any)?.status;
      const isNotFound = isHttpError && (httpStatus === 404 || httpStatus === 400);
      
      // For 404/400 errors, show "No result found" message
      if (isNotFound) {
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              p: 4,
            }}
          >
            <Card sx={{ maxWidth: 500, width: '100%' }}>
              <CardContent>
                <Stack spacing={3} alignItems="center" textAlign="center">
                  <SearchX size={48} color="#6b7280" />

                  <Box>
                    <Typography variant="h6" gutterBottom>
                      No result found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      We couldn&apos;t find what you&apos;re looking for. Try adjusting your search or browse other content.
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      onClick={this.handleRetry}
                    >
                      Try Again
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => window.location.reload()}
                    >
                      Refresh Page
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        );
      }

      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 4,
          }}
        >
          <Card sx={{ maxWidth: 500, width: '100%' }}>
            <CardContent>
              <Stack spacing={3} alignItems="center" textAlign="center">
                <AlertTriangle size={48} color="#ef4444" />

                <Box>
                  <Typography variant="h6" gutterBottom>
                    {authLike ? 'Authentication Failed' : 'Something went wrong'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {authLike
                      ? 'Your authentication session has expired or failed. Please try logging in again.'
                      : 'We encountered an unexpected error. Please try refreshing the page.'
                    }
                  </Typography>
                </Box>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: 'grey.100',
                      borderRadius: 1,
                      width: '100%',
                      overflow: 'auto',
                    }}
                  >
                    <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                      {this.state.error.message}
                    </Typography>
                    {/* Also show error name and status if it's an HttpError */}
                    {this.state.error.name === 'HttpError' && (
                      <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem', mt: 1 }}>
                        Error Type: {this.state.error.name}
                        {(this.state.error as any).status && `, Status: ${(this.state.error as any).status}`}
                      </Typography>
                    )}
                  </Box>
                )}

                <Stack direction="row" spacing={2}>
                  {authLike ? (
                    <>
                      <Button
                        variant="contained"
                        onClick={() => window.location.href = '/auth/login'}
                      >
                        Go to Login
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => window.location.reload()}
                      >
                        Refresh Page
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        onClick={this.handleRetry}
                        startIcon={<RefreshCw size={16} />}
                      >
                        Try Again
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => window.location.reload()}
                      >
                        Refresh Page
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;