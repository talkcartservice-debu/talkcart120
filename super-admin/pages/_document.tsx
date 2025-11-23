import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Inter Font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        {/* Meta tags */}
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="description" content="TalkCart Super Admin Dashboard - Manage your marketplace with ease" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
