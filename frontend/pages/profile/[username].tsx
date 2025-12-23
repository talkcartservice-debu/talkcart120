import { useRouter } from 'next/router';
import ModernProfilePage from './modern';
import { ProfileProvider } from '@/contexts/ProfileContext'; // Add this import
import Layout from '@/components/layout/Layout';

export default function UserProfilePage() {
  const router = useRouter();
  const { username } = router.query;

  // This is another user's profile page
  return (
    <Layout>
      <ProfileProvider>
        <ModernProfilePage />
      </ProfileProvider>
    </Layout>
  );
}

// Add getStaticPaths and getStaticProps to fix prerendering errors
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking'
  };
}

export async function getStaticProps() {
  return {
    props: {}
  };
}
