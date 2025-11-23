const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  public_id: {
    type: String,
    required: true
  },
  secure_url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Basic URL validation
        return v && (v.startsWith('http') || v.startsWith('/uploads/') || v.startsWith('/cloudinary/'));
      },
      message: props => `${props.value} is not a valid URL!`
    }
  },
  url: String,
  resource_type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  format: String,
  width: Number,
  height: Number,
  bytes: Number,
  duration: Number, // For video/audio
  created_at: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Add a pre-save hook to validate media
mediaSchema.pre('save', function(next) {
  if (this.secure_url) {
    // Check for known missing file patterns
    const knownMissingPatterns = [
      'file_1760168733155_lfhjq4ik7ht',
      'file_1760263843073_w13593s5t8l',
      'file_1760276276250_3pqeekj048s'
    ];
    
    for (const pattern of knownMissingPatterns) {
      if (this.secure_url.includes(pattern)) {
        return next(new Error(`Media references a known missing file`));
      }
    }
  }
  next();
});

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Post author is required']
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: [2000, 'Post content cannot exceed 2000 characters'],
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video'],
    default: 'text',
    required: true,
    index: true
  },
  media: [mediaSchema],
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Hashtag cannot exceed 50 characters']
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  location: {
    name: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  privacy: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  bookmarks: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  poll: {
    question: String,
    options: [{
      text: String,
      votes: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }]
    }],
    expiresAt: Date,
    allowMultipleChoices: {
      type: Boolean,
      default: false
    }
  },
  hideLikes: {
    type: Boolean,
    default: false
  },
  hideComments: {
    type: Boolean,
    default: false
  },
  // Add fields for achievement posts
  isAchievement: {
    type: Boolean,
    default: false
  },
  achievementType: {
    type: String,
    enum: ['milestone', 'award', 'challenge', 'custom'],
    default: 'milestone'
  },
  achievementData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add a pre-save hook to validate post media
postSchema.pre('save', function(next) {
  if (this.media && this.media.length > 0) {
    for (let i = 0; i < this.media.length; i++) {
      const media = this.media[i];
      
      // Ensure secure_url is present
      if (!media.secure_url) {
        return next(new Error(`Media item ${i + 1} is missing secure_url`));
      }
      
      // Check for known missing file patterns
      const knownMissingPatterns = [
        'file_1760168733155_lfhjq4ik7ht',
        'file_1760263843073_w13593s5t8l',
        'file_1760276276250_3pqeekj048s'
      ];
      
      for (const pattern of knownMissingPatterns) {
        if (media.secure_url.includes(pattern)) {
          return next(new Error(`Media item ${i + 1} references a known missing file`));
        }
      }
    }
  }
  next();
});

// Indexes for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ privacy: 1, isActive: 1 });
postSchema.index({ isAchievement: 1, createdAt: -1 }); // Index for achievement posts
// Note: type field already has index: true in field definition, so no separate index needed
// Search-related indexes (weighted)
postSchema.index({ content: 'text', hashtags: 'text' }, { weights: { content: 10, hashtags: 5 } });

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments || 0; // Will be populated from Comment model
});

// Virtual for share count
postSchema.virtual('shareCount').get(function() {
  return this.shares ? this.shares.length : 0;
});

// Virtual for bookmark count
postSchema.virtual('bookmarkCount').get(function() {
  return this.bookmarks ? this.bookmarks.length : 0;
});

// Virtual for engagement score
postSchema.virtual('engagementScore').get(function() {
  const likes = this.likeCount;
  const comments = this.commentCount || 0;
  const shares = this.shareCount;
  const views = this.views || 0;
  
  // Weighted engagement score
  return (likes * 2) + (comments * 3) + (shares * 4) + (views * 0.1);
});

// Virtual for post URL
postSchema.virtual('postUrl').get(function() {
  return `/post/${this._id}`;
});

// Instance method to check if user liked the post
postSchema.methods.isLikedBy = function(userId) {
  // Handle edge cases where likes array might be undefined or null
  if (!this.likes || !Array.isArray(this.likes)) {
    return false;
  }
  
  return this.likes.some(like => 
    like.user && like.user.toString() === userId.toString()
  );
};

// Instance method to check if user bookmarked the post
postSchema.methods.isBookmarkedBy = function(userId) {
  // Handle edge cases where bookmarks array might be undefined or null
  if (!this.bookmarks || !Array.isArray(this.bookmarks)) {
    return false;
  }
  
  return this.bookmarks.some(bookmark => 
    bookmark.user && bookmark.user.toString() === userId.toString()
  );
};

// Instance method to check if user shared the post
postSchema.methods.isSharedBy = function(userId) {
  // Handle edge cases where shares array might be undefined or null
  if (!this.shares || !Array.isArray(this.shares)) {
    return false;
  }
  
  return this.shares.some(share => 
    share.user && share.user.toString() === userId.toString()
  );
};

// Static method to get trending posts
postSchema.statics.getTrending = async function(options = {}) {
  const {
    limit = 20,
    timeRange = 'week', // 'day', 'week', 'month', 'year'
    minViews = 0,
    minLikes = 0
  } = options;
  
  // Calculate date range
  const now = new Date();
  let startDate = new Date(now);
  
  switch (timeRange) {
    case 'day':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }
  
  // Query for trending posts
  const trendingPosts = await this.find({
    privacy: 'public',
    isActive: true,
    createdAt: { $gte: startDate },
    views: { $gte: minViews },
    likes: { $size: { $gte: minLikes } }
  })
  .populate('author', 'username displayName avatar isVerified')
  .sort({ 
    views: -1,
    createdAt: -1 
  })
  .limit(limit)
  .lean();
  
  return trendingPosts;
};

// Static method to get posts by feed type
postSchema.statics.getByFeedType = async function(feedType, userId, options = {}) {
  const {
    limit = 20,
    page = 1,
    contentType = 'all',
    hashtag,
    search
  } = options;
  
  // Base query
  let query = { isActive: true };
  
  // Apply feed type specific filters
  switch (feedType) {
    case 'following':
      if (userId) {
        // Get IDs of users that the current user follows
        const { Follow } = require('./Follow');
        const followingIds = await Follow.getFollowingIds(userId);
        
        // Include posts from followed users and own posts
        const authorIds = [...followingIds, userId];
        
        query.$and = [
          { author: { $in: authorIds } },
          {
            $or: [
              { privacy: 'public' },
              { privacy: 'followers', author: { $in: followingIds } },
              { author: userId } // Always show own posts
            ]
          }
        ];
      } else {
        // Not authenticated: show all public posts
        query.privacy = 'public';
      }
      break;
      
    case 'recent':
      // Recent feed: show all public posts + posts from followed users (most inclusive)
      if (userId) {
        const { Follow } = require('./Follow');
        const followingIds = await Follow.getFollowingIds(userId);
        
        query.$or = [
          { privacy: 'public' }, // All public posts from everyone
          { privacy: 'followers', author: { $in: followingIds } }, // Followers posts from people you follow
          { author: userId } // Always show own posts
        ];
      } else {
        // Not authenticated: show all public posts
        query.privacy = 'public';
      }
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
      if (userId) {
        const { Follow } = require('./Follow');
        const followingIds = await Follow.getFollowingIds(userId);
        
        query.$or = [
          { privacy: 'public' },
          { privacy: 'followers', author: { $in: followingIds } },
          { author: userId } // Always show own posts
        ];
      } else {
        // Not authenticated: only show public posts
        query.privacy = 'public';
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
  
  // Determine sort criteria based on feed type
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
  
  // Prefer $text score sort when using text search
  const isTextSearch = !!(
    (query.$and && query.$and.some(clause => clause.$text)) ||
    (query.$or && query.$or.some(clause => clause.$text))
  );
  
  const posts = await this.find(query, isTextSearch ? { score: { $meta: 'textScore' } } : undefined)
    .populate('author', 'username displayName avatar isVerified bio role followerCount location')
    .sort(isTextSearch ? { score: { $meta: 'textScore' }, createdAt: -1 } : sortCriteria)
    .limit(parseInt(limit))
    .skip(skip)
    .lean();
  
  return posts;
};

module.exports = mongoose.model('Post', postSchema);