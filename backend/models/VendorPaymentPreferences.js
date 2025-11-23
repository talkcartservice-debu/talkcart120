const mongoose = require('mongoose');

const vendorPaymentPreferencesSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Mobile Money preferences
  mobileMoney: {
    enabled: {
      type: Boolean,
      default: false
    },
    provider: {
      type: String,
      enum: ['mtn', 'airtel', 'vodacom', 'tigo', 'orange', 'ecocash', 'other'],
      default: 'other'
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
    },
    country: {
      type: String,
      trim: true
    }
  },
  // Bank account preferences
  bankAccount: {
    enabled: {
      type: Boolean,
      default: false
    },
    accountHolderName: {
      type: String,
      trim: true,
      maxlength: 100
    },
    accountNumber: {
      type: String,
      trim: true
    },
    bankName: {
      type: String,
      trim: true
    },
    routingNumber: {
      type: String,
      trim: true
    },
    swiftCode: {
      type: String,
      trim: true
    },
    iban: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    }
  },
  // PayPal preferences
  paypal: {
    enabled: {
      type: Boolean,
      default: false
    },
    email: {
      type: String,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    }
  },
  // Crypto wallet preferences
  cryptoWallet: {
    enabled: {
      type: Boolean,
      default: false
    },
    walletAddress: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$|^([a-zA-Z0-9]{35,})$/, 'Please enter a valid wallet address']
    },
    network: {
      type: String,
      enum: ['ethereum', 'bitcoin', 'polygon', 'bsc', 'solana', 'other'],
      default: 'ethereum'
    }
  },
  // Default payment method
  defaultPaymentMethod: {
    type: String,
    enum: ['mobileMoney', 'bankAccount', 'paypal', 'cryptoWallet'],
    default: 'mobileMoney'
  },
  // Commission withdrawal preferences
  withdrawalPreferences: {
    minimumAmount: {
      type: Number,
      default: 10,
      min: 1
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'manual'],
      default: 'weekly'
    }
  },
  // Verification status
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: String // URLs to uploaded documents
  }],
  // Payout tracking
  payoutHistory: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true
    },
    method: {
      type: String,
      enum: ['mobileMoney', 'bankAccount', 'paypal', 'cryptoWallet'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    transactionId: {
      type: String
    },
    processedAt: {
      type: Date,
      default: Date.now
    },
    details: {
      type: Object
    }
  }],
  // Additional fields for enhanced payment functionality
  taxInformation: {
    taxId: String,
    taxCountry: String,
    taxRegistrationDate: Date
  },
  payoutSchedule: {
    type: String,
    enum: ['immediate', 'daily', 'weekly', 'biweekly', 'monthly'],
    default: 'weekly'
  },
  autoPayoutEnabled: {
    type: Boolean,
    default: true
  },
  payoutNotifications: {
    type: Boolean,
    default: true
  },
  paymentMethodFees: [{
    method: {
      type: String,
      enum: ['mobileMoney', 'bankAccount', 'paypal', 'cryptoWallet']
    },
    feePercentage: Number,
    feeFixed: Number
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
// Note: vendorId index is handled by the unique: true option in the schema definition
vendorPaymentPreferencesSchema.index({ 'mobileMoney.phoneNumber': 1 });
vendorPaymentPreferencesSchema.index({ 'paypal.email': 1 });
vendorPaymentPreferencesSchema.index({ 'cryptoWallet.walletAddress': 1 });
vendorPaymentPreferencesSchema.index({ 'payoutHistory.status': 1 });
vendorPaymentPreferencesSchema.index({ 'payoutHistory.processedAt': -1 });

module.exports = mongoose.model('VendorPaymentPreferences', vendorPaymentPreferencesSchema);