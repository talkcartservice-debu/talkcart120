const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateTokenStrict } = require('./auth');
const { Post, User } = require('../models');

// Helper function to get date range
const getDateRange = (timeRange) => {
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  return { startDate, endDate: now };
};

// @route   GET /api/analytics/overview
// @desc    Get analytics overview
// @access  Private (creator-only)
router.get('/overview', authenticateTokenStrict, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;
    const { startDate, endDate } = getDateRange(timeRange);

    // Get user's posts analytics
    const postsAnalytics = await Post.aggregate([
      {
        $match: {
          author: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: { $size: '$likes' } },
          totalShares: { $sum: { $size: '$shares' } },
          totalBookmarks: { $sum: { $size: '$bookmarks' } }
        }
      }
    ]);

    // Get user's follower count
    const user = await User.findById(userId).select('followerCount postCount');

    // Get top performing posts
    const topPosts = await Post.find({
      author: userId,
      createdAt: { $gte: startDate, $lte: endDate }
    })
    .select('content views createdAt')
    .sort({ views: -1 })
    .limit(5)
    .lean();

    // Get previous period for comparison
    const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
    const previousPeriodEnd = startDate;

    const previousAnalytics = await Post.aggregate([
      {
        $match: {
          author: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: { $size: '$likes' } },
          totalShares: { $sum: { $size: '$shares' } }
        }
      }
    ]);

    const currentStats = postsAnalytics[0] || {
      totalPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0,
      totalBookmarks: 0
    };

    const previousStats = previousAnalytics[0] || {
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0
    };

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const analyticsData = {
      overview: {
        totalViews: currentStats.totalViews,
        totalLikes: currentStats.totalLikes,
        totalShares: currentStats.totalShares,
        totalBookmarks: currentStats.totalBookmarks,
        totalFollowers: user?.followerCount || 0,
        totalPosts: user?.postCount || 0,
        viewsChange: calculateChange(currentStats.totalViews, previousStats.totalViews),
        likesChange: calculateChange(currentStats.totalLikes, previousStats.totalLikes),
        sharesChange: calculateChange(currentStats.totalShares, previousStats.totalShares),
        followersChange: 0, // Would need historical data to calculate
      },
      topPosts: topPosts.map(post => ({
        id: post._id,
        title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
        views: post.views,
        createdAt: post.createdAt,
      })),
      engagement: {
        avgViewsPerPost: currentStats.totalPosts > 0 ? Math.round(currentStats.totalViews / currentStats.totalPosts) : 0,
        avgLikesPerPost: currentStats.totalPosts > 0 ? Math.round(currentStats.totalLikes / currentStats.totalPosts) : 0,
        engagementRate: currentStats.totalViews > 0 ? 
          Math.round(((currentStats.totalLikes + currentStats.totalShares) / currentStats.totalViews) * 100 * 100) / 100 : 0
      },
      timeRange,
      period: {
        start: startDate,
        end: endDate
      }
    };

    res.json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      message: error.message,
    });
  }
});

// @route   GET /api/analytics/posts
// @desc    Get detailed post analytics
// @access  Private (creator-only)
router.get('/posts', authenticateTokenStrict, async (req, res) => {
  try {
    const { timeRange = '30d', limit = 20, page = 1 } = req.query;
    const userId = req.user.userId;
    const { startDate, endDate } = getDateRange(timeRange);
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get user's posts with analytics
    const posts = await Post.find({
      author: userId,
      createdAt: { $gte: startDate, $lte: endDate }
    })
    .select('content type views likes shares bookmarks createdAt media')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();
    
    // Get total count
    const total = await Post.countDocuments({
      author: userId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Transform data
    const transformedPosts = posts.map(post => ({
      id: post._id,
      title: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
      type: post.type,
      views: post.views,
      likes: post.likes?.length || 0,
      shares: post.shares?.length || 0,
      bookmarks: post.bookmarks?.length || 0,
      engagementRate: post.views > 0 ? 
        Math.round(((post.likes?.length || 0) + (post.shares?.length || 0)) / post.views * 100 * 100) / 100 : 0,
      createdAt: post.createdAt,
      hasMedia: post.media && post.media.length > 0
    }));

    res.json({
      success: true,
      data: {
        posts: transformedPosts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        timeRange,
        period: {
          start: startDate,
          end: endDate
        }
      },
    });
  } catch (error) {
    console.error('Get post analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get post analytics',
      message: error.message,
    });
  }
});

// @route   GET /api/analytics/engagement
// @desc    Get engagement analytics over time
// @access  Private (creator-only)
router.get('/engagement', authenticateTokenStrict, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.userId;
    const { startDate, endDate } = getDateRange(timeRange);
    
    // Get daily engagement data
    const engagementData = await Post.aggregate([
      {
        $match: {
          author: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          views: { $sum: '$views' },
          likes: { $sum: { $size: '$likes' } },
          shares: { $sum: { $size: '$shares' } },
          posts: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        engagement: engagementData.map(item => ({
          date: item._id,
          views: item.views,
          likes: item.likes,
          shares: item.shares,
          posts: item.posts,
          engagementRate: item.views > 0 ? 
            Math.round((item.likes + item.shares) / item.views * 100 * 100) / 100 : 0
        })),
        timeRange,
        period: {
          start: startDate,
          end: endDate
        }
      },
    });
  } catch (error) {
    console.error('Get engagement analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get engagement analytics',
      message: error.message,
    });
  }
});

// @route   POST /api/analytics/video-performance
// @desc    Track video performance metrics
// @access  Private (creator-only)
router.post('/video-performance', authenticateTokenStrict, async (req, res) => {
  try {
    const { videoId, sessionId, metrics, events } = req.body;
    const userId = req.user.userId;

    // Here you would typically save to a VideoAnalytics collection
    // For now, we'll just acknowledge the data
    console.log('Video performance data received:', {
      videoId,
      sessionId,
      userId,
      metrics,
      eventCount: events?.length || 0
    });

    res.json({
      success: true,
      message: 'Video performance data recorded',
      data: {
        videoId,
        sessionId,
        recordedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Video performance tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record video performance',
      message: error.message,
    });
  }
});

// @route   GET /api/analytics/video/:postId
// @desc    Get video analytics for a specific post
// @access  Private (creator-only)
router.get('/video/:postId', authenticateTokenStrict, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    // Get the post and verify ownership
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Check if post has video content
    const hasVideo = post.media?.some(m => m.resource_type === 'video');
    if (!hasVideo) {
      return res.status(400).json({
        success: false,
        error: 'Post does not contain video content'
      });
    }

    // Generate mock analytics data (in production, this would come from your analytics database)
    const videoAnalytics = {
      views: post.views || 0,
      likes: post.likes?.length || 0,
      comments: 0, // Would need to query Comment model
      shares: post.shares?.length || 0,
      watchTime: Math.floor(Math.random() * 300) + 60, // Mock data
      avgWatchTime: Math.floor(Math.random() * 120) + 30, // Mock data
      completionRate: Math.floor(Math.random() * 40) + 60, // Mock data
      engagement: Math.floor(Math.random() * 30) + 70, // Mock data
      topCountries: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany'],
      viewsByHour: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        views: Math.floor(Math.random() * 50)
      })),
      demographics: {
        ageGroups: [
          { range: '18-24', percentage: 25 },
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 20 },
          { range: '45-54', percentage: 15 },
          { range: '55+', percentage: 5 }
        ],
        gender: [
          { type: 'Male', percentage: 55 },
          { type: 'Female', percentage: 45 }
        ]
      }
    };

    res.json({
      success: true,
      data: {
        postId,
        videoAnalytics,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Get video analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get video analytics',
      message: error.message,
    });
  }
});

