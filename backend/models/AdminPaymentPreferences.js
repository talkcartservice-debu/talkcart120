const mongoose = require('mongoose');

const adminPaymentPreferencesSchema = new mongoose.Schema({
  adminId: {
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
      enum: ['mtn', 'airtel', 'vodacom', 'tigo', 'orange', 'ecocash', 'paystack', 'other'],
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
    default: 'bankAccount'
  },
  // Commission withdrawal preferences
  withdrawalPreferences: {
    minimumAmount: {
      type: Number,
      default: 50,
      min: 1
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'manual'],
      default: 'monthly'
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
  // Additional fields for enhanced payment functionality
  taxInformation: {
    taxId: String,
    taxCountry: String,
    taxRegistrationDate: Date
  },
  payoutSchedule: {
    type: String,
    enum: ['immediate', 'daily', 'weekly', 'biweekly', 'monthly'],
    default: 'monthly'
  },
  autoPayoutEnabled: {
    type: Boolean,
    default: false
  },
  payoutNotifications: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
// Note: adminId index is handled by the unique: true option in the schema definition
adminPaymentPreferencesSchema.index({ 'mobileMoney.phoneNumber': 1 });
adminPaymentPreferencesSchema.index({ 'paypal.email': 1 });
adminPaymentPreferencesSchema.index({ 'cryptoWallet.walletAddress': 1 });

module.exports = mongoose.model('AdminPaymentPreferences', adminPaymentPreferencesSchema);