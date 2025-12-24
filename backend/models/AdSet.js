const mongoose = require('mongoose');

const adSetSchema = new mongoose.Schema({
  // Ad set information
  name: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // Campaign reference
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdCampaign',
    required: true
  },
  
  // Advertiser information
  advertiserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Status and scheduling
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'active', 'paused', 'completed', 'archived'],
    default: 'draft'
  },
  
  scheduledStart: {
    type: Date,
    required: true
  },
  
  scheduledEnd: {
    type: Date,
    required: true
  },
  
  // Budget and bidding
  dailyBudget: {
    type: Number,
    required: function() {
      return this.lifetimeBudget === undefined || this.lifetimeBudget === null;
    },
    min: 0
  },
  
  lifetimeBudget: {
    type: Number,
    required: function() {
      return this.dailyBudget === undefined || this.dailyBudget === null;
    },
    min: 0
  },
  
  // Bidding strategy
  biddingStrategy: {
    type: String,
    enum: [
      'lowest_cost',      // Lowest cost per optimization event
      'target_cost',      // Target cost per optimization event
      'bid_cap',          // Bid cap strategy
      'cost_cap',         // Cost cap strategy
      'roas'              // Return on ad spend
    ],
    default: 'lowest_cost'
  },
  
  bidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Targeting settings
  targeting: {
    // Demographics
    ageMin: { type: Number, default: 13, min: 13, max: 100 },
    ageMax: { type: Number, default: 65, min: 13, max: 100 },
    genders: [{
      type: String,
      enum: ['male', 'female', 'other', 'all'],
      default: 'all'
    }],
    
    // Geographic targeting
    locations: [{
      country: String,
      region: String,
      city: String,
      radius: Number, // in km
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    }],
    
    // Interest-based targeting
    interests: [{
      name: String,
      value: Number // Weight or relevance score
    }],
    
    // Behavior-based targeting
    behaviors: [{
      name: String,
      value: Number // Weight or relevance score
    }],
    
    // Device targeting
    devicePlatforms: [{
      type: String,
      enum: ['ios', 'android', 'windows', 'macos', 'linux', 'all'],
      default: 'all'
    }],
    
    deviceTypes: [{
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'all'],
      default: 'all'
    }],
    
    // Connection targeting
    connectionTypes: [{
      type: String,
      enum: ['wifi', 'cellular', 'all'],
      default: 'all'
    }],
    
    // Audience targeting
    customAudiences: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    
    lookalikeAudiences: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    
    // Excluded audiences
    excludedCustomAudiences: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    
    excludedLookalikeAudiences: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    
    // Language targeting
    languages: [String],
    
    // Education targeting
    educationStatuses: [{
      type: String,
      enum: ['high_school', 'undergraduate', 'graduate', 'alumni', 'all']
    }],
    
    // Relationship targeting
    relationshipStatuses: [{
      type: String,
      enum: ['single', 'married', 'in_relationship', 'not_specified', 'all']
    }],
    
    // Workplace targeting
    workPositions: [String],
    workEmployers: [String],
    
    // Life events targeting
    lifeEvents: [{
      type: String,
      enum: [
        'newlywed', 'newly_engaged', 'moved_home', 'graduated', 
        'job_change', 'promoted', 'retired', 'new_baby', 'none'
      ]
    }]
  },
  
  // Optimization settings
  optimizationGoal: {
    type: String,
    enum: [
      'link_clicks',
      'page_likes',
      'post_engagement',
      'reach',
      'video_views',
      'app_installs',
      'app_events',
      'conversions',
      'catalog_sales',
      'lead_generation',
      'messages',
      'landing_page_views',
      'outbound_clicks',
      'value',
      'replies'
    ],
    default: 'post_engagement'
  },
  
  // Delivery settings
  deliveryType: {
    type: String,
    enum: ['standard', 'accelerated'],
    default: 'standard'
  },
  
  // Performance metrics
  impressions: {
    type: Number,
    default: 0,
    min: 0
  },
  
  clicks: {
    type: Number,
    default: 0,
    min: 0
  },
  
  conversions: {
    type: Number,
    default: 0,
    min: 0
  },
  
  spend: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Tracking and attribution
  trackingId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Compliance and moderation
  requiresModeration: {
    type: Boolean,
    default: true
  },
  
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  moderationNotes: String,
  
  // Additional settings
  createdTime: {
    type: Date,
    default: Date.now
  },
  
  updatedTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for CTR (Click Through Rate)
adSetSchema.virtual('ctr').get(function() {
  return this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
});

