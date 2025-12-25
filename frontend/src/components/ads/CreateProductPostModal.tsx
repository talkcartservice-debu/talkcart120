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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }

    try {
      const response: any = await api.ads.createProductPost({
        postId,
        productId: selectedProduct,
        ...formData
      });

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.message || 'Failed to create product post');
      }
    } catch (err) {
      setError('Error creating product post');
      console.error('Error creating product post:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Create Shoppable Post</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Product
              </label>
              {loading ? (
                <div className="text-center py-4">Loading products...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {products.map((product) => (
                    <div
                      key={product._id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedProduct === product._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedProduct(product._id)}
                    >
                      <div className="flex items-center space-x-3">
                        {product.images && product.images[0] ? (
                          <img
                            src={product.images[0].secure_url || product.images[0].url}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                            <Image className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${product.price} • {product.stock} in stock
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Product Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Price Position
                    </label>
                    <select
                      value={formData.productPosition}
                      onChange={(e) => setFormData({...formData, productPosition: e.target.value as ProductPosition})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="main">Main Product</option>
                      <option value="tagged">Tagged Product</option>
                      <option value="featured">Featured Product</option>
                      <option value="promoted">Promoted Product</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Current Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Use product price"
                      value={formData.currentPrice ?? ''}
                      onChange={(e) => setFormData({...formData, currentPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Original Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Use product price"
                      value={formData.originalPrice ?? ''}
                      onChange={(e) => setFormData({...formData, originalPrice: e.target.value ? parseFloat(e.target.value) : undefined})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Available Stock
                    </label>
                    <input
                      type="number"
                      placeholder="Use product stock"
                      value={formData.availableStock ?? ''}
                      onChange={(e) => setFormData({...formData, availableStock: e.target.value ? parseInt(e.target.value) : undefined})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.showPrice}
                        onChange={(e) => setFormData({...formData, showPrice: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-xs font-medium text-gray-700 flex items-center">
                        <Eye className="w-3 h-3 mr-1" /> Show Price
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.showProductTag}
                        onChange={(e) => setFormData({...formData, showProductTag: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-xs font-medium text-gray-700 flex items-center">
                        <Tag className="w-3 h-3 mr-1" /> Show Product Tag
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-xs font-medium text-gray-700 flex items-center">
                        <ShoppingCart className="w-3 h-3 mr-1" /> Featured
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isPromoted}
                        onChange={(e) => setFormData({...formData, isPromoted: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-xs font-medium text-gray-700 flex items-center">
                        <Percent className="w-3 h-3 mr-1" /> Promoted
                      </span>
                    </label>
                  </div>

                  {formData.isPromoted && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Promotion Discount (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.promotionDiscount ?? ''}
                        onChange={(e) => setFormData({...formData, promotionDiscount: e.target.value ? parseFloat(e.target.value) : undefined})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedProduct || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create Product Post
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateProductPostModal;