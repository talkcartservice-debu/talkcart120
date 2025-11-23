const express = require('express');
const router = express.Router();
const { User, Post, Product } = require('../models');
const { authenticateToken } = require('./auth');
const mongoose = require('mongoose');
const { Conversation, Message } = require('../models');

// @route   GET /api/search/health
// @desc    Health check for search service
// @access  Public
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Search service is healthy',
    timestamp: new Date().toISOString(),
    features: ['users', 'posts', 'hashtags', 'products', 'global']
  });
});

// @route   GET /api/search
// @desc    Global search across all content types
// @access  Public
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      q: query,
      type = 'all',
      filters = '',
      limit = 10,
      page = 1
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    const searchQuery = query.trim();
    const currentUserId = req.user?.userId;
    const searchFilters = filters ? filters.split(',') : [];
    const pageLimit = Math.min(parseInt(limit), 50);
    const skip = (parseInt(page) - 1) * pageLimit;

    const results = {
      users: [],
      posts: [],
      products: [],
      hashtags: [],
      total: 0
    };

    // Search Users
    if (type === 'all' || type === 'users') {
      const userQuery = {
        isActive: true,
        $or: [
          { username: { $regex: searchQuery, $options: 'i' } },
          { displayName: { $regex: searchQuery, $options: 'i' } },
          { bio: { $regex: searchQuery, $options: 'i' } }
        ]
      };

      const users = await User.find(userQuery)
        .select('username displayName avatar bio isVerified followerCount')
        .sort({ followerCount: -1, createdAt: -1 })
        .limit(type === 'users' ? pageLimit : 5)
        .skip(type === 'users' ? skip : 0);

      results.users = users;
    }

    // Search Posts
    if (type === 'all' || type === 'posts') {
      const postQuery = {
        isActive: true,
        privacy: 'public', // Only public posts in search
        $or: [
          { content: { $regex: searchQuery, $options: 'i' } },
          { hashtags: { $in: [searchQuery.toLowerCase()] } }
        ]
      };

      // Add text search if available
      if (searchQuery.length > 2) {
        postQuery.$text = { $search: searchQuery };
      }

      const posts = await Post.find(postQuery)
        .populate('author', 'username displayName avatar isVerified')
        .sort({ createdAt: -1 })
        .limit(type === 'posts' ? pageLimit : 5)
        .skip(type === 'posts' ? skip : 0);

      results.posts = posts;
    }

    // Search Products
    if (type === 'all' || type === 'products') {
      const productQuery = {
        isActive: true,
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { tags: { $in: [searchQuery.toLowerCase()] } }
        ]
      };

      // Filter by category if specified
      if (searchFilters.includes('category')) {
        productQuery.category = { $regex: searchQuery, $options: 'i' };
      }

      const products = await Product.find(productQuery)
        .populate('vendorId', 'username displayName avatar')
        .sort({ sales: -1, createdAt: -1 })
        .limit(type === 'products' ? pageLimit : 5)
        .skip(type === 'products' ? skip : 0);

      results.products = products;
    }

    // Search Hashtags
    if (type === 'all' || type === 'hashtags') {
      const hashtagQuery = [
        {
          $match: {
            isActive: true,
            privacy: 'public',
            hashtags: { $regex: searchQuery, $options: 'i' }
          }
        },
        { $unwind: '$hashtags' },
        {
          $match: {
            hashtags: { $regex: searchQuery, $options: 'i' }
          }
        },
        {
          $group: {
            _id: '$hashtags',
            count: { $sum: 1 },
            recentPost: { $first: '$$ROOT' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: type === 'hashtags' ? pageLimit : 5 }
      ];

      if (type === 'hashtags' && skip > 0) {
        hashtagQuery.push({ $skip: skip });
      }

      const hashtags = await Post.aggregate(hashtagQuery);
      results.hashtags = hashtags.map(h => ({
        hashtag: h._id,
        count: h.count,
        trending: h.count > 10
      }));
    }

    // Calculate total results
    results.total = results.users.length + results.posts.length + 
                   results.products.length + results.hashtags.length;

    res.json({
      success: true,
      data: results,
      query: searchQuery,
      type,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        hasMore: results.total >= pageLimit
      }
    });

  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

// @route   GET /api/search/users
// @desc    Search users specifically
// @access  Public
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    const searchQuery = query.trim();
    const searchLimit = Math.min(parseInt(limit), 50);

    const users = await User.find({
      isActive: true,
      $or: [
        { username: { $regex: searchQuery, $options: 'i' } },
        { displayName: { $regex: searchQuery, $options: 'i' } },
        { bio: { $regex: searchQuery, $options: 'i' } }
      ]
    })
    .select('username displayName avatar bio isVerified followerCount')
    .sort({ followerCount: -1, createdAt: -1 })
    .limit(searchLimit);

    res.json({
      success: true,
      data: users,
      total: users.length,
      query: searchQuery
    });

  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      success: false,
      error: 'User search failed',
      message: error.message
    });
  }
});

