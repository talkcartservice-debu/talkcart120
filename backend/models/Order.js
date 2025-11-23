const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  isNFT: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    required: false
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 8);
      return `ORD-${timestamp}-${random}`.toUpperCase();
    }
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['flutterwave', 'paystack', 'crypto', 'nft', 'mobile_money', 'airtel_money', 'cash_on_delivery', 'card_payment']
  },
  paymentDetails: {
    type: Object,
    required: false
  },
  tx_ref: { type: String, index: true },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  paymentConfirmedAt: Date,
  transactionReference: {
    type: String,
    sparse: true,
    index: true
  },
  shippingAddress: {
    name: String,
    email: String,
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    phone: String
  },
  trackingNumber: String,
  estimatedDelivery: Date,
  carrier: String,
  shippedAt: Date,
  deliveredAt: Date,
  completedAt: Date,
  notes: String,
  completedAt: Date,
  cancelledAt: Date,
  // Additional fields for enhanced order tracking
  vendorPayoutStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  vendorPayoutAmount: Number,
  vendorPayoutDate: Date,
  commissionAmount: Number,
  commissionRate: Number,
  metadata: {
    type: Object,
    default: {}
  },
  // Status tracking and notifications
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['status_update', 'shipping_update', 'payment_update', 'vendor_notification'],
      required: true
    },
    title: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    },
    data: Object
  }],
  // Additional tracking fields
  shippedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String,
  refundReason: String,
  // Timeline tracking
  timeline: [{
    event: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: Object
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate order number
orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    this.orderNumber = `ORD-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

// Indexes for better query performance
orderSchema.index({ userId: 1, createdAt: -1 });
// orderNumber index is automatically created by unique: true constraint
orderSchema.index({ status: 1 });
orderSchema.index({ paymentMethod: 1 });
orderSchema.index({ trackingNumber: 1 });

module.exports = mongoose.model('Order', orderSchema);