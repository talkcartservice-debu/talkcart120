const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Unique identifier for settings type
  type: {
    type: String,
    required: true,
    unique: true,
    enum: ['marketplace', 'system', 'security', 'payment']
  },
  
  // Marketplace Settings
  commissionRate: {
    type: Number,
    default: 0.10,
    min: 0,
    max: 1,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 1;
      },
      message: 'Commission rate must be between 0 and 1'
    }
  },
  
  currencies: {
    type: [String],
    default: ['ETH', 'BTC', 'USD', 'USDC', 'USDT'],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'At least one currency must be supported'
    }
  },
  
  categories: {
    type: [String],
    default: ['Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 'Books', 'Collectibles', 'Other'],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'At least one category must be available'
    }
  },
  
  maxImageSize: {
    type: Number,
    default: 5 * 1024 * 1024, // 5MB
    min: 1024 * 1024, // 1MB minimum
    max: 50 * 1024 * 1024 // 50MB maximum
  },
  
  maxImagesPerProduct: {
    type: Number,
    default: 10,
    min: 1,
    max: 50
  },
  
  autoApproveProducts: {
    type: Boolean,
    default: false
  },
  
  requireVendorVerification: {
    type: Boolean,
    default: true
  },
  
  allowGuestCheckout: {
    type: Boolean,
    default: false
  },
  
  // System Settings
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  
  maintenanceMessage: {
    type: String,
    default: 'The marketplace is currently under maintenance. Please check back later.'
  },
  
  maxProductsPerVendor: {
    type: Number,
    default: 1000,
    min: 1
  },
  
  enableNotifications: {
    type: Boolean,
    default: true
  },
  
  enableAnalytics: {
    type: Boolean,
    default: true
  },
  
  // Security Settings
  enableTwoFactor: {
    type: Boolean,
    default: false
  },
  
  sessionTimeout: {
    type: Number,
    default: 30, // minutes
    min: 5,
    max: 1440 // 24 hours
  },
  
  maxLoginAttempts: {
    type: Number,
    default: 5,
    min: 3,
    max: 20
  },
  
  passwordMinLength: {
    type: Number,
    default: 8,
    min: 6,
    max: 50
  },
  
  requirePasswordComplexity: {
    type: Boolean,
    default: true
  },
  
  // Payment Settings
  enablePaystack: {
    type: Boolean,
    default: true
  },
  
  enableCrypto: {
    type: Boolean,
    default: true
  },
  
  enableNFT: {
    type: Boolean,
    default: true
  },
  
  minimumOrderAmount: {
    type: Number,
    default: 1,
    min: 0
  },
  
  maximumOrderAmount: {
    type: Number,
    default: 100000,
    min: 1
  },
  
  // Metadata
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// Note: type field already has unique: true which creates an index, so no separate index needed
settingsSchema.index({ updatedAt: -1 });

// Pre-save middleware to increment version
settingsSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

// Static method to get or create default settings
settingsSchema.statics.getOrCreateDefault = async function(type = 'marketplace') {
  let settings = await this.findOne({ type });
  
  if (!settings) {
    settings = new this({ type });
    await settings.save();
  }
  
  return settings;
};

// Static method to update settings by type
settingsSchema.statics.updateSettings = async function(type, updates, updatedBy) {
  // Validate updates
  const allowedFields = [
    'commissionRate', 'currencies', 'categories', 'maxImageSize', 'maxImagesPerProduct',
    'autoApproveProducts', 'requireVendorVerification', 'allowGuestCheckout',
    'maintenanceMode', 'maintenanceMessage', 'maxProductsPerVendor',
    'enableNotifications', 'enableAnalytics', 'enableTwoFactor', 'sessionTimeout',
    'maxLoginAttempts', 'passwordMinLength', 'requirePasswordComplexity',
    'enablePaystack', 'enableCrypto', 'enableNFT', 'minimumOrderAmount', 'maximumOrderAmount'
  ];
  
  const filteredUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = value;
    }
  }
  
  // Get or create settings document
  let settings = await this.findOne({ type });
  if (!settings) {
    settings = new this({ type });
  }
  
  // Apply updates
  Object.assign(settings, filteredUpdates);
  settings.lastUpdatedBy = updatedBy;
  
  return await settings.save();
};

// Instance method to update settings safely
settingsSchema.methods.updateSettings = async function(updates, updatedBy) {
  // Validate updates
  const allowedFields = [
    'commissionRate', 'currencies', 'categories', 'maxImageSize', 'maxImagesPerProduct',
    'autoApproveProducts', 'requireVendorVerification', 'allowGuestCheckout',
    'maintenanceMode', 'maintenanceMessage', 'maxProductsPerVendor',
    'enableNotifications', 'enableAnalytics', 'enableTwoFactor', 'sessionTimeout',
    'maxLoginAttempts', 'passwordMinLength', 'requirePasswordComplexity',
    'enablePaystack', 'enableCrypto', 'enableNFT', 'minimumOrderAmount', 'maximumOrderAmount'
  ];
  
  const filteredUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = value;
    }
  }
  
  // Apply updates
  Object.assign(this, filteredUpdates);
  this.lastUpdatedBy = updatedBy;
  
  return await this.save();
};

module.exports = mongoose.model('Settings', settingsSchema);