// @route   GET /api/search/posts
// @desc    Search posts specifically
// @access  Public
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    const searchQuery = query.trim();
    const searchLimit = Math.min(parseInt(limit), 50);

    const posts = await Post.find({
      isActive: true,
      privacy: 'public',
      $or: [
        { content: { $regex: searchQuery, $options: 'i' } },
        { hashtags: { $in: [searchQuery.toLowerCase()] } }
      ]
    })
    .populate('author', 'username displayName avatar isVerified')
    .sort({ createdAt: -1 })
    .limit(searchLimit);

    res.json({
      success: true,
      data: posts,
      total: posts.length,
      query: searchQuery
    });

  } catch (error) {
    console.error('Post search error:', error);
    res.status(500).json({
      success: false,
      error: 'Post search failed',
      message: error.message
    });
  }
});

// @route   GET /api/search/hashtags
// @desc    Search hashtags specifically
// @access  Public
router.get('/hashtags', authenticateToken, async (req, res) => {
  try {
    const { q: query, limit = 20 } = req.query;

    if (!query || query.trim().length < 1) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchQuery = query.trim().toLowerCase();
    const searchLimit = Math.min(parseInt(limit), 50);

    const hashtags = await Post.aggregate([
      {
        $match: {
          isActive: true,
          privacy: 'public',
          hashtags: { $regex: searchQuery, $options: 'i' }
        }
      },
      { $unwind: '$hashtags' },
      {
        $match: {
          hashtags: { $regex: searchQuery, $options: 'i' }
        }
      },
      {
        $group: {
          _id: '$hashtags',
          count: { $sum: 1 },
          lastUsed: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1, lastUsed: -1 } },
      { $limit: searchLimit },
      {
        $project: {
          hashtag: '$_id',
          count: 1,
          lastUsed: 1,
          trending: { $gt: ['$count', 5] },
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      data: hashtags,
      total: hashtags.length,
      query: searchQuery
    });

  } catch (error) {
    console.error('Hashtag search error:', error);
    res.status(500).json({
      success: false,
      error: 'Hashtag search failed',
      message: error.message
    });
  }
});

// @route   GET /api/search/products
// @desc    Search products specifically
// @access  Public
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const { 
      q: query, 
      category,
      minPrice,
      maxPrice,
      limit = 20 
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    const searchQuery = query.trim();
    const searchLimit = Math.min(parseInt(limit), 50);

    let productQuery = {
      isActive: true,
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { tags: { $in: [searchQuery.toLowerCase()] } }
      ]
    };

    // Add category filter
    if (category) {
      productQuery.category = category;
    }

    // Add price range filter
    if (minPrice || maxPrice) {
      productQuery.price = {};
      if (minPrice) productQuery.price.$gte = parseFloat(minPrice);
      if (maxPrice) productQuery.price.$lte = parseFloat(maxPrice);
    }

    const products = await Product.find(productQuery)
      .populate('vendorId', 'username displayName avatar isVerified')
      .sort({ sales: -1, rating: -1, createdAt: -1 })
      .limit(searchLimit);

    res.json({
      success: true,
      data: products,
      total: products.length,
      query: searchQuery,
      filters: { category, minPrice, maxPrice }
    });

  } catch (error) {
    console.error('Product search error:', error);
    res.status(500).json({
      success: false,
      error: 'Product search failed',
      message: error.message
    });
  }
});

