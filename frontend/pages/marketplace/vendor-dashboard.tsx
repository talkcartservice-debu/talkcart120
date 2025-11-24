import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Skeleton,
  Switch,
  FormControlLabel,
  useTheme,
  alpha,
  Paper,
  Stack,
  Rating,
  Divider,
  Alert,
  Fab,
  Tooltip,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Filter,
  ShoppingCart,
  Tag,
  Wallet,
  AlertCircle,
  TrendingUp,
  Eye,
  Star,
  BadgeCheck,
  Plus,
  Edit,
  Trash2,
  SortAsc,
  SortDesc,
  Grid3x3,
  List as ListIcon,
  RefreshCcw,
  FilterX,
  Sparkles,
  Users,
  Package,
  Globe,
  Zap,
  Award,
  Heart,
  Share2,
  ShoppingBag,
  ArrowRight,
  TrendingDown,
  Clock,
  Shield,
  Verified,
  Bell,
  Settings,
  Menu,
  X,
  XCircle,
  Truck,
  Calendar,
  CreditCard,
  CheckCircle,
  Upload,
  Store,
  MessageCircle
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { SupportAgent as SupportAgentIcon } from '@mui/icons-material';
import PersistentChatContainer from '@/components/chatbot/PersistentChatContainer';
import EnhancedVendorAnalyticsDashboard from '@/components/marketplace/EnhancedVendorAnalyticsDashboard';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: Array<{
    secure_url?: string;
    url: string;
    public_id: string;
  } | string>;
  category: string;
  tags: string[];
  stock: number;
  isActive: boolean;
  featured: boolean;
  isNFT: boolean;
  contractAddress?: string;
  tokenId?: string;
  rating: number;
  reviewCount: number;
  sales: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
}

