import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  currency: string;
  quantity: number;
  image: string;
  vendorId: string;
  color?: string;
}

export interface CartData {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

export const useCart = () => {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Add ref to track ongoing requests
  const fetchCartRef = useRef<Promise<any> | null>(null);
  // Add timeout ref for debouncing
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCart = useCallback(async () => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Set a new timeout to reset loading state if request takes too long
    fetchTimeoutRef.current = setTimeout(() => {
      setLoading(false);
    }, 10000); // 10 second timeout
    
    // Prevent multiple simultaneous requests
    if (fetchCartRef.current) {
      return fetchCartRef.current;
    }
    
    const fetchPromise = (async () => {
      try {
        setLoading(true);
        setError(null);
        const response: any = await api.marketplace.getCart();
        if (response?.success && response?.data) {
          // Ensure data has the correct structure
          const cartData = {
            items: Array.isArray(response.data.items) ? response.data.items : [],
            totalItems: response.data.totalItems || 0,
            totalPrice: response.data.totalPrice || 0
          };
          setCart(cartData);
          // Dispatch a custom event to notify other components of cart updates
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cart-updated', { detail: cartData }));
          }
        } else {
          const emptyCart = { items: [], totalItems: 0, totalPrice: 0 };
          setCart(emptyCart);
          // Dispatch a custom event to notify other components of cart updates
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cart-updated', { 
              detail: emptyCart
            }));
          }
        }
        return response;
      } catch (err: any) {
        console.error('Error fetching cart:', err);
        // Handle auth errors gracefully to prevent logout
        if (err?.message?.includes('Unauthorized') || err?.status === 401) {
          // Don't set error state for auth issues to prevent triggering logout
          const emptyCart = { items: [], totalItems: 0, totalPrice: 0 };
          setCart(emptyCart);
          // Dispatch a custom event to notify other components of cart updates
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cart-updated', { 
              detail: emptyCart
            }));
          }
        } else {
          setError(err.message || 'Failed to load cart');
          const emptyCart = { items: [], totalItems: 0, totalPrice: 0 };
          setCart(emptyCart);
          // Dispatch a custom event to notify other components of cart updates
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('cart-updated', { 
              detail: emptyCart
            }));
          }
        }
        return null;
      } finally {
        setLoading(false);
        fetchCartRef.current = null;
        // Clear the timeout
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
      }
    })();
    
    fetchCartRef.current = fetchPromise;
    return fetchPromise;
  }, []);

  const addToCart = useCallback(async (productId: string, quantity: number = 1, color?: string) => {
    try {
      setAddToCartLoading(true);
      const response: any = await api.marketplace.addToCart(productId, quantity, color);
      if (response?.success && response?.data) {
        // Ensure data has the correct structure
        const cartData = {
          items: Array.isArray(response.data.items) ? response.data.items : [],
          totalItems: response.data.totalItems || 0,
          totalPrice: response.data.totalPrice || 0
        };
        // Update cart state with the full response data for consistency
        setCart(cartData);
        
        // Dispatch a custom event to notify other components of cart updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cart-updated', { detail: cartData }));
        }
        
        toast.success('Item added to cart');
        return true;
      } else {
        // Handle specific error cases
        const errorMessage = response?.error || 'Failed to add item to cart';
        toast.error(errorMessage);
        return false;
      }
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      // Provide more specific error messages
      let errorMessage = 'Failed to add item to cart';
      
      if (err?.message?.includes('404')) {
        errorMessage = 'Cart service is currently unavailable';
      } else if (err?.message?.includes('Unauthorized') || err?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
      return false;
    } finally {
      setAddToCartLoading(false);
    }
  }, []);

  const removeFromCart = async (productId: string) => {
    try {
      const response: any = await api.marketplace.removeFromCart(productId);
      if (response?.success) {
        await fetchCart();
        toast.success('Item removed from cart');
        return true;
      } else {
        toast.error(response?.error || 'Failed to remove item from cart');
        return false;
      }
    } catch (err: any) {
      console.error('Error removing from cart:', err);
      toast.error(err.message || 'Failed to remove item from cart');
      return false;
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        return await removeFromCart(productId);
      }
      
      const response: any = await api.marketplace.updateCartQuantity(productId, quantity);
      if (response?.success) {
        await fetchCart();
        return true;
      } else {
        toast.error(response?.error || 'Failed to update quantity');
        return false;
      }
    } catch (err: any) {
      console.error('Error updating quantity:', err);
      toast.error(err.message || 'Failed to update quantity');
      return false;
    }
  };

  const clearCart = async () => {
    try {
      const response: any = await api.marketplace.clearCart();
      if (response?.success) {
        await fetchCart();
        toast.success('Cart cleared');
        return true;
      } else {
        toast.error(response?.error || 'Failed to clear cart');
        return false;
      }
    } catch (err: any) {
      console.error('Error clearing cart:', err);
      toast.error(err.message || 'Failed to clear cart');
      return false;
    }
  };

  const checkout = async () => {
    try {
      const response: any = await api.marketplace.checkoutCart();
      if (response?.success) {
        await fetchCart();
        toast.success('Checkout successful');
        return response.data;
      } else {
        toast.error(response?.error || 'Checkout failed');
        return null;
      }
    } catch (err: any) {
      console.error('Error during checkout:', err);
      toast.error(err.message || 'Checkout failed');
      return null;
    }
  };

  // Only fetch cart when needed to prevent excessive API calls
  useEffect(() => {
    // We'll rely on manual fetchCart calls rather than auto-fetching
    // This prevents unnecessary API calls on every page load
  }, []);

  return {
    cart,
    loading,
    addToCartLoading,
    error,
    fetchCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    checkout
  };
};

export default useCart;