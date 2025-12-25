import React, { useState, useEffect } from 'react';
import { Button, Box, Typography, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ShoppingCart, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import CreateProductPostModal from './CreateProductPostModal';

interface VendorProductPostCreatorProps {
  postId: string; // The post ID to link the product to
  onSuccess?: () => void;
}

const VendorProductPostCreator: React.FC<VendorProductPostCreatorProps> = ({ 
  postId, 
  onSuccess 
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasProducts, setHasProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if the user has products available to create a product post
  useEffect(() => {
    const checkUserProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!user) {
          setError('You must be logged in to create product posts');
          return;
        }

        const response: any = await api.marketplace.getMyProducts({ limit: 1 });
        
        if (response.success && response.data?.products && Array.isArray(response.data.products)) {
          setHasProducts(response.data.products.length > 0);
        } else {
          setHasProducts(false);
        }
      } catch (err) {
        console.error('Error checking user products:', err);
        setError('Failed to check your products');
        setHasProducts(false);
      } finally {
        setLoading(false);
      }
    };

    if (postId && user) {
      checkUserProducts();
    }
  }, [postId, user]);

  const handleOpen = () => {
    if (!hasProducts) {
      setError('You need to create products first before you can create product posts');
      return;
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  if (!user) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        You need to be logged in to create product posts
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <>
      <Button
        variant="contained"
        startIcon={<ShoppingCart size={16} />}
        onClick={handleOpen}
        disabled={!hasProducts}
        sx={{
          backgroundColor: 'primary.main',
          color: 'white',
          '&:hover': {
            backgroundColor: 'primary.dark',
          },
          mt: 1,
          mb: 2
        }}
      >
        {hasProducts ? 'Create Shoppable Post' : 'Create Products First'}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}

      <CreateProductPostModal
        isOpen={open}
        onClose={handleClose}
        postId={postId}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default VendorProductPostCreator;