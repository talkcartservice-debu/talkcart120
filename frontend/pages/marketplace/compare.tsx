import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  CircularProgress, 
  Alert,
  useTheme
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProductComparison from '@/components/marketplace/ProductComparison';

const ComparePage = () => {
  const theme = useTheme();
  const router = useRouter();
  const { ids } = router.query;
  const [productIds, setProductIds] = useState<string[]>([]);

  useEffect(() => {
    if (ids && typeof ids === 'string') {
      setProductIds(ids.split(','));
    } else if (Array.isArray(ids)) {
      setProductIds(ids);
    }
  }, [ids]);

  const handleBack = () => {
    router.back();
  };

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Button
            startIcon={<ArrowLeft size={20} />}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          <Typography variant="h4" fontWeight={700}>
            Product Comparison
          </Typography>
        </Box>

        {productIds.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary" mb={2}>
              No products selected for comparison
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/marketplace')}
            >
              Browse Products
            </Button>
          </Box>
        ) : productIds.length < 2 ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Please select at least 2 products to compare
          </Alert>
        ) : productIds.length > 10 ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You can compare up to 10 products at a time
          </Alert>
        ) : (
          <ProductComparison productIds={productIds} />
        )}
      </Container>
    </Layout>
  );
};

export default ComparePage;