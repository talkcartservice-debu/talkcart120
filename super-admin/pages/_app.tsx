import type { AppProps } from 'next/app';
import Head from 'next/head';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { useRouter } from 'next/router';
import theme from '@/theme';
import Layout from '@/components/Layout';
import ToastProvider from '@/components/ToastProvider';

// Pages that don't need the main layout
const noLayoutPages = ['/signin', '/signup'];

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const needsLayout = !noLayoutPages.includes(router.pathname);

  return (
    <ThemeProvider theme={theme}>
      <Head>
        <title>TalkCart Super Admin</title>
      </Head>
      <CssBaseline />
      <ToastProvider />

      {needsLayout ? (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      ) : (
        <Component {...pageProps} />
      )}
    </ThemeProvider>
  );
}