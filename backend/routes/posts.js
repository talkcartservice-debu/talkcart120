const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config/config');
const { Post, User, Comment, Follow, Share, Notification } = require('../models');
const { authenticateToken } = require('./auth');
const { getVideoThumbnail } = require('../config/cloudinary');
const NotificationService = require('../services/notificationService');
const fs = require('fs');
const path = require('path');

// Helper: attempt to resolve local /uploads URLs to files with known extensions
// and fall back to a placeholder when nothing matches.
const resolveLocalUploadUrl = (url) => {
  try {
    if (!url || typeof url !== 'string') return url;

    // Only operate on local uploads paths (either absolute /uploads/... or localhost URLs)
    const uploadsToken = '/uploads/';
    if (!url.includes(uploadsToken)) return url;

    // Fix duplicate vetora path issue first
    if (url.includes('/uploads/vetora/vetora/')) {
      url = url.replace(/\/uploads\/vetora\/vetora\//g, '/uploads/vetora/');
    }

    // Extract the relative path after /uploads/
    const rel = url.split(uploadsToken).pop();
    if (!rel) return url;

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const candidatePath = path.normalize(path.join(uploadsDir, path.basename(rel)));

    // If file already exists (maybe had an extension) return original URL
    if (fs.existsSync(candidatePath)) return url;

    // Try to find a matching filename with a known extension in the same directory
    const allowedExts = ['.mp4', '.mp4v', '.webm', '.ogg', '.mov', '.mkv', '.avi', '.flv', '.mp3', '.wav', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const dir = path.dirname(candidatePath);
    const base = path.basename(candidatePath).toLowerCase();
    if (!fs.existsSync(dir)) return url;

    const candidates = fs.readdirSync(dir);
    const match = candidates.find(f => {
      const lower = f.toLowerCase();
      // exact match
      if (lower === base) return true;
      const ext = path.extname(lower);
      if (!ext) return false;
      return lower === `${base}${ext}` && allowedExts.includes(ext);
    });

    if (match) {
      // Preserve host prefix if present in URL
      if (url.startsWith('http')) {
        const idx = url.indexOf(uploadsToken);
        const prefix = url.substring(0, idx);
        return `${prefix}${uploadsToken}${match}`;
      }
      return `${uploadsToken}${match}`;
    }

    // If nothing matched, attempt a safe fallback to proper placeholder files
    try {
      // Determine if this should be an image or video placeholder based on the filename
      const isVideo = base.includes('.mp4') || base.includes('.mov') || base.includes('.webm') || 
                     base.includes('.ogg') || base.includes('.avi') || base.includes('.mkv');
      
      // Use proper placeholder files from the backend uploads directory
      const placeholderFile = isVideo ? 'placeholder-video.mp4' : 'placeholder-image.jpg';
      const placeholderPath = path.join(uploadsDir, 'vetora', placeholderFile);
      
      if (fs.existsSync(placeholderPath)) {
        // Preserve host prefix if present in URL
        if (url.startsWith('http')) {
          const idx = url.indexOf(uploadsToken);
          const prefix = url.substring(0, idx);
          return `${prefix}${uploadsToken}vetora/${placeholderFile}`;
        }
        return `${uploadsToken}vetora/${placeholderFile}`;
      }
    } catch (e) {
      // ignore placeholder resolution errors
    }

    return url;
  } catch (err) {
    console.error('Error resolving local upload URL:', err);
    return url;
  }
};

const normalizeMediaUrls = (mediaArray) => {
  if (!Array.isArray(mediaArray)) return mediaArray || [];
  return mediaArray.map(item => {
    try {
      // Preserve Cloudinary URLs as they are - they should be valid as-is
      const secure_url = item.secure_url || item.url || '';
      const regular_url = item.url || item.secure_url || '';
      
      // If this is a Cloudinary URL, don't modify it
      if (secure_url && secure_url.includes('cloudinary.com')) {
        return {
          ...item,
          url: regular_url,
          secure_url: secure_url,
        };
      }
      
      const originalUrl = secure_url;
      const resolved = resolveLocalUploadUrl(originalUrl);
      
      // Fix duplicate vetora path issue
      let fixedUrl = resolved || item.url || '';
      if (fixedUrl.includes('/uploads/vetora/vetora/')) {
        fixedUrl = fixedUrl.replace(/\/uploads\/vetora\/vetora\//g, '/uploads/vetora/');
      }
      
      // Convert HTTP to HTTPS for secure connections (except localhost)
      let secureUrl = fixedUrl;
      let regularUrl = fixedUrl;
      
      // Only convert to HTTPS in production, not in development with localhost
      if (secureUrl && secureUrl.startsWith('http://') && !secureUrl.includes('localhost:')) {
        secureUrl = secureUrl.replace('http://', 'https://');
      }
      
      if (regularUrl && regularUrl.startsWith('http://') && !regularUrl.includes('localhost:')) {
        regularUrl = regularUrl.replace('http://', 'https://');
      }
      
      // If resolved is a relative /uploads/... path and original was not absolute,
      // keep as-is; otherwise, set both url and secure_url to resolved so frontend
      // can use either field interchangeably.
      return {
        ...item,
        url: regularUrl,
        secure_url: item.secure_url || secureUrl,
      };
    } catch (e) {
      return item;
    }
  });
};

// Helper function to get Socket.IO instance
const getIo = (req) => req.app.get('io');

// MongoDB-only post management

// Add health check endpoint at the top
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Posts service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Add enhanced endpoint for better post fetching
router.get('/enhanced', async (req, res) => {
  try {
    console.log('GET /api/posts/enhanced - Request received');
    console.log('Query params:', req.query);
    
    // Extract query parameters
    const {
      feedType = 'for-you',
      limit = 20,
      page = 1,
      contentType = 'all',
      authorId,
      hashtag,
      search
    } = req.query;
    
    // Get current user ID if authenticated
    const rawUserId = req.user ? (req.user.userId || req.user.id) : null;
    const currentUserId = (rawUserId && rawUserId !== 'anonymous-user' && mongoose.Types.ObjectId.isValid(String(rawUserId)))
      ? String(rawUserId)
      : null;
    
    console.log('Current user ID:', currentUserId);
    
    // Base query - always include active posts
    let query = { isActive: true };
    
    // Apply feed type specific filters
    switch (feedType) {
      case 'following':
        if (currentUserId) {
          console.log('Fetching following feed for user:', currentUserId);
          const followingIds = await Follow.getFollowingIds(currentUserId);
          console.log('Following IDs:', followingIds);
          
          // Include posts from followed users and own posts
          const authorIds = [...followingIds, currentUserId];
          query.author = { $in: authorIds };
        } else {
          // Not authenticated: show all public posts
          query.privacy = 'public';
        }
        break;
        
      case 'recent':
        // Recent feed: show all public posts
        query.privacy = 'public';
        break;
        
      case 'trending':
        // Trending feed: show popular public posts only
        query.privacy = 'public';
        // Add date filter for trending (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: weekAgo };
        break;
        
      case 'for-you':
      default:
        // For-you feed: personalized content
        if (currentUserId) {
          const followingIds = await Follow.getFollowingIds(currentUserId);
          
          query.$or = [
            { privacy: 'public' },
            { privacy: 'followers', author: { $in: followingIds } },
            { author: currentUserId } // Always show own posts
          ];
        } else {
          // Not authenticated: only show public posts
          query.privacy = 'public';
        }
        break;
    }
    
    // Filter by specific author
    if (authorId) {
      query.author = authorId;
    }
    
    // Filter by content type
    if (contentType !== 'all') {
      query.type = contentType;
    }
    
    // Filter by hashtag
    if (hashtag) {
      query.hashtags = { $in: [hashtag.toLowerCase()] };
    }
    
    // Search functionality
    if (search) {
      const searchString = String(search).trim();
      if (searchString.length) {
        query.$text = { $search: searchString };
      }
    }
    
    console.log('Final query:', JSON.stringify(query, null, 2));
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch posts with proper population
    const posts = await Post.find(query)
      .populate('author', 'username displayName avatar isVerified bio role followerCount location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    console.log(`Found ${posts.length} posts`);
    
    // Get total count for pagination
    const total = await Post.countDocuments(query);
    console.log('Total posts:', total);
    
    // Enhance posts with additional data
    const enhancedPosts = await Promise.all(posts.map(async (post) => {
      // Count comments for this post
      const commentCount = await Comment.countDocuments({ 
        post: post._id, 
        isActive: true 
      });
      
      // Ensure media array is properly structured
      const media = Array.isArray(post.media) ? post.media.map(mediaItem => ({
        ...mediaItem,
        id: mediaItem._id || mediaItem.public_id,
        secure_url: mediaItem.secure_url || mediaItem.url,
        resource_type: mediaItem.resource_type || 'image',
        url: mediaItem.url || mediaItem.secure_url,i
      })) : [];
      
      // Ensure author object is properly structured
      const author = post.author ? {
        ...post.author,
        id: post.author._id,
        name: post.author.displayName || post.author.username,
      } : null;
      
      return {
        ...post,
        id: post._id,
        authorId: post.author ? post.author._id : null,
        author,
        media,
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
        likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
        commentCount: commentCount,
        shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
        bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
        likes: Array.isArray(post.likes) ? post.likes.length : 0,
        shares: Array.isArray(post.shares) ? post.shares.length : 0,
        bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
        comments: commentCount,
        hideLikes: post.hideLikes || false,
        hideComments: post.hideComments || false,
      };
    }));
    
    res.json({
      success: true,
      data: {
        posts: enhancedPosts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        feedType,
      },
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get posts',
      message: error.message,
    });
  }
});

// @route   GET /api/posts
// @desc    Get all posts with proper privacy filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/posts - Request received');
    console.log('Query params:', req.query);
    
    // Extract query parameters
    const {
      feedType = 'for-you',
      limit = 20,
      page = 1,
      contentType = 'all',
      authorId,
      hashtag,
      search
    } = req.query;
    
    // Get current user ID if authenticated and valid
    const rawUserId = req.user ? (req.user.userId || req.user.id) : null;
    const currentUserId = (rawUserId && rawUserId !== 'anonymous-user' && mongoose.Types.ObjectId.isValid(String(rawUserId)))
      ? String(rawUserId)
      : null;
    
    // Base query - always include active posts
    let query = { isActive: true };
    
    // Privacy filtering based on user authentication and feed type
    if (feedType === 'following' && currentUserId) {
      // Following feed: get posts from users the current user follows + their own posts
      const followingIds = await Follow.getFollowingIds(currentUserId);
      
      // Include posts from followed users and own posts
      const authorIds = [...followingIds, currentUserId];
      
      query.$and = [
        { author: { $in: authorIds } },
        {
          $or: [
            { privacy: 'public' },
            { privacy: 'followers', author: { $in: followingIds } },
            { author: currentUserId } // Always show own posts
          ]
        }
      ];
    } else if (feedType === 'recent') {
      // Recent feed: show all public posts + posts from followed users (most inclusive)
      if (currentUserId) {
        const followingIds = await Follow.getFollowingIds(currentUserId);
        
        query.$or = [
          { privacy: 'public' }, // All public posts from everyone
          { privacy: 'followers', author: { $in: followingIds } }, // Followers posts from people you follow
          { author: currentUserId } // Always show own posts
        ];
      } else {
        // Not authenticated: show all public posts
        query.privacy = 'public';
      }
    } else if (feedType === 'trending') {
      // Trending feed: show popular public posts only
      query.privacy = 'public';
      // Add date filter for trending (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: weekAgo };
    } else {
      // For-you feed: personalized content
      if (currentUserId) {
        const followingIds = await Follow.getFollowingIds(currentUserId);
        
        query.$or = [
          { privacy: 'public' },
          { privacy: 'followers', author: { $in: followingIds } },
          { author: currentUserId } // Always show own posts
        ];
      } else {
        // Not authenticated: only show public posts
        query.privacy = 'public';
      }
    }
    
    // Filter by specific author (for profile pages)
    if (authorId) {
      // When viewing someone's profile, respect privacy settings
      if (currentUserId && currentUserId.toString() === authorId.toString()) {
        // Own profile: show all posts
        query = { isActive: true, author: authorId };
      } else if (currentUserId) {
        // Other's profile: check if following
        const { Follow } = require('../models');
        const isFollowing = await Follow.isFollowing(currentUserId, authorId);
        
        query = {
          isActive: true,
          author: authorId,
          $or: [
            { privacy: 'public' },
            ...(isFollowing ? [{ privacy: 'followers' }] : [])
          ]
        };
      } else {
        // Not authenticated: only public posts
        query = { isActive: true, author: authorId, privacy: 'public' };
      }
    }

    // Filter by content type
    if (contentType !== 'all') {
      query.type = contentType;
    }

    // Filter by hashtag
    if (hashtag) {
      query.hashtags = { $in: [hashtag.toLowerCase()] };
    }

    // Search functionality using MongoDB $text for content/hashtags
    if (search) {
      const searchString = String(search).trim();
      if (searchString.length) {
        const textClause = { $text: { $search: searchString } };
        if (query.$and) {
          query.$and.push(textClause);
        } else {
          query = { $and: [query, textClause] };
        }
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get posts based on feed type with proper sorting
    let posts;
    let sortCriteria;
    
    switch (feedType) {
      case 'trending':
        // Sort by engagement metrics for trending
        sortCriteria = { 
          views: -1,
          createdAt: -1
        };
        break;
      case 'following':
        // Sort by recency for following feed
        sortCriteria = { createdAt: -1 };
        break;
      case 'recent':
        // Sort by recency for recent feed
        sortCriteria = { createdAt: -1 };
        break;
      default:
        // For-you feed: mix of engagement and recency
        sortCriteria = { 
          createdAt: -1
        };
    }
    
    console.log('Query:', JSON.stringify(query, null, 2));
    console.log('Sort criteria:', JSON.stringify(sortCriteria, null, 2));
    console.log('Limit:', parseInt(limit), 'Skip:', skip);
    
    // Prefer $text score sort when using text search
    const isTextSearch = !!(
      (query.$and && query.$and.some(clause => clause.$text)) ||
      (query.$or && query.$or.some(clause => clause.$text))
    );

    posts = await Post.find(query, isTextSearch ? { score: { $meta: 'textScore' } } : undefined)
      .populate('author', 'username displayName avatar isVerified bio role followerCount location')
      .sort(isTextSearch ? { score: { $meta: 'textScore' }, createdAt: -1 } : sortCriteria)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count for pagination
    const total = await Post.countDocuments(query);

    console.log(`Found ${posts.length} posts (${total} total)`);

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(async post => {
          // Handle anonymous author case
          // Transform arrays to counts and add computed properties
          const userId = req.user ? (req.user.userId || req.user.id) : null;
          
          // Count comments for this post
          const commentCount = await Comment.countDocuments({ 
            post: post._id, 
            isActive: true 
          });
          
          // Ensure author data is properly structured
          let authorData = null;
          if (post.author) {
            authorData = {
              id: post.author._id || post.author.id,
              username: post.author.username || 'unknown',
              displayName: post.author.displayName || post.author.username || 'Unknown User',
              avatar: post.author.avatar || '',
              isVerified: post.author.isVerified || false,
              bio: post.author.bio || '',
              role: post.author.role || 'user',
              followerCount: post.author.followerCount || 0,
              location: post.author.location || '',
              // Legacy field for backward compatibility
              name: post.author.displayName || post.author.username || 'Unknown User',
            };
          }
          
          return {
            ...post,
            id: post._id, // Add id field for compatibility
            authorId: post.author?._id || post.author?.id, // Add authorId for compatibility
            // Use structured author data
            author: authorData,
            // Ensure hashtags is always an array
            hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
            // Transform arrays to counts
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            // Add user interaction flags
            isLiked: userId && Array.isArray(post.likes) ? post.likes.some(like => 
              (like.user && like.user.toString() === userId.toString())
            ) : false,
            isBookmarked: userId && Array.isArray(post.bookmarks) ? post.bookmarks.some(bookmark => 
              (bookmark.user && bookmark.user.toString() === userId.toString())
            ) : false,
            isShared: userId && Array.isArray(post.shares) ? post.shares.some(share => 
              (share.user && share.user.toString() === userId.toString())
            ) : false,
            // Keep original arrays for backward compatibility but ensure they're safe
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            shares: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            comments: commentCount,
            // Ensure media array is properly structured
            media: Array.isArray(post.media) ? post.media.map(media => ({
              ...media,
              id: media._id || media.public_id,
              url: media.url || media.secure_url,
              secure_url: media.secure_url || media.url,
              resource_type: media.resource_type || 'image',
              thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
            })) : []
          };
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        feedType,
      },
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get posts',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/achievements
// @desc    Get achievement posts
// @access  Public
router.get('/achievements', async (req, res) => {
  try {
    console.log('GET /api/posts/achievements - Request received');
    const {
      limit = 20,
      page = 1,
    } = req.query;

    // Base query for achievement posts
    const query = { 
      isActive: true, 
      isAchievement: true 
    };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch achievement posts
    const posts = await Post.find(query)
      .populate('author', 'username displayName avatar isVerified bio role followerCount location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(async post => {
          // Count comments for this post
          const commentCount = await Comment.countDocuments({ 
            post: post._id, 
            isActive: true 
          });
          
          return {
            ...post,
            id: post._id,
            authorId: post.author._id,
            author: {
              ...post.author,
              id: post.author._id,
              name: post.author.displayName || post.author.username,
            },
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            shares: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            comments: commentCount,
            hideLikes: post.hideLikes || false,
            hideComments: post.hideComments || false,
            isAchievement: post.isAchievement || false,
            achievementType: post.achievementType || 'milestone',
            achievementData: post.achievementData || {},
            media: Array.isArray(post.media) ? post.media.map(media => ({
              ...media,
              id: media._id || media.public_id,
              url: media.url || media.secure_url,
              secure_url: media.secure_url || media.url,
              resource_type: media.resource_type || 'image',
              thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
            })) : []
          };
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get achievement posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get achievement posts',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/user/:username/achievements
// @desc    Get achievement posts for a specific user
// @access  Public
router.get('/user/:username/achievements', async (req, res) => {
  try {
    console.log('GET /api/posts/user/:username/achievements - Request received');
    const { username } = req.params;
    const {
      limit = 20,
      page = 1,
    } = req.query;

    // Find user by username
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Base query for user's achievement posts
    const query = { 
      author: user._id,
      isActive: true, 
      isAchievement: true 
    };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch user's achievement posts
    const posts = await Post.find(query)
      .populate('author', 'username displayName avatar isVerified bio role followerCount location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(async post => {
          // Count comments for this post
          const commentCount = await Comment.countDocuments({ 
            post: post._id, 
            isActive: true 
          });
          
          return {
            ...post,
            id: post._id,
            authorId: post.author._id,
            author: {
              ...post.author,
              id: post.author._id,
              name: post.author.displayName || post.author.username,
            },
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            shares: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            comments: commentCount,
            hideLikes: post.hideLikes || false,
            hideComments: post.hideComments || false,
            isAchievement: post.isAchievement || false,
            achievementType: post.achievementType || 'milestone',
            achievementData: post.achievementData || {},
            media: Array.isArray(post.media) ? post.media.map(media => ({
              ...media,
              id: media._id || media.public_id,
              url: media.url || media.secure_url,
              secure_url: media.secure_url || media.url,
              resource_type: media.resource_type || 'image',
              thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
            })) : []
          };
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get user achievement posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user achievement posts',
      message: error.message,
    });
  }
});



// @route   GET /api/posts/public
// @desc    Get all public posts (no authentication required)
// @access  Public
router.get('/public', async (req, res) => {
  try {
    console.log('GET /api/posts/public - Request received');
    const {
      limit = 20,
      page = 1,
      contentType = 'all',
      hashtag,
      search,
      sortBy = 'recent' // recent, trending, popular
    } = req.query;

    // Base query for public posts only
    let query = { 
      isActive: true, 
      privacy: 'public' 
    };

    // Filter by content type
    if (contentType !== 'all') {
      query.type = contentType;
    }

    // Filter by hashtag
    if (hashtag) {
      query.hashtags = { $in: [hashtag.toLowerCase()] };
    }

    // Search functionality using MongoDB $text for content/hashtags
    if (search) {
      const searchString = String(search).trim();
      if (searchString.length) {
        const textClause = { $text: { $search: searchString } };
        if (query.$and) {
          query.$and.push(textClause);
        } else {
          query = { $and: [query, textClause] };
        }
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort criteria
    let sortCriteria;
    switch (sortBy) {
      case 'trending':
        sortCriteria = { 
          views: -1,
          createdAt: -1
        };
        break;
      case 'popular':
        sortCriteria = { 
          views: -1,
          createdAt: -1
        };
        break;
      default: // recent
        sortCriteria = { createdAt: -1 };
    }
    
    // Prefer $text score sort when using text search
    const isTextSearch = !!(
      (query.$and && query.$and.some(clause => clause.$text)) ||
      (query.$or && query.$or.some(clause => clause.$text))
    );

    const posts = await Post.find(query, isTextSearch ? { score: { $meta: 'textScore' } } : undefined)
      .populate('author', 'username displayName avatar isVerified bio role followerCount location')
      .sort(isTextSearch ? { score: { $meta: 'textScore' }, createdAt: -1 } : sortCriteria)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(async post => {
          // Count comments for this post
          const commentCount = await Comment.countDocuments({ 
            post: post._id, 
            isActive: true 
          });
          
          // Ensure author data is properly structured
          let authorData = null;
          if (post.author) {
            authorData = {
              id: post.author._id || post.author.id,
              username: post.author.username || 'unknown',
              displayName: post.author.displayName || post.author.username || 'Unknown User',
              avatar: post.author.avatar || '',
              isVerified: post.author.isVerified || false,
              bio: post.author.bio || '',
              role: post.author.role || 'user',
              followerCount: post.author.followerCount || 0,
              location: post.author.location || '',
              // Legacy field for backward compatibility
              name: post.author.displayName || post.author.username || 'Unknown User',
            };
          }
          
          return {
            ...post,
            id: post._id,
            authorId: post.author?._id || post.author?.id,
            author: authorData,
            // Ensure hashtags is always an array
            hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            shares: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            comments: commentCount,
            hideLikes: post.hideLikes || false,
            hideComments: post.hideComments || false,
            media: Array.isArray(post.media) ? post.media.map(media => ({
              ...media,
              id: media._id || media.public_id,
              url: media.url || media.secure_url,
              secure_url: media.secure_url || media.url,
              resource_type: media.resource_type || 'image',
              thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
            })) : []
          };
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get public posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get public posts',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/trending
// @desc    Get trending posts
// @access  Public
router.get('/trending', async (req, res) => {
  try {
    console.log('GET /api/posts/trending - Request received');
    const {
      limit = 20,
      timeRange = 'week',
      minViews = 0,
      minLikes = 0
    } = req.query;

    // Use the static method to get trending posts
    const posts = await Post.getTrending({
      limit: parseInt(limit),
      timeRange,
      minViews: parseInt(minViews),
      minLikes: parseInt(minLikes)
    });

    const total = posts.length;

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(async post => {
          // Count comments for this post
          const commentCount = await Comment.countDocuments({ 
            post: post._id, 
            isActive: true 
          });
          
          // Ensure author data is properly structured
          let authorData = null;
          if (post.author) {
            authorData = {
              id: post.author._id || post.author.id,
              username: post.author.username || 'unknown',
              displayName: post.author.displayName || post.author.username || 'Unknown User',
              avatar: post.author.avatar || '',
              isVerified: post.author.isVerified || false,
              bio: post.author.bio || '',
              role: post.author.role || 'user',
              followerCount: post.author.followerCount || 0,
              location: post.author.location || '',
              // Legacy field for backward compatibility
              name: post.author.displayName || post.author.username || 'Unknown User',
            };
          }
          
          return {
            ...post,
            id: post._id,
            authorId: post.author?._id || post.author?.id,
            author: authorData,
            // Ensure hashtags is always an array
            hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            shares: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            comments: commentCount,
            hideLikes: post.hideLikes || false,
            hideComments: post.hideComments || false,
            media: Array.isArray(post.media) ? post.media.map(media => ({
              ...media,
              id: media._id || media.public_id,
              url: media.url || media.secure_url,
              secure_url: media.secure_url || media.url,
              resource_type: media.resource_type || 'image',
              thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
            })) : []
          };
        })),
        pagination: {
          page: 1,
          limit: parseInt(limit),
          total,
          pages: 1,
        },
      },
    });
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending posts',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/trending/hashtags
// @desc    Get trending hashtags
// @access  Public
router.get('/trending/hashtags', async (req, res) => {
  try {
    console.log('GET /api/posts/trending/hashtags - Request received');
    const {
      limit = 10,
      timeRange = 'week'
    } = req.query;

    // Use the static method to get trending hashtags
    const hashtags = await Post.getTrendingHashtags(
      parseInt(limit),
      timeRange
    );

    res.json({
      success: true,
      data: {
        hashtags,
        pagination: {
          limit: parseInt(limit),
          timeRange,
        },
      },
      message: `Found ${hashtags.length} trending hashtags`
    });
  } catch (error) {
    console.error('Get trending hashtags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending hashtags',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/bookmarks/:userId
// @desc    Get bookmarked posts for a user
// @access  Private
router.get('/bookmarks/:userId', authenticateToken, async (req, res) => {
  try {
    console.log('GET /api/posts/bookmarks/:userId - Request received');
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    // Validate user ID
    if (userId !== req.user.id && userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only view your own bookmarks'
      });
    }

    // Find posts that are bookmarked by this user
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const posts = await Post.find({
      'bookmarks.user': userId,
      isActive: true
    })
    .populate('author', 'username displayName avatar isVerified bio role followerCount location')
    .sort({ 'bookmarks.createdAt': -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

    const total = await Post.countDocuments({
      'bookmarks.user': userId,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(async post => {
          // Count comments for this post
          const commentCount = await Comment.countDocuments({ 
            post: post._id, 
            isActive: true 
          });
          
          return {
            ...post,
            id: post._id,
            authorId: post.author._id,
            author: {
              ...post.author,
              id: post.author._id,
              name: post.author.displayName || post.author.username,
            },
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            shares: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            comments: commentCount,
            hideLikes: post.hideLikes || false,
            hideComments: post.hideComments || false,
            isBookmarked: true, // All posts from this endpoint are bookmarked
            media: Array.isArray(post.media) ? post.media.map(media => ({
              ...media,
              id: media._id || media.public_id,
              url: media.url || media.secure_url,
              secure_url: media.secure_url || media.url,
              resource_type: media.resource_type || 'image',
              thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
            })) : []
          };
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bookmarks',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/:postId
// @desc    Get a specific post by ID
// @access  Public
router.get('/:postId', async (req, res) => {
  try {
    console.log('GET /api/posts/:postId - Request received');
    const { postId } = req.params;
    const userId = req.user ? (req.user.userId || req.user.id) : null;

    // Find the post
    const post = await Post.findById(postId)
      .populate('author', 'username displayName avatar isVerified bio role followerCount location')
      .lean();

    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
        message: 'The requested post could not be found or has been removed'
      });
    }

    // Privacy check
    if (post.privacy === 'private' && (!userId || (post.author && post.author._id.toString() !== userId.toString()))) { // Fixed: null-safe access
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to view this post'
      });
    }

    if (post.privacy === 'followers') {
      // Check if user is following the author or is the author
      if (userId && post.author && post.author._id.toString() !== userId.toString()) { // Fixed: null-safe access
        const isFollowing = await Follow.isFollowing(userId, post.author._id);
        if (!isFollowing) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'You must follow this user to view their posts'
          });
        }
      }
    }

    // Count comments for this post
    const commentCount = await Comment.countDocuments({ 
      post: post._id, 
      isActive: true 
    });

    // Ensure author data is properly structured
    let authorData = null;
    if (post.author) {
      authorData = {
        id: post.author._id || post.author.id,
        username: post.author.username || 'unknown',
        displayName: post.author.displayName || post.author.username || 'Unknown User',
        avatar: post.author.avatar || '',
        isVerified: post.author.isVerified || false,
        bio: post.author.bio || '',
        role: post.author.role || 'user',
        followerCount: post.author.followerCount || 0,
        location: post.author.location || '',
        // Legacy field for backward compatibility
        name: post.author.displayName || post.author.username || 'Unknown User',
      };
    }

    const postWithCounts = {
      ...post,
      id: post._id,
      authorId: post.author?._id || post.author?.id,
      author: authorData,
      likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
      commentCount: commentCount,
      shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
      bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
      likes: Array.isArray(post.likes) ? post.likes.length : 0,
      shares: Array.isArray(post.shares) ? post.shares.length : 0,
      bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
      comments: commentCount,
      isLiked: userId && Array.isArray(post.likes) ? post.likes.some(like => 
        (like.user && like.user.toString() === userId.toString())
      ) : false,
      isBookmarked: userId && Array.isArray(post.bookmarks) ? post.bookmarks.some(bookmark => 
        (bookmark.user && bookmark.user.toString() === userId.toString())
      ) : false,
      isShared: userId && Array.isArray(post.shares) ? post.shares.some(share => 
        (share.user && share.user.toString() === userId.toString())
      ) : false,
      media: Array.isArray(post.media) ? post.media.map(media => ({
        ...media,
        id: media._id || media.public_id,
        secure_url: media.secure_url || media.url,
        resource_type: media.resource_type || 'image',
        thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
      })) : []
    };

    res.json({
      success: true,
      data: {
        post: postWithCounts
      },
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get post',
      message: error.message,
    });
  }
});

// @route   POST /api/posts
// @desc    Create new post
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts - Request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    const {
      content,
      type = 'text',
      media = [],
      hashtags = [],
      mentions = [],
      location = '',
      privacy = 'public'
    } = req.body;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Post content is required',
      });
    }

    // Validate post type
    const validTypes = ['text', 'image', 'video'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid post type',
      });
    }

    // Validate media requirements for non-text posts
    if (type !== 'text' && (!media || media.length === 0)) {
      return res.status(400).json({
        success: false,
        error: `${type.charAt(0).toUpperCase() + type.slice(1)} posts require media files`,
        details: type === 'video' ? 'Please upload a video file to create a video post' : 
                 type === 'image' ? 'Please upload an image file to create an image post' :
                 'Please upload media files for this post type'
      });
    }

    // Add this helper function to validate media URLs
    const validateMediaUrls = (mediaArray) => {
      if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
        return { valid: true }; // No media to validate
      }

      for (let i = 0; i < mediaArray.length; i++) {
        const media = mediaArray[i];
        
        // Check required fields
        if (!media.public_id) {
          return { 
            valid: false, 
            error: `Media item ${i + 1} is missing public_id` 
          };
        }
        
        if (!media.secure_url && !media.url) {
          return { 
            valid: false, 
            error: `Media item ${i + 1} is missing both secure_url and url` 
          };
        }
        
        // Validate URL format
        const url = media.secure_url || media.url;
        if (url && typeof url === 'string') {
          // Check for localhost or configured backend URLs that might indicate local files not properly uploaded
          const backendUrl = config.server.backendUrl;
          if ((url.includes('localhost:8000/uploads/') || (backendUrl && url.includes(`${backendUrl}/uploads/`))) && !url.includes('cloudinary.com')) {
            // This might be a local file, which is okay for development but should be checked
            console.warn(`Media item ${i + 1} appears to be a local file: ${url}`);
          }
          
          // Check for known missing file patterns
          const knownMissingPatterns = [
            'file_1760168733155_lfhjq4ik7ht',
            'file_1760263843073_w13593s5t8l',
            'file_1760276276250_3pqeekj048s'
          ];
          
          for (const pattern of knownMissingPatterns) {
            if (url.includes(pattern)) {
              return { 
                valid: false, 
                error: `Media item ${i + 1} references a known missing file` 
              };
            }
          }
        }
      }
      
      return { valid: true };
    };

    // Handle both authenticated and anonymous users
    const userId = req.user.id || req.user.userId;
    
    console.log('Processing user authentication - userId:', userId, 'isAnonymous:', req.user.isAnonymous);
    
    // Get authenticated user from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Note: Mentions validation can be added later as an async process
    // For now, we'll allow mentions and validate them in the background

    // Normalize media URLs so local uploads point to resolvable paths
    const normalizedMedia = normalizeMediaUrls(media || []);
    
    // Ensure all media items have required fields
    const validatedMedia = normalizedMedia.map(item => {
      // Ensure we have both url and secure_url
      const url = item.url || item.secure_url;
      const secure_url = item.secure_url || item.url;
      
      // Determine resource type if not provided
      let resource_type = item.resource_type;
      if (!resource_type) {
        if (secure_url && (secure_url.includes('.mp4') || secure_url.includes('.mov') || secure_url.includes('.webm'))) {
          resource_type = 'video';
        } else {
          resource_type = 'image';
        }
      }
      
      return {
        ...item,
        public_id: item.public_id || (secure_url ? secure_url.split('/').pop().split('.')[0] : null),
        url,
        secure_url,
        resource_type,
        created_at: item.created_at || new Date().toISOString()
      };
    });

    // Create new post
    const newPost = new Post({
      author: user._id,
      content: content.trim(),
      type,
      media: validatedMedia,
      hashtags: hashtags.map(tag => tag.toLowerCase()),
      mentions,
      location,
      privacy,
      views: 0,
    });

    // Save post to MongoDB
    await newPost.save();

    // Update user's post count
    await User.findByIdAndUpdate(userId, { $inc: { postCount: 1 } });

    // Populate author data for registered users
    await newPost.populate('author', 'username displayName avatar isVerified');

    console.log(`Post created successfully:`, {
      postId: newPost._id,
      type: newPost.type,
      author: newPost.author.username,
      hasMedia: newPost.media && newPost.media.length > 0,
      mediaCount: newPost.media ? newPost.media.length : 0,
      mediaTypes: newPost.media ? newPost.media.map(m => m.resource_type) : []
    });

    // Notify all followers about the new post
    setImmediate(async () => {
      try {
        // Only notify followers for non-anonymous users
        if (user._id !== 'anonymous-user' && !req.user.isAnonymous) {
          // Get all followers of the post author
          const followers = await Follow.getFollowers(user._id, { limit: 1000, populate: false });
          const followerIds = followers.map(follow => follow.follower.toString());
          
          console.log(`Notifying ${followerIds.length} followers about new post`);
          
          // Create notifications for each follower
          const notificationPromises = followerIds.map(followerId => {
            // Skip notifying the post author
            if (followerId === user._id.toString()) {
              return Promise.resolve();
            }
            
            const notificationData = {
              recipient: followerId,
              sender: user._id,
              type: 'post',
              title: `${user.displayName || user.username} just posted`,
              message: newPost.content.length > 100 
                ? newPost.content.substring(0, 100) + '...' 
                : newPost.content,
              data: {
                postId: newPost._id,
                postType: newPost.type,
                authorId: user._id
              },
              relatedId: newPost._id,
              relatedModel: 'Post',
              actionUrl: `/post/${newPost._id}`
            };
            
            return NotificationService.createNotification(notificationData)
              .then(notification => {
                // Send real-time notification
                // Instead of using getIo(req), let's try to access io directly
                // This is a more reliable approach for background processes
                const io = req.app.get('io');
                if (io) {
                  io.to(`user_${followerId}`).emit('notification:new', notification);
                  
                  // Update unread count for the follower
                  return Notification.getUnreadCount(followerId)
                    .then(unreadCount => {
                      io.to(`user_${followerId}`).emit('notification:unread-count', {
                        unreadCount
                      });
                    })
                    .catch(err => {
                      console.error('Error getting unread count:', err);
                    });
                } else {
                  console.log('Socket.IO instance not available for real-time notifications');
                }
              })
              .catch(err => {
                console.error(`Error creating notification for follower ${followerId}:`, err);
              });
          });
          
          // Wait for all notifications to be created
          await Promise.all(notificationPromises);
          console.log(`Notifications sent to ${followerIds.length} followers`);
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
      }
    });

    // Return the created post with proper structure
    const postResponse = {
      ...newPost.toObject(),
      id: newPost._id,
      authorId: newPost.author?._id,
      author: newPost.author ? {
        ...newPost.author.toObject(),
        id: newPost.author._id,
        name: newPost.author.displayName || newPost.author.username,
      } : null,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      bookmarkCount: 0,
      likes: 0,
      shares: 0,
      bookmarks: 0,
      comments: 0,
      hideLikes: false,
      hideComments: false,
      isLiked: false,
      isBookmarked: false,
      isShared: false,
      media: Array.isArray(newPost.media) ? newPost.media.map(media => {
        // Ensure proper media structure in response
        const url = media.url || media.secure_url;
        const secure_url = media.secure_url || media.url;
        
        return {
          ...media,
          id: media._id || media.public_id,
          url,
          secure_url,
          resource_type: media.resource_type || 'image',
          thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
        };
      }) : []
    };

    res.status(201).json({
      success: true,
      data: {
        post: postResponse
      },
      message: 'Post created successfully',
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: error.message,
    });
  }
});

// @route   PUT /api/posts/:postId
// @desc    Update a post
// @access  Private
router.put('/:postId', authenticateToken, async (req, res) => {
  try {
    console.log('PUT /api/posts/:postId - Request received');
    const { postId } = req.params;
    const { content, hashtags, location, privacy, hideLikes, hideComments } = req.body;
    const userId = req.user.id || req.user.userId;

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if user is the author
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only edit your own posts',
      });
    }

    // Add to edit history if content changed
    if (content && content !== post.content) {
      post.editHistory = post.editHistory || [];
      post.editHistory.push({
        content: post.content,
        editedAt: new Date(),
      });
    }

    // Update fields
    if (content) post.content = content.trim();
    if (hashtags) post.hashtags = hashtags.map(tag => tag.toLowerCase());
    if (location) post.location = location;
    if (privacy) post.privacy = privacy;
    if (hideLikes !== undefined) post.hideLikes = hideLikes;
    if (hideComments !== undefined) post.hideComments = hideComments;

    // Normalize media URLs on update if provided
    if (req.body.media) {
      post.media = normalizeMediaUrls(req.body.media || []);
    }

    // Save updated post
    await post.save();

    // Populate author data
    await post.populate('author', 'username displayName avatar isVerified');

    // Return updated post
    res.json({
      success: true,
      data: {
        post: {
          ...post.toObject(),
          id: post._id,
          authorId: post.author._id,
          author: {
            ...post.author.toObject(),
            id: post.author._id,
            name: post.author.displayName || post.author.username,
          },
          likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
          commentCount: await Comment.countDocuments({ post: post._id, isActive: true }),
          shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
          bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
          likes: Array.isArray(post.likes) ? post.likes.length : 0,
          shares: Array.isArray(post.shares) ? post.shares.length : 0,
          bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
          comments: await Comment.countDocuments({ post: post._id, isActive: true }),
          hideLikes: post.hideLikes || false,
          hideComments: post.hideComments || false,
          media: Array.isArray(post.media) ? post.media.map(media => ({
            ...media,
            id: media._id || media.public_id,
            secure_url: media.secure_url || media.url,
            resource_type: media.resource_type || 'image',
            thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
          })) : []
        }
      },
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post',
      message: error.message,
    });
  }
});

// @route   PUT /api/posts/:id
// @desc    Update a post (including hide likes/comments settings)
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { hideLikes, hideComments } = req.body;
    
    // Validate post ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid post ID',
      });
    }
    
    // Find the post
    const post = await Post.findById(id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }
    
    // Check if user is authorized to update this post
    const userId = req.user.userId || req.user.id;
    if (post.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'User not authorized to update this post',
      });
    }
    
    // Update hide settings if provided
    if (hideLikes !== undefined) {
      post.hideLikes = hideLikes;
    }
    
    if (hideComments !== undefined) {
      post.hideComments = hideComments;
    }
    
    // Save the updated post
    await post.save();
    
    res.json({
      success: true,
      data: {
        post: {
          ...post.toObject(),
          id: post._id,
          authorId: post.author._id,
          likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
          commentCount: Array.isArray(post.comments) ? post.comments.length : 0,
          shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
          bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
          hideLikes: post.hideLikes,
          hideComments: post.hideComments,
        }
      },
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post',
      message: error.message,
    });
  }
});

