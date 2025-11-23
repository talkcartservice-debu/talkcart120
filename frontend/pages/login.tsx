import { GetServerSideProps } from 'next';

// Redirect /login to /auth/login for backward compatibility
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/auth/login',
      permanent: true, // permanent redirect (308)
    },
  };
};

// No UI needed; redirect happens on the server
export default function LoginRedirect() {
  return null;
}