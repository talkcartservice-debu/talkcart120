const { Ad, AdSet, AdCampaign, ProductPost, Post, TrackingEvent } = require('../models');
const adTargetingService = require('./adTargetingService');

class AdDeliveryService {
  constructor() {
    this.adFrequencyCache = new Map(); // Track ad frequency per user
    this.feedCache = new Map(); // Cache feed content with ads
    this.adRotation = 0; // Simple rotation counter
  }

  /**
   * Insert ads into social feed
   */
  async insertAdsIntoFeed(posts, userId, options = {}) {
    const {
      feedType = 'social',
      adFrequency = 5, // Insert ad every 5 posts
      maxAds = 3,
      placement = 'feed'
    } = options;

    try {
      // Get targeted ads for this user
      const targetedAds = await adTargetingService.getTargetedAds(userId, {
        limit: maxAds,
        feedType,
        placement
      });

      if (!targetedAds || targetedAds.length === 0) {
        return posts; // Return original posts if no ads available
      }

      // Convert ads to feed-compatible format
      const adPosts = await this.convertAdsToFeedFormat(targetedAds, userId);

      // Insert ads into feed at regular intervals
      const result = [];
      let adIndex = 0;

      for (let i = 0; i < posts.length; i++) {
        // Insert ad at specified frequency
        if ((i + 1) % adFrequency === 0 && adIndex < adPosts.length) {
          result.push(adPosts[adIndex]);
          adIndex++;
        }
        
        result.push(posts[i]);
      }

      // Add remaining ads if we have more ads than insertion points
      while (adIndex < adPosts.length && result.length < posts.length + adPosts.length) {
        result.push(adPosts[adIndex]);
        adIndex++;
      }

      return result;
    } catch (error) {
      console.error('Error inserting ads into feed:', error);
      return posts; // Return original posts on error
    }
  }

  /**
   * Insert product posts (shoppable posts) into feed
   */
  async insertProductPostsIntoFeed(posts, userId, options = {}) {
    const {
      feedType = 'social',
      frequency = 4, // Insert product post every 4 posts
      maxProductPosts = 2
    } = options;

    try {
      // Get product posts for user
      const productPosts = await this.getProductPostsForUser(userId, {
        limit: maxProductPosts
      });

      if (!productPosts || productPosts.length === 0) {
        return posts;
      }

      // Convert product posts to feed-compatible format
      const productPostItems = await this.convertProductPostsToFeedFormat(productPosts, userId);

      // Insert product posts into feed
      const result = [];
      let ppIndex = 0;

      for (let i = 0; i < posts.length; i++) {
        // Insert product post at specified frequency
        if ((i + 1) % frequency === 0 && ppIndex < productPostItems.length) {
          result.push(productPostItems[ppIndex]);
          ppIndex++;
        }
        
        result.push(posts[i]);
      }

      // Add remaining product posts
      while (ppIndex < productPostItems.length && result.length < posts.length + productPostItems.length) {
        result.push(productPostItems[ppIndex]);
        ppIndex++;
      }

      return result;
    } catch (error) {
      console.error('Error inserting product posts into feed:', error);
      return posts;
    }
  }

  /**
   * Get product posts for a user
   */
  async getProductPostsForUser(userId, options = {}) {
    const { limit = 5 } = options;

    try {
      // In a real system, this would use more sophisticated targeting
      // For now, return popular product posts
      const productPosts = await ProductPost.find({
        isActive: true,
        'productDetails.stock': { $gt: 0 }
      })
      .populate('postId', 'content type media createdAt')
      .populate('productId', 'name description price images category')
      .populate('vendorId', 'username displayName avatar isVerified')
      .sort({ clicks: -1, purchases: -1 }) // Sort by engagement
      .limit(limit);

      return productPosts;
    } catch (error) {
      console.error('Error getting product posts for user:', error);
      return [];
    }
  }

