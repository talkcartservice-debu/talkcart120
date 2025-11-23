import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

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
}

const useRotatingProducts = (count: number = 2, interval: number = 10000) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: any = await api.marketplace.getRandomProducts(count * 2); // Fetch more to have variety
      
      if (response?.data?.success && response?.data?.data?.products) {
        setProducts(response.data.data.products.slice(0, count));
      } else if (response?.success && response?.data?.products) {
        // Handle alternative response structure
        setProducts(response.data.products.slice(0, count));
      }
    } catch (err: any) {
      console.error('Error fetching rotating products:', err);
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [count]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Rotate products every interval
  useEffect(() => {
    if (products.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % products.length);
    }, interval);

    return () => clearInterval(timer);
  }, [products, interval]);

  return {
    products,
    currentIndex,
    loading,
    error,
    refetch: fetchProducts
  };
};

export default useRotatingProducts;