// @route   DELETE /api/posts/:postId
// @desc    Delete all posts from database (Admin only)
// @access  Private (Admin)
router.delete('/all', authenticateToken, async (req, res) => {
  try {
    console.log('DELETE /api/posts/all - Request received');
    
    // Check if user is admin
    const userId = req.user.id || req.user.userId;
    const requestingUser = await User.findById(userId);
    
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only administrators can delete all posts',
      });
    }
    
    // Get count of posts to be deleted
    const postsToDelete = await Post.find({ isActive: true });
    const postCount = postsToDelete.length;
    
    // Perform soft delete on all posts
    const result = await Post.updateMany(
      { isActive: true }, 
      { isActive: false }
    );
    
    console.log(`Soft deleted ${result.modifiedCount} posts`);
    
    res.json({
      success: true,
      message: `Successfully soft deleted ${result.modifiedCount} posts`,
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Delete all posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all posts',
      message: error.message,
    });
  }
});

// @desc    Delete a post
// @access  Private
router.delete('/:postId', authenticateToken, async (req, res) => {
  try {
    console.log('DELETE /api/posts/:postId - Request received');
    const { postId } = req.params;
    const userId = req.user.id || req.user.userId;

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if user is the author
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only delete your own posts',
      });
    }

    // Soft delete - set isActive to false
    post.isActive = false;
    await post.save();

    // Update user's post count
    await User.findByIdAndUpdate(post.author, { $inc: { postCount: -1 } });

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/like
// @desc    Like/unlike a post
// @access  Private
router.post('/:postId/like', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/like - Request received');
    const { postId } = req.params;
    const userId = req.user.id || req.user.userId;

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if user already liked the post
    const existingLikeIndex = post.likes.findIndex(like => 
      like.user && like.user.toString() === userId.toString()
    );

    let action;
    if (existingLikeIndex >= 0) {
      // Unlike - remove from likes array
      post.likes.splice(existingLikeIndex, 1);
      action = 'unlike';
    } else {
      // Like - add to likes array
      post.likes.push({
        user: userId,
        createdAt: new Date(),
      });
      action = 'like';
    }

    // Save updated post
    await post.save();

    // Send notification if this is a like action (not unlike)
    if (action === 'like') {
      setImmediate(async () => {
        try {
          const liker = await User.findById(userId).select('username displayName avatar').lean();
          const postOwner = await User.findById(post.author).select('username displayName avatar').lean();
          
          // Don't send notification to self
          if (post.author.toString() !== userId.toString()) {
            await NotificationService.createLikeNotification(
              userId,
              post.author.toString(),
              postId,
              post.content
            );
          }
        } catch (notificationError) {
          console.error('Error creating like notification:', notificationError);
        }
      });
    }

    res.json({
      success: true,
      data: {
        action,
        likeCount: post.likes.length,
      },
      message: action === 'like' ? 'Post liked successfully' : 'Post unliked successfully',
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like/unlike post',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/bookmark
// @desc    Bookmark/unbookmark a post
// @access  Private
router.post('/:postId/bookmark', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/bookmark - Request received');
    const { postId } = req.params;
    const userId = req.user.id || req.user.userId;

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Check if user already bookmarked the post
    const existingBookmarkIndex = post.bookmarks.findIndex(bookmark => 
      bookmark.user && bookmark.user.toString() === userId.toString()
    );

    let action;
    if (existingBookmarkIndex >= 0) {
      // Unbookmark - remove from bookmarks array
      post.bookmarks.splice(existingBookmarkIndex, 1);
      action = 'unbookmark';
    } else {
      // Bookmark - add to bookmarks array
      post.bookmarks.push({
        user: userId,
        createdAt: new Date(),
      });
      action = 'bookmark';
    }

    // Save updated post
    await post.save();

    res.json({
      success: true,
      data: {
        action,
        isBookmarked: action === 'bookmark',
      },
      message: action === 'bookmark' ? 'Post bookmarked successfully' : 'Post unbookmarked successfully',
    });
  } catch (error) {
    console.error('Bookmark post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bookmark/unbookmark post',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/share
// @desc    Share a post
// @access  Private
router.post('/:postId/share', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/share - Request received');
    const { postId } = req.params;
    const userId = req.user.id || req.user.userId;

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Add user to shares array if not already there
    const existingShareIndex = post.shares.findIndex(share => 
      share.user && share.user.toString() === userId.toString()
    );

    if (existingShareIndex === -1) {
      post.shares.push({
        user: userId,
        createdAt: new Date(),
      });
    }

    // Save updated post
    await post.save();

    res.json({
      success: true,
      message: 'Post shared successfully',
    });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share post',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/view
// @desc    Track post view
// @access  Public
router.post('/:postId/view', async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/view - Request received');
    const { postId } = req.params;
    
    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Increment view count
    post.views = (post.views || 0) + 1;
    await post.save();

    res.json({
      success: true,
      data: {
        views: post.views
      },
      message: 'Post view tracked successfully',
    });
  } catch (error) {
    console.error('Track post view error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track post view',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/comments
// @desc    Add a comment to a post
// @access  Private
router.post('/:postId/comments', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/comments - Request received');
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user.id || req.user.userId;

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    let shareResult;
    
    // Create share using appropriate Share model method
    if (platform === 'internal') {
      shareResult = await Share.createSimpleShare(postId, userId);
    } else {
      // For external shares (copy link, social media, etc.)
      const metadata = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referer')
      };
      shareResult = await Share.createExternalShare(postId, userId, platform, metadata);
    }

    // Update post share count
    const updatedPost = await Post.findByIdAndUpdate(postId, {
      $inc: { shareCount: 1 }
    }, { new: true });

    // Emit share update via WebSocket if available
    const io = req.app.get('io');
    if (io) {
      io.emit('post-share-updated', {
        postId: postId,
        shareCount: updatedPost.shareCount || 1,
        userId: userId,
        type: 'share_update',
        action: 'share',
        platform: platform,
        timestamp: new Date().toISOString()
      });
      
      // Also emit general post update
      io.emit('post-updated', {
        postId: postId,
        type: 'share',
        shareCount: updatedPost.shareCount || 1,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        shareCount: updatedPost.shareCount || 1,
      },
      message: 'Post shared successfully',
    });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share post',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/share/followers
// @desc    Share a post with all followers
// @access  Private
router.post('/:postId/share/followers', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/share/followers - Request received');
    const { postId } = req.params;
    const { message = '' } = req.body;
    const userId = req.user.id || req.user.userId;

    // Validate user
    if (!userId || userId === 'anonymous-user') {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Fetch user information
    const user = await User.findById(userId).select('username displayName');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Share with followers using Share model
    const shareResult = await Share.shareWithFollowers(postId, userId, message);

    // Update post share count
    const updatedPost = await Post.findByIdAndUpdate(postId, {
      $inc: { shareCount: shareResult.sharedWith.length }
    }, { new: true });

    // Emit share update via WebSocket if available
    const io = req.app.get('io');
    if (io) {
      io.emit('post-share-updated', {
        postId: postId,
        shareCount: updatedPost.shareCount || shareResult.sharedWith.length,
        userId: userId,
        type: 'share_update',
        action: 'share_followers',
        platform: 'internal',
        timestamp: new Date().toISOString()
      });
      
      // Also emit general post update
      io.emit('post-updated', {
        postId: postId,
        type: 'share',
        shareCount: updatedPost.shareCount || shareResult.sharedWith.length,
        timestamp: new Date().toISOString()
      });
    }

    // Create notifications for all followers
    if (shareResult.sharedWith && shareResult.sharedWith.length > 0) {
      const notificationPromises = shareResult.sharedWith.map(async (shareEntry) => {
        if (shareEntry.user && shareEntry.user.toString() !== userId.toString()) {
          const notification = new Notification({
            recipient: shareEntry.user,
            sender: userId,
            type: 'share',
            title: 'New Post Shared',
            message: message || `${user.username || user.displayName} shared a post with their followers`,
            data: {
              shareId: shareResult._id,
              shareType: 'followers',
              postId: postId
            },
            relatedId: postId,
            relatedModel: 'Post'
          });
          await notification.save();
        }
      });
      
      // Run all notification creations in parallel
      await Promise.allSettled(notificationPromises);
    }

    res.json({
      success: true,
      data: shareResult,
      message: 'Post shared with followers successfully',
    });
  } catch (error) {
    console.error('Share post with followers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share post with followers',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/share/users
// @desc    Share a post with specific users
// @access  Private
router.post('/:postId/share/users', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/share/users - Request received');
    const { postId } = req.params;
    const { userIds = [], message = '' } = req.body;
    const userId = req.user.id || req.user.userId;

    // Validation
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one user must be specified',
      });
    }

    // Validate user
    if (!userId || userId === 'anonymous-user') {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Fetch user information
    const user = await User.findById(userId).select('username displayName');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Share with specific users using Share model
    const shareResult = await Share.shareWithUsers(postId, userId, userIds, message);

    // Update post share count
    const updatedPost = await Post.findByIdAndUpdate(postId, {
      $inc: { shareCount: userIds.length }
    }, { new: true });

    // Emit share update via WebSocket if available
    const io = req.app.get('io');
    if (io) {
      io.emit('post-share-updated', {
        postId: postId,
        shareCount: updatedPost.shareCount || userIds.length,
        userId: userId,
        type: 'share_update',
        action: 'share_users',
        platform: 'internal',
        timestamp: new Date().toISOString()
      });
      
      // Also emit general post update
      io.emit('post-updated', {
        postId: postId,
        type: 'share',
        shareCount: updatedPost.shareCount || userIds.length,
        timestamp: new Date().toISOString()
      });
    }

    // Create conversations and messages for all shared users
    if (shareResult.sharedWith && shareResult.sharedWith.length > 0) {
      const messagePromises = shareResult.sharedWith.map(async (shareEntry) => {
        if (shareEntry.user && shareEntry.user.toString() !== userId.toString()) {
          try {
            // Check if conversation already exists between these users
            let conversation = await Conversation.findOne({
              participants: { $all: [userId, shareEntry.user] },
              isGroup: false
            });

            // If no conversation exists, create one
            if (!conversation) {
              conversation = new Conversation({
                participants: [userId, shareEntry.user],
                isGroup: false
              });
              await conversation.save();
            }

            // Create a special "post share" message
            const newMessage = new Message({
              conversationId: conversation._id,
              senderId: userId,
              content: message || `${user.username || user.displayName} shared a post with you`,
              type: 'system', // Using system type for post shares
              media: {
                public_id: postId,
                url: `/post/${postId}`,
                resource_type: 'post',
                format: 'link'
              }
            });

            await newMessage.save();

            // Update conversation's last message and activity
            await Conversation.findByIdAndUpdate(conversation._id, {
              lastMessage: newMessage._id,
              lastActivity: new Date()
            });

            // Create notification
            const notification = new Notification({
              recipient: shareEntry.user,
              sender: userId,
              type: 'share',
              title: 'New Post Shared with You',
              message: message || `${user.username || user.displayName} shared a post with you`,
              data: {
                shareId: shareResult._id,
                shareType: 'direct',
                postId: postId,
                conversationId: conversation._id,
                messageId: newMessage._id
              },
              relatedId: postId,
              relatedModel: 'Post'
            });
            await notification.save();

            return { success: true, user: shareEntry.user };
          } catch (error) {
            console.error(`Error creating message for user ${shareEntry.user}:`, error);
            return { success: false, user: shareEntry.user, error: error.message };
          }
        }
      });

      // Run all message creations in parallel
      await Promise.allSettled(messagePromises);
    }

    res.json({
      success: true,
      data: shareResult,
      message: `Post shared with ${userIds.length} user${userIds.length > 1 ? 's' : ''} successfully`,
    });
  } catch (error) {
    console.error('Share post with users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share post with users',
      message: error.message,
    });
  }
});

// @route   POST /api/posts/:postId/comments
// @desc    Add a comment to a post
// @access  Private
router.post('/:postId/comments', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts/:postId/comments - Request received');
    const { postId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user.id || req.user.userId;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required',
      });
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Create comment using Comment model
    const newComment = new Comment({
      post: postId,
      author: userId,
      content: content.trim(),
      parentId: parentId || null,
    });

    // Save comment
    await newComment.save();

    // Populate author data
    await newComment.populate('author', 'username displayName avatar isVerified');

    // Send notification if this is not a reply to another comment (top-level comment)
    if (!parentId) {
      setImmediate(async () => {
        try {
          const commentAuthor = await User.findById(userId).select('username displayName avatar').lean();
          const post = await Post.findById(postId).select('author').lean();
          
          // Don't send notification to self
          if (post && post.author.toString() !== userId.toString()) {
            await NotificationService.createCommentNotification(
              userId,
              post.author.toString(),
              postId,
              content
            );
          }
        } catch (notificationError) {
          console.error('Error creating comment notification:', notificationError);
        }
      });
    }

    res.status(201).json({
      success: true,
      data: {
        comment: {
          ...newComment.toObject(),
          id: newComment._id,
          authorId: newComment.author._id,
          author: {
            ...newComment.author.toObject(),
            id: newComment.author._id,
            name: newComment.author.displayName || newComment.author.username,
          },
        }
      },
      message: 'Comment added successfully',
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/:postId/comments
// @desc    Get comments for a post
// @access  Public
router.get('/:postId/comments', async (req, res) => {
  try {
    console.log('GET /api/posts/:postId/comments - Request received');
    const { postId } = req.params;
    const { limit = 20, page = 1, sortBy = 'newest' } = req.query;

    // Find the post
    const post = await Post.findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
      });
    }

    // Privacy check
    if (post.privacy === 'private') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to view comments on this post'
      });
    }

    // Build sort criteria
    let sortCriteria;
    switch (sortBy) {
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      case 'popular':
        sortCriteria = { likes: -1, createdAt: -1 };
        break;
      default: // newest
        sortCriteria = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find comments
    const comments = await Comment.find({ 
      post: postId, 
      isActive: true,
      parentId: null // Only top-level comments
    })
    .populate('author', 'username displayName avatar isVerified')
    .sort(sortCriteria)
    .limit(parseInt(limit))
    .skip(skip)
    .lean();


    // Get total count
    const total = await Comment.countDocuments({ 
      post: postId, 
      isActive: true,
      parentId: null
    });

    // Add like counts and user interaction flags
    const userId = req.user ? (req.user.userId || req.user.id) : null;
    const commentsWithCounts = await Promise.all(comments.map(async comment => {
      const likeCount = Array.isArray(comment.likes) ? comment.likes.length : 0;
      const isLiked = userId && Array.isArray(comment.likes) ? comment.likes.some(like => 
        (like.user && like.user.toString() === userId.toString())
      ) : false;
      
      return {
        ...comment,
        id: comment._id,
        authorId: comment.author._id,
        author: {
          ...comment.author,
          id: comment.author._id,
          name: comment.author.displayName || comment.author.username,
        },
        likeCount,
        isLiked,
        likes: likeCount,
        replies: await Comment.countDocuments({ 
          parentId: comment._id, 
          isActive: true 
        }),
      };
    }));

    res.json({
      success: true,
      data: {
        comments: commentsWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comments',
      message: error.message,
    });
  }
});

// @route   GET /api/posts/user/:username
// @desc    Get posts by username
// @access  Public
router.get('/user/:username', async (req, res) => {
  try {
    console.log('GET /api/posts/user/:username - Request received');
    const { username } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    // Get current user ID if authenticated and valid
    const rawUserId = req.user ? (req.user.userId || req.user.id) : null;
    const currentUserId = (rawUserId && rawUserId !== 'anonymous-user' && mongoose.Types.ObjectId.isValid(String(rawUserId)))
      ? String(rawUserId)
      : null;
    
    // First, find the user by username
    // Log the incoming username for debugging
    console.log('Looking for username:', username);
    
    // Clean and validate the username
    const cleanUsername = username ? username.trim() : '';
    if (!cleanUsername) {
      console.log('Empty username provided');
      return res.status(400).json({
        success: false,
        error: 'Invalid username',
        message: 'Username cannot be empty'
      });
    }
    
    const user = await User.findOne({ 
      username: new RegExp(`^${cleanUsername}$`, 'i'),
      isActive: true 
    });
    
    if (!user) {
      console.log('User not found for username:', cleanUsername);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The requested user profile does not exist or may have been deleted.'
      });
    }
    
    console.log('Found user:', user.username, 'with ID:', user._id);
    
    const authorId = user._id.toString();
    
    // When viewing someone's profile, respect privacy settings
    let query;
    if (currentUserId && currentUserId.toString() === authorId) {
      // Own profile: show all posts
      query = { isActive: true, author: authorId };
    } else if (currentUserId) {
      // Other's profile: check if following
      const isFollowing = await Follow.isFollowing(currentUserId, authorId);
      
      query = {
        isActive: true,
        author: authorId,
        $or: [
          { privacy: 'public' },
          ...(isFollowing ? [{ privacy: 'followers' }] : [])
        ]
      };
    } else {
      // Not authenticated: only public posts
      query = { isActive: true, author: authorId, privacy: 'public' };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get posts
    const posts = await Post.find(query)
      .populate('author', 'username displayName avatar isVerified bio role followerCount location')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    // Get total count for pagination
    const total = await Post.countDocuments(query);
    
    console.log(`Found ${posts.length} posts for user ${username} (${total} total)`);
    
    res.json({
      success: true,
      data: {
        posts: await Promise.all(posts.map(async post => {
          // Count comments for this post
          const commentCount = await Comment.countDocuments({ 
            post: post._id, 
            isActive: true 
          });
          
          // Ensure author data is properly structured
          let authorData = null;
          if (post.author) {
            authorData = {
              id: post.author._id || post.author.id,
              username: post.author.username || 'unknown',
              displayName: post.author.displayName || post.author.username || 'Unknown User',
              avatar: post.author.avatar || '',
              isVerified: post.author.isVerified || false,
              bio: post.author.bio || '',
              role: post.author.role || 'user',
              followerCount: post.author.followerCount || 0,
              location: post.author.location || '',
              // Legacy field for backward compatibility
              name: post.author.displayName || post.author.username || 'Unknown User',
            };
          }
          
          return {
            ...post,
            id: post._id,
            authorId: post.author?._id || post.author?.id,
            author: authorData,
            hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
            likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
            commentCount: commentCount,
            shareCount: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarkCount: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            likes: Array.isArray(post.likes) ? post.likes.length : 0,
            shares: Array.isArray(post.shares) ? post.shares.length : 0,
            bookmarks: Array.isArray(post.bookmarks) ? post.bookmarks.length : 0,
            comments: commentCount,
            isLiked: currentUserId && Array.isArray(post.likes) ? post.likes.some(like => 
              (like.user && like.user.toString() === currentUserId.toString())
            ) : false,
            isBookmarked: currentUserId && Array.isArray(post.bookmarks) ? post.bookmarks.some(bookmark => 
              (bookmark.user && bookmark.user.toString() === currentUserId.toString())
            ) : false,
            isShared: currentUserId && Array.isArray(post.shares) ? post.shares.some(share => 
              (share.user && share.user.toString() === currentUserId.toString())
            ) : false,
            media: Array.isArray(post.media) ? post.media.map(media => ({
              ...media,
              id: media._id || media.public_id,
              url: media.url || media.secure_url,
              secure_url: media.secure_url || media.url,
              resource_type: media.resource_type || 'image',
              thumbnail_url: media.thumbnail_url || (media.resource_type === 'video' && media.public_id ? getVideoThumbnail(media.public_id) : undefined),
            })) : []
          };
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user posts',
      message: error.message,
    });
  }
});

module.exports = router;