  /**
   * Convert ads to feed-compatible format
   */
  async convertAdsToFeedFormat(ads, userId) {
    const adPosts = [];

    for (const ad of ads) {
      // Record impression
      await this.recordAdImpression(ad._id, userId);

      const adPost = {
        _id: `ad_${ad._id}`, // Unique ID prefixed with 'ad_'
        id: `ad_${ad._id}`,
        type: 'ad', // Special type for ads
        adType: ad.adFormat, // image, video, carousel, etc.
        content: ad.creative.description,
        headline: ad.creative.headline,
        callToAction: ad.creative.callToAction,
        destinationUrl: ad.creative.destinationUrl,
        isSponsored: true,
        isAd: true,
        isNative: true, // Native ad format
        sponsoredLabel: 'Sponsored',
        promotedBy: ad.advertiserId.username,
        promotedById: ad.advertiserId._id,
        
        // Ad creative data
        creative: {
          headline: ad.creative.headline,
          description: ad.creative.description,
          callToAction: ad.creative.callToAction,
          images: ad.creative.images,
          video: ad.creative.video,
          destinationUrl: ad.creative.destinationUrl
        },
        
        // Placement data
        placement: ad.placement,
        
        // Performance data
        performance: {
          impressions: ad.impressions,
          clicks: ad.clicks,
          ctr: ad.ctr
        },
        
        // Author-like structure for consistency with posts
        author: {
          _id: ad.advertiserId._id,
          id: ad.advertiserId._id,
          username: ad.advertiserId.username,
          displayName: ad.advertiserId.displayName || ad.advertiserId.username,
          avatar: ad.advertiserId.avatar,
          isVerified: ad.advertiserId.isVerified,
          isAdAccount: true // Flag to identify ad accounts
        },
        
        // Engagement data (for consistency with posts)
        likes: [],
        comments: 0,
        shares: 0,
        bookmarks: [],
        
        // Timing
        createdAt: ad.createdAt,
        updatedAt: ad.updatedAt,
        
        // Tracking
        trackingId: ad.trackingId
      };

      adPosts.push(adPost);
    }

    return adPosts;
  }

  /**
   * Convert product posts to feed-compatible format
   */
  async convertProductPostsToFeedFormat(productPosts, userId) {
    const ppItems = [];

    for (const pp of productPosts) {
      // Record product post view
      await this.recordProductPostView(pp._id, userId);

      const ppItem = {
        _id: `pp_${pp._id}`, // Unique ID prefixed with 'pp_'
        id: `pp_${pp._id}`,
        type: 'product_post', // Special type for product posts
        isProductPost: true,
        isShoppable: true,
        content: pp.postId.content,
        originalPostId: pp.postId._id,
        
        // Product data
        product: {
          id: pp.productId._id,
          name: pp.productDetails.name,
          description: pp.productDetails.description,
          price: pp.currentPrice,
          originalPrice: pp.originalPrice,
          currency: pp.currency,
          images: pp.productDetails.images,
          category: pp.productDetails.category,
          inStock: pp.availableStock > 0,
          stock: pp.availableStock,
          discount: pp.promotionDiscount
        },
        
        // Placement data
        placementData: pp.placementData,
        
        // Performance data
        performance: {
          clicks: pp.clicks,
          purchases: pp.purchases,
          addToCart: pp.addToCart,
          conversionRate: pp.conversionRate
        },
        
        // Author from original post
        author: {
          _id: pp.postId.author,
          id: pp.postId.author,
          username: pp.postId.author.username,
          displayName: pp.postId.author.displayName || pp.postId.author.username,
          avatar: pp.postId.author.avatar,
          isVerified: pp.postId.author.isVerified,
          isVendor: true // Flag for vendor accounts
        },
        
        // Original post data
        originalPost: {
          type: pp.postId.type,
          media: pp.postId.media
        },
        
        // Engagement data
        likes: pp.postId.likes || [],
        comments: pp.postId.comments || 0,
        shares: pp.postId.shares || 0,
        bookmarks: pp.postId.bookmarks || [],
        
        // Timing
        createdAt: pp.postId.createdAt,
        updatedAt: pp.postId.updatedAt,
        
        // Tracking
        trackingId: pp.trackingId
      };

      ppItems.push(ppItem);
    }

    return ppItems;
  }

