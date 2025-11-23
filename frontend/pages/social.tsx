import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';

// Redirect /social to /social-new
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/social-new',
      permanent: false,
    },
  };
};

// No UI needed; redirect happens on the server
export default function SocialRedirect() {
  const router = useRouter();
  
  // Client-side fallback in case SSR redirect fails
  useEffect(() => {
    router.replace('/social-new');
  }, [router]);
  
  return null;
}