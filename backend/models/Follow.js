const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure unique follow relationships
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Index for efficient queries
followSchema.index({ follower: 1, isActive: 1 });
followSchema.index({ following: 1, isActive: 1 });
followSchema.index({ createdAt: -1 });

// Static method to create follow relationship
followSchema.statics.createFollow = async function(followerId, followingId) {
  try {
    // Check if relationship already exists
    const existingFollow = await this.findOne({
      follower: followerId,
      following: followingId
    });

    if (existingFollow) {
      if (!existingFollow.isActive) {
        // Reactivate existing relationship
        existingFollow.isActive = true;
        await existingFollow.save();
        return existingFollow;
      }
      return existingFollow; // Already following
    }

    // Create new follow relationship
    const follow = new this({
      follower: followerId,
      following: followingId
    });

    await follow.save();
    return follow;
  } catch (error) {
    throw error;
  }
};

// Static method to remove follow relationship
followSchema.statics.removeFollow = async function(followerId, followingId) {
  try {
    const follow = await this.findOne({
      follower: followerId,
      following: followingId,
      isActive: true
    });

    if (follow) {
      follow.isActive = false;
      await follow.save();
      return follow;
    }

    return null;
  } catch (error) {
    throw error;
  }
};

// Static method to check if user is following another user
followSchema.statics.isFollowing = async function(followerId, followingId) {
  try {
    const follow = await this.findOne({
      follower: followerId,
      following: followingId,
      isActive: true
    });

    return !!follow;
  } catch (error) {
    throw error;
  }
};

// Static method to get user's followers
followSchema.statics.getFollowers = function(userId, options = {}) {
  const { limit = 20, skip = 0, populate = true } = options;
  
  let query = this.find({
    following: userId,
    isActive: true
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);

  if (populate) {
    query = query.populate('follower', 'username displayName avatar isVerified followerCount followingCount');
  }

  return query;
};

// Static method to get user's following
followSchema.statics.getFollowing = function(userId, options = {}) {
  const { limit = 20, skip = 0, populate = true } = options;
  
  let query = this.find({
    follower: userId,
    isActive: true
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);

  if (populate) {
    query = query.populate('following', 'username displayName avatar isVerified followerCount followingCount');
  }

  return query;
};

// Static method to get following IDs for feed generation
followSchema.statics.getFollowingIds = async function(userId) {
  try {
    const follows = await this.find({
      follower: userId,
      isActive: true
    }).select('following');

    return follows.map(follow => follow.following);
  } catch (error) {
    throw error;
  }
};

// Static method to get follower IDs
followSchema.statics.getFollowerIds = async function(userId) {
  try {
    const follows = await this.find({
      following: userId,
      isActive: true
    }).select('follower');

    return follows.map(follow => follow.follower);
  } catch (error) {
    throw error;
  }
};

// Static method to get mutual followers
followSchema.statics.getMutualFollowers = async function(userId1, userId2) {
  try {
    // Get followers of both users
    const user1Followers = await this.find({
      following: userId1,
      isActive: true
    }).select('follower');

    const user2Followers = await this.find({
      following: userId2,
      isActive: true
    }).select('follower');

    // Find mutual followers
    const user1FollowerIds = user1Followers.map(f => f.follower.toString());
    const user2FollowerIds = user2Followers.map(f => f.follower.toString());
    
    const mutualFollowerIds = user1FollowerIds.filter(id => 
      user2FollowerIds.includes(id)
    );

    return mutualFollowerIds;
  } catch (error) {
    throw error;
  }
};

// Static method to get follow suggestions
followSchema.statics.getFollowSuggestions = async function(userId, options = {}) {
  const { limit = 10 } = options;
  
  try {
    // Get users that current user's followers are following
    const currentUserFollowing = await this.getFollowingIds(userId);
    
    // Find users followed by people the current user follows
    const suggestions = await this.aggregate([
      {
        $match: {
          follower: { $in: currentUserFollowing },
          following: { $ne: new mongoose.Types.ObjectId(userId) },
          isActive: true
        }
      },
      {
        $group: {
          _id: '$following',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          _id: { $nin: [...currentUserFollowing, new mongoose.Types.ObjectId(userId)] }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: '$user._id',
          username: '$user.username',
          displayName: '$user.displayName',
          avatar: '$user.avatar',
          isVerified: '$user.isVerified',
          followerCount: '$user.followerCount',
          mutualFollowCount: '$count'
        }
      }
    ]);

    return suggestions;
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('Follow', followSchema);