// @route   GET /api/analytics/videos
// @desc    Get analytics for all user's videos
// @access  Private (creator-only)
router.get('/videos', authenticateTokenStrict, async (req, res) => {
  try {
    const { timeRange = '30d', limit = 20, page = 1 } = req.query;
    const userId = req.user.userId;
    const { startDate, endDate } = getDateRange(timeRange);
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get user's video posts
    const videoPosts = await Post.find({
      author: userId,
      $or: [
        { type: 'video' },
        { 'media.resource_type': 'video' }
      ],
      createdAt: { $gte: startDate, $lte: endDate }
    })
    .select('content type views likes shares bookmarks createdAt media')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();
    
    // Get total count
    const total = await Post.countDocuments({
      author: userId,
      $or: [
        { type: 'video' },
        { 'media.resource_type': 'video' }
      ],
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Transform data with video-specific analytics
    const transformedVideos = videoPosts.map(post => {
      const videoMedia = post.media?.filter(m => m.resource_type === 'video') || [];
      
      return {
        id: post._id,
        title: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
        thumbnail: videoMedia[0]?.secure_url || null,
        duration: videoMedia[0]?.duration || 0,
        format: videoMedia[0]?.format || 'unknown',
        size: videoMedia[0]?.bytes || 0,
        views: post.views || 0,
        likes: post.likes?.length || 0,
        shares: post.shares?.length || 0,
        comments: 0, // Would need to query Comment model
        engagementRate: post.views > 0 ? 
          Math.round(((post.likes?.length || 0) + (post.shares?.length || 0)) / post.views * 100 * 100) / 100 : 0,
        createdAt: post.createdAt,
        status: 'ready', // Mock status
        visibility: post.privacy || 'public',
        // Mock analytics data
        analytics: {
          watchTime: Math.floor(Math.random() * 300) + 60,
          completionRate: Math.floor(Math.random() * 40) + 60,
          engagement: Math.floor(Math.random() * 30) + 70,
          topCountries: ['US', 'CA', 'UK'],
          deviceTypes: {
            mobile: Math.floor(Math.random() * 40) + 30,
            desktop: Math.floor(Math.random() * 40) + 30,
            tablet: Math.floor(Math.random() * 20) + 10
          }
        }
      };
    });

    res.json({
      success: true,
      data: {
        videos: transformedVideos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        summary: {
          totalVideos: total,
          totalViews: transformedVideos.reduce((sum, v) => sum + v.views, 0),
          totalLikes: transformedVideos.reduce((sum, v) => sum + v.likes, 0),
          totalSize: transformedVideos.reduce((sum, v) => sum + v.size, 0),
          avgWatchTime: transformedVideos.reduce((sum, v) => sum + v.analytics.watchTime, 0) / transformedVideos.length || 0
        },
        timeRange,
        period: {
          start: startDate,
          end: endDate
        }
      },
    });
  } catch (error) {
    console.error('Get video analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get video analytics',
      message: error.message,
    });
  }
});

// @route   GET /api/analytics/public/:identifier/summary
// @desc    Public viewer-safe analytics summary for a creator
//          :identifier can be a Mongo ObjectId (userId) or a username
// @access  Public
router.get('/public/:identifier/summary', async (req, res) => {
  try {
    const { identifier } = req.params;


    // Resolve user by id or username (with validation)
    let userDoc = null;
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      userDoc = await User.findById(identifier).select('username displayName avatar isVerified followerCount postCount');
    }
    // Only allow valid usernames (alphanumeric, underscore, dash, dot, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_\-.]{3,30}$/;
    if (!userDoc && usernameRegex.test(identifier)) {
      userDoc = await User.findOne({ username: identifier }).select('username displayName avatar isVerified followerCount postCount');
    }

    if (!userDoc) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userId = userDoc._id;

    // Run aggregations in parallel for performance
    const [postsAgg, topPosts, streamsAgg, topStreams, donationsAgg] = await Promise.all([
      // Public posts summary
      Post.aggregate([
        {
          $match: {
            author: new mongoose.Types.ObjectId(userId),
            isActive: true,
            privacy: 'public'
          }
        },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            totalViews: { $sum: '$views' },
            totalLikes: { $sum: { $size: { $ifNull: ['$likes', []] } } },
            totalShares: { $sum: { $size: { $ifNull: ['$shares', []] } } },
            totalBookmarks: { $sum: { $size: { $ifNull: ['$bookmarks', []] } } }
          }
        }
      ]),

      // Top public posts by views
      Post.find({
        author: userId,
        isActive: true,
        privacy: 'public'
      })
      .select('content views createdAt')
      .sort({ views: -1 })
      .limit(5)
      .lean(),

      // Streams summary
      Stream.aggregate([
        { $match: { streamerId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalStreams: { $sum: 1 },
            liveNow: { $sum: { $cond: ['$isLive', 1, 0] } },
            totalViews: { $sum: '$totalViews' },
            peakLiveViewers: { $max: '$peakViewerCount' }
          }
        }
      ]),

      // Top streams by total views
      Stream.find({ streamerId: userId })
        .select('title totalViews peakViewerCount category playbackUrl isLive createdAt thumbnail.secure_url')
        .sort({ totalViews: -1 })
        .limit(3)
        .lean(),

      // Donations summary (completed only)
      StreamDonation.aggregate([
        { $match: { streamerId: new mongoose.Types.ObjectId(userId), status: 'completed' } },
        {
          $group: {
            _id: null,
            totalDonationsCount: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            totalNetAmount: { $sum: { $ifNull: ['$netAmount', '$amount'] } }
          }
        }
      ])
    ]);

    const postsStats = postsAgg[0] || {
      totalPosts: 0,
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0,
      totalBookmarks: 0
    };

    const streamsStats = streamsAgg[0] || {
      totalStreams: 0,
      liveNow: 0,
      totalViews: 0,
      peakLiveViewers: 0
    };

    const donationStats = donationsAgg[0] || {
      totalDonationsCount: 0,
      totalAmount: 0,
      totalNetAmount: 0
    };

    const response = {
      user: {
        id: userDoc._id,
        username: userDoc.username,
        displayName: userDoc.displayName || userDoc.username,
        avatar: userDoc.avatar || null,
        isVerified: !!userDoc.isVerified,
        followerCount: userDoc.followerCount || 0,
        postCount: userDoc.postCount || 0
      },
      posts: {
        totalPosts: postsStats.totalPosts,
        totalViews: postsStats.totalViews,
        totalLikes: postsStats.totalLikes,
        totalShares: postsStats.totalShares,
        totalBookmarks: postsStats.totalBookmarks,
        topPosts: (topPosts || []).map(p => ({
          id: p._id,
          title: (p.content || '').substring(0, 50) + ((p.content || '').length > 50 ? '...' : ''),
          views: p.views || 0,
          createdAt: p.createdAt
        }))
      },
      streams: {
        totalStreams: streamsStats.totalStreams,
        liveNow: streamsStats.liveNow,
        totalViews: streamsStats.totalViews,
        peakLiveViewers: streamsStats.peakLiveViewers,
        topStreams: (topStreams || []).map(s => ({
          id: s._id,
          title: s.title,
          totalViews: s.totalViews || 0,
          peakViewerCount: s.peakViewerCount || 0,
          category: s.category || 'Other',
          isLive: !!s.isLive,
          thumbnail: s.thumbnail?.secure_url || null,
          createdAt: s.createdAt
        }))
      },
      donations: {
        totalDonationsCount: donationStats.totalDonationsCount,
        totalAmount: donationStats.totalAmount,
        totalNetAmount: donationStats.totalNetAmount
      }
    };

    return res.json({ success: true, data: response });
  } catch (error) {
    console.error('Public analytics summary error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get public summary', message: error.message });
  }
});

module.exports = router;
