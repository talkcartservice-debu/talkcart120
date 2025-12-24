const { Ad, AdSet, User, TrackingEvent, ProductPost } = require('../models');
const { Post } = require('../models');

class AdTargetingService {
  constructor() {
    this.targetingCache = new Map();
    this.userProfilesCache = new Map();
  }

  /**
   * Get targeted ads for a user based on their profile and behavior
   */
  async getTargetedAds(userId, options = {}) {
    try {
      const {
        limit = 5,
        feedType = 'social',
        placement = 'feed',
        excludeAdIds = []
      } = options;

      // Get user profile data
      const userProfile = await this.getUserProfile(userId);
      
      // Get active ad sets that match user's profile
      const matchingAdSets = await this.getMatchingAdSets(userProfile, options);
      
      // Get ads from matching ad sets
      const candidateAds = await this.getCandidateAds(matchingAdSets, {
        excludeAdIds,
        placement
      });

      // Score and rank ads based on relevance
      const scoredAds = await this.scoreAds(candidateAds, userProfile);
      
      // Sort by score and return top ads
      const sortedAds = scoredAds
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return sortedAds.map(item => item.ad);
    } catch (error) {
      console.error('Error in getTargetedAds:', error);
      throw error;
    }
  }

  /**
   * Get user profile for targeting purposes
   */
  async getUserProfile(userId) {
    // Check cache first
    if (this.userProfilesCache.has(userId)) {
      return this.userProfilesCache.get(userId);
    }

    try {
      // Get user basic information
      const user = await User.findById(userId).select('username displayName avatar isVerified role location').lean();
      
      // Get user behavior from tracking events
      const recentEvents = await TrackingEvent.find({
        userId: userId,
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      })
      .sort({ timestamp: -1 })
      .limit(1000)
      .lean();

      // Get user's recent posts and interactions
      const userPosts = await Post.find({
        author: userId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
      .select('content hashtags type media')
      .limit(50)
      .lean();

      // Get user's followed interests
      const userInterests = await this.extractUserInterests(userPosts, recentEvents);

      // Get user's device and location data
      const deviceData = await this.extractDeviceData(recentEvents);
      const locationData = await this.extractLocationData(recentEvents);

      const profile = {
        userId,
        user,
        interests: userInterests,
        device: deviceData,
        location: locationData,
        behavior: await this.analyzeUserBehavior(recentEvents),
        demographics: await this.extractDemographics(user)
      };

      // Cache for 1 hour
      this.userProfilesCache.set(userId, profile);
      setTimeout(() => this.userProfilesCache.delete(userId), 3600000);

      return profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { userId, interests: [], behavior: {} };
    }
  }

  /**
   * Extract user interests from their posts and events
   */
  async extractUserInterests(posts, events) {
    const interests = new Set();
    
    // Extract from post content and hashtags
    posts.forEach(post => {
      if (post.hashtags) {
        post.hashtags.forEach(tag => interests.add(tag.toLowerCase()));
      }
      
      if (post.content) {
        // Extract potential interests from content
        const content = post.content.toLowerCase();
        const potentialInterests = content.match(/\b\w{4,}\b/g) || [];
        potentialInterests.forEach(interest => interests.add(interest));
      }
    });

    // Extract from tracking events
    events.forEach(event => {
      if (event.properties && event.properties.category) {
        interests.add(event.properties.category.toLowerCase());
      }
      if (event.properties && event.properties.product) {
        interests.add(event.properties.product.toLowerCase());
      }
    });

    return Array.from(interests).slice(0, 50); // Limit to 50 interests
  }

  /**
   * Extract device data from tracking events
   */
  async extractDeviceData(events) {
    const devices = {};
    const deviceTypes = new Set();
    
    events.forEach(event => {
      if (event.device) {
        if (event.device.type) {
          deviceTypes.add(event.device.type);
        }
        if (event.device.browser) {
          devices.browser = event.device.browser;
        }
        if (event.device.os) {
          devices.os = event.device.os;
        }
      }
    });

    return {
      types: Array.from(deviceTypes),
      browser: devices.browser,
      os: devices.os
    };
  }

  /**
   * Extract location data from tracking events
   */
  async extractLocationData(events) {
    const locations = new Set();
    
    events.forEach(event => {
      if (event.location) {
        if (event.location.country) {
          locations.add(event.location.country);
        }
        if (event.location.city) {
          locations.add(event.location.city);
        }
      }
    });

    return Array.from(locations);
  }

  /**
   * Analyze user behavior patterns
   */
  async analyzeUserBehavior(events) {
    const behavior = {
      engagement: {
        clicks: 0,
        views: 0,
        conversions: 0
      },
      preferences: {
        contentTypes: {},
        timeOfDay: {},
        dayOfWeek: {}
      },
      recency: 0
    };

    events.forEach(event => {
      // Count engagement types
      switch (event.eventType) {
        case 'click':
          behavior.engagement.clicks++;
          break;
        case 'impression':
          behavior.engagement.views++;
          break;
        case 'conversion':
        case 'purchase':
          behavior.engagement.conversions++;
          break;
      }

      // Track content preferences
      if (event.properties && event.properties.contentType) {
        behavior.preferences.contentTypes[event.properties.contentType] = 
          (behavior.preferences.contentTypes[event.properties.contentType] || 0) + 1;
      }

      // Track time patterns
      const date = new Date(event.timestamp);
      const hour = date.getHours();
      const day = date.getDay();
      
      behavior.preferences.timeOfDay[hour] = (behavior.preferences.timeOfDay[hour] || 0) + 1;
      behavior.preferences.dayOfWeek[day] = (behavior.preferences.dayOfWeek[day] || 0) + 1;
    });

    // Calculate recency (days since last activity)
    if (events.length > 0) {
      const lastEvent = events[0]; // Most recent event
      behavior.recency = Math.floor((Date.now() - lastEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24));
    }

    return behavior;
  }

  /**
   * Extract demographic information
   */
  async extractDemographics(user) {
    // In a real system, this would come from user profile data
    return {
      ageRange: '25-34', // Placeholder
      gender: 'unknown', // Placeholder
      location: user.location || null
    };
  }

  /**
   * Get ad sets that match user profile
   */
  async getMatchingAdSets(userProfile, options = {}) {
    const { feedType = 'social', placement = 'feed' } = options;
    
    try {
      // Build query based on user profile
      const query = {
        status: 'active',
        scheduledStart: { $lte: new Date() },
        scheduledEnd: { $gte: new Date() },
        'targeting.ageMin': { $lte: 30 }, // Placeholder age
        'targeting.ageMax': { $gte: 30 },
        $or: [
          { 'targeting.genders': 'all' },
          { 'targeting.genders': userProfile.demographics.gender }
        ]
      };

      // Geographic targeting
      if (userProfile.location.length > 0) {
        query.$or = query.$or || [];
        query.$or.push({
          'targeting.locations': {
            $elemMatch: {
              $or: userProfile.location.map(loc => ({
                $or: [
                  { country: loc },
                  { city: loc }
                ]
              }))
            }
          }
        });
      }

      // Interest targeting
      if (userProfile.interests.length > 0) {
        query.$or = query.$or || [];
        query.$or.push({
          'targeting.interests': {
            $elemMatch: {
              name: { $in: userProfile.interests }
            }
          }
        });
      }

      // Device targeting
      if (userProfile.device.types.length > 0) {
        query.$or = query.$or || [];
        query.$or.push({
          'targeting.deviceTypes': { $in: userProfile.device.types }
        });
      }

      // Get matching ad sets
      const adSets = await AdSet.find(query)
        .populate('campaignId', 'name advertiserId status')
        .populate('advertiserId', 'username displayName isVerified')
        .limit(100);

      return adSets;
    } catch (error) {
      console.error('Error getting matching ad sets:', error);
      return [];
    }
  }

  /**
   * Get candidate ads from matching ad sets
   */
  async getCandidateAds(adSets, options = {}) {
    const { excludeAdIds = [], placement = 'feed' } = options;
    
    if (adSets.length === 0) {
      return [];
    }

    const adSetIds = adSets.map(adSet => adSet._id);
    
    try {
      const query = {
        adSetId: { $in: adSetIds },
        status: 'active',
        scheduledStart: { $lte: new Date() },
        scheduledEnd: { $gte: new Date() },
        ...(excludeAdIds.length > 0 && { _id: { $nin: excludeAdIds } })
      };

      // Filter by placement if specified
      if (placement) {
        query['placement.type'] = placement;
      }

      const ads = await Ad.find(query)
        .populate('advertiserId', 'username displayName isVerified')
        .populate('campaignId', 'name objective')
        .populate('adSetId', 'name targeting');

      return ads;
    } catch (error) {
      console.error('Error getting candidate ads:', error);
      return [];
    }
  }

  /**
   * Score ads based on relevance to user
   */
  async scoreAds(ads, userProfile) {
    return Promise.all(ads.map(async (ad) => {
      let score = 0;

      // Content relevance based on interests
      if (ad.creative && ad.creative.description) {
        const description = ad.creative.description.toLowerCase();
        const matchedInterests = userProfile.interests.filter(interest => 
          description.includes(interest)
        );
        score += matchedInterests.length * 10;
      }

      // Geographic relevance
      if (ad.targeting && ad.targeting.locations) {
        const matchedLocations = ad.targeting.locations.filter(location => 
          userProfile.location.includes(location.country) || 
          userProfile.location.includes(location.city)
        );
        score += matchedLocations.length * 15;
      }

      // Demographic relevance
      if (ad.targeting) {
        // Age relevance
        const userAge = 30; // Placeholder
        if (userAge >= ad.targeting.ageMin && userAge <= ad.targeting.ageMax) {
          score += 10;
        }

        // Gender relevance
        if (ad.targeting.genders.includes('all') || 
            ad.targeting.genders.includes(userProfile.demographics.gender)) {
          score += 10;
        }
      }

      // Behavioral relevance
      if (ad.targeting && ad.targeting.behaviors) {
        const matchedBehaviors = ad.targeting.behaviors.filter(behavior => 
          userProfile.behavior.preferences.contentTypes[behavior]
        );
        score += matchedBehaviors.length * 5;
      }

      // Performance-based scoring
      if (ad.ctr) {
        score += ad.ctr * 2; // Higher CTR gets higher score
      }

      // Recency boost for new ads
      const daysSinceCreated = Math.floor((Date.now() - ad.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCreated < 7) {
        score += 5; // New ads get a boost
      }

      // Budget consideration - ads with more budget get higher priority
      if (ad.budget > 0) {
        score += Math.min(ad.budget / 100, 20); // Cap at 20 points
      }

      // Campaign performance consideration
      const campaign = await ad.populate('campaignId');
      if (campaign.campaignId && campaign.campaignId.ctr) {
        score += campaign.campaignId.ctr;
      }

      return {
        ad,
        score
      };
    }));
  }

  /**
   * Get lookalike audiences based on user behavior
   */
  async getLookalikeAudiences(seedUserId, count = 1000) {
    try {
      // Get seed user's profile
      const seedProfile = await this.getUserProfile(seedUserId);
      
      // Find users with similar interests and behavior
      const similarUsers = await User.find({
        _id: { $ne: seedUserId },
        // Additional filtering logic would go here
      })
      .limit(count)
      .select('_id');

      return similarUsers.map(user => user._id);
    } catch (error) {
      console.error('Error getting lookalike audiences:', error);
      return [];
    }
  }

  /**
   * Get retargeting audiences for a user
   */
  async getRetargetingAudiences(userId, options = {}) {
    const {
      daysBack = 30,
      eventType = 'view',
      minFrequency = 1
    } = options;

    try {
      // Get users who viewed/interacted with the same content
      const events = await TrackingEvent.find({
        userId: userId,
        eventType: eventType,
        timestamp: { $gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000) }
      })
      .select('sourceId sourceType')
      .limit(100);

      // Get other users who interacted with the same content
      const retargetingUsers = new Set();
      for (const event of events) {
        const similarEvents = await TrackingEvent.find({
          sourceId: event.sourceId,
          sourceType: event.sourceType,
          eventType: eventType,
          userId: { $ne: userId }
        })
        .select('userId')
        .limit(1000);

        similarEvents.forEach(event => {
          retargetingUsers.add(event.userId.toString());
        });
      }

      return Array.from(retargetingUsers);
    } catch (error) {
      console.error('Error getting retargeting audiences:', error);
      return [];
    }
  }

  /**
   * Update user interest profile
   */
  async updateUserInterest(userId, interest, weight = 1) {
    try {
      const userProfile = await this.getUserProfile(userId);
      
      // Update user's interest in the database
      // In a real system, this would update a user interests collection
      console.log(`Updating interest for user ${userId}: ${interest} with weight ${weight}`);
      
      // Clear cache to refresh profile
      this.userProfilesCache.delete(userId);
    } catch (error) {
      console.error('Error updating user interest:', error);
    }
  }

  /**
   * Get trending topics for ad targeting
   */
  async getTrendingTopics(limit = 20) {
    try {
      // Get trending hashtags from recent posts
      const recentPosts = await Post.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      })
      .select('hashtags')
      .limit(10000);

      // Count hashtag frequencies
      const hashtagCount = {};
      recentPosts.forEach(post => {
        if (post.hashtags) {
          post.hashtags.forEach(tag => {
            hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
          });
        }
      });

      // Sort and return top hashtags
      const trending = Object.entries(hashtagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));

      return trending;
    } catch (error) {
      console.error('Error getting trending topics:', error);
      return [];
    }
  }

  /**
   * Get audience insights
   */
  async getAudienceInsights(adSetId) {
    try {
      const adSet = await AdSet.findById(adSetId).populate('targeting.customAudiences');
      
      if (!adSet) {
        return null;
      }

      // Get engagement data for this ad set
      const engagementEvents = await TrackingEvent.find({
        sourceId: adSetId,
        sourceType: 'AdSet'
      });

      const insights = {
        audienceSize: adSet.targeting.customAudiences ? adSet.targeting.customAudiences.length : 0,
        engagementRate: engagementEvents.length > 0 ? 
          engagementEvents.filter(e => ['click', 'like', 'comment', 'share'].includes(e.eventType)).length / engagementEvents.length * 100 : 0,
        topInterests: [],
        demographicBreakdown: {},
        geographicDistribution: {}
      };

      return insights;
    } catch (error) {
      console.error('Error getting audience insights:', error);
      return null;
    }
  }
}

module.exports = new AdTargetingService();