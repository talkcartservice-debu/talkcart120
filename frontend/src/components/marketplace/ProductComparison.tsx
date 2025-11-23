import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Chip, 
  Avatar,
  Rating,
  Button,
  CircularProgress,
  useTheme
} from '@mui/material';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/router';
import { api } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  images: { url: string }[];
  rating: number;
  reviewCount: number;
  sales: number;
  stock: number;
  brand: string;
  condition: string;
  category: string;
  tags?: string[];
  vendorId: {
    username: string;
    displayName: string;
    avatar: string;
  };
}

interface ComparisonData {
  products: Product[];
  attributes: {
    basic: any;
    tags: any;
    tagList: string[];
    specifications: any;
    specificationKeys: string[];
  };
}

interface ProductComparisonProps {
  productIds: string[];
}

const ProductComparison: React.FC<ProductComparisonProps> = ({ productIds }) => {
  const theme = useTheme();
  const router = useRouter();
  const { addToCart } = useCart();
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComparisonData();
  }, [productIds]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: any = await api.marketplace.compareProducts(productIds);
      
      if (response?.success && response?.data) {
        // Ensure products have the correct id field
        const transformedData = {
          ...response.data,
          products: response.data.products.map((product: any) => ({
            ...product,
            id: product.id || product._id
          }))
        };
        setComparisonData(transformedData);
      } else {
        throw new Error(response?.message || 'Failed to fetch comparison data');
      }
    } catch (err: any) {
      console.error('Error fetching comparison data:', err);
      setError(err.message || 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProduct = (productId: string) => {
    router.push(`/marketplace/${productId}`);
  };

  const handleAddToCart = async (productId: string, productName: string) => {
    // Debug log to help identify issues
    console.log('Adding to cart:', { productId, productName });
    
    if (!productId) {
      toast.error('Invalid product ID');
      return;
    }
    
    const success = await addToCart(productId, 1);
    if (success) {
      toast.success(`${productName} added to cart!`);
      // Show a success message with instructions to view cart
      toast.success('Click the cart icon in the header to view your cart', { duration: 3000 });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchComparisonData} variant="outlined" sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!comparisonData || comparisonData.products.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography>No products to compare</Typography>
      </Box>
    );
  }

  const { products, attributes } = comparisonData;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Product Comparison
      </Typography>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '200px', fontWeight: 600 }}>Attribute</TableCell>
              {products.map((product, index) => (
                <TableCell key={index} align="center">
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    <Avatar 
                      src={product.images[0]?.url} 
                      alt={product.name}
                      sx={{ width: 60, height: 60, mb: 1 }}
                    />
                    <Typography variant="subtitle2" textAlign="center">
                      {product.name}
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {product.price} {product.currency}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Rating value={product.rating} readOnly size="small" />
                      <Typography variant="caption">
                        ({product.reviewCount})
                      </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                      <Button
                        size="small"
                        startIcon={<ExternalLink size={16} />}
                        onClick={() => handleViewProduct(product.id)}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<ShoppingCart size={16} />}
                        onClick={() => handleAddToCart(product.id, product.name)}
                      >
                        Add to Cart
                      </Button>
                    </Box>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Basic Information */}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Brand</TableCell>
              {attributes.basic.brand.map((brand: string, index: number) => (
                <TableCell key={index} align="center">
                  {brand || '-'}
                </TableCell>
              ))}
            </TableRow>
            
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Condition</TableCell>
              {attributes.basic.condition.map((condition: string, index: number) => (
                <TableCell key={index} align="center">
                  <Chip 
                    label={condition} 
                    size="small" 
                    color={condition === 'new' ? 'success' : condition === 'refurbished' ? 'warning' : 'default'} 
                  />
                </TableCell>
              ))}
            </TableRow>
            
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              {attributes.basic.category.map((category: string, index: number) => (
                <TableCell key={index} align="center">
                  {category}
                </TableCell>
              ))}
            </TableRow>
            
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Stock</TableCell>
              {attributes.basic.stock.map((stock: number, index: number) => (
                <TableCell key={index} align="center">
                  {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                </TableCell>
              ))}
            </TableRow>
            
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Sales</TableCell>
              {attributes.basic.sales.map((sales: number, index: number) => (
                <TableCell key={index} align="center">
                  {sales}
                </TableCell>
              ))}
            </TableRow>
            
            {/* Specifications */}
            {attributes.specificationKeys.map((key: string) => (
              <TableRow key={key}>
                <TableCell sx={{ fontWeight: 600 }}>{key}</TableCell>
                {attributes.specifications[key].map((value: string, index: number) => (
                  <TableCell key={index} align="center">
                    {value || '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            
            {/* Tags */}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Tags</TableCell>
              <TableCell colSpan={products.length} align="center">
                <Box display="flex" flexWrap="wrap" justifyContent="center" gap={0.5}>
                  {attributes.tagList && attributes.tags ? (
                    attributes.tagList.map((tag: string, tagIndex: number) => {
                      // Check if any product has this tag
                      const hasTag = attributes.tags[tag] && 
                        Array.isArray(attributes.tags[tag]) && 
                        attributes.tags[tag].some((hasTag: boolean) => hasTag);
                      
                      return hasTag ? (
                        <Chip 
                          key={tagIndex} 
                          label={tag} 
                          size="small" 
                          variant="outlined" 
                          color="primary"
                        />
                      ) : null;
                    })
                  ) : (
                    <Typography variant="body2">-</Typography>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ProductComparison;