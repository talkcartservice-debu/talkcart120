const mongoose = require('mongoose');

const productPostSchema = new mongoose.Schema({
  // Reference to the original post
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    unique: true
  },
  
  // Reference to the original product
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  // Vendor information
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Product details (copied for historical accuracy)
  productDetails: {
    name: String,
    description: String,
    price: Number,
    currency: String,
    images: [{
      public_id: String,
      secure_url: String,
      url: String
    }],
    category: String,
    tags: [String],
    stock: Number,
    isNFT: Boolean,
    contractAddress: String,
    tokenId: String,
    rating: Number,
    reviewCount: Number,
    sales: Number,
    views: Number,
    availability: String,
    // Additional fields for enhanced marketplace experience
    discount: Number,
    freeShipping: Boolean,
    fastDelivery: Boolean,
    prime: Boolean,
    inStock: Boolean
  },
  
  // Post-specific product information
  productPosition: {
    type: String,
    enum: ['main', 'tagged', 'featured', 'promoted'],
    default: 'main'
  },
  
  // Product placement in post
  placementData: {
    x: Number, // X coordinate for product tag in image/video (0-100%)
    y: Number, // Y coordinate for product tag in image/video (0-100%)
    width: Number, // Width of product tag (0-100%)
    height: Number, // Height of product tag (0-100%)
    mediaIndex: Number // Index of media item in post where product is placed
  },
  
  // Pricing and availability (may differ from original product)
  currentPrice: {
    type: Number,
    required: true,
    min: 0
  },
  
  originalPrice: {
    type: Number,
    min: 0
  },
  
  currency: {
    type: String,
    enum: ['ETH', 'BTC', 'USD', 'USDC', 'USDT'],
    default: 'USD'
  },
  
  // Inventory tracking
  availableStock: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Product status in post
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Engagement metrics
  clicks: {
    type: Number,
    default: 0,
    min: 0
  },
  
  purchases: {
    type: Number,
    default: 0,
    min: 0
  },
  
  addToCart: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Visibility and placement settings
  showPrice: {
    type: Boolean,
    default: true
  },
  
  showProductTag: {
    type: Boolean,
    default: true
  },
  
  // Promotion settings
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  isPromoted: {
    type: Boolean,
    default: false
  },
  
  promotionDiscount: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Timestamps
  promotedAt: Date,
  featuredAt: Date,
  
  // Tracking and attribution
  trackingId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Moderation
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  moderationNotes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for discount percentage
productPostSchema.virtual('discountPercentage').get(function() {
  if (this.originalPrice && this.currentPrice < this.originalPrice) {
    return ((this.originalPrice - this.currentPrice) / this.originalPrice) * 100;
  }
  return 0;
});

// Virtual for conversion rate
productPostSchema.virtual('conversionRate').get(function() {
  return this.clicks > 0 ? (this.purchases / this.clicks) * 100 : 0;
});

// Indexes for better query performance
productPostSchema.index({ vendorId: 1, createdAt: -1 });
productPostSchema.index({ productId: 1 });

productPostSchema.index({ isActive: 1 });
productPostSchema.index({ isFeatured: 1 });
productPostSchema.index({ isPromoted: 1 });
productPostSchema.index({ createdAt: -1 });

// Method to check if product is in stock
productPostSchema.methods.isInStock = function() {
  return this.availableStock > 0;
};

// Method to check if product is discounted
productPostSchema.methods.isDiscounted = function() {
  return this.originalPrice && this.currentPrice < this.originalPrice;
};

// Method to record a click on the product
productPostSchema.methods.recordClick = async function() {
  this.clicks += 1;
  await this.save();
};

// Method to record a purchase
productPostSchema.methods.recordPurchase = async function() {
  this.purchases += 1;
  if (this.availableStock > 0) {
    this.availableStock -= 1;
  }
  await this.save();
};

// Method to record add to cart action
productPostSchema.methods.recordAddToCart = async function() {
  this.addToCart += 1;
  await this.save();
};

// Method to update stock
productPostSchema.methods.updateStock = async function(newStock) {
  this.availableStock = Math.max(0, newStock);
  await this.save();
};

// Static method to get product posts by vendor
productPostSchema.statics.getByVendor = async function(vendorId, options = {}) {
  const query = { vendorId: vendorId };
  
  if (options.isActive !== undefined) {
    query.isActive = options.isActive;
  }
  
  const productPosts = await this.find(query)
    .populate('postId', 'content type media createdAt')
    .populate('productId', 'name description price images category')
    .populate('vendorId', 'username displayName avatar isVerified')
    .sort({ createdAt: -1 })
    .limit(options.limit || 20);
  
  return productPosts;
};

// Static method to get product posts by product
productPostSchema.statics.getByProduct = async function(productId, options = {}) {
  const query = { productId: productId, isActive: true };
  
  const productPosts = await this.find(query)
    .populate('postId', 'content type media createdAt')
    .populate('productId', 'name description price images category')
    .populate('vendorId', 'username displayName avatar isVerified')
    .sort({ createdAt: -1 })
    .limit(options.limit || 20);
  
  return productPosts;
};

// Static method to get featured product posts
productPostSchema.statics.getFeatured = async function(options = {}) {
  const query = { 
    isActive: true, 
    isFeatured: true,
    availableStock: { $gt: 0 }
  };
  
  const productPosts = await this.find(query)
    .populate('postId', 'content type media createdAt')
    .populate('productId', 'name description price images category')
    .populate('vendorId', 'username displayName avatar isVerified')
    .sort({ featuredAt: -1, createdAt: -1 })
    .limit(options.limit || 10);
  
  return productPosts;
};

// Static method to get promoted product posts
productPostSchema.statics.getPromoted = async function(options = {}) {
  const query = { 
    isActive: true, 
    isPromoted: true,
    availableStock: { $gt: 0 }
  };
  
  const productPosts = await this.find(query)
    .populate('postId', 'content type media createdAt')
    .populate('productId', 'name description price images category')
    .populate('vendorId', 'username displayName avatar isVerified')
    .sort({ promotedAt: -1, createdAt: -1 })
    .limit(options.limit || 10);
  
  return productPosts;
};

// Static method to get product posts by engagement
productPostSchema.statics.getByEngagement = async function(options = {}) {
  const query = { 
    isActive: true,
    availableStock: { $gt: 0 }
  };
  
  const sortCriteria = options.sortBy === 'conversion' ? 
    { conversionRate: -1, purchases: -1, clicks: -1 } : 
    { clicks: -1, purchases: -1, addToCart: -1 };
  
  const productPosts = await this.find(query)
    .populate('postId', 'content type media createdAt')
    .populate('productId', 'name description price images category')
    .populate('vendorId', 'username displayName avatar isVerified')
    .sort(sortCriteria)
    .limit(options.limit || 10);
  
  return productPosts;
};

module.exports = mongoose.model('ProductPost', productPostSchema);