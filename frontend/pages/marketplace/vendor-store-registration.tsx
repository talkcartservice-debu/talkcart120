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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Store as StoreIcon,
  Save,
  Upload,
  CheckCircle,
} from '@mui/icons-material';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { HttpError, SessionExpiredError } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface VendorStoreData {
  storeName: string;
  storeDescription: string;
  contactEmail: string;
  contactPhone: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  socialLinks?: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
    website: string;
  };
  storePolicy: string;
  returnPolicy: string;
  shippingPolicy: string;
}

const VendorStoreRegistration: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeExists, setStoreExists] = useState(false);
  const [storeData, setStoreData] = useState<VendorStoreData>({
    storeName: '',
    storeDescription: '',
    contactEmail: '',
    contactPhone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
    socialLinks: {
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: '',
      website: '',
    },
    storePolicy: '',
    returnPolicy: '',
    shippingPolicy: '',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Prevent multiple rapid redirects
      const now = Date.now();
      const lastRedirect = (window as any).lastVendorStoreRegistrationLoginRedirectClick || 0;
      if (now - lastRedirect < 1000) {
        // Ignore redirects within 1 second
        return;
      }
      (window as any).lastVendorStoreRegistrationLoginRedirectClick = now;
      
      // Use replace instead of push to avoid back navigation issues
      router.replace('/login').catch((error) => {
        // Handle navigation errors gracefully
        console.error('Navigation to login failed:', error);
      });
    }
  }, [isAuthenticated, router]);

  // Fetch current store information
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchStoreInfo();
    }
  }, [isAuthenticated, user]);

  const fetchStoreInfo = async () => {
    try {
      setLoading(true);
      const response: any = await api.marketplace.getMyVendorStore();
      if (response.success) {
        if (response.data) {
          setStoreExists(true);
          setStoreData({
            storeName: response.data.storeName || '',
            storeDescription: response.data.storeDescription || '',
            contactEmail: response.data.contactEmail || '',
            contactPhone: response.data.contactPhone || '',
            address: {
              street: response.data.address?.street || '',
              city: response.data.address?.city || '',
              state: response.data.address?.state || '',
              country: response.data.address?.country || '',
              zipCode: response.data.address?.zipCode || '',
            },
            socialLinks: {
              facebook: response.data.socialLinks?.facebook || '',
              twitter: response.data.socialLinks?.twitter || '',
              instagram: response.data.socialLinks?.instagram || '',
              linkedin: response.data.socialLinks?.linkedin || '',
              website: response.data.socialLinks?.website || '',
            },
            storePolicy: response.data.storePolicy || '',
            returnPolicy: response.data.returnPolicy || '',
            shippingPolicy: response.data.shippingPolicy || '',
          });
        }
      } else {
        setError(response.error || 'Failed to load store information');
      }
    } catch (err: any) {
      console.error('Error fetching store info:', err);
      setError(err.message || 'Failed to load store information');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle nested fields
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setStoreData(prev => {
        // Ensure parent exists and is an object
        const parentKey = parent as keyof VendorStoreData;
        const parentObj = prev[parentKey];
        const isParentObject = parentObj && typeof parentObj === 'object' && !Array.isArray(parentObj);
        
        return {
          ...prev,
          [parentKey]: {
            ...(isParentObject ? parentObj : {}),
            [child as string]: value
          }
        };
      });
    } else {
      setStoreData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Prevent form submission on Enter key press in input fields
      e.preventDefault();
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Validate required fields
      const storeName = storeData.storeName.trim();
      if (!storeName) {
        setError('Store name is required');
        setSaving(false);
        return;
      }
      
      // Validate store name length
      if (storeName.length > 100) {
        setError('Store name must be 100 characters or less');
        setSaving(false);
        return;
      }
      
      // Additional frontend validation to match backend requirements
      if (storeData.contactEmail && storeData.contactEmail.trim()) {
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(storeData.contactEmail.trim())) {
          setError('Please enter a valid email address');
          setSaving(false);
          return;
        }
      }
      
      if (storeData.contactPhone && storeData.contactPhone.trim()) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(storeData.contactPhone.trim())) {
          setError('Please enter a valid phone number');
          setSaving(false);
          return;
        }
      }
      
      // Validate policy lengths
      if (storeData.storePolicy.length > 2000) {
        setError('Store policy must be 2000 characters or less');
        setSaving(false);
        return;
      }
      
      if (storeData.returnPolicy.length > 2000) {
        setError('Return policy must be 2000 characters or less');
        setSaving(false);
        return;
      }
      
      if (storeData.shippingPolicy.length > 2000) {
        setError('Shipping policy must be 2000 characters or less');
        setSaving(false);
        return;
      }
      
      // Validate address field lengths
      if (storeData.address) {
        if (storeData.address.street && storeData.address.street.length > 200) {
          setError('Street address must be 200 characters or less');
          setSaving(false);
          return;
        }
        if (storeData.address.city && storeData.address.city.length > 100) {
          setError('City must be 100 characters or less');
          setSaving(false);
          return;
        }
        if (storeData.address.state && storeData.address.state.length > 100) {
          setError('State must be 100 characters or less');
          setSaving(false);
          return;
        }
        if (storeData.address.country && storeData.address.country.length > 100) {
          setError('Country must be 100 characters or less');
          setSaving(false);
          return;
        }
        if (storeData.address.zipCode && storeData.address.zipCode.length > 20) {
          setError('ZIP code must be 20 characters or less');
          setSaving(false);
          return;
        }
      }
      
      // Validate social link lengths
      if (storeData.socialLinks) {
        const socialLinks = storeData.socialLinks;
        const maxLength = 200;
        if (socialLinks.facebook && socialLinks.facebook.length > maxLength) {
          setError(`Facebook link must be ${maxLength} characters or less`);
          setSaving(false);
          return;
        }
        if (socialLinks.twitter && socialLinks.twitter.length > maxLength) {
          setError(`Twitter link must be ${maxLength} characters or less`);
          setSaving(false);
          return;
        }
        if (socialLinks.instagram && socialLinks.instagram.length > maxLength) {
          setError(`Instagram link must be ${maxLength} characters or less`);
          setSaving(false);
          return;
        }
        if (socialLinks.linkedin && socialLinks.linkedin.length > maxLength) {
          setError(`LinkedIn link must be ${maxLength} characters or less`);
          setSaving(false);
          return;
        }
        if (socialLinks.website && socialLinks.website.length > maxLength) {
          setError(`Website link must be ${maxLength} characters or less`);
          setSaving(false);
          return;
        }
      }
      
      // Create a clean copy of the data with only valid fields
      const cleanStoreData: any = {
        storeName: storeName,
        storeDescription: storeData.storeDescription.trim(),
        // Only include contact fields if they have values
        ...(storeData.contactEmail.trim() && { contactEmail: storeData.contactEmail.trim() }),
        ...(storeData.contactPhone.trim() && { contactPhone: storeData.contactPhone.trim() }),
        storePolicy: storeData.storePolicy.trim(),
        returnPolicy: storeData.returnPolicy.trim(),
        shippingPolicy: storeData.shippingPolicy.trim(),
      };
      
      // Add address if it exists and has values
      if (storeData.address && typeof storeData.address === 'object') {
        const address = {
          street: storeData.address.street?.trim() || '',
          city: storeData.address.city?.trim() || '',
          state: storeData.address.state?.trim() || '',
          country: storeData.address.country?.trim() || '',
          zipCode: storeData.address.zipCode?.trim() || '',
        };
        
        // Only add address if it has at least one non-empty value
        if (Object.values(address).some(value => value)) {
          cleanStoreData.address = address;
        }
      }
      
      // Add socialLinks if it exists and has values
      if (storeData.socialLinks && typeof storeData.socialLinks === 'object') {
        const socialLinks = {
          facebook: storeData.socialLinks.facebook?.trim() || '',
          twitter: storeData.socialLinks.twitter?.trim() || '',
          instagram: storeData.socialLinks.instagram?.trim() || '',
          linkedin: storeData.socialLinks.linkedin?.trim() || '',
          website: storeData.socialLinks.website?.trim() || '',
        };
        
        // Only add socialLinks if it has at least one non-empty value
        if (Object.values(socialLinks).some(value => value)) {
          cleanStoreData.socialLinks = socialLinks;
        }
      }
      
      // Log the data being sent for debugging
      console.log('Sending vendor store data:', cleanStoreData);
      
      let response: any;
      
      if (storeExists) {
        // Update existing store
        console.log('Updating vendor store with data:', cleanStoreData);
        response = await api.marketplace.updateMyVendorStore(cleanStoreData);
      } else {
        // Create new store
        console.log('Creating vendor store with data:', cleanStoreData);
        response = await api.marketplace.createVendorStore(cleanStoreData);
      }
      
      console.log('API response:', response);
      
      if (response && response.success) {
        setStoreExists(true);
        toast.success(storeExists ? 'Store updated successfully' : 'Store registered successfully');
        
        // Improved user role update logic after store creation
        if (!storeExists && user) {
          try {
            // Small delay to ensure backend has processed the role change
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Refresh user profile to get updated role
            const profileResponse = await api.auth.getProfile();
            console.log('Profile response after store creation:', profileResponse);
            if (profileResponse.success && profileResponse.data) {
              console.log('Profile data received:', profileResponse.data);
              
              // Always update the user context with the new profile data
              // The backend should have already set the role to 'vendor'
              updateUser(profileResponse.data);
              console.log('User profile updated with backend data');
              
              // Also update localStorage to ensure consistency
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('user', JSON.stringify(profileResponse.data));
                  console.log('User data saved to localStorage');
                } catch (storageError) {
                  console.error('Failed to update user in localStorage:', storageError);
                }
              }
              
              // Redirect to vendor dashboard after successful store creation and role update
              router.replace('/marketplace/vendor-dashboard').catch((error) => {
                console.error('Navigation to vendor dashboard failed:', error);
              });
              return;
            } else {
              console.error('Failed to get updated profile:', profileResponse);
              // Try to get user data from localStorage as fallback
              if (typeof window !== 'undefined') {
                try {
                  const storedUser = localStorage.getItem('user');
                  if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    console.log('Using user data from localStorage:', parsedUser);
                    // Force update the role to vendor since store was created
                    const updatedUser = { ...parsedUser, role: 'vendor' as const };
                    updateUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                  }
                } catch (storageError) {
                  console.error('Failed to read user from localStorage:', storageError);
                }
              }
            }
          } catch (profileError) {
            console.error('Error refreshing user profile:', profileError);
            // Fallback: manually set the role to vendor since store creation was successful
            if (user) {
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
        
        // Redirect to vendor dashboard after successful save (for both create and update)
        // Only redirect here if we haven't already redirected above
        router.replace('/marketplace/vendor-dashboard').catch((error) => {
          console.error('Navigation to vendor dashboard failed:', error);
        });
      } else {
        // Enhanced error handling to show validation details
        let errorMessage = response?.error || response?.message || 'Failed to save store information';
        
        // If there are validation details, include them in the error message
        if (response?.details && Array.isArray(response.details)) {
          errorMessage += ': ' + response.details.join(', ');
        }
        
        console.error('API Error Response:', response);
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error('Error saving store:', err);
      
      // Handle different types of errors
      if (err instanceof SessionExpiredError) {
        setError('Session expired. Please login again.');
      } else if (err instanceof HttpError) {
        setError(err.message || 'An error occurred while saving the store.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setSaving(false);
    }
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

  // Check if user is authenticated (allow all authenticated users to register a store)
  if (!isAuthenticated || !user) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            Access denied. You must be logged in to register a store.
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => router.push('/login')}
          >
            Go to Login
          </Button>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            {storeExists ? 'Edit Vendor Store' : 'Register Vendor Store'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {storeExists 
              ? 'Update your store information' 
              : 'Register your store to start selling on Vetora Marketplace'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', mb: 4 }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StoreIcon />
                <span>Store Information</span>
              </Box>
            }
            sx={{ bgcolor: theme.palette.grey[50] }}
          />
          <Divider />
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Store Name *"
                    name="storeName"
                    value={storeData.storeName}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    required
                    helperText="This is the public name of your store"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Store Description"
                    name="storeDescription"
                    value={storeData.storeDescription}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    multiline
                    rows={3}
                    helperText="A brief description of your store and what you sell"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Contact Email"
                    name="contactEmail"
                    value={storeData.contactEmail}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    type="email"
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Contact Phone"
                    name="contactPhone"
                    value={storeData.contactPhone}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    type="tel"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Store Address
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Street Address"
                    name="address.street"
                    value={storeData.address?.street || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="City"
                    name="address.city"
                    value={storeData.address?.city || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="State/Province"
                    name="address.state"
                    value={storeData.address?.state || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Country"
                    name="address.country"
                    value={storeData.address?.country || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="ZIP/Postal Code"
                    name="address.zipCode"
                    value={storeData.address?.zipCode || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>
                    Social Media Links
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Facebook"
                    name="socialLinks.facebook"
                    value={storeData.socialLinks?.facebook || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Twitter"
                    name="socialLinks.twitter"
                    value={storeData.socialLinks?.twitter || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Instagram"
                    name="socialLinks.instagram"
                    value={storeData.socialLinks?.instagram || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="LinkedIn"
                    name="socialLinks.linkedin"
                    value={storeData.socialLinks?.linkedin || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Website"
                    name="socialLinks.website"
                    value={storeData.socialLinks?.website || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2, mt: 2 }}>
                    Store Policies
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Store Policy"
                    name="storePolicy"
                    value={storeData.storePolicy}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    multiline
                    rows={3}
                    helperText="General policies for your store"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Return Policy"
                    name="returnPolicy"
                    value={storeData.returnPolicy}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    multiline
                    rows={3}
                    helperText="Your return and refund policy"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Shipping Policy"
                    name="shippingPolicy"
                    value={storeData.shippingPolicy}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    multiline
                    rows={3}
                    helperText="Your shipping and delivery policy"
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                <Button
                  variant="outlined"
                  onClick={(e) => {
                    e.preventDefault();
                    // Use replace instead of push to avoid back navigation issues
                    router.replace('/marketplace/vendor-dashboard').catch((error) => {
                      console.error('Navigation to vendor dashboard failed:', error);
                    });
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                  disabled={saving}
                  sx={{ minWidth: 120 }}
                >
                  {saving ? 'Saving...' : 'Save Store'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Paper>
      </Container>
    </Layout>
  );
};

export default VendorStoreRegistration;