// Virtual for CPC (Cost Per Click)
adSetSchema.virtual('cpc').get(function() {
  return this.clicks > 0 ? this.spend / this.clicks : 0;
});

// Virtual for CPM (Cost Per Mille)
adSetSchema.virtual('cpm').get(function() {
  return this.impressions > 0 ? (this.spend / this.impressions) * 1000 : 0;
});

// Virtual for conversion rate
adSetSchema.virtual('conversionRate').get(function() {
  return this.clicks > 0 ? (this.conversions / this.clicks) * 100 : 0;
});

// Virtual for total budget (daily or lifetime)
adSetSchema.virtual('totalBudget').get(function() {
  return this.lifetimeBudget || (this.dailyBudget * this.getDurationInDays());
});

// Virtual for spent percentage
adSetSchema.virtual('spentPercentage').get(function() {
  const totalBudget = this.lifetimeBudget || (this.dailyBudget * this.getDurationInDays());
  return totalBudget > 0 ? (this.spend / totalBudget) * 100 : 0;
});

// Indexes for better query performance
adSetSchema.index({ campaignId: 1, createdAt: -1 });
adSetSchema.index({ advertiserId: 1 });
adSetSchema.index({ status: 1 });
adSetSchema.index({ scheduledStart: 1, scheduledEnd: 1 });
adSetSchema.index({ createdAt: -1 });
adSetSchema.index({ 'targeting.locations.coordinates': '2dsphere' });

// Method to calculate ad set duration in days
adSetSchema.methods.getDurationInDays = function() {
  const start = new Date(this.scheduledStart);
  const end = new Date(this.scheduledEnd);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Method to check if ad set is currently active
adSetSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.scheduledStart <= now && 
         this.scheduledEnd >= now;
};

// Method to check if ad set is within budget
adSetSchema.methods.isWithinBudget = function() {
  if (this.lifetimeBudget) {
    return this.spend < this.lifetimeBudget;
  } else if (this.dailyBudget) {
    // Check daily budget - simplified for now
    return true; // Would need to track daily spend separately
  }
  return true;
};

// Method to check if ad set has ended
adSetSchema.methods.hasEnded = function() {
  const now = new Date();
  return now > this.scheduledEnd;
};

// Method to increment impression count
adSetSchema.methods.recordImpression = async function() {
  this.impressions += 1;
  await this.save();
};

// Method to increment click count
adSetSchema.methods.recordClick = async function() {
  this.clicks += 1;
  await this.save();
};

// Method to increment conversion count
adSetSchema.methods.recordConversion = async function(cost = 0) {
  this.conversions += 1;
  if (cost > 0) {
    this.spend += cost;
  }
  await this.save();
};

// Static method to get active ad sets for a campaign
adSetSchema.statics.getActiveAdSets = async function(campaignId, options = {}) {
  const now = new Date();
  const query = {
    campaignId: campaignId,
    status: 'active',
    scheduledStart: { $lte: now },
    scheduledEnd: { $gte: now }
  };
  
  const adSets = await this.find(query)
    .populate('campaignId', 'name status')
    .populate('advertiserId', 'username displayName avatar isVerified')
    .limit(options.limit || 10);
  
  return adSets;
};

// Static method to get ad sets by targeting criteria
adSetSchema.statics.getTargetedAdSets = async function(userId, targetingCriteria) {
  // This would be a more complex implementation in a real system
  // For now, return ad sets that match basic targeting
  const now = new Date();
  
  let query = {
    status: 'active',
    scheduledStart: { $lte: now },
    scheduledEnd: { $gte: now },
    spend: { $lt: this.budget } // Within budget
  };
  
  // Additional targeting logic would go here
  // This is where you'd match user profile, behavior, etc.
  
  const adSets = await this.find(query)
    .populate('campaignId', 'name status objective')
    .populate('advertiserId', 'username displayName avatar isVerified');
  
  return adSets;
};

// Static method to get ad sets by status
adSetSchema.statics.getAdSetsByStatus = async function(advertiserId, status, options = {}) {
  const query = {
    advertiserId: advertiserId,
    status: status
  };
  
  const adSets = await this.find(query)
    .populate('campaignId', 'name status objective')
    .populate('advertiserId', 'username displayName avatar isVerified')
    .sort({ createdAt: -1 })
    .limit(options.limit || 10);
  
  return adSets;
};

// Pre-save hook to update the updatedTime
adSetSchema.pre('save', function(next) {
  this.updatedTime = Date.now();
  next();
});

module.exports = mongoose.model('AdSet', adSetSchema);