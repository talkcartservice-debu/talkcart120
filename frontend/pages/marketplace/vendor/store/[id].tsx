import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Store as StoreIcon,
  Verified as VerifiedIcon,
  LocationOn,
  Email,
  Phone,
  Link as LinkIcon,
  Facebook,
  Twitter,
  Instagram,
  LinkedIn,
  Edit,
  AddBusiness,
} from '@mui/icons-material';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface VendorStore {
  id: string;
  storeName: string;
  storeDescription: string;
  storeLogo: string;
  storeBanner: string;
  contactEmail: string;
  contactPhone: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  socialLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
    website: string;
  };
  storePolicy: string;
  returnPolicy: string;
  shippingPolicy: string;
  isVerified: boolean;
  rating: number;
  reviewCount: number;
  followerCount: number;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    walletAddress?: string;
    bio?: string;
    followerCount?: number;
    followingCount?: number;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

const VendorStorePage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<VendorStore | null>(null);
  const [isStoreOwner, setIsStoreOwner] = useState(false);
  const [hasVendorStore, setHasVendorStore] = useState(false);

  useEffect(() => {
    if (id) {
      fetchVendorStore();
    }
  }, [id]);

  const fetchVendorStore = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First check if the current user is the store owner by trying to access the private endpoint
      if (isAuthenticated && user) {
        try {
          const myStoreResponse: any = await api.marketplace.getMyVendorStore();
          if (myStoreResponse.success && myStoreResponse.data) {
            setHasVendorStore(true);
            // Check if this is the current user's store
            if (myStoreResponse.data.vendor.id === id) {
              setStore(myStoreResponse.data);
              setIsStoreOwner(true);
              setLoading(false);
              return;
            }
          } else {
            setHasVendorStore(false);
          }
        } catch (err) {
          // If the user doesn't have a store or it's not their store, continue with public endpoint
          setHasVendorStore(false);
          console.log('User does not own this store or does not have a store');
        }
      }
      
      // If not the store owner, fetch the public store information
      const response: any = await api.marketplace.getVendorStore(id as string);
      
      if (response.success) {
        setStore(response.data);
        setIsStoreOwner(false);
      } else {
        setError(response.error || 'Failed to load store information');
      }
    } catch (err: any) {
      console.error('Error fetching store:', err);
      setError(err.message || 'Failed to load store information');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProducts = () => {
    // Prevent multiple rapid clicks
    const now = Date.now();
    const lastClick = (window as any).lastVendorStoreViewProductsClick || 0;
    if (now - lastClick < 1000) {
      // Ignore clicks within 1 second
      return;
    }
    (window as any).lastVendorStoreViewProductsClick = now;
    
    router.push(`/marketplace/vendors/${id}/products`).catch((error) => {
      // Handle navigation errors gracefully
      console.error('Navigation to products failed:', error);
    });
  };

  const handleFollowStore = () => {
    toast.success('Following store functionality would be implemented here');
  };

  const handleEditStore = () => {
    // Prevent multiple rapid clicks
    const now = Date.now();
    const lastClick = (window as any).lastVendorStoreEditClick || 0;
    if (now - lastClick < 1000) {
      // Ignore clicks within 1 second
      return;
    }
    (window as any).lastVendorStoreEditClick = now;
    
    router.push('/marketplace/vendor-store-registration').catch((error) => {
      // Handle navigation errors gracefully
      console.error('Navigation to store registration failed:', error);
    });
  };

  const handleRegisterStore = () => {
    // Prevent multiple rapid clicks
    const now = Date.now();
    const lastClick = (window as any).lastVendorStoreRegisterClick || 0;
    if (now - lastClick < 1000) {
      // Ignore clicks within 1 second
      return;
    }
    (window as any).lastVendorStoreRegisterClick = now;
    
    router.push('/marketplace/vendor-store-registration').catch((error) => {
      // Handle navigation errors gracefully
      console.error('Navigation to store registration failed:', error);
    });
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading store information...
          </Typography>
        </Container>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Layout>
    );
  }

  if (!store) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Alert severity="warning">Store not found</Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box
        sx={{
          height: 200,
          background: store.storeBanner 
            ? `url(${store.storeBanner}) center/cover` 
            : theme.palette.grey[300],
          position: 'relative',
          mb: 4,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            bottom: -40,
            left: 40,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 2,
          }}
        >
          <Avatar
            src={store.storeLogo || store.vendor.avatar}
            sx={{ width: 80, height: 80, border: `4px solid ${theme.palette.background.paper}` }}
          />
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                {store.storeName}
              </Typography>
              {store.isVerified && (
                <VerifiedIcon sx={{ color: '#1DA1F2', fontSize: 20 }} />
              )}
            </Box>
            <Chip 
              label={`${store.followerCount || 0} followers`} 
              size="small" 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
              }} 
            />
          </Box>
        </Box>
      </Box>

      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3, gap: 2 }}>
          {isStoreOwner && (
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={handleEditStore}
            >
              Edit Store
            </Button>
          )}
          {!isAuthenticated && (
            <Button
              variant="contained"
              startIcon={<AddBusiness />}
              onClick={() => router.push('/register')}
            >
              Register to Create Store
            </Button>
          )}
          {isAuthenticated && !hasVendorStore && (
            <Button
              variant="contained"
              startIcon={<AddBusiness />}
              onClick={handleRegisterStore}
            >
              Register Your Store
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleViewProducts}
          >
            View Products
          </Button>
          <Button
            variant="outlined"
            onClick={handleFollowStore}
          >
            Follow Store
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ borderRadius: 2, mb: 3 }}>
              <CardHeader
                title="About This Store"
                sx={{ bgcolor: theme.palette.grey[50] }}
              />
              <Divider />
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {store.storeDescription || 'No description provided.'}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <StoreIcon sx={{ color: theme.palette.grey[600] }} />
                  <Typography variant="body2">
                    Member since {new Date(store.vendor.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                
                {store.vendor.bio && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {store.vendor.bio}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ borderRadius: 2 }}>
              <CardHeader
                title="Store Policies"
                sx={{ bgcolor: theme.palette.grey[50] }}
              />
              <Divider />
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Store Policy
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {store.storePolicy || 'No store policy provided.'}
                </Typography>
                
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Return Policy
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {store.returnPolicy || 'No return policy provided.'}
                </Typography>
                
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  Shipping Policy
                </Typography>
                <Typography variant="body2">
                  {store.shippingPolicy || 'No shipping policy provided.'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: 2, mb: 3 }}>
              <CardHeader
                title="Store Information"
                sx={{ bgcolor: theme.palette.grey[50] }}
              />
              <Divider />
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Email sx={{ color: theme.palette.grey[600] }} />
                  <Typography variant="body2">
                    {store.contactEmail || 'No email provided'}
                  </Typography>
                </Box>
                
                {store.contactPhone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Phone sx={{ color: theme.palette.grey[600] }} />
                    <Typography variant="body2">
                      {store.contactPhone}
                    </Typography>
                  </Box>
                )}
                
                {(store.address.street || store.address.city) && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                    <LocationOn sx={{ color: theme.palette.grey[600], mt: 0.5 }} />
                    <Typography variant="body2">
                      {store.address.street && `${store.address.street}, `}
                      {store.address.city && `${store.address.city}, `}
                      {store.address.state && `${store.address.state}, `}
                      {store.address.country}
                      {store.address.zipCode && ` ${store.address.zipCode}`}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Card elevation={0} sx={{ borderRadius: 2 }}>
              <CardHeader
                title="Connect With Us"
                sx={{ bgcolor: theme.palette.grey[50] }}
              />
              <Divider />
              <CardContent>
                <Grid container spacing={1}>
                  {store.socialLinks.facebook && (
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        startIcon={<Facebook />}
                        href={store.socialLinks.facebook}
                        target="_blank"
                        variant="outlined"
                        size="small"
                      >
                        Facebook
                      </Button>
                    </Grid>
                  )}
                  
                  {store.socialLinks.twitter && (
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        startIcon={<Twitter />}
                        href={store.socialLinks.twitter}
                        target="_blank"
                        variant="outlined"
                        size="small"
                      >
                        Twitter
                      </Button>
                    </Grid>
                  )}
                  
                  {store.socialLinks.instagram && (
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        startIcon={<Instagram />}
                        href={store.socialLinks.instagram}
                        target="_blank"
                        variant="outlined"
                        size="small"
                      >
                        Instagram
                      </Button>
                    </Grid>
                  )}
                  
                  {store.socialLinks.linkedin && (
                    <Grid item xs={6}>
                      <Button
                        fullWidth
                        startIcon={<LinkedIn />}
                        href={store.socialLinks.linkedin}
                        target="_blank"
                        variant="outlined"
                        size="small"
                      >
                        LinkedIn
                      </Button>
                    </Grid>
                  )}
                  
                  {store.socialLinks.website && (
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        startIcon={<LinkIcon />}
                        href={store.socialLinks.website}
                        target="_blank"
                        variant="outlined"
                        size="small"
                      >
                        Website
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default VendorStorePage;

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
