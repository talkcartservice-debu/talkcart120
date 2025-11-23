import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { SessionExpiredError } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: Array<{ secure_url?: string; url: string; public_id: string; } | string>;
  category: string;
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    walletAddress?: string;
  };
  isNFT: boolean;
  createdAt: string;
  tags: string[];
  stock: number;
  rating: number;
  reviewCount: number;
  sales: number;
  views: number;
  featured?: boolean;
  contractAddress?: string;
  tokenId?: string;
  // Additional fields needed by MarketplaceGrid
  availability: string;
  discount: number;
  freeShipping: boolean;
  fastDelivery: boolean;
  prime: boolean;
}

interface Vendor {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  walletAddress?: string;
  productCount: number;
  followerCount?: number;
  followingCount?: number;
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  pages: number;
  total: number;
}

interface MarketplaceFilters {
  page?: number;
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  isNFT?: boolean;
  featured?: boolean;
  sortBy?: 'priceAsc' | 'priceDesc' | 'newest' | 'sales' | 'views' | 'featured';
  vendorId?: string;
  brand?: string;
  color?: string;
  size?: string;
  condition?: string;
  rating?: number;
  inStock?: boolean;
  freeShipping?: boolean;
  discount?: boolean;
  tags?: string[];
  location?: string;
}

