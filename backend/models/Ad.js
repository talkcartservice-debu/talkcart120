const mongoose = require('mongoose');

// Ad creative schema - handles different types of ad content
const adCreativeSchema = new mongoose.Schema({
  headline: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 300
  },
  callToAction: {
    type: String,
    enum: ['Shop Now', 'Learn More', 'Sign Up', 'Install', 'Book Now', 'Apply Now', 'Get Quote', 'Contact Us', 'Watch More', 'Play Now', 'Try Now', 'Download', 'View Deal', 'Get Offer', 'See Menu', 'Order Now', 'Register', 'Buy Now', 'See More', 'Show More', 'Get Started', 'Start Free', 'No Button'],
    default: 'Shop Now'
  },
  primaryText: {
    type: String,
    maxlength: 90
  },
  images: [{
    public_id: String,
    secure_url: String,
    url: String,
    width: Number,
    height: Number
  }],
  video: {
    public_id: String,
    secure_url: String,
    url: String,
    duration: Number
  },
  destinationUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.*/.test(v);
      },
      message: props => `${props.value} is not a valid URL!`
    }
  }
}, { _id: false });

// Ad placement schema - defines where the ad will appear
const adPlacementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['feed', 'story', 'collection', 'banner', 'video', 'search', 'marketplace', 'social'],
    required: true
  },
  position: {
    type: String,
    enum: ['top', 'middle', 'bottom', 'sidebar', 'grid'],
    default: 'middle'
  },
  frequencyCap: {
    type: Number,
    default: 3, // Show max 3 times per user per day
    min: 1,
    max: 10
  }
}, { _id: false });

const adSchema = new mongoose.Schema({
  // Advertiser information
  advertiserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Campaign and ad set references
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdCampaign',
    required: true
  },
  
  adSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdSet',
    required: true
  },
  
  // Ad creative content
  creative: adCreativeSchema,
  
  // Ad placement settings
  placement: adPlacementSchema,
  
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
  bidAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  budget: {
    type: Number,
    required: true,
    min: 0
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
    
    // Geographic
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
    
    // Interests and behavior
    interests: [String],
    behaviors: [String],
    deviceTypes: [{
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'all'],
      default: 'all'
    }],
    
    // Lookalike audiences
    lookalikeAudiences: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    
    // Exclude specific audiences
    excludedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  
  // Ad format and features
  adFormat: {
    type: String,
    enum: ['image', 'video', 'carousel', 'collection', 'story', 'dynamic'],
    required: true
  },
  
  isSponsored: {
    type: Boolean,
    default: true
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
  
  // Tracking and attribution
  trackingId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Conversion tracking
  conversionTrackingEnabled: {
    type: Boolean,
    default: false
  },
  
  conversionPixel: String,
  
  // Engagement tracking
  engagementTracking: {
    viewTime: { type: Number, default: 0 }, // in seconds
    scrollDepth: { type: Number, default: 0 }, // percentage of page scrolled
    interactionType: String // click, view, conversion
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for CTR (Click Through Rate)
adSchema.virtual('ctr').get(function() {
  return this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
});

// Virtual for CPC (Cost Per Click)
adSchema.virtual('cpc').get(function() {
  return this.clicks > 0 ? this.spend / this.clicks : 0;
});

// Virtual for CPM (Cost Per Mille)
adSchema.virtual('cpm').get(function() {
  return this.impressions > 0 ? (this.spend / this.impressions) * 1000 : 0;
});

// Virtual for conversion rate
adSchema.virtual('conversionRate').get(function() {
  return this.clicks > 0 ? (this.conversions / this.clicks) * 100 : 0;
});

// Indexes for better query performance
adSchema.index({ advertiserId: 1, createdAt: -1 });
adSchema.index({ campaignId: 1 });
adSchema.index({ adSetId: 1 });
adSchema.index({ status: 1 });
adSchema.index({ scheduledStart: 1, scheduledEnd: 1 });
adSchema.index({ createdAt: -1 });
adSchema.index({ targeting: 1 });

// Method to check if ad is currently active
adSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.scheduledStart <= now && 
         this.scheduledEnd >= now;
};

// Method to check if ad is within budget
adSchema.methods.isWithinBudget = function() {
  return this.spend < this.budget;
};

// Method to increment impression count
adSchema.methods.recordImpression = async function() {
  this.impressions += 1;
  await this.save();
};

// Method to increment click count
adSchema.methods.recordClick = async function() {
  this.clicks += 1;
  await this.save();
};

// Method to increment conversion count
adSchema.methods.recordConversion = async function(cost = 0) {
  this.conversions += 1;
  if (cost > 0) {
    this.spend += cost;
  }
  await this.save();
};

// Static method to get active ads
adSchema.statics.getActiveAds = async function(options = {}) {
  const now = new Date();
  const query = {
    status: 'active',
    scheduledStart: { $lte: now },
    scheduledEnd: { $gte: now },
    spend: { $lt: this.budget } // Within budget
  };
  
  if (options.adFormat) {
    query.adFormat = options.adFormat;
  }
  
  if (options.advertiserId) {
    query.advertiserId = options.advertiserId;
  }
  
  const ads = await this.find(query)
    .populate('advertiserId', 'username displayName avatar isVerified')
    .populate('campaignId', 'name status')
    .populate('adSetId', 'name targeting')
    .limit(options.limit || 10);
  
  return ads;
};

// Static method to get ads by targeting criteria
adSchema.statics.getTargetedAds = async function(userId, targetingCriteria) {
  // This would be a more complex implementation in a real system
  // For now, return ads that match basic targeting
  const now = new Date();
  
  let query = {
    status: 'active',
    scheduledStart: { $lte: now },
    scheduledEnd: { $gte: now },
    spend: { $lt: this.budget } // Within budget
  };
  
  // Additional targeting logic would go here
  // This is where you'd match user profile, behavior, etc.
  
  const ads = await this.find(query)
    .populate('advertiserId', 'username displayName avatar isVerified')
    .populate('campaignId', 'name status')
    .populate('adSetId', 'name targeting');
  
  return ads;
};

module.exports = mongoose.model('Ad', adSchema);