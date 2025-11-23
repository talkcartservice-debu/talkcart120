const mongoose = require('mongoose');

const Post = require('./Post');

const shareSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    shareType: {
      type: String,
      enum: ['direct', 'followers', 'public'],
      default: 'followers'
    },
    message: {
      type: String,
      maxlength: 500,
      default: ''
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  shareType: {
    type: String,
    enum: ['repost', 'direct_share', 'external_link'],
    default: 'repost'
  },
  message: {
    type: String,
    maxlength: 500,
    default: ''
  },
  platform: {
    type: String,
    enum: ['internal', 'twitter', 'facebook', 'linkedin', 'telegram', 'whatsapp', 'copy_link'],
    default: 'internal'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    referrer: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
shareSchema.index({ post: 1, createdAt: -1 });
shareSchema.index({ sharedBy: 1, createdAt: -1 });
shareSchema.index({ 'sharedWith.user': 1, createdAt: -1 });
shareSchema.index({ shareType: 1, platform: 1 });

// Virtual for share count
shareSchema.virtual('shareCount').get(function() {
  return this.sharedWith ? this.sharedWith.length : 0;
});

// Static method to create a simple share
shareSchema.statics.createSimpleShare = async function(postId, userId) {
  try {
    const share = new this({
      post: postId,
      sharedBy: userId,
      shareType: 'repost',
      platform: 'internal'
    });

    await share.save();
    return share;
  } catch (error) {
    throw error;
  }
};

// Static method to share post with followers
shareSchema.statics.shareWithFollowers = async function(postId, userId, message = '') {
  try {
    const Follow = mongoose.model('Follow');
    
    // Get user's followers
    const followers = await Follow.getFollowers(userId, { populate: false });
    const followerIds = followers.map(follow => follow.follower);

    if (followerIds.length === 0) {
      throw new Error('No followers to share with');
    }

    // Create share record
    const share = new this({
      post: postId,
      sharedBy: userId,
      shareType: 'repost',
      message: message,
      platform: 'internal',
      sharedWith: followerIds.map(followerId => ({
        user: followerId,
        shareType: 'followers',
        message: message
      }))
    });

    await share.save();
    
    // Populate the share with post and user data
    await share.populate([
      {
        path: 'post',
        populate: {
          path: 'author',
          select: 'username displayName avatar isVerified'
        }
      },
      {
        path: 'sharedBy',
        select: 'username displayName avatar isVerified'
      },
      {
        path: 'sharedWith.user',
        select: 'username displayName avatar'
      }
    ]);

    return share;
  } catch (error) {
    throw error;
  }
};

// Static method to share post directly with specific users
shareSchema.statics.shareWithUsers = async function(postId, userId, targetUserIds, message = '') {
  try {
    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      throw new Error('Target users are required');
    }

    // Create share record
    const share = new this({
      post: postId,
      sharedBy: userId,
      shareType: 'direct_share',
      message: message,
      platform: 'internal',
      sharedWith: targetUserIds.map(targetUserId => ({
        user: targetUserId,
        shareType: 'direct',
        message: message
      }))
    });

    await share.save();
    
    // Populate the share with post and user data
    await share.populate([
      {
        path: 'post',
        populate: {
          path: 'author',
          select: 'username displayName avatar isVerified'
        }
      },
      {
        path: 'sharedBy',
        select: 'username displayName avatar isVerified'
      },
      {
        path: 'sharedWith.user',
        select: 'username displayName avatar'
      }
    ]);

    return share;
  } catch (error) {
    throw error;
  }
};

// Static method to create external share (link copy, social media)
shareSchema.statics.createExternalShare = async function(postId, userId, platform, metadata = {}) {
  try {
    const share = new this({
      post: postId,
      sharedBy: userId,
      shareType: 'external_link',
      platform: platform,
      metadata: metadata,
      sharedWith: [] // External shares don't have specific recipients
    });

    await share.save();
    
    // Update post share count
    const Post = require('./Post');
    await Post.findByIdAndUpdate(postId, {
      $inc: { shareCount: 1 }
    });
    
    return share;
  } catch (error) {
    throw error;
  }
};

// Static method to get shares for a post
shareSchema.statics.getPostShares = function(postId, options = {}) {
  const { limit = 20, skip = 0, shareType = null } = options;
  
  let query = { post: postId, isActive: true };
  
  if (shareType) {
    query.shareType = shareType;
  }

  return this.find(query)
    .populate('sharedBy', 'username displayName avatar isVerified')
    .populate('sharedWith.user', 'username displayName avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get user's shares
shareSchema.statics.getUserShares = function(userId, options = {}) {
  const { limit = 20, skip = 0, shareType = null } = options;
  
  let query = { sharedBy: userId, isActive: true };
  
  if (shareType) {
    query.shareType = shareType;
  }

  return this.find(query)
    .populate({
      path: 'post',
      populate: {
        path: 'author',
        select: 'username displayName avatar isVerified'
      }
    })
    .populate('sharedWith.user', 'username displayName avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get shares received by a user
shareSchema.statics.getReceivedShares = function(userId, options = {}) {
  const { limit = 20, skip = 0 } = options;
  
  return this.find({
    'sharedWith.user': userId,
    isActive: true
  })
  .populate({
    path: 'post',
    populate: {
      path: 'author',
      select: 'username displayName avatar isVerified'
    }
  })
  .populate('sharedBy', 'username displayName avatar isVerified')
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to get share analytics
shareSchema.statics.getShareAnalytics = async function(postId) {
  try {
    const analytics = await this.aggregate([
      {
        $match: { post: new mongoose.Types.ObjectId(postId), isActive: true }
      },
      {
        $group: {
          _id: null,
          totalShares: { $sum: 1 },
          reposts: {
            $sum: {
              $cond: [{ $eq: ['$shareType', 'repost'] }, 1, 0]
            }
          },
          directShares: {
            $sum: {
              $cond: [{ $eq: ['$shareType', 'direct_share'] }, 1, 0]
            }
          },
          externalShares: {
            $sum: {
              $cond: [{ $eq: ['$shareType', 'external_link'] }, 1, 0]
            }
          },
          totalRecipients: { $sum: { $size: '$sharedWith' } }
        }
      }
    ]);

    return analytics[0] || {
      totalShares: 0,
      reposts: 0,
      directShares: 0,
      externalShares: 0,
      totalRecipients: 0
    };
  } catch (error) {
    throw error;
  }
};

// Add post save middleware to update the Post model
shareSchema.post('save', async function(doc) {
  try {
    // Update the Post model to add shares
    if (doc.sharedWith && doc.sharedWith.length > 0) {
      const postUpdate = {
        $push: {
          shares: {
            $each: doc.sharedWith.map(share => ({
              user: share.user,
              createdAt: share.sharedAt || new Date()
            }))
          }
        }
      };
      
      await Post.findByIdAndUpdate(doc.post, postUpdate, { new: true });
    }
  } catch (error) {
    console.error('Error updating post shares:', error);
  }
});

// Add post remove middleware to update the Post model
shareSchema.post('remove', async function(doc) {
  try {
    // Update the Post model to remove shares
    if (doc.sharedWith && doc.sharedWith.length > 0) {
      const postUpdate = {
        $pull: {
          shares: {
            user: { $in: doc.sharedWith.map(share => share.user) }
          }
        }
      };
      
      await Post.findByIdAndUpdate(doc.post, postUpdate, { new: true });
    }
  } catch (error) {
    console.error('Error removing post shares:', error);
  }
});

module.exports = mongoose.model('Share', shareSchema);
