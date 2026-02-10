// Order-related TypeScript interfaces

export interface OrderItem {
  productId: string | {
    _id: string;
    name: string;
    images?: string[];
    category?: string;
    description?: string;
    vendorId?: string;
  };
  name: string;
  price: number;
  quantity: number;
  currency: string;
  isNFT: boolean;
}

export interface ShippingAddress {
  name?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface Order {
  _id: string;
  userId: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  paymentMethod: 'paystack' | 'nft';
  paymentDetails: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  shippingAddress?: ShippingAddress;
  notes?: string;
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  success: boolean;
  data: {
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  message?: string;
}

export interface OrderResponse {
  success: boolean;
  data: Order;
  message?: string;
}

export interface OrderCancelResponse {
  success: boolean;
  data: Order;
  message: string;
}

// For creating orders during checkout
export interface CreateOrderData {
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentDetails: Record<string, any>;
  shippingAddress?: ShippingAddress;
  notes?: string;
}