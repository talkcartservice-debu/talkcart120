import { GetServerSideProps } from 'next';

// Redirect root to the login page to keep functionality while removing the old home UI
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/auth/login',
      permanent: true, // permanent redirect (308)
    },
  };
};

// No UI needed; redirect happens on the server
export default function IndexRedirect() {
  return null;
}
