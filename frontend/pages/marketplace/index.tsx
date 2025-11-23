import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  Chip,
  useTheme,
  Skeleton,
  Alert,
  Pagination,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  Stack,
  Fab,
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
  Building,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
// Cart context removed as part of cart functionality removal
import useMarketplace from '@/hooks/useMarketplace';
import ProductCard from '@/components/marketplace/ProductCard';
import PWAInstallButton from '@/components/common/PWAInstallButton';

import MarketplaceGrid from '@/components/marketplace/MarketplaceGrid';
import MarketplaceSidebar from '@/components/marketplace/MarketplaceSidebar'; // Added import
import toast from 'react-hot-toast';
import api from '@/lib/api';

// Define sort options for the marketplace
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'priceAsc', label: 'Price: Low to High' },
  { value: 'priceDesc', label: 'Price: High to Low' },
  { value: 'sales', label: 'Best Selling' },
  { value: 'views', label: 'Most Viewed' },
  { value: 'featured', label: 'Featured Items' },
];

const MarketplacePage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { 
    joinMarketplace, 
    leaveMarketplace, 
    onProductUpdate, 
    onProductSale, 
    onNewProduct 
  } = useWebSocket();
  const { 
    products, 
    categories, 
    pagination, 
    loading, 
    error, 
    fetchProducts, 
    fetchCategories,
    buyProduct
  } = useMarketplace();
  
  console.log('Marketplace page received products:', products);
  console.log('Marketplace page loading state:', loading);
  console.log('Marketplace page error state:', error);

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Enhanced filter states
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    minPrice: '',
    maxPrice: '',
    isNFT: false,
    featured: false,
    sortBy: 'newest' as 'priceAsc' | 'priceDesc' | 'newest' | 'sales' | 'views' | 'featured',
    page: 1,
    currency: 'all',
    vendor: 'all',
    inStock: false,
    freeShipping: false,
    rating: 0,
    condition: 'all',
    location: 'all',
    tags: [] as string[],
    priceRange: [0, 10000] as [number, number],
    brand: 'all',
    color: 'all',
    size: 'all',
    discount: false,
  });

  // Vendor filter state
  const [marketplaceVendors, setMarketplaceVendors] = useState<{ id: string; username: string; displayName: string }[]>([]);
  const [vendorFilter, setVendorFilter] = useState('all');

  // UI States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Add comparison state
  const [selectedForComparison, setSelectedForComparison] = useState<Set<string>>(new Set());
  

  // Initialize from URL params
  useEffect(() => {
    if (!router.isReady) return;
    
    const query = router.query;
    setFilters(prev => ({
      ...prev,
      search: (query.search as string) || prev.search,
      category: (query.category as string) || prev.category,
      minPrice: (query.minPrice as string) || prev.minPrice,
      maxPrice: (query.maxPrice as string) || prev.maxPrice,
      isNFT: query.isNFT === 'true' ? true : (query.isNFT === 'false' ? false : prev.isNFT),
      featured: query.featured === 'true' ? true : (query.featured === 'false' ? false : prev.featured),
      sortBy: (query.sortBy as any) || prev.sortBy,
      page: query.page ? parseInt(query.page as string) : prev.page,
      brand: (query.brand as string) || prev.brand,
      color: (query.color as string) || prev.color,
      size: (query.size as string) || prev.size,
      condition: (query.condition as string) || prev.condition,
      rating: query.rating ? parseInt(query.rating as string) : prev.rating,
      inStock: query.inStock === 'true' ? true : (query.inStock === 'false' ? false : prev.inStock),
      freeShipping: query.freeShipping === 'true' ? true : (query.freeShipping === 'false' ? false : prev.freeShipping),
      discount: query.discount === 'true' ? true : (query.discount === 'false' ? false : prev.discount),
      location: (query.location as string) || prev.location,
    }));
  }, [router.isReady, router.query]);

  // Fetch vendors for filter
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        console.log('Fetching vendors for filter...');
        const response: any = await api.marketplace.getVendors({ limit: 100 });
        console.log('Vendors API response:', response);
        
        if (response.success) {
          const vendorList = response.data.vendors.map((vendor: any) => ({
            id: vendor.id,
            username: vendor.username,
            displayName: vendor.displayName
          }));
          setMarketplaceVendors(vendorList);
        }
      } catch (err) {
        console.error('Failed to fetch vendors:', err);
      }
    };
    
    fetchVendors();
  }, []);

  // Update URL when filters change
  const updateURL = useCallback((newFilters: typeof filters) => {
    const query: any = { ...newFilters };
    
    // Remove default/empty values
    if (query.search === '') delete query.search;
    if (query.category === 'all') delete query.category;
    if (query.minPrice === '') delete query.minPrice;
    if (query.maxPrice === '') delete query.maxPrice;
    if (!query.isNFT) delete query.isNFT;
    if (!query.featured) delete query.featured;
    if (query.sortBy === 'newest') delete query.sortBy;
    if (query.page === 1) delete query.page;
    if (query.brand === 'all') delete query.brand;
    if (query.color === 'all') delete query.color;
    if (query.size === 'all') delete query.size;
    if (query.condition === 'all') delete query.condition;
    if (query.rating === 0) delete query.rating;
    if (!query.inStock) delete query.inStock;
    if (!query.freeShipping) delete query.freeShipping;
    if (!query.discount) delete query.discount;
    if (query.location === 'all') delete query.location;

    router.push({ pathname: '/marketplace', query }, undefined, { shallow: true });
  }, [router]);

  // Fetch products when filters change
  const handleFiltersChange = useCallback((newFilters: Partial<typeof filters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 };
    setFilters(updatedFilters);
    updateURL(updatedFilters);
    
    // Validate vendorId before passing to API
    let vendorId = vendorFilter !== 'all' ? vendorFilter : undefined;
    if (vendorId && !isValidObjectId(vendorId)) {
      console.warn('Invalid vendor ID detected:', vendorId);
      vendorId = undefined; // Don't pass invalid vendor IDs to the API
    }
    
    console.log('Fetching products with updated filters:', updatedFilters);
    fetchProducts({
      page: updatedFilters.page,
      search: updatedFilters.search || undefined,
      category: updatedFilters.category !== 'all' ? updatedFilters.category : undefined,
      minPrice: updatedFilters.minPrice || undefined,
      maxPrice: updatedFilters.maxPrice || undefined,
      isNFT: updatedFilters.isNFT || undefined,
      featured: updatedFilters.featured || undefined,
      sortBy: updatedFilters.sortBy,
      vendorId: vendorId,
      brand: updatedFilters.brand && updatedFilters.brand !== 'all' ? updatedFilters.brand : undefined,
      color: updatedFilters.color && updatedFilters.color !== 'all' ? updatedFilters.color : undefined,
      size: updatedFilters.size && updatedFilters.size !== 'all' ? updatedFilters.size : undefined,
      condition: updatedFilters.condition && updatedFilters.condition !== 'all' ? updatedFilters.condition : undefined,
      rating: updatedFilters.rating > 0 ? updatedFilters.rating : undefined,
      inStock: updatedFilters.inStock || undefined,
      freeShipping: updatedFilters.freeShipping || undefined,
      discount: updatedFilters.discount || undefined,
      tags: updatedFilters.tags.length > 0 ? updatedFilters.tags : undefined,
      location: updatedFilters.location && updatedFilters.location !== 'all' ? updatedFilters.location : undefined,
    });
  }, [filters, fetchProducts, updateURL, vendorFilter]);

  // Join marketplace for real-time updates
  useEffect(() => {
    joinMarketplace();
    
    return () => {
      leaveMarketplace();
    };
  }, [joinMarketplace, leaveMarketplace]);

  // Real-time product updates
  useEffect(() => {
    const unsubscribeUpdate = onProductUpdate((data: any) => {
      console.log('Product updated:', data);
      // Optionally refresh the product list or update specific product
      // For now, just refresh to get latest data
      handleFiltersChange({});
    });

    const unsubscribeSale = onProductSale((data: any) => {
      console.log('Product sold:', data);
      toast.success(`🎉 ${data.productName} was just sold!`);
      // Refresh to show updated sales count
      handleFiltersChange({});
    });

    const unsubscribeNew = onNewProduct((data: any) => {
      console.log('New product added:', data);
      toast.success(`🆕 New ${data.product.category} item: ${data.product.name}`);
      // Refresh to show new product
      handleFiltersChange({});
    });

    return () => {
      unsubscribeUpdate();
      unsubscribeSale();
      unsubscribeNew();
    };
  }, [onProductUpdate, onProductSale, onNewProduct, handleFiltersChange]);

  // Initial load
  useEffect(() => {
    if (!router.isReady) return;
    
    // Validate vendorId before passing to API
    let vendorId = vendorFilter !== 'all' ? vendorFilter : undefined;
    if (vendorId && !isValidObjectId(vendorId)) {
      console.warn('Invalid vendor ID detected:', vendorId);
      vendorId = undefined; // Don't pass invalid vendor IDs to the API
    }
    
    console.log('Initial fetch with filters:', filters);
    fetchProducts({
      page: filters.page,
      search: filters.search || undefined,
      category: filters.category !== 'all' ? filters.category : undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      isNFT: filters.isNFT || undefined,
      featured: filters.featured || undefined,
      sortBy: filters.sortBy,
      vendorId: vendorId,
      brand: filters.brand && filters.brand !== 'all' ? filters.brand : undefined,
      color: filters.color && filters.color !== 'all' ? filters.color : undefined,
      size: filters.size && filters.size !== 'all' ? filters.size : undefined,
      condition: filters.condition && filters.condition !== 'all' ? filters.condition : undefined,
      rating: filters.rating > 0 ? filters.rating : undefined,
      inStock: filters.inStock || undefined,
      freeShipping: filters.freeShipping || undefined,
      discount: filters.discount || undefined,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
      location: filters.location && filters.location !== 'all' ? filters.location : undefined,
    });
    
    fetchCategories();
  }, [router.isReady, vendorFilter, filters, fetchProducts, fetchCategories]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Handling search with filters:', filters);
    handleFiltersChange({});
  };
  
  // Handle pagination
  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    const newFilters = { ...filters, page: value };
    setFilters(newFilters);
    updateURL(newFilters);
    
    // Validate vendorId before passing to API
    let vendorId = vendorFilter !== 'all' ? vendorFilter : undefined;
    if (vendorId && !isValidObjectId(vendorId)) {
      console.warn('Invalid vendor ID detected:', vendorId);
      vendorId = undefined; // Don't pass invalid vendor IDs to the API
    }
    
    console.log('Fetching products for page:', value);
    fetchProducts({
      page: value,
      search: filters.search || undefined,
      category: filters.category !== 'all' ? filters.category : undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      isNFT: filters.isNFT || undefined,
      featured: filters.featured || undefined,
      sortBy: filters.sortBy,
      vendorId: vendorId,
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle product share
  const handleProductShare = async (product: any) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: `${window.location.origin}/marketplace/${product.id}`,
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/marketplace/${product.id}`);
        toast.success('Product link copied to clipboard');
      }
    } catch (error) {
      toast.error('Failed to share product');
    }
  };

  // Handle product buy (direct purchase)
  const handleProductBuy = async (product: any) => {
    try {
      // Use the marketplace hook to directly purchase the product
      const result = await buyProduct(product.id, {
        paymentMethod: 'card_payment',
        product: product
      });
      if (result) {
        toast.success(`${product.name} purchased successfully!`);
      } else {
        toast.error(`Failed to purchase ${product.name}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to purchase product');
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await handleFiltersChange({});
    setIsRefreshing(false);
    toast.success('Marketplace refreshed');
  };

  // Clear all filters
  const clearFilters = () => {
    const defaultFilters = {
      search: '',
      category: 'all',
      minPrice: '',
      maxPrice: '',
      isNFT: false,
      featured: false,
      sortBy: 'newest' as 'priceAsc' | 'priceDesc' | 'newest' | 'sales' | 'views' | 'featured',
      page: 1,
      currency: 'all',
      vendor: 'all',
      inStock: false,
      freeShipping: false,
      rating: 0,
      condition: 'all',
      location: 'all',
      tags: [] as string[],
      priceRange: [0, 10000] as [number, number],
      brand: 'all',
      color: 'all',
      size: 'all',
      discount: false,
    };
    setFilters(defaultFilters);
    setVendorFilter('all');
    updateURL(defaultFilters);
    fetchProducts({ sortBy: 'newest', vendorId: undefined });
  };
  
  // Format price with proper currency symbols
  const formatPrice = (price: number, currency: string) => {
    const formatMap: { [key: string]: string } = {
      'USD': `$${price.toFixed(2)}`,
      'ETH': `${price} ETH`,
      'BTC': `${price} BTC`,
      'USDC': `${price} USDC`,
      'USDT': `${price} USDT`,
    };
    return formatMap[currency] || `${price} ${currency}`;
  };

  // Get proper image URL
  const getImageUrl = (images: any) => {
    if (!images || images.length === 0) {
      return '/images/placeholder-image.png';
    }
    
    const firstImage = images[0];
    if (typeof firstImage === 'string') return firstImage;
    return firstImage.secure_url || firstImage.url || '/images/placeholder-image.png';
  };

  // Check if filters are applied
  const hasActiveFilters = filters.search || filters.category !== 'all' || filters.minPrice || 
                          filters.maxPrice || filters.isNFT || filters.featured || filters.sortBy !== 'newest' || vendorFilter !== 'all' ||
                          filters.brand !== 'all' || filters.color !== 'all' || filters.size !== 'all' || filters.condition !== 'all' ||
                          filters.rating > 0 || filters.inStock || filters.freeShipping || filters.discount;
  
  // Handle comparison toggle
  const handleComparisonToggle = (productId: string) => {
    setSelectedForComparison(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header Section */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 400,
                color: '#232F3E',
                mb: 1,
                fontSize: { xs: '1.75rem', md: '2.125rem' }
              }}
            >
              Marketplace
            </Typography>
            
            {/* Results Summary */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} component="p">
              {pagination.total > 0 ? (
                `1-${Math.min(pagination.limit, pagination.total)} of over ${pagination.total.toLocaleString()} results`
              ) : (
                'No results found'
              )}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <PWAInstallButton />
            
            {user && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {/* My Orders Button - Visible to all authenticated users */}
                <Button
                  variant="contained"
                  startIcon={<Package size={20} />}
                  onClick={() => router.push('/marketplace/dashboard')}
                  sx={{
                    bgcolor: '#232F3E',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#1d2733',
                    },
                    whiteSpace: 'nowrap',
                  }}
                >
                  My Orders
                </Button>
                
                {/* My Dashboard Button - Only show if user is not a vendor */}
                {user.role !== 'vendor' && (
                  <Button
                    variant="contained"
                    startIcon={<ShoppingCart size={20} />}
                    onClick={() => router.push('/marketplace/my-dashboard')}
                    sx={{
                      bgcolor: '#1976d2',
                      color: 'white',
                      '&:hover': {
                        bgcolor: '#1565c0',
                      },
                      whiteSpace: 'nowrap',
                    }}
                  >
                    My Dashboard
                  </Button>
                )}
                
                {/* Vendor Store Button - Only show if user is a vendor */}
                {user.role === 'vendor' && (
                  <Button
                    variant="contained"
                    startIcon={<ShoppingCart size={20} />}
                    onClick={() => router.push('/marketplace/vendor-payment-settings')}
                    sx={{
                      bgcolor: '#FF9900',
                      color: 'white',
                      '&:hover': {
                        bgcolor: '#e88900',
                      },
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Vendor Store
                  </Button>
                )}
                
                {/* Vendor Dashboard Button - Only show if user is a vendor */}
                {user.role === 'vendor' && (
                  <Button
                    variant="contained"
                    startIcon={<Building size={20} />}
                    onClick={() => router.push('/marketplace/vendor-dashboard')}
                    sx={{
                      bgcolor: '#FF9900',
                      color: 'white',
                      '&:hover': {
                        bgcolor: '#e88900',
                      },
                      whiteSpace: 'nowrap',
                    }}
                  >
                    My Store Dashboard
                  </Button>
                )}
                
                {/* Vendor Registration Button - Only show if user is not already a vendor */}
                {user.role !== 'vendor' && (
                  <Button
                    variant="contained"
                    startIcon={<Plus size={20} />}
                    onClick={() => router.push('/marketplace/vendor-store-registration')}
                    sx={{
                      bgcolor: '#4CAF50',
                      color: 'white',
                      '&:hover': {
                        bgcolor: '#45a049',
                      },
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Register Your Store
                  </Button>
                )}
              </Box>
            )}
            
            {/* Show registration button for non-authenticated users */}
            {!user && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Plus size={20} />}
                  onClick={() => router.push('/register')}
                  sx={{
                    bgcolor: '#4CAF50',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#45a049',
                    },
                    whiteSpace: 'nowrap',
                  }}
                >
                  Register to Sell
                </Button>
              </Box>
            )}
          </Box>

        </Box>
        
        {/* Main Content with Sidebar */}
        <Grid container spacing={3}>
          {/* Sidebar */}
          <Grid item xs={12} md={3} lg={2.5}>
            <MarketplaceSidebar userId={user?.id || null} />
          </Grid>
          
          {/* Main Content */}
          <Grid item xs={12} md={9} lg={9.5}>
            {/* Search and Filters */}
            <Paper 
              elevation={0} 
              sx={{ 
                mb: 3, 
                p: 2, 
                border: '1px solid #ddd',
                borderRadius: 1,
                backgroundColor: '#f8f8f8',
              }}
            >
              {/* Main Search Row */}
              <Box component="form" onSubmit={handleSearch} sx={{ mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <TextField
                      fullWidth
                      placeholder="Search products, creators, or NFTs..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      size="medium"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={20} color="#666" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        backgroundColor: 'white',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1,
                          '& fieldset': {
                            borderColor: '#ddd',
                          },
                          '&:hover fieldset': {
                            borderColor: '#FF9900',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#FF9900',
                            borderWidth: '2px',
                          },
                        }
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={2.5}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={filters.category}
                        label="Category"
                        onChange={(e) => handleFiltersChange({ category: e.target.value })}
                        size="medium"
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#ddd',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#FF9900',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#FF9900',
                            borderWidth: '2px',
                          },
                        }}
                      >
                        <MenuItem value="all">All Categories</MenuItem>
                        {categories.map((category) => (
                          <MenuItem key={category} value={category}>
                            {category}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={2.5}>
                    <FormControl fullWidth>
                      <InputLabel>Vendor</InputLabel>
                      <Select
                        value={vendorFilter}
                        label="Vendor"
                        onChange={(e) => {
                          setVendorFilter(e.target.value);
                          handleFiltersChange({});
                        }}
                        size="medium"
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#ddd',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#FF9900',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#FF9900',
                            borderWidth: '2px',
                          },
                        }}
                      >
                        <MenuItem value="all">All Vendors</MenuItem>
                        {marketplaceVendors.map((vendor) => (
                          <MenuItem key={vendor.id} value={vendor.id}>
                            {vendor.displayName || vendor.username}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={6} md={1.5}>
                    <TextField
                      fullWidth
                      label="Min Price"
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                      size="medium"
                      InputProps={{
                        inputProps: { min: 0, step: 0.01 }
                      }}
                      sx={{
                        backgroundColor: 'white',
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#ddd' },
                          '&:hover fieldset': { borderColor: '#FF9900' },
                          '&.Mui-focused fieldset': { borderColor: '#FF9900', borderWidth: '2px' },
                        }
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={6} md={1.5}>
                    <TextField
                      fullWidth
                      label="Max Price"
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                      size="medium"
                      InputProps={{
                        inputProps: { min: 0, step: 0.01 }
                      }}
                      sx={{
                        backgroundColor: 'white',
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#ddd' },
                          '&:hover fieldset': { borderColor: '#FF9900' },
                          '&.Mui-focused fieldset': { borderColor: '#FF9900', borderWidth: '2px' },
                        }
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={1.5}>
                    <FormControl fullWidth>
                      <InputLabel>Sort By</InputLabel>
                      <Select
                        value={filters.sortBy}
                        label="Sort By"
                        onChange={(e) => handleFiltersChange({ sortBy: e.target.value as any })}
                        size="medium"
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ddd' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9900' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9900', borderWidth: '2px' },
                        }}
                      >
                        {SORT_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>

              {/* Quick Filters */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={filters.isNFT} 
                      onChange={(e) => handleFiltersChange({ isNFT: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#FF9900',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#FF9900',
                        },
                      }}
                    />
                  }
                  label="NFTs Only"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
                
                <FormControlLabel
                  control={
                    <Switch 
                      checked={filters.featured} 
                      onChange={(e) => handleFiltersChange({ featured: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#146EB4',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#146EB4',
                        },
                      }}
                    />
                  }
                  label="Featured"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                />
                
                <Button
                  variant="text"
                  size="small"
                  startIcon={<Filter size={16} />}
                  onClick={() => setShowFilters(!showFilters)}
                  sx={{ 
                    color: '#0066c0',
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: '#f0f8ff',
                    }
                  }}
                >
                  {showFilters ? 'Hide Filters' : 'More Filters'}
                </Button>
                
                {hasActiveFilters && (
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<FilterX size={16} />}
                    onClick={clearFilters}
                    sx={{ 
                      color: '#0066c0',
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: '#f0f8ff',
                      }
                    }}
                  >
                    Clear All
                  </Button>
                )}
                
                <Button
                  variant="contained"
                  size="small"
                  startIcon={isRefreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshCcw size={16} />}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  sx={{
                    backgroundColor: '#FF9900',
                    color: 'white',
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: '#e88900',
                    },
                    '&:disabled': {
                      backgroundColor: '#FF9900',
                      opacity: 0.7,
                    }
                  }}
                >
                  Refresh
                </Button>
              </Box>

              {/* Advanced Filters Panel */}
              {showFilters && (
                <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #eee' }}>
                  <Grid container spacing={2}>
                    {/* Brand Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Brand"
                        value={filters.brand}
                        onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
                        size="small"
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: '#ddd' },
                            '&:hover fieldset': { borderColor: '#FF9900' },
                            '&.Mui-focused fieldset': { borderColor: '#FF9900', borderWidth: '2px' },
                          }
                        }}
                      />
                    </Grid>
                    
                    {/* Color Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Color"
                        value={filters.color}
                        onChange={(e) => setFilters(prev => ({ ...prev, color: e.target.value }))}
                        size="small"
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: '#ddd' },
                            '&:hover fieldset': { borderColor: '#FF9900' },
                            '&.Mui-focused fieldset': { borderColor: '#FF9900', borderWidth: '2px' },
                          }
                        }}
                      />
                    </Grid>
                    
                    {/* Size Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Size"
                        value={filters.size}
                        onChange={(e) => setFilters(prev => ({ ...prev, size: e.target.value }))}
                        size="small"
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: '#ddd' },
                            '&:hover fieldset': { borderColor: '#FF9900' },
                            '&.Mui-focused fieldset': { borderColor: '#FF9900', borderWidth: '2px' },
                          }
                        }}
                      />
                    </Grid>
                    
                    {/* Location Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Location"
                        value={filters.location}
                        onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                        size="small"
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: '#ddd' },
                            '&:hover fieldset': { borderColor: '#FF9900' },
                            '&.Mui-focused fieldset': { borderColor: '#FF9900', borderWidth: '2px' },
                          }
                        }}
                      />
                    </Grid>
                    
                    {/* Condition Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Condition</InputLabel>
                        <Select
                          value={filters.condition}
                          label="Condition"
                          onChange={(e) => setFilters(prev => ({ ...prev, condition: e.target.value }))}
                          sx={{
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ddd' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9900' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9900', borderWidth: '2px' },
                          }}
                        >
                          <MenuItem value="all">All Conditions</MenuItem>
                          <MenuItem value="new">New</MenuItem>
                          <MenuItem value="used">Used</MenuItem>
                          <MenuItem value="refurbished">Refurbished</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    {/* Rating Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Minimum Rating</InputLabel>
                        <Select
                          value={filters.rating}
                          label="Minimum Rating"
                          onChange={(e) => setFilters(prev => ({ ...prev, rating: Number(e.target.value) }))}
                          sx={{
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ddd' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9900' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#FF9900', borderWidth: '2px' },
                          }}
                        >
                          <MenuItem value={0}>Any Rating</MenuItem>
                          <MenuItem value={4}>4+ Stars</MenuItem>
                          <MenuItem value={3}>3+ Stars</MenuItem>
                          <MenuItem value={2}>2+ Stars</MenuItem>
                          <MenuItem value={1}>1+ Stars</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    {/* In Stock Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={filters.inStock} 
                            onChange={(e) => setFilters(prev => ({ ...prev, inStock: e.target.checked }))}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#FF9900',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#FF9900',
                              },
                            }}
                          />
                        }
                        label="In Stock Only"
                        sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                      />
                    </Grid>
                    
                    {/* Free Shipping Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={filters.freeShipping} 
                            onChange={(e) => setFilters(prev => ({ ...prev, freeShipping: e.target.checked }))}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#FF9900',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#FF9900',
                              },
                            }}
                          />
                        }
                        label="Free Shipping"
                        sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                      />
                    </Grid>
                    
                    {/* Discount Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Switch 
                            checked={filters.discount} 
                            onChange={(e) => setFilters(prev => ({ ...prev, discount: e.target.checked }))}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: '#FF9900',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: '#FF9900',
                              },
                            }}
                          />
                        }
                        label="On Sale"
                        sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
                      />
                    </Grid>
                    
                    {/* Apply Filters Button */}
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button
                          variant="outlined"
                          onClick={clearFilters}
                          sx={{
                            borderColor: '#ddd',
                            color: '#666',
                            '&:hover': {
                              borderColor: '#999',
                              backgroundColor: '#f5f5f5',
                            }
                          }}
                        >
                          Reset
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => {
                            setShowFilters(false);
                            handleFiltersChange({});
                          }}
                          sx={{
                            backgroundColor: '#FF9900',
                            color: 'white',
                            '&:hover': {
                              backgroundColor: '#e88900',
                            }
                          }}
                        >
                          Apply Filters
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Paper>
            
            {/* Error State */}
            {error && (
              <Alert 
                severity="error" 
                action={
                  <Button color="inherit" size="small" onClick={() => fetchProducts()}>
                    Try Again
                  </Button>
                }
                sx={{ mb: 3, borderRadius: 2 }}
              >
                <strong>Error loading products:</strong> {error}
              </Alert>
            )}
            
            {/* Amazon-Style Products Grid */}
            <MarketplaceGrid
              products={products}
              loading={loading}
            />

            {/* Amazon-Style Pagination */}
            {pagination.pages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2, 
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    backgroundColor: '#f8f8f8',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" color="text.secondary" component="span">
                      Page {pagination.page} of {pagination.pages}
                    </Typography>
                    <Pagination
                      count={pagination.pages}
                      page={pagination.page}
                      onChange={handlePageChange}
                      size="medium"
                      showFirstButton
                      showLastButton
                    />
                  </Stack>
                </Paper>
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default MarketplacePage;

// Simple ObjectId validation function
const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};
