const mongoose = require('mongoose');

const adCampaignSchema = new mongoose.Schema({
  // Campaign information
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
  
  // Advertiser information
  advertiserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Campaign type
  campaignType: {
    type: String,
    enum: [
      'awareness',      // Brand awareness
      'traffic',        // Drive traffic to website
      'engagement',     // Increase engagement
      'app_installs',   // App installs
      'video_views',    // Video views
      'lead_generation', // Generate leads
      'conversions',    // Drive conversions
      'catalog_sales',  // Product catalog sales
      'store_visits'    // Drive store visits
    ],
    required: true
  },
  
  // Campaign objective
  objective: {
    type: String,
    enum: [
      'brand_awareness',
      'reach',
      'traffic',
      'engagement',
      'app_installs',
      'video_views',
      'lead_generation',
      'conversions',
      'catalog_sales',
      'store_visits'
    ],
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
  
  // Campaign settings
  isSuspended: {
    type: Boolean,
    default: false
  },
  
  isDeleted: {
    type: Boolean,
    default: false
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
  usePageActor: Boolean, // Use page as actor for ad posts
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
adCampaignSchema.virtual('ctr').get(function() {
  return this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
});

// Virtual for CPC (Cost Per Click)
adCampaignSchema.virtual('cpc').get(function() {
  return this.clicks > 0 ? this.spend / this.clicks : 0;
});

// Virtual for CPM (Cost Per Mille)
adCampaignSchema.virtual('cpm').get(function() {
  return this.impressions > 0 ? (this.spend / this.impressions) * 1000 : 0;
});

// Virtual for conversion rate
adCampaignSchema.virtual('conversionRate').get(function() {
  return this.clicks > 0 ? (this.conversions / this.clicks) * 100 : 0;
});

// Virtual for total budget (daily or lifetime)
adCampaignSchema.virtual('totalBudget').get(function() {
  return this.lifetimeBudget || (this.dailyBudget * this.getDurationInDays());
});

// Virtual for spent percentage
adCampaignSchema.virtual('spentPercentage').get(function() {
  const totalBudget = this.lifetimeBudget || (this.dailyBudget * this.getDurationInDays());
  return totalBudget > 0 ? (this.spend / totalBudget) * 100 : 0;
});

// Indexes for better query performance
adCampaignSchema.index({ advertiserId: 1, createdAt: -1 });
adCampaignSchema.index({ status: 1 });
adCampaignSchema.index({ scheduledStart: 1, scheduledEnd: 1 });
adCampaignSchema.index({ campaignType: 1 });
adCampaignSchema.index({ createdAt: -1 });

// Method to calculate campaign duration in days
adCampaignSchema.methods.getDurationInDays = function() {
  const start = new Date(this.scheduledStart);
  const end = new Date(this.scheduledEnd);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Method to check if campaign is currently active
adCampaignSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.scheduledStart <= now && 
         this.scheduledEnd >= now;
};

// Method to check if campaign is within budget
adCampaignSchema.methods.isWithinBudget = function() {
  if (this.lifetimeBudget) {
    return this.spend < this.lifetimeBudget;
  } else if (this.dailyBudget) {
    // Check daily budget - simplified for now
    return true; // Would need to track daily spend separately
  }
  return true;
};

// Method to check if campaign has ended
adCampaignSchema.methods.hasEnded = function() {
  const now = new Date();
  return now > this.scheduledEnd;
};

// Method to increment impression count
adCampaignSchema.methods.recordImpression = async function() {
  this.impressions += 1;
  await this.save();
};

// Method to increment click count
adCampaignSchema.methods.recordClick = async function() {
  this.clicks += 1;
  await this.save();
};

// Method to increment conversion count
adCampaignSchema.methods.recordConversion = async function(cost = 0) {
  this.conversions += 1;
  if (cost > 0) {
    this.spend += cost;
  }
  await this.save();
};

// Static method to get active campaigns for an advertiser
adCampaignSchema.statics.getActiveCampaigns = async function(advertiserId, options = {}) {
  const now = new Date();
  const query = {
    advertiserId: advertiserId,
    status: 'active',
    scheduledStart: { $lte: now },
    scheduledEnd: { $gte: now }
  };
  
  if (options.campaignType) {
    query.campaignType = options.campaignType;
  }
  
  const campaigns = await this.find(query)
    .populate('advertiserId', 'username displayName avatar isVerified')
    .limit(options.limit || 10);
  
  return campaigns;
};

// Static method to get campaigns by status
adCampaignSchema.statics.getCampaignsByStatus = async function(advertiserId, status, options = {}) {
  const query = {
    advertiserId: advertiserId,
    status: status
  };
  
  const campaigns = await this.find(query)
    .populate('advertiserId', 'username displayName avatar isVerified')
    .sort({ createdAt: -1 })
    .limit(options.limit || 10);
  
  return campaigns;
};

// Static method to get campaigns by type
adCampaignSchema.statics.getCampaignsByType = async function(advertiserId, campaignType, options = {}) {
  const query = {
    advertiserId: advertiserId,
    campaignType: campaignType
  };
  
  const campaigns = await this.find(query)
    .populate('advertiserId', 'username displayName avatar isVerified')
    .sort({ createdAt: -1 })
    .limit(options.limit || 10);
  
  return campaigns;
};

// Pre-save hook to update the updatedTime
adCampaignSchema.pre('save', function(next) {
  this.updatedTime = Date.now();
  next();
});

module.exports = mongoose.model('AdCampaign', adCampaignSchema);
