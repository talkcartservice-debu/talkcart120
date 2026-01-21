import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { PrivacyProvider } from '@/contexts/PrivacyContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { Web3Provider } from '@/contexts/Web3Context';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from '@/theme';
import { ThemeProvider, useCustomTheme } from '@/contexts/ThemeContext';
import { InteractionProvider } from '@/contexts/InteractionContext';
import { AdTrackingProvider } from '@/contexts/AdTrackingContext';
import { Toaster, toast } from 'react-hot-toast';
import '@/styles/globals.css';
import 'react-image-crop/dist/ReactCrop.css'; // global import for cropper styles
import { ProfileCacheProvider } from '@/contexts/ProfileCacheContext';
// CartProvider and StripeProvider removed as part of cleanup
import { SessionExpiredError } from '@/lib/api';
import { isAuthError } from '@/lib/authErrors';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { registerServiceWorker } from '@/utils/pwaUtils'; // Add this import

// Create a component that consumes the theme context and provides the correct MUI theme
const ThemedApp = ({ children }: { children: React.ReactNode }) => {
  const { actualTheme } = useCustomTheme();
  
  // Create MUI theme based on actualTheme
  const muiTheme = actualTheme === 'dark' ? darkTheme : lightTheme;
  
  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  // Create a client
  const [queryClient] = useState(() => new QueryClient());

  // Register service worker for PWA functionality
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Global error handlers for auth-related issues and session expiration
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof SessionExpiredError) {
        event.preventDefault(); // Prevent default browser behavior
        toast.error('Your session has expired. Please log in again.');
        setTimeout(() => {
          const currentPath = window.location.pathname + window.location.search;
          window.location.assign(`/auth/login?next=${encodeURIComponent(currentPath)}`);
        }, 100);
        return;
      }
      if (isAuthError(event.reason)) {
        event.preventDefault();
        toast.error('Authentication failed. Please try again later.');
        return;
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      const candidate = (event as any)?.error || event?.message || '';
      if (isAuthError(candidate)) {
        event.preventDefault?.();
        toast.error('Authentication failed. Please try again later.');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Head>
        <title>Vetora - Web3 Super Application</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Vetora" />
        <meta name="apple-mobile-web-app-title" content="Vetora" />
        <meta name="theme-color" content="#4f46e5" />
        <meta name="description" content="A modern social commerce platform with Web3 integration" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
      </Head>

      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ThemedApp>
                <ProfileProvider>
                  <Web3Provider>
                    <PrivacyProvider>
                      <PresenceProvider>
                        <WebSocketProvider>
                          <InteractionProvider>
                            <ProfileCacheProvider>
                              <AdTrackingProvider>
                                <Component {...pageProps} />
                              </AdTrackingProvider>
                              <Toaster
                                position="top-right"
                                toastOptions={{
                                  duration: 4000,
                                  style: {
                                    background: '#363636',
                                    color: '#fff',
                                  },
                                }}
                              />
                            </ProfileCacheProvider>
                          </InteractionProvider>
                        </WebSocketProvider>
                      </PresenceProvider>
                    </PrivacyProvider>
                  </Web3Provider>
                </ProfileProvider>
              </ThemedApp>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default MyApp;