const mongoose = require('mongoose');

const vendorStoreSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  storeName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  storeDescription: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  storeLogo: {
    type: String,
    default: ''
  },
  storeBanner: {
    type: String,
    default: ''
  },
  contactEmail: {
    type: String,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  contactPhone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  address: {
    street: { type: String, maxlength: 200 },
    city: { type: String, maxlength: 100 },
    state: { type: String, maxlength: 100 },
    country: { type: String, maxlength: 100 },
    zipCode: { type: String, maxlength: 20 }
  },
  socialLinks: {
    facebook: { type: String, maxlength: 200 },
    twitter: { type: String, maxlength: 200 },
    instagram: { type: String, maxlength: 200 },
    linkedin: { type: String, maxlength: 200 },
    website: { type: String, maxlength: 200 }
  },
  businessLicense: {
    type: String, // URL to uploaded document
    default: ''
  },
  taxId: {
    type: String,
    maxlength: 50
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationDocuments: [{
    type: String // URLs to uploaded documents
  }],
  storePolicy: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  returnPolicy: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  shippingPolicy: {
    type: String,
    maxlength: 2000,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  followerCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Additional fields for enhanced vendor functionality
  storeType: {
    type: String,
    enum: ['individual', 'business', 'brand'],
    default: 'individual'
  },
  businessName: String,
  businessRegistrationNumber: String,
  yearsInBusiness: Number,
  numberOfEmployees: Number,
  annualRevenue: Number,
  acceptedPaymentMethods: [{
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'crypto', 'bank_transfer', 'mobile_money']
  }],
  shippingOptions: [{
    name: String,
    cost: Number,
    estimatedDelivery: String,
    isDefault: Boolean
  }],
  languages: [String],
  supportHours: {
    monday: String,
    tuesday: String,
    wednesday: String,
    thursday: String,
    friday: String,
    saturday: String,
    sunday: String
  },
  responseTime: {
    type: String,
    enum: ['within_1_hour', 'within_4_hours', 'within_12_hours', 'within_24_hours', 'within_48_hours'],
    default: 'within_24_hours'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
// Note: vendorId index is handled by the unique: true option in the schema definition
vendorStoreSchema.index({ storeName: 1 });
vendorStoreSchema.index({ isVerified: 1 });
vendorStoreSchema.index({ rating: -1 });
vendorStoreSchema.index({ followerCount: -1 });

module.exports = mongoose.model('VendorStore', vendorStoreSchema);