  /**
   * Get mixed feed with posts, ads, and product posts
   */
  async getMixedFeed(userId, options = {}) {
    const {
      feedType = 'social',
      limit = 20,
      page = 1,
      contentType = 'all',
      hashtag,
      search
    } = options;

    try {
      // Get regular posts first
      const postsQuery = {
        isActive: true,
        privacy: 'public'
      };

      if (contentType !== 'all') {
        postsQuery.type = contentType;
      }

      if (hashtag) {
        postsQuery.hashtags = { $in: [hashtag.toLowerCase()] };
      }

      if (search) {
        postsQuery.$text = { $search: search };
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get regular posts
      const posts = await Post.find(postsQuery)
        .populate('author', 'username displayName avatar isVerified')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) * 2) // Get more posts to account for ads insertion
        .skip(skip)
        .lean();

      // Insert ads into the feed
      const feedWithAds = await this.insertAdsIntoFeed(posts, userId, {
        feedType,
        adFrequency: 5,
        maxAds: 3
      });

      // Insert product posts into the feed
      const mixedFeed = await this.insertProductPostsIntoFeed(feedWithAds, userId, {
        feedType,
        frequency: 4,
        maxProductPosts: 2
      });

      // Return only the requested limit
      return mixedFeed.slice(0, limit);
    } catch (error) {
      console.error('Error getting mixed feed:', error);
      throw error;
    }
  }

  /**
   * Record ad impression
   */
  async recordAdImpression(adId, userId) {
    try {
      // Update ad impression count
      await Ad.findByIdAndUpdate(adId, { $inc: { impressions: 1 } });

      // Update campaign and ad set impression counts
      const ad = await Ad.findById(adId).populate('campaignId').populate('adSetId');
      if (ad.campaignId) {
        await AdCampaign.findByIdAndUpdate(ad.campaignId._id, { $inc: { impressions: 1 } });
      }
      if (ad.adSetId) {
        await AdSet.findByIdAndUpdate(ad.adSetId._id, { $inc: { impressions: 1 } });
      }

      // Record tracking event
      await TrackingEvent.create({
        eventType: 'impression',
        userId: userId,
        source: 'ad',
        sourceId: adId,
        sourceType: 'Ad',
        sessionId: `session_${Date.now()}_${userId}`,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error recording ad impression:', error);
    }
  }

  /**
   * Record ad click
   */
  async recordAdClick(adId, userId, clickData = {}) {
    try {
      // Update ad click count
      await Ad.findByIdAndUpdate(adId, { $inc: { clicks: 1 } });

      // Update campaign and ad set click counts
      const ad = await Ad.findById(adId).populate('campaignId').populate('adSetId');
      if (ad.campaignId) {
        await AdCampaign.findByIdAndUpdate(ad.campaignId._id, { $inc: { clicks: 1 } });
      }
      if (ad.adSetId) {
        await AdSet.findByIdAndUpdate(ad.adSetId._id, { $inc: { clicks: 1 } });
      }

      // Record tracking event
      await TrackingEvent.create({
        eventType: 'click',
        userId: userId,
        source: 'ad',
        sourceId: adId,
        sourceType: 'Ad',
        sessionId: `session_${Date.now()}_${userId}`,
        timestamp: new Date(),
        properties: clickData
      });

      return true;
    } catch (error) {
      console.error('Error recording ad click:', error);
      return false;
    }
  }

  /**
   * Record product post view
   */
  async recordProductPostView(productPostId, userId) {
    try {
      // Update product post view count
      await ProductPost.findByIdAndUpdate(productPostId, { $inc: { clicks: 1 } });

      // Record tracking event
      await TrackingEvent.create({
        eventType: 'product_view',
        userId: userId,
        source: 'product_post',
        sourceId: productPostId,
        sourceType: 'ProductPost',
        sessionId: `session_${Date.now()}_${userId}`,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error recording product post view:', error);
    }
  }

  /**
   * Record product post interaction (click to purchase)
   */
  async recordProductPostInteraction(productPostId, userId, interactionType = 'click') {
    try {
      let updateField;
      switch (interactionType) {
        case 'click':
          updateField = { $inc: { clicks: 1 } };
          break;
        case 'add_to_cart':
          updateField = { $inc: { addToCart: 1 } };
          break;
        case 'purchase':
          updateField = { $inc: { purchases: 1 } };
          break;
        default:
          updateField = { $inc: { clicks: 1 } };
      }

      // Update product post interaction count
      await ProductPost.findByIdAndUpdate(productPostId, updateField);

      // Record tracking event
      await TrackingEvent.create({
        eventType: interactionType,
        userId: userId,
        source: 'product_post',
        sourceId: productPostId,
        sourceType: 'ProductPost',
        sessionId: `session_${Date.now()}_${userId}`,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error recording product post interaction:', error);
      return false;
    }
  }

  /**
   * Get ad placement options for a feed
   */
  getAdPlacementOptions(feedType) {
    const placementOptions = {
      social: [
        { type: 'feed', position: 'middle', frequencyCap: 3 },
        { type: 'story', position: 'top', frequencyCap: 1 },
        { type: 'banner', position: 'top', frequencyCap: 2 }
      ],
      marketplace: [
        { type: 'feed', position: 'middle', frequencyCap: 2 },
        { type: 'collection', position: 'grid', frequencyCap: 3 },
        { type: 'banner', position: 'top', frequencyCap: 1 }
      ],
      search: [
        { type: 'feed', position: 'top', frequencyCap: 2 },
        { type: 'feed', position: 'middle', frequencyCap: 1 }
      ]
    };

    return placementOptions[feedType] || placementOptions.social;
  }

  /**
   * Validate ad insertion based on frequency caps
   */
  async validateAdFrequency(adId, userId) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const cacheKey = `${userId}_${adId}_${today.toISOString().split('T')[0]}`;
    const frequency = this.adFrequencyCache.get(cacheKey) || 0;
    
    // Get ad's frequency cap
    const ad = await Ad.findById(adId);
    const frequencyCap = ad?.placement?.frequencyCap || 3;
    
    if (frequency >= frequencyCap) {
      return false; // Frequency cap reached
    }
    
    // Update frequency cache
    this.adFrequencyCache.set(cacheKey, frequency + 1);
    
    // Clean up old cache entries after 24 hours
    setTimeout(() => {
      this.adFrequencyCache.delete(cacheKey);
    }, 24 * 60 * 60 * 1000);
    
    return true;
  }

  /**
   * Rotate ads based on performance
   */
  rotateAdsByPerformance(ads) {
    // Simple rotation based on performance metrics
    return ads.sort((a, b) => {
      // Prioritize ads with higher CTR and engagement
      const scoreA = (a.ctr || 0) * 10 + (a.clicks || 0) * 0.1;
      const scoreB = (b.ctr || 0) * 10 + (b.clicks || 0) * 0.1;
      return scoreB - scoreA; // Higher scores first
    });
  }

  /**
   * Get feed with proper ad spacing
   */
  async getFeedWithProperAdSpacing(posts, userId, options = {}) {
    const {
      minAdSpacing = 3, // Minimum posts between ads
      maxAdsPerFeed = 3
    } = options;

    try {
      // Get targeted ads
      const targetedAds = await adTargetingService.getTargetedAds(userId, {
        limit: maxAdsPerFeed,
        placement: 'feed'
      });

      if (!targetedAds || targetedAds.length === 0) {
        return posts;
      }

      // Convert ads to feed format
      const adPosts = await this.convertAdsToFeedFormat(targetedAds, userId);

      // Distribute ads evenly throughout the feed
      const result = [];
      const postCount = posts.length;
      const adCount = Math.min(adPosts.length, maxAdsPerFeed);
      
      if (adCount === 0) {
        return posts;
      }

      // Calculate optimal spacing
      const spacing = Math.max(minAdSpacing, Math.floor(postCount / (adCount + 1)));
      
      let adIndex = 0;
      let postsSinceLastAd = 0;

      for (let i = 0; i < posts.length; i++) {
        // Add an ad if we've reached the spacing threshold and have ads left
        if (postsSinceLastAd >= spacing && adIndex < adCount) {
          result.push(adPosts[adIndex]);
          adIndex++;
          postsSinceLastAd = 0;
        }

        result.push(posts[i]);
        postsSinceLastAd++;
      }

      // Add any remaining ads at the end if space allows
      while (adIndex < adCount && result.length < postCount + adCount) {
        result.push(adPosts[adIndex]);
        adIndex++;
      }

      return result;
    } catch (error) {
      console.error('Error getting feed with proper ad spacing:', error);
      return posts;
    }
  }
}

module.exports = new AdDeliveryService();