import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Alert,
  Divider,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { ArrowLeft, Upload, Plus, X } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { validateMediaFile, formatFileSize } from '@/utils/mediaValidation';

// Simple Ethereum address validation function
const isAddress = (address: string): boolean => {
  // Basic validation - check if it starts with 0x and is 42 characters long
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'ETH', label: 'ETH' },
  { value: 'BTC', label: 'BTC' },
  { value: 'USDC', label: 'USDC' },
  { value: 'USDT', label: 'USDT' },
  { value: 'RWF', label: 'RWF (Rwandan Franc)' },
  { value: 'UGX', label: 'UGX (Ugandan Shilling)' },
  { value: 'KES', label: 'KES (Kenyan Shilling)' },
  { value: 'TZS', label: 'TZS (Tanzanian Shilling)' },
];

interface ProductForm {
  name: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  tags: string[];
  stock: string;
  isNFT: boolean;
  contractAddress: string;
  tokenId: string;
  images: any[];
  discount: string; // Add discount field
}

const CreateProductPage: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [hasVendorStore, setHasVendorStore] = useState<boolean | null>(null); // New state to track vendor store status

  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    category: '',
    tags: [],
    stock: '1',
    isNFT: false,
    contractAddress: '',
    tokenId: '',
    images: [],
    discount: '0' // Add discount field with default value
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!router.isReady) return;
    
    (async () => {
      try {
        const res: any = await api.marketplace.getCategories();
        if (res?.success) setCategories(res.data.categories || []);
      } catch (e) {
        console.warn('Failed to load categories', e);
        setCategories([]); // do not fallback to hardcoded
      }
    })();

    // Cleanup function to revoke preview URLs when component unmounts
    return () => {
      imagePreview.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreview, router.isReady]);

  // Check if user has a vendor store
  useEffect(() => {
    if (!router.isReady || !isAuthenticated || authLoading) return;
    
    (async () => {
      try {
        const response: any = await api.marketplace.getMyVendorStore();
        // Fixed the check to properly verify if vendor store exists
        setHasVendorStore(!!(response?.success && response?.data));
      } catch (error) {
        console.error('Error checking vendor store:', error);
        setHasVendorStore(false);
      }
    })();
  }, [isAuthenticated, authLoading, router.isReady]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!router.isReady) return;
    
    if (!isAuthenticated && !authLoading) {
      router.push('/auth/login?next=' + encodeURIComponent('/marketplace/create'));
    }
  }, [isAuthenticated, authLoading, router.isReady, router]);

  const handleInputChange = (field: keyof ProductForm) => (event: any) => {
    const value = event.target.value;
    setForm(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSwitchChange = (field: keyof ProductForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: event.target.checked }));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types and sizes using our utility
    const validFiles = files.filter(file => {
      const validation = validateMediaFile(file, {
        maxSize: 5, // 5MB limit for product images
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });
      
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error} - ${validation.details || ''}`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length + imageFiles.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));

    setImageFiles(prev => [...prev, ...validFiles]);
    setImagePreview(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    // Revoke the preview URL to prevent memory leaks
    const previewUrl = imagePreview[index];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<any[]> => {
    if (imageFiles.length === 0) return [];

    setUploadingImages(true);
    try {
      const response = await api.marketplace.uploadImages(imageFiles) as any;
      if (response.success) {
        return response.data.images;
      } else {
        throw new Error(response.error || 'Failed to upload images');
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error(error.message || 'Failed to upload images');
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic required fields
    if (!form.name.trim()) newErrors.name = 'Product name is required';
    if (!form.description.trim()) newErrors.description = 'Description is required';
    if (!form.category) newErrors.category = 'Category is required';

    // Price: numeric, > 0, max 2 decimals for fiat, reasonable range
    const priceNum = Number(form.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      newErrors.price = 'Enter a valid price greater than 0';
    } else {
      if (['USD', 'USDC', 'USDT'].includes(form.currency)) {
        const decimalsOk = /^\d+(\.\d{1,2})?$/.test(String(form.price));
        if (!decimalsOk) newErrors.price = 'For USD/USDC/USDT, use up to 2 decimal places';
      }
      if (priceNum > 1_000_000_000) {
        newErrors.price = 'Price is too large';
      }
    }

    // Discount: numeric, 0-99
    const discountNum = Number(form.discount);
    if (!Number.isFinite(discountNum) || discountNum < 0 || discountNum > 99) {
      newErrors.discount = 'Discount must be between 0 and 99';
    }

    // Stock: integer >= 0 when not NFT
    if (!form.isNFT) {
      const stockNum = Number(form.stock);
      if (!Number.isInteger(stockNum) || stockNum < 0) {
        newErrors.stock = 'Stock must be a whole number 0 or greater';
      }
      if (stockNum > 1_000_000) {
        newErrors.stock = 'Stock is too large';
      }
    }

    // NFT-specific: validate address checksum and tokenId numeric
    if (form.isNFT) {
      const addr = form.contractAddress.trim();
      if (!addr) {
        newErrors.contractAddress = 'Contract address is required for NFTs';
      } else if (!isAddress(addr)) {
        newErrors.contractAddress = 'Invalid Ethereum address (must be 0x-prefixed)';
      }

      const tokenIdStr = form.tokenId.trim();
      if (!tokenIdStr) {
        newErrors.tokenId = 'Token ID is required for NFTs';
      } else if (!/^\d+$/.test(tokenIdStr)) {
        newErrors.tokenId = 'Token ID must be a positive integer';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);

    try {
      // Upload images first if any
      let uploadedImages: any[] = [];
      if (imageFiles.length > 0) {
        uploadedImages = await uploadImages();
        if (imageFiles.length > 0 && uploadedImages.length === 0) {
          throw new Error('Failed to upload images');
        }
      }

      // Normalize/format values
      const normalizedPrice = Number(form.price);
      const normalizedStock = form.isNFT ? 1 : Number(form.stock);
      // Use the address as-is since we're not using ethers for checksum validation
      const contractAddress = form.isNFT ? form.contractAddress.trim() : '';

      // Combine existing images and new uploaded images
      const allImages = uploadedImages.map(img => ({
        url: img.secure_url || img.url,
        secure_url: img.secure_url,
        public_id: img.public_id,
        width: img.width,
        height: img.height
      }));

      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: normalizedPrice,
        currency: form.currency,
        category: form.category,
        tags: form.tags,
        stock: normalizedStock,
        isNFT: form.isNFT,
        discount: Number(form.discount), // Add discount field
        ...(form.isNFT && {
          contractAddress: contractAddress,
          tokenId: form.tokenId.trim(),
        }),
        images: allImages,
      };

      const response = await api.marketplace.createProduct(productData) as any;

      if (response.success) {
        toast.success('Product created successfully!');
        // Clean up preview URLs before navigation
        imagePreview.forEach(url => {
          if (url) URL.revokeObjectURL(url);
        });
        // Navigate to the new product page
        router.push(`/marketplace/${response.data.id}`);
      } else {
        throw new Error(response.error || 'Failed to create product');
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Check if we're in the browser environment and if there's a previous page in history
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/marketplace');
    }
  };

  // Show loading state while determining auth status or router not ready
  if (authLoading || !router.isReady || hasVendorStore === null) {
    return (
      <Layout>
        <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>Loading...</Typography>
        </Container>
      </Layout>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    // Don't render anything while redirecting
    return null;
  }

  // Show error if user doesn't have a vendor store
  if (!hasVendorStore) {
    return (
      <Layout>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Alert severity="warning" sx={{ mb: 3 }}>
                Only vendors with registered stores can create products.
              </Alert>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Register Your Vendor Store
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                You need to register a vendor store before you can create products.
              </Typography>
              <Button
                variant="contained"
                onClick={() => router.push('/marketplace/vendor-store-registration')}
                sx={{ minWidth: 200 }}
              >
                Register Store
              </Button>
            </CardContent>
          </Card>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Button
            onClick={handleBack}
            startIcon={<ArrowLeft size={20} />}
            sx={{ mb: 2 }}
          >
            Back to Marketplace
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            Create New Product
          </Typography>
          <Typography variant="body1" color="text.secondary">
            List a new product in the marketplace
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 4 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Product Name"
                    value={form.name}
                    onChange={handleInputChange('name')}
                    error={!!errors.name}
                    helperText={errors.name}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={4}
                    value={form.description}
                    onChange={handleInputChange('description')}
                    error={!!errors.description}
                    helperText={errors.description}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Price"
                    type="number"
                    value={form.price}
                    onChange={handleInputChange('price')}
                    error={!!errors.price}
                    helperText={errors.price}
                    required
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <FormControl sx={{ minWidth: 80 }}>
                            <Select
                              value={form.currency}
                              onChange={handleInputChange('currency')}
                              size="small"
                              sx={{ height: 30 }}
                            >
                              {currencies.map(currency => (
                                <MenuItem key={currency.value} value={currency.value}>
                                  {currency.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.category}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={form.category}
                      label="Category"
                      onChange={handleInputChange('category')}
                    >
                      {categories.map(category => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.category && (
                      <Typography variant="caption" color="error">
                        {errors.category}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {form.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        onDelete={() => removeTag(tag)}
                        deleteIcon={<X size={16} />}
                      />
                    ))}
                  </Box>
                  <TextField
                    fullWidth
                    label="Add Tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    helperText="Press Enter to add tags"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Stock Quantity"
                    type="number"
                    value={form.stock}
                    onChange={handleInputChange('stock')}
                    error={!!errors.stock}
                    helperText={errors.stock || 'Number of items available'}
                    disabled={form.isNFT}
                  />
                </Grid>

                {/* Add Discount Field */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Discount (%)"
                    type="number"
                    value={form.discount}
                    onChange={handleInputChange('discount')}
                    error={!!errors.discount}
                    helperText={errors.discount || 'Discount percentage (0-99)'}
                    InputProps={{
                      inputProps: { min: 0, max: 99 }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.isNFT}
                        onChange={handleSwitchChange('isNFT')}
                      />
                    }
                    label="This is an NFT"
                  />
                </Grid>

                {form.isNFT && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Contract Address"
                        value={form.contractAddress}
                        onChange={handleInputChange('contractAddress')}
                        error={!!errors.contractAddress}
                        helperText={errors.contractAddress}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Token ID"
                        value={form.tokenId}
                        onChange={handleInputChange('tokenId')}
                        error={!!errors.tokenId}
                        helperText={errors.tokenId}
                        required
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Product Images
                  </Typography>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="upload-images"
                    type="file"
                    multiple
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="upload-images">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<Upload size={20} />}
                      disabled={uploadingImages}
                    >
                      {uploadingImages ? 'Uploading...' : 'Upload Images'}
                    </Button>
                  </label>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                    Max 5 images, 5MB each
                  </Typography>
                  
                  {imagePreview.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {imagePreview.map((preview, index) => (
                        <Box key={index} sx={{ position: 'relative' }}>
                          <Image
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            width={100}
                            height={100}
                            style={{
                              objectFit: 'cover',
                              borderRadius: 4,
                              border: '1px solid #ddd'
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeImage(index)}
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              backgroundColor: 'white',
                              '&:hover': {
                                backgroundColor: 'white',
                              }
                            }}
                          >
                            <X size={16} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={handleBack}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      sx={{ minWidth: 120 }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Create Product'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

export default CreateProductPage;