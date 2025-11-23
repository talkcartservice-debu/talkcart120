const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  subscriberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  streamerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tier: {
    type: String,
    enum: ['basic', 'premium', 'vip'],
    default: 'basic'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'crypto', 'wallet'],
    default: 'card'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  nextBillingDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  price: {
    type: Number,
    default: 4.99
  },
  currency: {
    type: String,
    default: 'USD'
  },
  benefits: [{
    type: String,
    enum: ['ad_free', 'exclusive_chat', 'custom_emotes', 'priority_support', 'exclusive_content']
  }],
  autoRenew: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ subscriberId: 1, streamerId: 1 });
subscriptionSchema.index({ streamerId: 1, isActive: 1 });
subscriptionSchema.index({ nextBillingDate: 1, isActive: 1 });

// Static methods
subscriptionSchema.statics.isSubscribed = async function(subscriberId, streamerId) {
  const subscription = await this.findOne({
    subscriberId,
    streamerId,
    isActive: true
  });
  return !!subscription;
};

subscriptionSchema.statics.getActiveSubscriptions = async function(streamerId) {
  return this.find({
    streamerId,
    isActive: true
  }).populate('subscriberId', 'username displayName avatar');
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