// @route   GET /api/search/messages
// @desc    Search messages across all conversations for the authenticated user
// @access  Private
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const { q: query, limit = 20, page = 1 } = req.query;
    const userId = req.user?.userId;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const searchQuery = query.trim();
    const searchLimit = Math.min(parseInt(limit), 50);
    const skip = (parseInt(page) - 1) * searchLimit;

    // First, find all conversations the user is a participant in
    const userConversations = await Conversation.find({
      participants: userId,
      isActive: true
    }).select('_id');

    const conversationIds = userConversations.map(conv => conv._id);

    // Search messages in those conversations
    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      content: { $regex: searchQuery, $options: 'i' },
      isDeleted: false
    })
    .populate({
      path: 'senderId',
      select: 'username displayName avatar isVerified'
    })
    .populate({
      path: 'conversationId',
      select: 'participants isGroup groupName',
      populate: {
        path: 'participants',
        select: 'username displayName avatar isVerified'
      }
    })
    .sort({ createdAt: -1 })
    .limit(searchLimit)
    .skip(skip)
    .lean();

    // Transform messages to include conversation info
    const transformedMessages = messages.map(message => {
      // Get conversation name
      let conversationName = 'Unknown';
      if (message.conversationId) {
        if (message.conversationId.isGroup && message.conversationId.groupName) {
          conversationName = message.conversationId.groupName;
        } else {
          // For direct messages, find the other participant
          const otherParticipant = message.conversationId.participants?.find(
            p => p._id.toString() !== userId
          );
          if (otherParticipant) {
            conversationName = otherParticipant.displayName || otherParticipant.username || 'Unknown';
          }
        }
      }

      return {
        id: message._id.toString(),
        content: message.content,
        type: message.type,
        senderId: message.senderId?._id.toString(),
        conversationId: message.conversationId?._id.toString(),
        createdAt: message.createdAt,
        isEdited: message.isEdited,
        isDeleted: message.isDeleted,
        isForwarded: message.isForwarded,
        media: message.media,
        sender: message.senderId ? {
          id: message.senderId._id.toString(),
          username: message.senderId.username,
          displayName: message.senderId.displayName,
          avatar: message.senderId.avatar,
          isVerified: message.senderId.isVerified
        } : null,
        conversation: {
          id: message.conversationId?._id.toString(),
          name: conversationName,
          isGroup: message.conversationId?.isGroup || false
        }
      };
    });

    // Get total count
    const total = await Message.countDocuments({
      conversationId: { $in: conversationIds },
      content: { $regex: searchQuery, $options: 'i' },
      isDeleted: false
    });

    res.json({
      success: true,
      data: {
        messages: transformedMessages,
        total,
        query: searchQuery,
        pagination: {
          page: parseInt(page),
          limit: searchLimit,
          hasMore: skip + transformedMessages.length < total
        }
      }
    });

  } catch (error) {
    console.error('Global message search error:', error);
    res.status(500).json({
      success: false,
      error: 'Message search failed',
      message: error.message
    });
  }
});

// @route   GET /api/search/suggestions
// @desc    Get search suggestions/autocomplete
// @access  Public
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { q: query, type = 'all' } = req.query;

    if (!query || query.trim().length < 1) {
      return res.json({
        success: true,
        data: {
          users: [],
          hashtags: [],
          products: []
        }
      });
    }

    const searchQuery = query.trim();
    const suggestions = {
      users: [],
      hashtags: [],
      products: []
    };

    // User suggestions
    if (type === 'all' || type === 'users') {
      const users = await User.find({
        isActive: true,
        username: { $regex: `^${searchQuery}`, $options: 'i' }
      })
      .select('username displayName avatar')
      .sort({ followerCount: -1 })
      .limit(5);

      suggestions.users = users;
    }

    // Hashtag suggestions
    if (type === 'all' || type === 'hashtags') {
      const recentHashtags = await Post.aggregate([
        {
          $match: {
            isActive: true,
            privacy: 'public',
            hashtags: { $regex: `^${searchQuery.toLowerCase()}`, $options: 'i' },
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
          }
        },
        { $unwind: '$hashtags' },
        {
          $match: {
            hashtags: { $regex: `^${searchQuery.toLowerCase()}`, $options: 'i' }
          }
        },
        {
          $group: {
            _id: '$hashtags',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      suggestions.hashtags = recentHashtags.map(h => ({
        hashtag: h._id,
        count: h.count
      }));
    }

    // Product suggestions
    if (type === 'all' || type === 'products') {
      const products = await Product.find({
        isActive: true,
        name: { $regex: `^${searchQuery}`, $options: 'i' }
      })
      .select('name category price images')
      .sort({ sales: -1 })
      .limit(5);

      suggestions.products = products;
    }

    res.json({
      success: true,
      data: suggestions,
      query: searchQuery
    });

  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
      message: error.message
    });
  }
});

module.exports = router;

