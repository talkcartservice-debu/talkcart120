const mongoose = require('mongoose');

const trackingEventSchema = new mongoose.Schema({
  // Event type
  eventType: {
    type: String,
    required: true,
    enum: [
      'impression',           // Ad impression
      'click',               // Ad click
      'view',                // Content view
      'conversion',          // Conversion event
      'add_to_cart',         // Add to cart
      'purchase',            // Purchase
      'page_view',           // Page view
      'video_view',          // Video view
      'video_complete',      // Video complete
      'video_25',            // Video 25% complete
      'video_50',            // Video 50% complete
      'video_75',            // Video 75% complete
      'like',                // Like action
      'comment',             // Comment action
      'share',               // Share action
      'follow',              // Follow action
      'product_view',        // Product view
      'product_click',       // Product click in feed
      'ad_skip',             // Ad skip
      'ad_mute',             // Ad mute
      'ad_unmute',           // Ad unmute
      'ad_pause',            // Ad pause
      'ad_resume',           // Ad resume
      'ad_fullscreen',       // Ad fullscreen
      'ad_exit_fullscreen',  // Ad exit fullscreen
      'ad_expand',           // Ad expand
      'ad_collapse',         // Ad collapse
      'ad_error',            // Ad error
      'ad_timeout',          // Ad timeout
      'custom_event'         // Custom event
    ]
  },
  
  // User who triggered the event
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.anonymousId === undefined || this.anonymousId === null;
    }
  },
  
  // Anonymous user ID for tracking non-logged in users
  anonymousId: {
    type: String,
    required: function() {
      return this.userId === undefined || this.userId === null;
    }
  },
  
  // Event source
  source: {
    type: String,
    required: true,
    enum: [
      'ad',           // Ad event
      'product_post', // Product post event
      'post',         // Regular post event
      'page',         // Page view event
      'video',        // Video event
      'app',          // App event
      'web',          // Web event
      'mobile'        // Mobile event
    ]
  },
  
  // Source ID (ad ID, post ID, etc.)
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // Source type (Ad, Post, ProductPost, etc.)
  sourceType: {
    type: String,
    required: true,
    enum: ['Ad', 'Post', 'ProductPost', 'Product', 'User', 'Page', 'Video']
  },
  
  // Session information
  sessionId: {
    type: String,
    required: true
  },
  
  // IP address for geographic and fraud detection
  ipAddress: String,
  
  // User agent for device and browser detection
  userAgent: String,
  
  // Geographic information
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Device information
  device: {
    type: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'tv', 'other']
    },
    browser: String,
    os: String,
    model: String,
    manufacturer: String
  },
  
  // Referrer information
  referrer: String,
  referrerDomain: String,
  
  // Timing information
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  // Duration for timed events (in milliseconds)
  duration: {
    type: Number,
    min: 0
  },
  
  // Additional event properties
  properties: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Attribution information
  attribution: {
    campaignId: mongoose.Schema.Types.ObjectId,
    adSetId: mongoose.Schema.Types.ObjectId,
    adId: mongoose.Schema.Types.ObjectId,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    utmTerm: String,
    utmContent: String,
    referringDomain: String,
    referringUrl: String
  },
  
  // Conversion specific data
  conversion: {
    value: Number,
    currency: String,
    transactionId: String,
    orderId: mongoose.Schema.Types.ObjectId,
    productId: mongoose.Schema.Types.ObjectId,
    quantity: Number
  },
  
  // Engagement metrics
  engagement: {
    viewTime: Number, // in seconds
    scrollDepth: Number, // percentage of page scrolled
    interactionType: String
  },
  
  // Platform information
  platform: {
    type: String,
    enum: ['web', 'mobile_web', 'ios', 'android', 'desktop_app', 'mobile_app'],
    default: 'web'
  },
  
  // Tracking ID for cross-reference
  trackingId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Fraud detection flags
  isFraud: {
    type: Boolean,
    default: false
  },
  
  fraudReason: String,
  
  // Verification status
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
trackingEventSchema.index({ eventType: 1 });
trackingEventSchema.index({ userId: 1, timestamp: -1 });
trackingEventSchema.index({ anonymousId: 1, timestamp: -1 });
trackingEventSchema.index({ sourceId: 1, sourceType: 1 });
trackingEventSchema.index({ sessionId: 1 });
trackingEventSchema.index({ timestamp: -1 });

trackingEventSchema.index({ 'attribution.campaignId': 1 });
trackingEventSchema.index({ 'attribution.adSetId': 1 });
trackingEventSchema.index({ 'attribution.adId': 1 });

