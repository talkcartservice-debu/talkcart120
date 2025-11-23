import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

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
  vendor: {
    id: string;
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
  isNFT: boolean;
  featured?: boolean;
  tags: string[];
  stock: number;
  rating: number;
  reviewCount: number;
  sales: number;
  views: number;
  availability: string;
  createdAt: string;
  discount?: number;
  freeShipping?: boolean;
  fastDelivery?: boolean;
  prime?: boolean;
  recommendationReason?: string;
}

interface UseRecommendationsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  refreshRecommendations: () => void;
  getTopRecommendations: (count: number) => Product[];
  getRecommendationsByCategory: (category: string) => Product[];
  getAffordableRecommendations: (maxPrice: number) => Product[];
  getPremiumRecommendations: (minPrice: number) => Product[];
  getHighlyRatedRecommendations: (minRating: number) => Product[];
  getBestValueRecommendations: () => Product[];
  getTrendingRecommendations: () => Product[];
  getNewRecommendations: () => Product[];
  isRecommended: (productId: string) => boolean;
  provideFeedback: (productId: string, feedback: 'like' | 'dislike', reason?: string) => Promise<void>;
}

export const useRecommendations = (userId: string | null, limit: number = 10): UseRecommendationsReturn => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0); // Add retry count

  const fetchRecommendations = useCallback(async () => {
    console.log('useRecommendations: fetchRecommendations called with userId:', userId);
    if (!userId) {
      console.log('useRecommendations: No userId, setting empty products');
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Add better error handling and logging
      console.log('Fetching recommendations for user:', userId);
      
      // Try to get user-specific recommendations first
      let response: any;
      try {
        response = await api.marketplace.getUserRecommendations(userId, limit);
        console.log('User recommendations API response:', response);
      } catch (userRecError: any) {
        console.warn('Failed to get user recommendations, trying fallback:', userRecError);
        // If user recommendations fail, try random products as fallback
        response = await api.marketplace.getRandomProducts(limit);
        console.log('Fallback to random products API response:', response);
      }
      
      console.log('Processing recommendations response:', response);
      
      // Add more robust response handling
      if (response?.success && response?.data?.recommendations) {
        console.log('Setting products from response.data.recommendations:', response.data.recommendations);
        setProducts(response.data.recommendations);
      } else if (response?.data?.success && response?.data?.data?.products) {
        console.log('Setting products from response.data.data.products:', response.data.data.products);
        setProducts(response.data.data.products);
      } else if (response?.data?.recommendations) {
        // Handle direct response structure
        console.log('Setting products from response.data.recommendations (direct):', response.data.recommendations);
        setProducts(response.data.recommendations);
      } else if (response?.recommendations) {
        // Handle another possible response structure
        console.log('Setting products from response.recommendations:', response.recommendations);
        setProducts(response.recommendations);
      } else if (Array.isArray(response)) {
        // Handle case where response is directly an array of products
        console.log('Setting products from array response:', response);
        setProducts(response);
      } else if (response?.success === false && response?.error) {
        // Handle explicit error responses
        console.log('Explicit error response:', response.error);
        throw new Error(response.error);
      } else {
        console.warn('Unexpected response structure for recommendations:', response);
        // Try one more fallback - trending products
        try {
          const fallbackResponse: any = await api.marketplace.getTrendingProducts(limit);
          console.log('Final fallback to trending products API response:', fallbackResponse);
          if (Array.isArray(fallbackResponse)) {
            console.log('Setting products from trending array response:', fallbackResponse);
            setProducts(fallbackResponse);
          } else if (fallbackResponse?.data?.products) {
            console.log('Setting products from trending data.products:', fallbackResponse.data.products);
            setProducts(fallbackResponse.data.products);
          } else {
            console.log('No trending products found, setting empty array');
            setProducts([]); // Set empty array if all fallbacks fail
          }
        } catch (fallbackError) {
          console.error('All fallbacks failed:', fallbackError);
          setProducts([]); // Set empty array if all fallbacks fail
        }
      }
      
      console.log('Final products state in useRecommendations:', products);
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      // Provide a more user-friendly error message
      const errorMessage = err.message || 'Failed to load recommendations';
      
      // Log the full error for debugging
      console.error('Full error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        status: err.status
      });
      
      // Try fallback to random products
      try {
        console.log('Trying fallback to random products due to error');
        const fallbackResponse: any = await api.marketplace.getRandomProducts(limit);
        console.log('Fallback response:', fallbackResponse);
        if (Array.isArray(fallbackResponse)) {
          console.log('Setting products from fallback array:', fallbackResponse);
          setProducts(fallbackResponse);
        } else if (fallbackResponse?.data?.products) {
          console.log('Setting products from fallback data.products:', fallbackResponse.data.products);
          setProducts(fallbackResponse.data.products);
        } else {
          console.log('Fallback also returned no products, setting empty array');
          setProducts([]);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        setProducts([]); // Set empty array to prevent UI blocking
      }
      
      // Don't set error state for internal server errors to prevent UI blocking
      if (!errorMessage.includes('Internal Server Error')) {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, limit, retryCount, products]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const refreshRecommendations = useCallback(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const getTopRecommendations = useCallback((count: number): Product[] => {
    return [...products].sort((a, b) => b.rating - a.rating).slice(0, count);
  }, [products]);

  const getRecommendationsByCategory = useCallback((category: string): Product[] => {
    return products.filter(product => product.category === category);
  }, [products]);

  const getAffordableRecommendations = useCallback((maxPrice: number): Product[] => {
    return products.filter(product => product.price <= maxPrice);
  }, [products]);

  const getPremiumRecommendations = useCallback((minPrice: number): Product[] => {
    return products.filter(product => product.price >= minPrice);
  }, [products]);

  const getHighlyRatedRecommendations = useCallback((minRating: number): Product[] => {
    return products.filter(product => product.rating >= minRating);
  }, [products]);

  const getBestValueRecommendations = useCallback((): Product[] => {
    // Sort by a combination of rating and price (higher rating, lower price = better value)
    return [...products].sort((a, b) => {
      const valueA = a.rating / a.price;
      const valueB = b.rating / b.price;
      return valueB - valueA;
    });
  }, [products]);

  const getTrendingRecommendations = useCallback((): Product[] => {
    return [...products].sort((a, b) => b.sales - a.sales);
  }, [products]);

  const getNewRecommendations = useCallback((): Product[] => {
    return [...products].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [products]);

  const isRecommended = useCallback((productId: string): boolean => {
    return products.some(product => product.id === productId);
  }, [products]);

  const provideFeedback = useCallback(async (productId: string, feedback: 'like' | 'dislike', reason?: string) => {
    try {
      await api.marketplace.provideRecommendationFeedback({ productId, feedback, reason });
    } catch (error) {
      console.error('Failed to provide recommendation feedback:', error);
      throw error;
    }
  }, []);

  return {
    products,
    loading,
    error,
    refreshRecommendations,
    getTopRecommendations,
    getRecommendationsByCategory,
    getAffordableRecommendations,
    getPremiumRecommendations,
    getHighlyRatedRecommendations,
    getBestValueRecommendations,
    getTrendingRecommendations,
    getNewRecommendations,
    isRecommended,
    provideFeedback
  };
};

export default useRecommendations;