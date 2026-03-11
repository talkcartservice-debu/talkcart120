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
  useMediaQuery,
  Menu,
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
  Menu as MenuIcon,
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
import DashboardAnalytics from '@/components/marketplace/DashboardAnalytics';
import VendorProductPostCreator from '@/components/ads/VendorProductPostCreator';
import VendorPostSelectorModal from '@/components/ads/VendorPostSelectorModal';

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

const VendorDashboardContent: React.FC = () => {
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  
  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [vendorTickets, setVendorTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showPostSelectorModal, setShowPostSelectorModal] = useState(false);

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
      
      const response: any = await api.support.getVendorTickets();
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch support tickets');
      }
      
      const data = response;
      
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

  const handleCreateProductPost = () => {
    // Open the post selector modal to let vendor choose which post to make shoppable
    setShowPostSelectorModal(true);
  };

  const handlePostSelected = (postId: string) => {
    // Now we have a postId, we could potentially open the CreateProductPostModal directly
    // For now, we'll just show a toast to indicate the selection
    toast.success('Post selected. You can now link products to this post.');
    
    // In a real implementation, we might want to redirect to the social page 
    // and pre-select this post, or open the product linking modal directly
    // For now, we'll navigate to the social page with the post ID as a query parameter
    router.push(`/social?linkPostId=${postId}`);
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
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 600, 
              mb: 1,
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.125rem' }
            }}
          >
            Board Store
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' } }}
          >
            Manage your store and products
          </Typography>
        </Box>
        
        {/* Vendor Analytics Dashboard */}
        <DashboardAnalytics />

        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', mb: 4 }}>
          <CardHeader
            title="Your Products"
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isMobile ? (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Plus size={16} />}
                      onClick={handleCreateProduct}
                      sx={{ borderRadius: 1.5, fontWeight: 700 }}
                    >
                      Add
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ShoppingBag size={16} />}
                      onClick={handleCreateProductPost}
                      sx={{ borderRadius: 1.5, fontWeight: 700 }}
                    >
                      Post
                    </Button>
                    <IconButton 
                      onClick={handleMenuClick}
                      size="small"
                      sx={{ 
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        color: theme.palette.primary.main,
                        border: '1px solid',
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                        borderRadius: 1.5
                      }}
                    >
                      <MenuIcon size={20} />
                    </IconButton>
                    <Menu
                      anchorEl={anchorEl}
                      open={openMenu}
                      onClose={handleMenuClose}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                    >
                      <MenuItem onClick={() => { router.push('/marketplace/my-dashboard'); handleMenuClose(); }}>
                        <ShoppingBag size={18} style={{ marginRight: 10 }} /> My Dashboard
                      </MenuItem>
                      <MenuItem onClick={() => { handleVendorStore(); handleMenuClose(); }}>
                        <Store size={18} style={{ marginRight: 10 }} /> Store Settings
                      </MenuItem>
                      <MenuItem onClick={() => { handlePaymentSettings(); handleMenuClose(); }}>
                        <Settings size={18} style={{ marginRight: 10 }} /> Payments
                      </MenuItem>
                      <MenuItem onClick={() => { router.push('/marketplace/vendor-admin-chat'); handleMenuClose(); }}>
                        <SupportAgentIcon fontSize="small" sx={{ mr: 1.25 }} /> Talk to Us
                      </MenuItem>
                    </Menu>
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end'
                  }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ShoppingBag size={16} />}
                      onClick={() => router.push('/marketplace/my-dashboard')}
                    >
                      My Dashboard
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Store size={16} />}
                      onClick={handleVendorStore}
                    >
                      Store Settings
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Settings size={16} />}
                      onClick={handlePaymentSettings}
                    >
                      Payments
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<SupportAgentIcon fontSize="small" />}
                      onClick={() => router.push('/marketplace/vendor-admin-chat')}
                    >
                      Talk to Us
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Plus size={16} />}
                      onClick={handleCreateProduct}
                    >
                      Add Product
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ShoppingBag size={16} />}
                      onClick={handleCreateProductPost}
                    >
                      Shoppable Post
                    </Button>
                  </Box>
                )}
              </Box>
            }
            sx={{ 
              pb: 0,
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: { xs: 1, sm: 2 },
              width: '100%',
              display: 'flex',
              flexWrap: 'wrap'
            }}
          />
          <CardContent>
            {/* Filters */}
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: { xs: 1.5, sm: 2 }, 
              mb: 3,
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center'
            }}>
              <Box sx={{ 
                width: { xs: '100%', sm: 'auto' },
                flexGrow: { xs: 0, sm: 1 },
                display: 'flex',
                gap: 1
              }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <Search size={16} style={{ marginRight: 8 }} />,
                  }}
                  sx={{ 
                    minWidth: { sm: 200 }
                  }}
                />
                {isMobile && (
                  <Button
                    variant="outlined"
                    onClick={handleClearFilters}
                    sx={{ minWidth: '40px', px: 1 }}
                  >
                    <FilterX size={18} />
                  </Button>
                )}
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                width: { xs: '100%', sm: 'auto' }, 
                gap: 1.5,
                flexWrap: { xs: 'nowrap', sm: 'wrap' }
              }}>
                <FormControl size="small" sx={{ flex: 1, minWidth: { sm: 150 } }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    label="Category"
                    onChange={(e) => setCategoryFilter(e.target.value as string)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ flex: 1, minWidth: { sm: 120 } }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value as string)}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {!isMobile && (
                <Button
                  variant="outlined"
                  startIcon={<FilterX size={16} />}
                  onClick={handleClearFilters}
                >
                  Clear
                </Button>
              )}
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
                        gap: { xs: 1.5, sm: 3 },
                        px: { xs: 1.5, sm: 2 },
                        py: { xs: 2, sm: 2 },
                        borderBottom: index < products.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider'
                      }}>
                        <ListItemAvatar>
                          <Avatar 
                            src={getImageSrc(product.images)} 
                            variant="rounded"
                            sx={{ 
                              width: { xs: 60, sm: 80 }, 
                              height: { xs: 60, sm: 80 },
                              borderRadius: 2,
                              flexShrink: 0,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          sx={{ m: 0, width: '100%' }}
                          primary={
                            <Typography 
                              variant="h6" 
                              component="div"
                              sx={{ 
                                fontWeight: 700,
                                fontSize: { xs: '1rem', sm: '1.125rem' },
                                mb: 0.5
                              }}
                            >
                              {product.name}
                            </Typography>
                          }
                          secondary={
                            <Box component="div">
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ 
                                  display: '-webkit-box',
                                  WebkitLineClamp: { xs: 2, sm: 1 },
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  mb: 1,
                                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                                  lineHeight: 1.4
                                }}
                              >
                                {product.description}
                              </Typography>
                              <Box sx={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: 0.75, 
                                alignItems: 'center'
                              }}>
                                <Chip 
                                  label={formatPrice(product.price, product.currency)} 
                                  size="small" 
                                  color="primary" 
                                  sx={{ height: 24, fontWeight: 600 }}
                                />
                                <Chip 
                                  label={`${product.stock} Stock`} 
                                  size="small" 
                                  color={product.stock > 0 ? 'success' : 'error'} 
                                  variant="outlined"
                                  sx={{ height: 24 }}
                                />
                                <Chip 
                                  label={product.category} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ height: 24 }}
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                                  <Star size={14} fill={theme.palette.warning.main} color={theme.palette.warning.main} />
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {product.rating.toFixed(1)}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          }
                        />
                        <Box sx={{ 
                          display: 'flex',
                          gap: 1,
                          mt: { xs: 2, sm: 0 },
                          pt: { xs: 1.5, sm: 0 },
                          borderTop: { xs: '1px solid', sm: 'none' },
                          borderColor: 'divider',
                          width: { xs: '100%', sm: 'auto' },
                          alignItems: 'center',
                          justifyContent: { xs: 'space-between', sm: 'center' },
                          flexDirection: { xs: 'row', sm: 'column' }
                        }}>
                          <Tooltip title="Edit product">
                            <IconButton 
                              size="medium" 
                              onClick={() => handleEditProduct(product)}
                              sx={{ 
                                p: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1.5,
                                bgcolor: alpha(theme.palette.primary.main, 0.02)
                              }}
                            >
                              <Edit size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={product.isActive ? 'Deactivate product' : 'Activate product'}>
                            <IconButton 
                              size="medium" 
                              onClick={() => handleToggleProductStatus(product)}
                              sx={{ 
                                p: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1.5,
                                color: product.isActive ? 'success.main' : 'text.disabled'
                              }}
                            >
                              <Shield size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete product">
                            <IconButton 
                              size="medium" 
                              onClick={() => handleDeleteProduct(product.id)}
                              disabled={deletingProductId === product.id}
                              sx={{ 
                                p: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1.5,
                                color: 'error.main',
                                bgcolor: alpha(theme.palette.error.main, 0.02)
                              }}
                            >
                              {deletingProductId === product.id ? (
                                <CircularProgress size={18} />
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItem>
                      {index < products.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
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
      
      {/* Post Selector Modal for creating shoppable posts */}
      <VendorPostSelectorModal
        open={showPostSelectorModal}
        onClose={() => setShowPostSelectorModal(false)}
        onPostSelected={handlePostSelected}
        vendorId={user?.id || ''}
      />
    </Layout>
  );
};

const VendorDashboard: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading dashboard...
          </Typography>
        </Container>
      </Layout>
    );
  }

  // Only render the content after auth state is loaded
  return <VendorDashboardContent />;
};

export default VendorDashboard;