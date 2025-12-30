import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Image, Tag, Percent, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  images: Array<{
    url: string;
    secure_url: string;
  }>;
  stock: number;
  category: string;
}

interface CreateProductPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onSuccess: () => void;
}

const CreateProductPostModal: React.FC<CreateProductPostModalProps> = ({
  isOpen,
  onClose,
  postId,
  onSuccess
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Define the type for product position
  type ProductPosition = 'main' | 'tagged' | 'featured' | 'promoted';
  
  interface FormData {
    productPosition: ProductPosition;
    currentPrice?: number;
    originalPrice?: number;
    availableStock?: number;
    showPrice: boolean;
    showProductTag: boolean;
    isFeatured: boolean;
    isPromoted: boolean;
    promotionDiscount?: number;
  }

  const [formData, setFormData] = useState<FormData>({
    productPosition: 'main',
    currentPrice: undefined,
    originalPrice: undefined,
    availableStock: undefined,
    showPrice: true,
    showProductTag: true,
    isFeatured: false,
    isPromoted: false,
    promotionDiscount: undefined
  });

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response: any = await api.marketplace.getMyProducts();
      if (response.success && response.data?.products) {
        setProducts(response.data.products);
      } else {
        setError(response.message || 'Failed to load products');
      }
    } catch (err) {
      setError('Error loading products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!selectedProduct) {
      setError('Please select a product');
      return false;
    }
    
    // Validate price fields
    if (formData.currentPrice !== undefined && formData.currentPrice < 0) {
      setError('Current price cannot be negative');
      return false;
    }
    
    if (formData.originalPrice !== undefined && formData.originalPrice < 0) {
      setError('Original price cannot be negative');
      return false;
    }
    
    if (formData.currentPrice !== undefined && formData.originalPrice !== undefined && 
        formData.currentPrice > formData.originalPrice) {
      setError('Current price cannot be higher than original price');
      return false;
    }
    
    if (formData.promotionDiscount !== undefined && (formData.promotionDiscount < 0 || formData.promotionDiscount > 100)) {
      setError('Promotion discount must be between 0 and 100');
      return false;
    }
    
    if (formData.availableStock !== undefined && formData.availableStock < 0) {
      setError('Available stock cannot be negative');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response: any = await api.ads.createProductPost({
        postId,
        productId: selectedProduct,
        ...formData
      });

      if (response.success) {
        // Dispatch a custom event that feeds can listen to, to add the product post immediately
        try {
          console.log('Dispatching product-posts:new event with product post:', response.data);
          const event = new CustomEvent('product-posts:new', { detail: { productPost: response.data } });
          window.dispatchEvent(event);
        } catch (e) {
          console.error('Error dispatching product-posts:new event:', e);
          // Ignore if CustomEvent is not supported
          // The feed will be updated via refresh anyway
        }
        
        onSuccess();
        onClose();
      } else {
        setError(response.message || 'Failed to create product post');
      }
    } catch (err: any) {
      console.error('Error creating product post:', err);
      
      // Handle different types of errors
      if (err.response) {
        // Server responded with error status
        const { status, data } = err.response;
        
        if (status === 400) {
          setError(data.message || 'Invalid input provided');
        } else if (status === 401 || status === 403) {
          setError('You are not authorized to create this product post');
        } else if (status === 404) {
          setError('Product or post not found');
        } else if (status === 409) {
          setError('A product post already exists for this post');
        } else {
          setError(data.message || 'Server error occurred');
        }
      } else if (err.request) {
        // Request was made but no response received
        setError('Network error. Please check your connection and try again.');
      } else {
        // Something else happened
        setError(err.message || 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Create Shoppable Post</h2>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-3 h-3 text-red-600" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Select Product
              </label>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                  <p className="text-gray-600">Loading your products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="flex justify-center mb-3">
                    <ShoppingCart className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-2">No products available</p>
                  <p className="text-sm text-gray-500">Create products first to link them to your posts</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
                  {products.map((product) => (
                    <div
                      key={product._id}
                      className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                        selectedProduct === product._id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedProduct(product._id)}
                    >
                      <div className="flex items-center space-x-4">
                        {product.images && product.images[0] ? (
                          <div className="relative flex-shrink-0">
                            <img
                              src={product.images[0].secure_url || product.images[0].url}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-black/5"></div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Image className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">
                            {product.name}
                          </div>
                          <div className="flex items-center mt-1 space-x-4">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">${product.price}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.stock} in stock
                            </div>
                          </div>
                          <div className="flex items-center mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {product.category}
                            </span>
                          </div>
                        </div>
                        {selectedProduct === product._id && (
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="mr-2 p-1 bg-blue-100 rounded-md">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                  </div>
                  Product Settings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price Position
                    </label>
                    <select
                      value={formData.productPosition}
                      onChange={(e) => setFormData({...formData, productPosition: e.target.value as ProductPosition})}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    >
                      <option value="main">Main Product</option>
                      <option value="tagged">Tagged Product</option>
                      <option value="featured">Featured Product</option>
                      <option value="promoted">Promoted Product</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Price
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Use product price"
                        value={formData.currentPrice ?? ''}
                        onChange={(e) => setFormData({...formData, currentPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                        className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Original Price
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Use product price"
                        value={formData.originalPrice ?? ''}
                        onChange={(e) => setFormData({...formData, originalPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                        className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Stock
                    </label>
                    <input
                      type="number"
                      placeholder="Use product stock"
                      value={formData.availableStock ?? ''}
                      onChange={(e) => setFormData({...formData, availableStock: e.target.value ? parseInt(e.target.value) : undefined})}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>

                  <div className="flex items-center">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={formData.showPrice}
                        onChange={(e) => setFormData({...formData, showPrice: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 flex items-center">
                      <Eye className="w-4 h-4 text-gray-500 mr-2" />
                      <label className="text-sm font-medium text-gray-700">
                        Show Price
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={formData.showProductTag}
                        onChange={(e) => setFormData({...formData, showProductTag: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 flex items-center">
                      <Tag className="w-4 h-4 text-gray-500 mr-2" />
                      <label className="text-sm font-medium text-gray-700">
                        Show Product Tag
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 flex items-center">
                      <ShoppingCart className="w-4 h-4 text-gray-500 mr-2" />
                      <label className="text-sm font-medium text-gray-700">
                        Featured
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={formData.isPromoted}
                        onChange={(e) => setFormData({...formData, isPromoted: e.target.checked})}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="ml-3 flex items-center">
                      <Percent className="w-4 h-4 text-gray-500 mr-2" />
                      <label className="text-sm font-medium text-gray-700">
                        Promoted
                      </label>
                    </div>
                  </div>

                  {formData.isPromoted && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Promotion Discount (%)
                      </label>
                      <div className="relative max-w-xs">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.promotionDiscount ?? ''}
                          onChange={(e) => setFormData({...formData, promotionDiscount: e.target.value ? parseFloat(e.target.value) : undefined})}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-w-[80px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedProduct || loading}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center min-w-[150px]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  'Create Shoppable Post'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProductPostModal;