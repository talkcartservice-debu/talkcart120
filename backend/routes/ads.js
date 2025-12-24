const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, authenticateTokenStrict } = require('./auth');
const { Ad, AdCampaign, AdSet, User, TrackingEvent, ProductPost } = require('../models');
const adDeliveryService = require('../services/adDeliveryService');
const adTargetingService = require('../services/adTargetingService');
const { uploadToCloudinary } = require('../config/cloudinary');
const multer = require('multer');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

// Configure multer for ad creative uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Ads service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// @route   GET /api/ads/targeted
// @desc    Get targeted ads for the current user
// @access  Private
router.get('/targeted', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      limit = 5,
      feedType = 'social',
      placement = 'feed'
    } = req.query;

    const targetedAds = await adTargetingService.getTargetedAds(userId, {
      limit: parseInt(limit),
      feedType,
      placement
    });

    res.json({
      success: true,
      data: {
        ads: targetedAds,
        count: targetedAds.length
      }
    });
  } catch (error) {
    console.error('Get targeted ads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get targeted ads',
      message: error.message
    });
  }
});

// @route   GET /api/ads/feed-with-ads
// @desc    Get social feed with inserted ads and product posts
// @access  Private
router.get('/feed-with-ads', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      feedType = 'social',
      limit = 20,
      page = 1,
      contentType = 'all',
      hashtag,
      search
    } = req.query;

    const mixedFeed = await adDeliveryService.getMixedFeed(userId, {
      feedType,
      limit: parseInt(limit),
      page: parseInt(page),
      contentType,
      hashtag,
      search
    });

    res.json({
      success: true,
      data: {
        posts: mixedFeed,
        count: mixedFeed.length
      }
    });
  } catch (error) {
    console.error('Get feed with ads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feed with ads',
      message: error.message
    });
  }
});

// @route   POST /api/ads/record-impression
// @desc    Record an ad impression
// @access  Private
router.post('/record-impression', authenticateToken, async (req, res) => {
  try {
    const { adId } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ad ID'
      });
    }

    const success = await adDeliveryService.recordAdImpression(adId, userId);

    if (success) {
      res.json({
        success: true,
        message: 'Impression recorded successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to record impression'
      });
    }
  } catch (error) {
    console.error('Record impression error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record impression',
      message: error.message
    });
  }
});

// @route   POST /api/ads/record-click
// @desc    Record an ad click
// @access  Private
router.post('/record-click', authenticateToken, async (req, res) => {
  try {
    const { adId, clickData = {} } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ad ID'
      });
    }

    const success = await adDeliveryService.recordAdClick(adId, userId, clickData);

    if (success) {
      res.json({
        success: true,
        message: 'Click recorded successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to record click'
      });
    }
  } catch (error) {
    console.error('Record click error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record click',
      message: error.message
    });
  }
});

// @route   GET /api/ads/campaigns
// @desc    Get ad campaigns for the current user
// @access  Private
router.get('/campaigns', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      status,
      campaignType,
      limit = 20,
      page = 1
    } = req.query;

    let query = { advertiserId: userId };
    
    if (status) {
      query.status = status;
    }
    
    if (campaignType) {
      query.campaignType = campaignType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const campaigns = await AdCampaign.find(query)
      .populate('advertiserId', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await AdCampaign.countDocuments(query);

    res.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        }
      }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get campaigns',
      message: error.message
    });
  }
});

// @route   POST /api/ads/campaigns
// @desc    Create a new ad campaign
// @access  Private
router.post('/campaigns', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Validate request body
    const schema = Joi.object({
      name: Joi.string().trim().min(1).max(100).required(),
      description: Joi.string().trim().max(500).optional(),
      campaignType: Joi.string().valid(
        'awareness', 'traffic', 'engagement', 'app_installs', 
        'video_views', 'lead_generation', 'conversions', 
        'catalog_sales', 'store_visits'
      ).required(),
      objective: Joi.string().valid(
        'brand_awareness', 'reach', 'traffic', 'engagement',
        'app_installs', 'video_views', 'lead_generation',
        'conversions', 'catalog_sales', 'store_visits'
      ).required(),
      scheduledStart: Joi.date().required(),
      scheduledEnd: Joi.date().required().greater(Joi.ref('scheduledStart')),
      dailyBudget: Joi.number().min(0).optional(),
      lifetimeBudget: Joi.number().min(0).optional(),
      biddingStrategy: Joi.string().valid('lowest_cost', 'target_cost', 'bid_cap', 'cost_cap', 'roas').default('lowest_cost'),
      bidAmount: Joi.number().min(0).default(0),
      optimizationGoal: Joi.string().valid(
        'link_clicks', 'page_likes', 'post_engagement', 'reach',
        'video_views', 'app_installs', 'app_events', 'conversions',
        'catalog_sales', 'lead_generation', 'messages', 'landing_page_views',
        'outbound_clicks', 'value', 'replies'
      ).default('post_engagement')
    });

    const { value, error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    // Check if user is verified vendor or advertiser
    const user = await User.findById(userId);
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        error: 'User must be verified to create ad campaigns'
      });
    }

    // Create new campaign
    const newCampaign = new AdCampaign({
      ...value,
      advertiserId: userId,
      status: 'draft' // Start as draft, requires approval
    });

    await newCampaign.save();

    // Populate for response
    await newCampaign.populate('advertiserId', 'username displayName avatar isVerified');

    res.status(201).json({
      success: true,
      data: newCampaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      message: error.message
    });
  }
});

// @route   PUT /api/ads/campaigns/:id
// @desc    Update an ad campaign
// @access  Private
router.put('/campaigns/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign ID'
      });
    }

    // Validate request body
    const schema = Joi.object({
      name: Joi.string().trim().min(1).max(100).optional(),
      description: Joi.string().trim().max(500).optional(),
      campaignType: Joi.string().valid(
        'awareness', 'traffic', 'engagement', 'app_installs', 
        'video_views', 'lead_generation', 'conversions', 
        'catalog_sales', 'store_visits'
      ).optional(),
      objective: Joi.string().valid(
        'brand_awareness', 'reach', 'traffic', 'engagement',
        'app_installs', 'video_views', 'lead_generation',
        'conversions', 'catalog_sales', 'store_visits'
      ).optional(),
      scheduledStart: Joi.date().optional(),
      scheduledEnd: Joi.date().greater(Joi.ref('scheduledStart')).optional(),
      dailyBudget: Joi.number().min(0).optional(),
      lifetimeBudget: Joi.number().min(0).optional(),
      biddingStrategy: Joi.string().valid('lowest_cost', 'target_cost', 'bid_cap', 'cost_cap', 'roas').optional(),
      bidAmount: Joi.number().min(0).optional(),
      optimizationGoal: Joi.string().valid(
        'link_clicks', 'page_likes', 'post_engagement', 'reach',
        'video_views', 'app_installs', 'app_events', 'conversions',
        'catalog_sales', 'lead_generation', 'messages', 'landing_page_views',
        'outbound_clicks', 'value', 'replies'
      ).optional(),
      status: Joi.string().valid('draft', 'active', 'paused', 'completed', 'archived').optional()
    });

    const { value, error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    // Check if campaign exists and belongs to user
    const campaign = await AdCampaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (campaign.advertiserId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this campaign'
      });
    }

    // Prevent modification of certain fields if campaign is active
    if (campaign.status === 'active' && (value.scheduledStart || value.scheduledEnd || value.dailyBudget || value.lifetimeBudget)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify schedule or budget for active campaigns'
      });
    }

    // Update campaign
    Object.assign(campaign, value);
    await campaign.save();

    // Populate for response
    await campaign.populate('advertiserId', 'username displayName avatar isVerified');

    res.json({
      success: true,
      data: campaign,
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
      message: error.message
    });
  }
});

// @route   GET /api/ads/adsets
// @desc    Get ad sets for a campaign or user
// @access  Private
router.get('/adsets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      campaignId,
      status,
      limit = 20,
      page = 1
    } = req.query;

    let query = { advertiserId: userId };
    
    if (campaignId) {
      if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid campaign ID'
        });
      }
      query.campaignId = campaignId;
    }
    
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const adSets = await AdSet.find(query)
      .populate('campaignId', 'name status objective')
      .populate('advertiserId', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await AdSet.countDocuments(query);

    res.json({
      success: true,
      data: {
        adSets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        }
      }
    });
  } catch (error) {
    console.error('Get ad sets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ad sets',
      message: error.message
    });
  }
});

// @route   POST /api/ads/adsets
// @desc    Create a new ad set
// @access  Private
router.post('/adsets', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Validate request body
    const schema = Joi.object({
      name: Joi.string().trim().min(1).max(100).required(),
      description: Joi.string().trim().max(500).optional(),
      campaignId: Joi.string().required(),
      scheduledStart: Joi.date().required(),
      scheduledEnd: Joi.date().required().greater(Joi.ref('scheduledStart')),
      dailyBudget: Joi.number().min(0).optional(),
      lifetimeBudget: Joi.number().min(0).optional(),
      biddingStrategy: Joi.string().valid('lowest_cost', 'target_cost', 'bid_cap', 'cost_cap', 'roas').default('lowest_cost'),
      bidAmount: Joi.number().min(0).default(0),
      optimizationGoal: Joi.string().valid(
        'link_clicks', 'page_likes', 'post_engagement', 'reach',
        'video_views', 'app_installs', 'app_events', 'conversions',
        'catalog_sales', 'lead_generation', 'messages', 'landing_page_views',
        'outbound_clicks', 'value', 'replies'
      ).default('post_engagement'),
      targeting: Joi.object({
        ageMin: Joi.number().min(13).max(100).default(13),
        ageMax: Joi.number().min(13).max(100).default(65),
        genders: Joi.array().items(Joi.string().valid('male', 'female', 'other', 'all')).default(['all']),
        locations: Joi.array().items(Joi.object({
          country: Joi.string().optional(),
          region: Joi.string().optional(),
          city: Joi.string().optional(),
          radius: Joi.number().optional(),
          coordinates: Joi.array().items(Joi.number()).length(2).optional()
        })).optional(),
        interests: Joi.array().items(Joi.object({
          name: Joi.string().required(),
          value: Joi.number().optional()
        })).optional(),
        behaviors: Joi.array().items(Joi.object({
          name: Joi.string().required(),
          value: Joi.number().optional()
        })).optional(),
        devicePlatforms: Joi.array().items(Joi.string().valid('ios', 'android', 'windows', 'macos', 'linux', 'all')).default(['all']),
        deviceTypes: Joi.array().items(Joi.string().valid('mobile', 'tablet', 'desktop', 'all')).default(['all']),
        connectionTypes: Joi.array().items(Joi.string().valid('wifi', 'cellular', 'all')).default(['all']),
        languages: Joi.array().items(Joi.string()).optional(),
        educationStatuses: Joi.array().items(Joi.string().valid('high_school', 'undergraduate', 'graduate', 'alumni', 'all')).optional(),
        relationshipStatuses: Joi.array().items(Joi.string().valid('single', 'married', 'in_relationship', 'not_specified', 'all')).optional(),
        lifeEvents: Joi.array().items(Joi.string().valid('newlywed', 'newly_engaged', 'moved_home', 'graduated', 'job_change', 'promoted', 'retired', 'new_baby', 'none')).optional()
      }).required()
    });

    const { value, error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    // Verify campaign exists and belongs to user
    if (!mongoose.Types.ObjectId.isValid(value.campaignId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid campaign ID'
      });
    }

    const campaign = await AdCampaign.findById(value.campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (campaign.advertiserId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create ad set for this campaign'
      });
    }

    // Create new ad set
    const newAdSet = new AdSet({
      ...value,
      advertiserId: userId,
      status: 'draft' // Start as draft
    });

    await newAdSet.save();

    // Populate for response
    await newAdSet.populate('campaignId', 'name status objective');
    await newAdSet.populate('advertiserId', 'username displayName avatar isVerified');

    res.status(201).json({
      success: true,
      data: newAdSet,
      message: 'Ad set created successfully'
    });
  } catch (error) {
    console.error('Create ad set error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ad set',
      message: error.message
    });
  }
});

// @route   GET /api/ads
// @desc    Get ads for an ad set or campaign
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      adSetId,
      campaignId,
      status,
      adFormat,
      limit = 20,
      page = 1
    } = req.query;

    let query = { advertiserId: userId };
    
    if (adSetId) {
      if (!mongoose.Types.ObjectId.isValid(adSetId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ad set ID'
        });
      }
      query.adSetId = adSetId;
    }
    
    if (campaignId) {
      if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid campaign ID'
        });
      }
      query.campaignId = campaignId;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (adFormat) {
      query.adFormat = adFormat;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const ads = await Ad.find(query)
      .populate('advertiserId', 'username displayName avatar isVerified')
      .populate('campaignId', 'name status')
      .populate('adSetId', 'name status')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Ad.countDocuments(query);

    res.json({
      success: true,
      data: {
        ads,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        }
      }
    });
  } catch (error) {
    console.error('Get ads error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ads',
      message: error.message
    });
  }
});

// @route   POST /api/ads
// @desc    Create a new ad
// @access  Private
router.post('/', authenticateTokenStrict, upload.array('creativeImages', 5), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Validate request body
    const schema = Joi.object({
      name: Joi.string().trim().min(1).max(100).required(),
      adSetId: Joi.string().required(),
      creative: Joi.object({
        headline: Joi.string().trim().max(100).required(),
        description: Joi.string().trim().max(300).required(),
        callToAction: Joi.string().valid(
          'Shop Now', 'Learn More', 'Sign Up', 'Install', 'Book Now', 'Apply Now', 
          'Get Quote', 'Contact Us', 'Watch More', 'Play Now', 'Try Now', 
          'Download', 'View Deal', 'Get Offer', 'See Menu', 'Order Now', 
          'Register', 'Buy Now', 'See More', 'Show More', 'Get Started', 
          'Start Free', 'No Button'
        ).default('Shop Now'),
        primaryText: Joi.string().trim().max(90).optional(),
        destinationUrl: Joi.string().uri().required()
      }).required(),
      placement: Joi.object({
        type: Joi.string().valid('feed', 'story', 'collection', 'banner', 'video', 'search', 'marketplace', 'social').required(),
        position: Joi.string().valid('top', 'middle', 'bottom', 'sidebar', 'grid').default('middle'),
        frequencyCap: Joi.number().min(1).max(10).default(3)
      }).required(),
      scheduledStart: Joi.date().required(),
      scheduledEnd: Joi.date().required().greater(Joi.ref('scheduledStart')),
      bidAmount: Joi.number().min(0).required(),
      budget: Joi.number().min(0).required(),
      adFormat: Joi.string().valid('image', 'video', 'carousel', 'collection', 'story', 'dynamic').required()
    });

    const { value, error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    // Verify ad set exists and belongs to user
    if (!mongoose.Types.ObjectId.isValid(value.adSetId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ad set ID'
      });
    }

    const adSet = await AdSet.findById(value.adSetId);
    if (!adSet) {
      return res.status(404).json({
        success: false,
        error: 'Ad set not found'
      });
    }

    if (adSet.advertiserId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create ad for this ad set'
      });
    }

    // Handle image uploads if any
    let uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file.buffer, {
            folder: 'ads/creatives',
            resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
            transformation: file.mimetype.startsWith('video/') ? 
              [{ quality: 'auto', fetch_format: 'auto' }] :
              [{ width: 1200, height: 630, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }]
          });

          uploadedImages.push({
            public_id: result.public_id,
            url: result.url,
            secure_url: result.secure_url,
            width: result.width,
            height: result.height
          });
        } catch (uploadError) {
          console.error('Error uploading ad creative:', uploadError);
          return res.status(500).json({
            success: false,
            error: 'Failed to upload creative assets',
            message: uploadError.message
          });
        }
      }
    }

    // Create new ad
    const newAd = new Ad({
      ...value,
      advertiserId: userId,
      creative: {
        ...value.creative,
        images: uploadedImages
      },
      status: 'pending_approval' // Requires moderation
    });

    await newAd.save();

    // Populate for response
    await newAd.populate('advertiserId', 'username displayName avatar isVerified');
    await newAd.populate('campaignId', 'name status');
    await newAd.populate('adSetId', 'name status');

    res.status(201).json({
      success: true,
      data: newAd,
      message: 'Ad created successfully and pending approval'
    });
  } catch (error) {
    console.error('Create ad error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ad',
      message: error.message
    });
  }
});

// @route   POST /api/ads/upload-creative
// @desc    Upload ad creative assets
// @access  Private
router.post('/upload-creative', authenticateTokenStrict, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided'
      });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        const result = await uploadToCloudinary(file.buffer, {
          folder: 'ads/creatives',
          resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
          transformation: file.mimetype.startsWith('video/') ? 
            [{ quality: 'auto', fetch_format: 'auto' }] :
            [{ width: 1200, height: 630, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }]
        });

        uploadedFiles.push({
          public_id: result.public_id,
          url: result.url,
          secure_url: result.secure_url,
          width: result.width,
          height: result.height,
          resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image'
        });
      } catch (uploadError) {
        console.error('Error uploading creative asset:', uploadError);
        // Continue with other files
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to upload any creative assets'
      });
    }

    res.json({
      success: true,
      data: { files: uploadedFiles },
      message: `${uploadedFiles.length} creative asset(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Upload creative error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload creative assets',
      message: error.message
    });
  }
});

// @route   GET /api/ads/trending-topics
// @desc    Get trending topics for ad targeting
// @access  Public
router.get('/trending-topics', async (req, res) => {
  try {
    const trendingTopics = await adTargetingService.getTrendingTopics(20);

    res.json({
      success: true,
      data: {
        trendingTopics
      }
    });
  } catch (error) {
    console.error('Get trending topics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending topics',
      message: error.message
    });
  }
});

// @route   POST /api/ads/product-posts
// @desc    Create a new product post (link a product to a post for shoppable functionality)
// @access  Private
router.post('/product-posts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const {
      postId,
      productId,
      productPosition = 'main',
      placementData,
      currentPrice,
      originalPrice,
      availableStock,
      showPrice = true,
      showProductTag = true,
      isFeatured = false,
      isPromoted = false,
      promotionDiscount
    } = req.body;

    // Validate required fields
    if (!postId || !productId) {
      return res.status(400).json({
        success: false,
        error: 'Post ID and Product ID are required'
      });
    }

    // Verify user is the vendor of the product
    const Product = require('../models').Product;
    const Post = require('../models').Post;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check if user is the vendor of this product
    if (product.vendorId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create product post for this product'
      });
    }

    // Verify post exists and belongs to user
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check if user is the author of the post
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create product post for this post'
      });
    }

    // Check if a product post already exists for this post
    const existingProductPost = await ProductPost.findOne({ postId });
    if (existingProductPost) {
      return res.status(409).json({
        success: false,
        error: 'A product post already exists for this post'
      });
    }

    // Create product details copy
    const productDetails = {
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency || 'USD',
      images: product.images,
      category: product.category,
      tags: product.tags,
      stock: product.stock,
      isNFT: product.isNFT,
      contractAddress: product.contractAddress,
      tokenId: product.tokenId,
      rating: product.rating,
      reviewCount: product.reviewCount,
      sales: product.sales,
      views: product.views,
      availability: product.availability,
      discount: product.discount,
      freeShipping: product.freeShipping,
      fastDelivery: product.fastDelivery,
      prime: product.prime,
      inStock: product.inStock
    };

    // Set default current price if not provided
    const effectiveCurrentPrice = currentPrice !== undefined ? currentPrice : product.price;
    const effectiveOriginalPrice = originalPrice !== undefined ? originalPrice : product.price;

    // Create new product post
    const newProductPost = new ProductPost({
      postId,
      productId,
      vendorId: userId,
      productDetails,
      productPosition,
      placementData,
      currentPrice: effectiveCurrentPrice,
      originalPrice: effectiveOriginalPrice,
      currency: product.currency || 'USD',
      availableStock: availableStock !== undefined ? availableStock : product.stock,
      showPrice,
      showProductTag,
      isFeatured,
      isPromoted,
      promotionDiscount,
      moderationStatus: 'pending_approval' // Requires moderation before showing in feed
    });

    await newProductPost.save();

    // Populate for response
    await newProductPost.populate('postId', 'content media author');
    await newProductPost.populate('productId', 'name description price images');
    await newProductPost.populate('vendorId', 'username displayName avatar isVerified');

    res.status(201).json({
      success: true,
      data: newProductPost,
      message: 'Product post created successfully and pending approval'
    });
  } catch (error) {
    console.error('Create product post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product post',
      message: error.message
    });
  }
});

// @route   GET /api/ads/product-posts
// @desc    Get product posts for the current user
// @access  Private
router.get('/product-posts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      limit = 10,
      page = 1,
      vendorId,
      productId
    } = req.query;

    let query = {};
    
    if (vendorId) {
      query.vendorId = vendorId;
    }
    
    if (productId) {
      query.productId = productId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const productPosts = await ProductPost.find(query)
      .populate('postId', 'content media author')
      .populate('productId', 'name description price images')
      .populate('vendorId', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await ProductPost.countDocuments(query);

    res.json({
      success: true,
      data: {
        productPosts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        }
      }
    });
  } catch (error) {
    console.error('Get product posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product posts',
      message: error.message
    });
  }
});

// @route   GET /api/ads/product-posts/:id
// @desc    Get a specific product post
// @access  Private
router.get('/product-posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product post ID'
      });
    }

    const productPost = await ProductPost.findById(id)
      .populate('postId', 'content media author')
      .populate('productId', 'name description price images')
      .populate('vendorId', 'username displayName avatar isVerified')
      .lean();

    if (!productPost) {
      return res.status(404).json({
        success: false,
        error: 'Product post not found'
      });
    }

    // Check if user is the vendor or has permission to view
    const userId = req.user.userId;
    if (productPost.vendorId._id.toString() !== userId.toString()) {
      // For non-vendor users, only return approved product posts
      if (productPost.moderationStatus !== 'approved') {
        return res.status(404).json({
          success: false,
          error: 'Product post not found'
        });
      }
    }

    res.json({
      success: true,
      data: productPost
    });
  } catch (error) {
    console.error('Get product post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product post',
      message: error.message
    });
  }
});

// @route   PUT /api/ads/product-posts/:id
// @desc    Update a product post
// @access  Private
router.put('/product-posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product post ID'
      });
    }

    const productPost = await ProductPost.findById(id);
    if (!productPost) {
      return res.status(404).json({
        success: false,
        error: 'Product post not found'
      });
    }

    // Check if user is the vendor of this product post
    if (productPost.vendorId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this product post'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'productPosition', 'placementData', 'currentPrice', 'originalPrice',
      'availableStock', 'showPrice', 'showProductTag', 'isFeatured',
      'isPromoted', 'promotionDiscount', 'isActive'
    ];
    
    const updates = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedUpdates.includes(key)) {
        updates[key] = value;
      }
    }

    // Update the product post
    Object.assign(productPost, updates);
    await productPost.save();

    // Populate for response
    await productPost.populate('postId', 'content media author');
    await productPost.populate('productId', 'name description price images');
    await productPost.populate('vendorId', 'username displayName avatar isVerified');

    res.json({
      success: true,
      data: productPost,
      message: 'Product post updated successfully'
    });
  } catch (error) {
    console.error('Update product post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product post',
      message: error.message
    });
  }
});

// @route   POST /api/ads/product-posts/record-view
// @desc    Record a product post view
// @access  Private
router.post('/product-posts/:id/views', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product post ID'
      });
    }

    // Find the product post
    const productPost = await ProductPost.findById(id);
    if (!productPost) {
      return res.status(404).json({
        success: false,
        error: 'Product post not found'
      });
    }

    // Record the view in tracking event
    const trackingEvent = new TrackingEvent({
      userId,
      eventType: 'product_post_view',
      sourceType: 'product_post',
      sourceId: id,
      sourceDetails: {
        postId: productPost.postId,
        productId: productPost.productId,
        vendorId: productPost.vendorId
      }
    });

    await trackingEvent.save();

    // Update product post view count
    productPost.views = (productPost.views || 0) + 1;
    await productPost.save();

    res.json({
      success: true,
      message: 'Product post view recorded successfully'
    });
  } catch (error) {
    console.error('Record product post view error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record product post view',
      message: error.message
    });
  }
});

// @route   POST /api/ads/product-posts/record-interaction
// @desc    Record a product post interaction
// @access  Private
router.post('/product-posts/:id/interactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product post ID'
      });
    }

    const validInteractionTypes = ['click', 'add_to_cart', 'purchase', 'like', 'share', 'comment'];
    if (!validInteractionTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid interaction type'
      });
    }

    // Find the product post
    const productPost = await ProductPost.findById(id);
    if (!productPost) {
      return res.status(404).json({
        success: false,
        error: 'Product post not found'
      });
    }

    // Record the interaction in tracking event
    const trackingEvent = new TrackingEvent({
      userId,
      eventType: `product_post_${type}`,
      sourceType: 'product_post',
      sourceId: id,
      sourceDetails: {
        postId: productPost.postId,
        productId: productPost.productId,
        vendorId: productPost.vendorId
      }
    });

    await trackingEvent.save();

    // Update interaction count based on type
    if (type === 'click') {
      productPost.clicks = (productPost.clicks || 0) + 1;
    } else if (type === 'add_to_cart') {
      productPost.addToCart = (productPost.addToCart || 0) + 1;
    } else if (type === 'purchase') {
      productPost.purchases = (productPost.purchases || 0) + 1;
    }

    await productPost.save();

    res.json({
      success: true,
      message: 'Product post interaction recorded successfully'
    });
  } catch (error) {
    console.error('Record product post interaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record product post interaction',
      message: error.message
    });
  }
});

// @route   GET /api/ads/analytics
// @desc    Get ad analytics for user
// @access  Private
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      startDate,
      endDate,
      campaignId,
      adSetId,
      adId
    } = req.query;

    // This would be a more complex implementation in a real system
    // For now, return basic metrics
    
    let query = { advertiserId: userId };
    
    if (campaignId) query.campaignId = campaignId;
    if (adSetId) query.adSetId = adSetId;
    if (adId) query._id = adId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get basic metrics
    const ads = await Ad.find(query);
    const campaigns = await AdCampaign.find({ advertiserId: userId });
    const adSets = await AdSet.find({ advertiserId: userId });

    // Calculate overall metrics
    const totalImpressions = ads.reduce((sum, ad) => sum + ad.impressions, 0);
    const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0);
    const totalConversions = ads.reduce((sum, ad) => sum + ad.conversions, 0);
    const totalSpend = ads.reduce((sum, ad) => sum + ad.spend, 0);

    const analytics = {
      overall: {
        totalCampaigns: campaigns.length,
        totalAdSets: adSets.length,
        totalAds: ads.length,
        totalImpressions,
        totalClicks,
        totalConversions,
        totalSpend,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0
      },
      campaigns: campaigns.map(c => ({
        id: c._id,
        name: c.name,
        status: c.status,
        impressions: c.impressions,
        clicks: c.clicks,
        conversions: c.conversions,
        spend: c.spend
      })),
      adSets: adSets.map(as => ({
        id: as._id,
        name: as.name,
        status: as.status,
        impressions: as.impressions,
        clicks: as.clicks,
        conversions: as.conversions,
        spend: as.spend
      })),
      ads: ads.map(ad => ({
        id: ad._id,
        headline: ad.creative.headline,
        status: ad.status,
        impressions: ad.impressions,
        clicks: ad.clicks,
        conversions: ad.conversions,
        spend: ad.spend,
        ctr: ad.ctr
      }))
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      message: error.message
    });
  }
});

module.exports = router;