const useMarketplace = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    pages: 1,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products with filters
  const fetchProducts = useCallback(async (filters: MarketplaceFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Add a check to ensure api and api.marketplace are defined
      if (!api) {
        throw new Error('API service is not initialized');
      }
      
      if (!api.marketplace) {
        throw new Error('Marketplace API is not available');
      }

      const params = {
        page: filters.page || 1,
        limit: 12,
        search: filters.search,
        category: filters.category,
        minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
        isNFT: filters.isNFT,
        featured: filters.featured,
        sortBy: filters.sortBy || 'newest',
        vendorId: filters.vendorId,
        brand: filters.brand,
        color: filters.color,
        size: filters.size,
        condition: filters.condition,
        rating: filters.rating,
        inStock: filters.inStock,
        freeShipping: filters.freeShipping,
        discount: filters.discount,
        tags: filters.tags,
        location: filters.location,
      };

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key as keyof typeof params] === undefined) {
          delete params[key as keyof typeof params];
        }
      });

      console.log('Fetching products with params:', params);
      const response: any = await api.marketplace.getProducts(params);
      console.log('Products API response:', response);

      if (response.success) {
        console.log('Products data from API:', response.data);
        const productsData = response.data.products.map((product: any) => ({
          id: product.id || product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          images: product.images?.map((img: any) => img.secure_url || img.url || img) || [],
          category: product.category,
          vendor: {
            id: product.vendor?.id || product.vendorId?._id || product.vendorId || '',
            username: product.vendor?.username || product.vendorId?.username || '',
            displayName: product.vendor?.displayName || product.vendorId?.displayName || '',
            avatar: product.vendor?.avatar || product.vendorId?.avatar || '',
            isVerified: product.vendor?.isVerified || product.vendorId?.isVerified || false,
            walletAddress: product.vendor?.walletAddress || product.vendorId?.walletAddress,
          },
          isNFT: product.isNFT || false,
          createdAt: product.createdAt,
          tags: product.tags || [],
          stock: product.stock !== undefined ? product.stock : 0,
          rating: product.rating !== undefined ? product.rating : 0,
          reviewCount: product.reviewCount !== undefined ? product.reviewCount : 0,
          sales: product.sales !== undefined ? product.sales : 0,
          views: product.views !== undefined ? product.views : 0,
          featured: product.featured || false,
          contractAddress: product.contractAddress,
          tokenId: product.tokenId,
          // Additional fields needed by MarketplaceGrid
          availability: product.stock !== undefined && product.stock > 0 ? 'In Stock' : 'Out of Stock',
          discount: product.discount !== undefined ? product.discount : 0,
          freeShipping: product.freeShipping || false,
          fastDelivery: product.fastDelivery || false,
          prime: product.prime || false,
        }));

        console.log('Processed products data:', productsData);
        setProducts(productsData);
        setPagination({
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          pages: response.data.pagination.pages,
          total: response.data.pagination.total,
        });
      } else {
        throw new Error(response.error || 'Failed to fetch products');
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to fetch products');
      setProducts([]);
      setPagination({ page: 1, limit: 12, pages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      // Add a check to ensure api and api.marketplace are defined
      if (!api || !api.marketplace) {
        console.warn('Marketplace API not available');
        setCategories([]);
        return;
      }
      
      console.log('Fetching categories...');
      const response: any = await api.marketplace.getCategories();
      console.log('Categories API response:', response);
      
      if (response.success) {
        setCategories(response.data.categories || []);
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      // On error, do not use hardcoded categories; leave empty so UI reflects real API state
      setCategories([]);
    }
  }, []);

  // Fetch vendors
  const fetchVendors = useCallback(async (params: { page?: number; limit?: number; search?: string } = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Add a check to ensure api and api.marketplace are defined
      if (!api || !api.marketplace) {
        throw new Error('Marketplace API is not available');
      }

      const response: any = await api.marketplace.getVendors(params);

      if (response.success) {
        const vendorsData = response.data.vendors.map((vendor: any) => ({
          id: vendor.id || vendor._id,
          username: vendor.username,
          displayName: vendor.displayName,
          avatar: vendor.avatar || '',
          isVerified: vendor.isVerified || false,
          walletAddress: vendor.walletAddress,
          productCount: vendor.productCount || 0,
          followerCount: vendor.followerCount,
          followingCount: vendor.followingCount,
          bio: vendor.bio,
          location: vendor.location,
          website: vendor.website,
          createdAt: vendor.createdAt,
        }));

        setVendors(vendorsData);
        setPagination({
          page: response.data.pagination.page,
          limit: response.data.pagination.limit,
          pages: response.data.pagination.pages,
          total: response.data.pagination.total,
        });
      } else {
        throw new Error(response.error || 'Failed to fetch vendors');
      }
    } catch (err: any) {
      console.error('Error fetching vendors:', err);
      setError(err.message || 'Failed to fetch vendors');
      setVendors([]);
      setPagination({ page: 1, limit: 12, pages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single product
  const fetchProduct = useCallback(async (productId: string) => {
    try {
      console.log('useMarketplace: fetchProduct called with productId:', productId);
      setLoading(true);
      setError(null);

      // Add a check to ensure api and api.marketplace are defined
      if (!api) {
        throw new Error('API service is not initialized');
      }
      
      if (!api.marketplace) {
        throw new Error('Marketplace API is not available');
      }

      // Normalize the id to a string early to avoid invalid ObjectId issues
      const normalizedId = String(productId);
      const response: any = await api.marketplace.getProduct(normalizedId);
      console.log('useMarketplace: getProduct response:', response);

      if (response.success) {
        const product = response.data.product || response.data;
        console.log('useMarketplace: Processing product data:', product);
        const processedProduct = {
          id: String(product.id || product._id),
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          images: product.images?.map((img: any) => img.secure_url || img.url || img) || [],
          category: product.category,
          vendor: {
            id: String(product.vendor?.id || product.vendorId?._id || product.vendorId),
            username: product.vendor?.username || product.vendorId?.username,
            displayName: product.vendor?.displayName || product.vendorId?.displayName,
            avatar: product.vendor?.avatar || product.vendorId?.avatar || '',
            isVerified: product.vendor?.isVerified || product.vendorId?.isVerified || false,
            walletAddress: product.vendor?.walletAddress || product.vendorId?.walletAddress,
          },
          isNFT: product.isNFT || false,
          createdAt: product.createdAt,
          tags: product.tags || [],
          stock: product.stock,
          rating: product.rating || 0,
          reviewCount: product.reviewCount || 0,
          sales: product.sales || 0,
          views: product.views || 0,
          featured: product.featured || false,
          contractAddress: product.contractAddress,
          tokenId: product.tokenId,
          relatedProducts: product.relatedProducts || [],
        };
        console.log('useMarketplace: Returning processed product:', processedProduct);
        return processedProduct;
      } else {
        throw new Error(response.error || 'Failed to fetch product');
      }
    } catch (err: any) {
      // Avoid noisy dev overlay for expected 404s
      const status = err?.status ?? err?.data?.status;
      const msg = err?.message || err?.data?.error || '';
      if (status !== 404) {
        console.warn('Error fetching product:', msg || err);
      }
      setError(msg || 'Failed to fetch product');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Buy product
  const buyProduct = useCallback(async (productId: string, opts?: { paymentMethod?: 'crypto' | 'nft' | 'paystack' | 'mobile_money' | 'airtel_money' | 'bank_transfer' | 'cash_on_delivery' | 'card_payment'; paymentDetails?: any; product?: any }) => {
    try {
      setLoading(true);
      setError(null);

      // Add a check to ensure api and api.marketplace are defined
      if (!api) {
        throw new Error('API service is not initialized');
      }
      
      if (!api.marketplace) {
        throw new Error('Marketplace API is not available');
      }

      // For NFTs, no payment method is required
      // For regular products, use the provided payment method
      const method = opts?.paymentMethod;
      const details = opts?.paymentDetails;

      let requestData: any = undefined;
      
      // Handle different payment methods
      if (method) {
        requestData = { paymentMethod: method, paymentDetails: details };
      }

      const response: any = await api.marketplace.buyProduct(productId, requestData);

      if (response.success) {
        const { product, payment } = response.data;
      
        if (payment.status === 'completed') {
          toast.success('Purchase completed successfully!');
        } else if (payment.status === 'requires_client_signature') {
          toast.success('Transaction prepared! Please sign with the vendor wallet.');
        }
      
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to purchase product');
      }
    } catch (err: any) {
      console.error('Error buying product:', err);
      setError(err.message || 'Failed to purchase product');
      
      if (err instanceof SessionExpiredError || err?.name === 'SessionExpiredError') {
        throw err;
      }
      
      toast.error(err.message || 'Failed to purchase product');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create product
  const createProduct = useCallback(async (productData: any) => {
    try {
      setLoading(true);
      setError(null);

      // Add a check to ensure api and api.marketplace are defined
      if (!api) {
        throw new Error('API service is not initialized');
      }
      
      if (!api.marketplace) {
        throw new Error('Marketplace API is not available');
      }

      const response: any = await api.marketplace.createProduct(productData);

      if (response.success) {
        toast.success('Product created successfully!');
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create product');
      }
    } catch (err: any) {
      console.error('Error creating product:', err);
      setError(err.message || 'Failed to create product');
      toast.error(err.message || 'Failed to create product');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add product review
  const addProductReview = useCallback(async (productId: string, reviewData: { rating: number; title: string; comment: string }) => {
    try {
      setLoading(true);
      setError(null);

      // Add a check to ensure api and api.marketplace are defined
      if (!api) {
        throw new Error('API service is not initialized');
      }
      
      if (!api.marketplace) {
        throw new Error('Marketplace API is not available');
      }

      // Send the review data with separate title and comment fields
      const apiReviewData = {
        rating: reviewData.rating,
        title: reviewData.title,
        comment: reviewData.comment
      };

      const response: any = await api.marketplace.addProductReview(productId, apiReviewData);

      if (response.success) {
        toast.success('Review submitted successfully!');
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to submit review');
      }
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err.message || 'Failed to submit review');
      toast.error(err.message || 'Failed to submit review');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    products,
    vendors,
    categories,
    pagination,
    loading,
    error,
    fetchProducts,
    fetchProduct,
    fetchCategories,
    fetchVendors,
    buyProduct,
    createProduct,
    addProductReview,
  };
};

export default useMarketplace;