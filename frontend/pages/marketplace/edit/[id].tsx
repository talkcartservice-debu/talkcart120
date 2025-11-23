import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
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

// Categories will be loaded from API

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
  isActive: boolean;
  featured: boolean;
  discount: string; // Add discount field
}

const EditProductPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);

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
    isActive: true,
    featured: false,
    discount: '0', // Add discount field with default value
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>([]);

  // Simple Ethereum address validation function
  const isEthereumAddress = (address: string): boolean => {
    // Basic validation - check if it starts with 0x and is 42 characters long
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Fetch categories
  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.marketplace.getCategories();
        if (res?.success) setCategories(res.data.categories || []);
      } catch (e) {
        console.warn('Failed to load categories', e);
        setCategories([]); // do not fallback to hardcoded
      }
    })();
  }, []);

  // Fetch product data
  useEffect(() => {
    if (!isAuthenticated || !id || typeof id !== 'string') return;

    const fetchProduct = async () => {
      try {
        setProductLoading(true);
        const response: any = await api.marketplace.getProduct(id);
        if (response.success) {
          const product = response.data.product;
          
          // Set form data
          setForm({
            name: product.name,
            description: product.description,
            price: product.price.toString(),
            currency: product.currency,
            category: product.category,
            tags: product.tags || [],
            stock: product.stock.toString(),
            isNFT: product.isNFT,
            contractAddress: product.contractAddress || '',
            tokenId: product.tokenId || '',
            images: product.images || [],
            isActive: product.isActive,
            featured: product.featured,
            discount: product.discount?.toString() || '0', // Add discount field
          });
          
          // Set existing images
          setExistingImages(product.images || []);
          
          // Create preview URLs for existing images
          const previews = (product.images || []).map((img: any) => 
            typeof img === 'string' ? img : (img.secure_url || img.url)
          ).filter(Boolean);
          
          setImagePreview(previews);
        } else {
          toast.error(response.error || 'Failed to load product');
          router.push('/marketplace/vendor-dashboard');
        }
      } catch (error: any) {
        console.error('Error fetching product:', error);
        toast.error(error.message || 'Failed to load product');
        router.push('/marketplace/vendor-dashboard');
      } finally {
        setProductLoading(false);
      }
    };

    fetchProduct();
  }, [id, isAuthenticated, router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?next=' + encodeURIComponent(`/marketplace/edit/${id}`));
    }
  }, [isAuthenticated, id, router]);

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

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length + imageFiles.length + existingImages.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));

    setImageFiles(prev => [...prev, ...validFiles]);
    setImagePreview(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const currentPreviews = [...imagePreview];
    const currentFiles = [...imageFiles];
    const currentExisting = [...existingImages];
    
    // Determine which array the image belongs to
    if (index < currentExisting.length) {
      // Remove from existing images
      currentExisting.splice(index, 1);
      setExistingImages(currentExisting);
    } else if (index < currentExisting.length + currentFiles.length) {
      // Remove from new files
      const fileIndex = index - currentExisting.length;
      // Revoke the preview URL to prevent memory leaks (only if it exists)
      const previewUrl = currentPreviews[index];
      if (previewUrl && typeof previewUrl === 'string') {
        URL.revokeObjectURL(previewUrl);
      }
      currentFiles.splice(fileIndex, 1);
      setImageFiles(currentFiles);
    }
    
    // Update previews
    currentPreviews.splice(index, 1);
    setImagePreview(currentPreviews);
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

    // Discount: numeric, 0-99, max 2 decimals
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

    // NFT-specific: validate address format
    if (form.isNFT) {
      const addr = form.contractAddress.trim();
      if (!addr) {
        newErrors.contractAddress = 'Contract address is required for NFTs';
      } else if (!isEthereumAddress(addr)) {
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

    if (!id || typeof id !== 'string') {
      toast.error('Invalid product ID');
      return;
    }

    setLoading(true);

    try {
      // Upload new images if any
      let uploadedImages: any[] = [];
      if (imageFiles.length > 0) {
        uploadedImages = await uploadImages();
        if (imageFiles.length > 0 && uploadedImages.length === 0) {
          throw new Error('Failed to upload images');
        }
      }

      // Combine existing images and new uploaded images
      const allImages = [
        ...existingImages,
        ...uploadedImages.map(img => ({
          url: img.secure_url || img.url,
          secure_url: img.secure_url,
          public_id: img.public_id,
          width: img.width,
          height: img.height
        }))
      ];

      // Normalize/format values
      const normalizedPrice = Number(form.price);
      const normalizedStock = form.isNFT ? 1 : Number(form.stock);
      // Use the address as-is since we're not using ethers for checksum validation
      const contractAddress = form.isNFT ? form.contractAddress.trim() : '';

      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: normalizedPrice,
        currency: form.currency,
        category: form.category,
        tags: form.tags,
        stock: normalizedStock,
        isNFT: form.isNFT,
        isActive: form.isActive,
        featured: form.featured,
        discount: Number(form.discount), // Add discount field
        ...(form.isNFT && {
          contractAddress: contractAddress,
          tokenId: form.tokenId.trim(),
        }),
        images: allImages,
      };

      const response = await api.marketplace.updateProduct(id, productData) as any;

      if (response.success) {
        toast.success('Product updated successfully!');
        // Clean up preview URLs
        imagePreview.forEach(url => {
          if (!existingImages.some(img => 
            typeof img === 'string' ? img === url : (img.secure_url || img.url) === url
          )) {
            URL.revokeObjectURL(url);
          }
        });
        router.push('/marketplace/vendor-dashboard');
      } else {
        throw new Error(response.error || 'Failed to update product');
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(error.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/marketplace/vendor-dashboard');
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h6">Please log in to edit products</Typography>
        </Container>
      </Layout>
    );
  }

  if (productLoading) {
    return (
      <Layout>
        <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading product...
          </Typography>
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
            Back to Dashboard
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            Edit Product
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Update your product details
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

                <Grid item xs={12} md={6}>
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
                      inputProps: { min: 0, step: '0.01' }
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!errors.currency}>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={form.currency}
                      label="Currency"
                      onChange={handleInputChange('currency')}
                    >
                      {currencies.map(currency => (
                        <MenuItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
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
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Stock"
                    type="number"
                    value={form.stock}
                    onChange={handleInputChange('stock')}
                    error={!!errors.stock}
                    helperText={errors.stock}
                    disabled={form.isNFT}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                  />
                </Grid>

                {/* Add Discount Field */}
                <Grid item xs={12} md={6}>
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

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.isActive}
                        onChange={handleSwitchChange('isActive')}
                      />
                    }
                    label="Product is Active"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.featured}
                        onChange={handleSwitchChange('featured')}
                      />
                    }
                    label="Featured Product"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Tags (comma separated)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    helperText="Add tags to help users find your product"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            onClick={addTag}
                            startIcon={<Plus size={16} />}
                            variant="outlined"
                            size="small"
                          >
                            Add
                          </Button>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Box sx={{ mt: 1 }}>
                    {form.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        onDelete={() => removeTag(tag)}
                        sx={{ mr: 1, mb: 1 }}
                      />
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12}>
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
                    <Grid item xs={12} md={6}>
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
                    <Grid item xs={12} md={6}>
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
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Product Images
                  </Typography>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<Upload size={16} />}
                      disabled={uploadingImages}
                    >
                      Upload Images
                    </Button>
                  </label>
                  {uploadingImages && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                      <CircularProgress size={20} sx={{ mr: 2 }} />
                      <Typography>Uploading images...</Typography>
                    </Box>
                  )}
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    {imagePreview.map((preview, index) => (
                      <Grid item key={index}>
                        <Box sx={{ position: 'relative' }}>
                          <img
                            src={preview}
                            alt={`Preview ${index}`}
                            style={{
                              width: 100,
                              height: 100,
                              objectFit: 'cover',
                              borderRadius: 4,
                            }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => removeImage(index)}
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              bgcolor: 'background.paper',
                              boxShadow: 2,
                            }}
                          >
                            <X size={16} />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
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
                      startIcon={loading ? <CircularProgress size={16} /> : null}
                    >
                      {loading ? 'Updating...' : 'Update Product'}
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

export default EditProductPage;