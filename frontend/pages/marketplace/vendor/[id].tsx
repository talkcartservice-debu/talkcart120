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
  Pagination,
} from '@mui/material';
import {
  Store as StoreIcon,
  Verified as VerifiedIcon,
  LocationOn,
  Link as LinkIcon,
  ShoppingCart,
} from '@mui/icons-material';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/marketplace/ProductCard';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Vendor {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  walletAddress?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: any;
  followerCount?: number;
  followingCount?: number;
  productCount: number;
  createdAt: string;
}

const VendorProfilePage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (id) {
      fetchVendorInfo();
      fetchVendorProducts(1);
    }
  }, [id]);

  const fetchVendorInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: any = await api.marketplace.getVendor(id as string);
      
      if (response.success) {
        setVendor(response.data.vendor);
      } else {
        setError(response.error || 'Failed to load vendor information');
      }
    } catch (err: any) {
      console.error('Error fetching vendor:', err);
      setError(err.message || 'Failed to load vendor information');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorProducts = async (pageNum: number = 1) => {
    try {
      setProductsLoading(true);
      setProductsError(null);
      
      const response: any = await api.marketplace.getVendorProducts(id as string, pageNum, 12);
      
      if (response.success) {
        setProducts(response.data.products || []);
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        setProductsError(response.error || 'Failed to load vendor products');
      }
    } catch (err: any) {
      console.error('Error fetching vendor products:', err);
      setProductsError(err.message || 'Failed to load vendor products');
    } finally {
      setProductsLoading(false);
    }
  };

  const handleViewProducts = () => {
    // Scroll to products section
    const productsSection = document.getElementById('vendor-products');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewStore = () => {
    // Prevent multiple rapid clicks
    const now = Date.now();
    const lastClick = (window as any).lastVendorViewStoreClick || 0;
    if (now - lastClick < 1000) {
      // Ignore clicks within 1 second
      return;
    }
    (window as any).lastVendorViewStoreClick = now;
    
    router.push(`/marketplace/vendor/store/${id}`).catch((error) => {
      // Handle navigation errors gracefully
      console.error('Navigation to store failed:', error);
    });
  };

  const handleFollowVendor = () => {
    toast.success('Following vendor functionality would be implemented here');
  };

  if (loading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading vendor information...
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

  if (!vendor) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Alert severity="warning">Vendor not found</Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Avatar
              src={vendor.avatar}
              sx={{ width: 100, height: 100 }}
            />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  {vendor.displayName || vendor.username}
                </Typography>
                {vendor.isVerified && (
                  <VerifiedIcon sx={{ color: '#1DA1F2', fontSize: 24 }} />
                )}
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip 
                  label={`${vendor.followerCount || 0} followers`} 
                  size="small" 
                />
                <Chip 
                  label={`${vendor.productCount} products`} 
                  size="small" 
                />
                <Chip 
                  label={`Member since ${new Date(vendor.createdAt).getFullYear()}`} 
                  size="small" 
                />
              </Box>
              
              {vendor.bio && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  {vendor.bio}
                </Typography>
              )}
              
              {vendor.location && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationOn sx={{ color: theme.palette.grey[600], fontSize: 18 }} />
                  <Typography variant="body2" color="text.secondary">
                    {vendor.location}
                  </Typography>
                </Box>
              )}
              
              {vendor.website && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinkIcon sx={{ color: theme.palette.grey[600], fontSize: 18 }} />
                  <Typography 
                    variant="body2" 
                    color="primary" 
                    component="a" 
                    href={vendor.website} 
                    target="_blank"
                    sx={{ textDecoration: 'none' }}
                  >
                    {vendor.website}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<StoreIcon />}
              onClick={handleViewStore}
              sx={{ mr: 2 }}
            >
              View Store
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ShoppingCart />}
              onClick={handleViewProducts}
            >
              View Products ({vendor.productCount})
            </Button>
            
            <Button
              variant="outlined"
              onClick={handleFollowVendor}
            >
              Follow
            </Button>
          </Box>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ borderRadius: 2, mb: 3 }}>
              <CardHeader
                title="About This Vendor"
                sx={{ bgcolor: theme.palette.grey[50] }}
              />
              <Divider />
              <CardContent>
                <Typography variant="body1">
                  {vendor.bio || 'This vendor has not provided a bio yet.'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: 2 }}>
              <CardHeader
                title="Vendor Statistics"
                sx={{ bgcolor: theme.palette.grey[50] }}
              />
              <Divider />
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Products
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {vendor.productCount}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Followers
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {vendor.followerCount || 0}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Member Since
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(vendor.createdAt).getFullYear()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Vendor Products Section */}
        <Box id="vendor-products" sx={{ mt: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
            Products by {vendor.displayName || vendor.username}
          </Typography>
          
          {productsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : productsError ? (
            <Alert severity="error">{productsError}</Alert>
          ) : products.length > 0 ? (
            <>
              <Grid container spacing={3}>
                {products.map((product) => (
                  <Grid item xs={6} sm={4} md={3} key={product.id}>
                    <ProductCard product={product} />
                  </Grid>
                ))}
              </Grid>
              
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={(event, value) => {
                      setPage(value);
                      fetchVendorProducts(value);
                    }}
                    color="primary" 
                  />
                </Box>
              )}
            </>
          ) : (
            <Card elevation={0} sx={{ borderRadius: 2, textAlign: 'center', py: 6 }}>
              <CardContent>
                <Typography variant="h6" color="text.secondary">
                  No products found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  This vendor hasn't listed any products yet.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Container>
    </Layout>
  );
};

export default VendorProfilePage;

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
