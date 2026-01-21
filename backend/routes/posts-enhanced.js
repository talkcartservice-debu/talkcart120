const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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

// Add health check endpoint at the top
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Posts Enhanced service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Enhanced endpoint for better post fetching with improved performance
router.get('/enhanced', async (req, res) => {
  try {
    console.log('GET /api/posts-enhanced/enhanced - Request received');
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
        url: mediaItem.url || mediaItem.secure_url,
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

// Create new post with enhanced validation and error handling
router.post('/enhanced', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts-enhanced - Request received');
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
            
            return Notification.createNotification(notificationData)
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

// Enhanced like/unlike endpoint with better error handling
router.post('/:postId/like-enhanced', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts-enhanced/:postId/like-enhanced - Request received');
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

// Enhanced bookmark/unbookmark endpoint
router.post('/:postId/bookmark-enhanced', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts-enhanced/:postId/bookmark-enhanced - Request received');
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

// Enhanced share endpoint
router.post('/:postId/share-enhanced', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts-enhanced/:postId/share-enhanced - Request received');
    const { postId } = req.params;
    const { platform = 'internal' } = req.body;
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

module.exports = router;