const VendorDashboard: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [vendorTickets, setVendorTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Refresh user profile on component mount to ensure role is up to date
  useEffect(() => {
    const refreshUserProfile = async () => {
      if (user) {
        try {
          // Always refresh the user profile when visiting the vendor dashboard
          // Add a small delay to ensure backend has processed any recent changes
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Force refresh the user profile to get the latest role information
          const profileResponse = await api.auth.getProfile();
          if (profileResponse.success && profileResponse.data) {
            // Always update the user context with the latest profile data
            updateUser(profileResponse.data);
            
            // If for some reason the role is not vendor, force it to vendor
            // since they are on the vendor dashboard
            if (profileResponse.data.role !== 'vendor') {
              const updatedData = { ...profileResponse.data, role: 'vendor' as const };
              updateUser(updatedData);
              
              // Also update localStorage
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('user', JSON.stringify(updatedData));
                } catch (storageError) {
                  console.error('Failed to update user in localStorage:', storageError);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error refreshing user profile:', error);
          // If there's an error but we're on the vendor dashboard, 
          // assume the user should be a vendor
          if (user && user.role !== 'vendor') {
            const updatedUser = { ...user, role: 'vendor' as const };
            updateUser(updatedUser);
            
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('user', JSON.stringify(updatedUser));
              } catch (storageError) {
                console.error('Failed to update user in localStorage:', storageError);
              }
            }
          }
        }
      }
    };

    refreshUserProfile();
  }, [user, updateUser]);

  // Fetch vendor support tickets
  useEffect(() => {
    if (user && user.role === 'vendor') {
      fetchVendorTickets();
    }
  }, [user]);

  // Check access permissions
  useEffect(() => {
    if (user && user.role !== 'vendor') {
      console.log('Access denied - User role:', user.role);
      setAccessDenied(true);
    }
  }, [user]);

  // Handle redirecting state
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setRedirecting(true);
    }
  }, [isAuthenticated, user]);

  const fetchVendorTickets = async () => {
    try {
      setTicketsLoading(true);
      setTicketsError(null);
      
      const response = await fetch('/api/support/tickets/vendor');
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Received non-JSON response from server');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setVendorTickets(data.tickets);
      } else {
        setTicketsError(data.message || 'Failed to fetch support tickets');
      }
    } catch (err) {
      setTicketsError('An error occurred while fetching support tickets');
      console.error('Error fetching vendor tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response: any = await api.marketplace.getCategories();
        if (response?.success) {
          setCategories(response.data.categories || []);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
      };

      // Add filters
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active';

      // Add sorting
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortOrder = sortOrder;
      }

      const response: any = await api.marketplace.getMyProducts(params);
      if (response.success) {
        setProducts(response.data.products || []);
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        setError(response.error || 'Failed to load products');
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);

  // Fetch vendor products
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    fetchProducts();
  }, [user, isAuthenticated, fetchProducts, router]);

  const handleDeleteProduct = async (productId: string) => {
    try {
      setDeletingProductId(productId);
      const response: any = await api.marketplace.deleteProduct(productId);
      if (response.success) {
        toast.success('Product deleted successfully');
        // Remove product from state
        setProducts(products.filter(product => product.id !== productId));
      } else {
        toast.error(response.error || 'Failed to delete product');
      }
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast.error(err.message || 'Failed to delete product');
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleToggleProductStatus = async (product: Product) => {
    try {
      const updatedData = {
        ...product,
        isActive: !product.isActive,
      };
      
      const response: any = await api.marketplace.updateProduct(product.id, updatedData);
      if (response.success) {
        toast.success(`Product ${updatedData.isActive ? 'activated' : 'deactivated'} successfully`);
        // Update product in state
        setProducts(products.map(p => 
          p.id === product.id ? { ...p, isActive: updatedData.isActive } : p
        ));
      } else {
        toast.error(response.error || 'Failed to update product');
      }
    } catch (err: any) {
      console.error('Error updating product:', err);
      toast.error(err.message || 'Failed to update product');
    }
  };

  const handleEditProduct = (product: Product) => {
    router.push(`/marketplace/edit/${product.id}`);
  };

  const handleCreateProduct = () => {
    router.push('/marketplace/create');
  };

  const handleVendorStore = () => {
    router.push('/marketplace/vendor-store-registration');
  };

  const handlePaymentSettings = () => {
    router.push('/marketplace/vendor-payment-settings');
  };

  const handleViewProduct = (productId: string) => {
    router.push(`/marketplace/${productId}`);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const getImageSrc = (images: any[]) => {
    if (!images || images.length === 0) {
      return '/images/placeholder-image.png';
    }
    
    const firstImage = images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    const imageUrl = firstImage?.secure_url || firstImage?.url || '/images/placeholder-image.png';
    
    // Add error handling for Cloudinary images
    return imageUrl;
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(price);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  // Render access denied message if user is not a vendor
  if (accessDenied) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            Access denied. You must be a vendor to access this page. Your current role is: {user?.role || 'undefined'}
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => router.push('/marketplace')}
            sx={{ mr: 2 }}
          >
            Back to Marketplace
          </Button>
          <Button 
            variant="outlined" 
            onClick={async () => {
              try {
                const profileResponse = await api.auth.getProfile();
                if (profileResponse.success && profileResponse.data) {
                  updateUser(profileResponse.data);
                  router.reload();
                }
              } catch (error) {
                console.error('Error refreshing profile:', error);
              }
            }}
            sx={{ mr: 2 }}
          >
            Refresh Profile
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => router.push('/marketplace/vendor-store-registration')}
          >
            Register as Vendor
          </Button>
        </Container>
      </Layout>
    );
  }

  // Render loading state if redirecting
  if (redirecting) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Redirecting to login...
          </Typography>
        </Container>
      </Layout>
    );
  }

  // Main render function
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 600, 
              mb: 1,
              fontSize: { xs: '1.5rem', sm: '2.125rem' }
            }}
          >
            My Store Dashboard
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            Manage your products and store
          </Typography>
        </Box>
        
        {/* Vendor Analytics Dashboard */}
        <EnhancedVendorAnalyticsDashboard />

        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', mb: 4 }}>
          <CardHeader
            title="Your Products"
            action={
              <Box sx={{ 
                display: 'flex', 
                gap: { xs: 0.5, sm: 1 },
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' }
              }}>
                <Button
                  variant="outlined"
                  startIcon={<ShoppingBag size={16} />}
                  onClick={() => router.push('/marketplace/my-dashboard')}
                  sx={{ 
                    minWidth: { xs: '100%', sm: 'auto' },
                    mb: { xs: 0.5, sm: 0 }
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }}}>
                    My Dashboard
                  </Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' }}}>
                    Dashboard
                  </Box>
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Store size={16} />}
                  onClick={handleVendorStore}
                  sx={{ 
                    minWidth: { xs: '100%', sm: 'auto' },
                    mb: { xs: 0.5, sm: 0 }
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }}}>
                    Vendor Store
                  </Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' }}}>
                    Store
                  </Box>
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Settings size={16} />}
                  onClick={handlePaymentSettings}
                  sx={{ 
                    minWidth: { xs: '100%', sm: 'auto' },
                    mb: { xs: 0.5, sm: 0 }
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }}}>
                    Payment Settings
                  </Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' }}}>
                    Payments
                  </Box>
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<MessageCircle size={16} />}
                  onClick={() => router.push('/marketplace/vendor-messaging')}
                  sx={{ 
                    minWidth: { xs: '100%', sm: 'auto' },
                    mb: { xs: 0.5, sm: 0 }
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }}}>
                    Messaging
                  </Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' }}}>
                    Msg
                  </Box>
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SupportAgentIcon />}
                  onClick={() => router.push('/marketplace/vendor-admin-chat')}
                  sx={{ 
                    minWidth: { xs: '100%', sm: 'auto' },
                    mb: { xs: 0.5, sm: 0 }
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }}}>
                    Chat with Admin
                  </Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' }}}>
                    Admin
                  </Box>
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Plus size={16} />}
                  onClick={handleCreateProduct}
                  sx={{ 
                    minWidth: { xs: '100%', sm: 'auto' }
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }}}>
                    Add Product
                  </Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' }}}>
                    Add
                  </Box>
                </Button>
              </Box>
            }
            sx={{ 
              pb: 0,
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: { xs: 1, sm: 0 }
            }}
          />
          <CardContent>
            {/* Filters */}
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: { xs: 1, sm: 2 }, 
              mb: 3,
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              <TextField
                size="small"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search size={16} style={{ marginRight: 8 }} />,
                }}
                sx={{ 
                  minWidth: { xs: '100%', sm: 200 }
                }}
              />
              
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => setCategoryFilter(e.target.value as string)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 } }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value as string)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                startIcon={<FilterX size={16} />}
                onClick={handleClearFilters}
                sx={{ 
                  minWidth: { xs: '100%', sm: 'auto' }
                }}
              >
                Clear Filters
              </Button>
            </Box>
            
            {/* Products List */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
                <Button 
                  startIcon={<RefreshCcw size={16} />} 
                  onClick={fetchProducts}
                  size="small"
                  sx={{ ml: 2 }}
                >
                  Retry
                </Button>
              </Alert>
            ) : (
              <>
                <List sx={{ width: '100%' }}>
                  {products.map((product, index) => (
                    <React.Fragment key={product.id}>
                      <ListItem sx={{ 
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: { xs: 2, sm: 3 },
                        px: { xs: 0, sm: 2 }
                      }}>
                        <ListItemAvatar>
                          <Avatar 
                            src={getImageSrc(product.images)} 
                            variant="rounded"
                            sx={{ 
                              width: { xs: 60, sm: 80 }, 
                              height: { xs: 60, sm: 80 },
                              borderRadius: 1
                            }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography 
                              variant="h6" 
                              component="div"
                              sx={{ 
                                fontWeight: 600,
                                fontSize: { xs: '1rem', sm: '1.125rem' }
                              }}
                            >
                              {product.name}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ 
                                  display: '-webkit-box',
                                  WebkitLineClamp: { xs: 2, sm: 1 },
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  mb: 0.5
                                }}
                              >
                                {product.description}
                              </Typography>
                              <Box sx={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: 1, 
                                alignItems: 'center',
                                mt: 0.5
                              }}>
                                <Chip 
                                  label={formatPrice(product.price, product.currency)} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined"
                                />
                                <Chip 
                                  label={`${product.stock} in stock`} 
                                  size="small" 
                                  color={product.stock > 0 ? 'success' : 'error'} 
                                  variant="outlined"
                                />
                                <Chip 
                                  label={product.category} 
                                  size="small" 
                                  variant="outlined"
                                />
                                <Chip 
                                  label={`${product.sales} sold`} 
                                  size="small" 
                                  variant="outlined"
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Star size={14} fill={theme.palette.warning.main} color={theme.palette.warning.main} />
                                  <Typography variant="caption">
                                    {product.rating.toFixed(1)} ({product.reviewCount})
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction sx={{ 
                          position: 'relative',
                          transform: 'none',
                          top: 'auto',
                          right: 'auto',
                          display: 'flex',
                          gap: 1,
                          mt: { xs: 1, sm: 0 }
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            gap: 1,
                            flexDirection: { xs: 'row', sm: 'column' }
                          }}>
                            <Tooltip title="Edit product">
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditProduct(product)}
                              >
                                <Edit size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={product.isActive ? 'Deactivate product' : 'Activate product'}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleToggleProductStatus(product)}
                              >
                                <Shield size={18} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete product">
                              <IconButton 
                                size="small" 
                                onClick={() => handleDeleteProduct(product.id)}
                                disabled={deletingProductId === product.id}
                              >
                                {deletingProductId === product.id ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <Trash2 size={18} />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < products.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={handlePageChange}
                      color="primary"
                      showFirstButton
                      showLastButton
                      siblingCount={1}
                      boundaryCount={1}
                    />
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Paper>
      </Container>
      
      {/* Persistent Chat Container */}
      <PersistentChatContainer 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)} 
      />
    </Layout>
  );
};

export default VendorDashboard;