// Method to check if event is a conversion
trackingEventSchema.methods.isConversion = function() {
  return this.eventType === 'conversion' || this.eventType === 'purchase';
};

// Method to check if event is an engagement
trackingEventSchema.methods.isEngagement = function() {
  return ['like', 'comment', 'share', 'click', 'add_to_cart'].includes(this.eventType);
};

// Method to get event value
trackingEventSchema.methods.getValue = function() {
  if (this.conversion && this.conversion.value) {
    return this.conversion.value;
  }
  return 0;
};

// Static method to get events by user
trackingEventSchema.statics.getByUser = async function(userId, options = {}) {
  const query = { userId: userId };
  
  if (options.eventType) {
    query.eventType = options.eventType;
  }
  
  if (options.startDate) {
    query.timestamp = { $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.timestamp = query.timestamp || {};
    query.timestamp.$lte = options.endDate;
  }
  
  const events = await this.find(query)
    .populate('userId', 'username displayName avatar')
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
  
  return events;
};

// Static method to get events by source
trackingEventSchema.statics.getBySource = async function(sourceType, sourceId, options = {}) {
  const query = { sourceType: sourceType, sourceId: sourceId };
  
  if (options.eventType) {
    query.eventType = options.eventType;
  }
  
  if (options.startDate) {
    query.timestamp = { $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.timestamp = query.timestamp || {};
    query.timestamp.$lte = options.endDate;
  }
  
  const events = await this.find(query)
    .populate('userId', 'username displayName avatar')
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
  
  return events;
};

// Static method to get conversion events
trackingEventSchema.statics.getConversions = async function(options = {}) {
  const query = { eventType: { $in: ['conversion', 'purchase'] } };
  
  if (options.userId) {
    query.userId = options.userId;
  }
  
  if (options.startDate) {
    query.timestamp = { $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.timestamp = query.timestamp || {};
    query.timestamp.$lte = options.endDate;
  }
  
  const events = await this.find(query)
    .populate('userId', 'username displayName avatar')
    .populate('conversion.orderId')
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
  
  return events;
};

// Static method to get engagement metrics
trackingEventSchema.statics.getEngagementMetrics = async function(sourceType, sourceId, options = {}) {
  const query = { sourceType: sourceType, sourceId: sourceId };
  
  if (options.startDate) {
    query.timestamp = { $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.timestamp = query.timestamp || {};
    query.timestamp.$lte = options.endDate;
  }
  
  const events = await this.find(query);
  
  // Calculate metrics
  const metrics = {
    totalEvents: events.length,
    impressions: events.filter(e => e.eventType === 'impression').length,
    clicks: events.filter(e => e.eventType === 'click').length,
    views: events.filter(e => e.eventType === 'view').length,
    conversions: events.filter(e => e.eventType === 'conversion' || e.eventType === 'purchase').length,
    likes: events.filter(e => e.eventType === 'like').length,
    comments: events.filter(e => e.eventType === 'comment').length,
    shares: events.filter(e => e.eventType === 'share').length,
    addToCart: events.filter(e => e.eventType === 'add_to_cart').length,
    purchases: events.filter(e => e.eventType === 'purchase').length
  };
  
  metrics.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;
  metrics.conversionRate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
  
  return metrics;
};

// Static method to get user behavior
trackingEventSchema.statics.getUserBehavior = async function(userId, options = {}) {
  const query = { userId: userId };
  
  if (options.startDate) {
    query.timestamp = { $gte: options.startDate };
  }
  
  if (options.endDate) {
    query.timestamp = query.timestamp || {};
    query.timestamp.$lte = options.endDate;
  }
  
  const events = await this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 1000);
  
  // Analyze behavior patterns
  const behavior = {
    totalEvents: events.length,
    eventTypes: {},
    sources: {},
    mostVisited: [],
    interests: []
  };
  
  // Count event types
  events.forEach(event => {
    behavior.eventTypes[event.eventType] = (behavior.eventTypes[event.eventType] || 0) + 1;
    behavior.sources[`${event.sourceType}:${event.sourceId}`] = (behavior.sources[`${event.sourceType}:${event.sourceId}`] || 0) + 1;
  });
  
  // Get most visited sources
  behavior.mostVisited = Object.entries(behavior.sources)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([source, count]) => ({ source, count }));
  
  return behavior;
};

module.exports = mongoose.model('TrackingEvent', trackingEventSchema);