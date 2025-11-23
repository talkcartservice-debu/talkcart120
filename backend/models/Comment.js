const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Comment must belong to a post']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Comment author is required']
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    maxlength: [1000, 'Comment content cannot exceed 1000 characters'],
    trim: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null // null for top-level comments
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
  isActive: {
    type: Boolean,
    default: true
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true,
      enum: ['spam', 'harassment', 'hate-speech', 'misinformation', 'inappropriate', 'other']
    },
    description: {
      type: String,
      maxlength: 500
    },
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parent: 1, createdAt: 1 });
commentSchema.index({ isActive: 1 });
commentSchema.index({ content: 'text' }); // Text search index
commentSchema.index({ 'reports.reportedBy': 1 }); // For report queries

// Virtual for like count
commentSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for reply count
commentSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for comment URL
commentSchema.virtual('commentUrl').get(function() {
  return `/post/${this.post}/comment/${this._id}`;
});

// Virtual for nesting level (calculated during population)
commentSchema.virtual('level').get(function() {
  return this._level || 0;
});

// Instance method to check if user liked the comment
commentSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Instance method to add like
commentSchema.methods.addLike = function(userId) {
  if (!this.isLikedBy(userId)) {
    this.likes.push({ user: userId });
  }
  return this.save();
};

// Instance method to remove like
commentSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  return this.save();
};

// Static method to get comments for a post with threading
commentSchema.statics.getPostComments = async function(postId, options = {}) {
  const { 
    limit = 20, 
    skip = 0, 
    sortBy = 'createdAt', 
    sortOrder = 1,
    maxDepth = 3 
  } = options;

  // Build sort object
  let sortObject = {};
  if (sortBy === 'likeCount') {
    // For popular sorting, we need to use aggregation to sort by array length
    const pipeline = [
      {
        $match: {
          post: new mongoose.Types.ObjectId(postId),
          parent: null,
          isActive: true
        }
      },
      {
        $addFields: {
          likeCount: { $size: { $ifNull: ['$likes', []] } }
        }
      },
      {
        $sort: { likeCount: sortOrder, createdAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
          pipeline: [
            { $project: { username: 1, displayName: 1, avatar: 1, isVerified: 1 } }
          ]
        }
      },
      {
        $unwind: '$author'
      },
      {
        $lookup: {
          from: 'users',
          localField: 'mentions',
          foreignField: '_id',
          as: 'mentions',
          pipeline: [
            { $project: { username: 1, displayName: 1 } }
          ]
        }
      }
    ];

    const topLevelComments = await this.aggregate(pipeline);
    
    // Convert to proper documents
    const commentDocs = topLevelComments.map(comment => {
      const doc = new this(comment);
      doc.isNew = false;
      return doc;
    });

    return this.processCommentsWithReplies(commentDocs, postId);
  } else {
    sortObject[sortBy] = sortOrder;
  }

  // Get top-level comments first (without .lean() to preserve methods and virtuals)
  const topLevelComments = await this.find({
    post: postId,
    parent: null,
    isActive: true
  })
  .populate('author', 'username displayName avatar isVerified')
  .populate('mentions', 'username displayName')
  .sort(sortObject)
  .limit(limit)
  .skip(skip);

  // Use the helper method to process comments with replies
  return this.processCommentsWithReplies(topLevelComments, postId);
};

// Helper method to process comments with replies (used by both regular and aggregation queries)
commentSchema.statics.processCommentsWithReplies = async function(topLevelComments, postId) {
  // Get all replies for these comments
  const commentIds = topLevelComments.map(comment => comment._id);
  const allReplies = await this.find({
    post: postId,
    parent: { $in: commentIds },
    isActive: true
  })
  .populate('author', 'username displayName avatar isVerified')
  .populate('mentions', 'username displayName')
  .sort({ createdAt: 1 });

  // Organize replies into threads
  const commentsWithReplies = topLevelComments.map(comment => {
    const replies = allReplies.filter(reply => 
      reply.parent && reply.parent.toString() === comment._id.toString()
    );
    
    return {
      ...comment.toObject(),
      replies: replies.map(reply => ({ 
        ...reply.toObject(),
        id: reply._id.toString(),
        level: 1,
      })),
      replyCount: replies.length
    };
  });

  return commentsWithReplies;
};

// Static method to get comment thread (comment + all its replies)
commentSchema.statics.getCommentThread = async function(commentId, options = {}) {
  const { maxDepth = 3 } = options;

  const comment = await this.findById(commentId)
    .populate('author', 'username displayName avatar isVerified')
    .populate('mentions', 'username displayName')
    .lean();

  if (!comment) return null;

  // Get all replies recursively
  const getReplies = async (parentId, currentDepth = 0) => {
    if (currentDepth >= maxDepth) return [];

    const replies = await this.find({
      parent: parentId,
      isActive: true
    })
    .populate('author', 'username displayName avatar isVerified')
    .populate('mentions', 'username displayName')
    .sort({ createdAt: 1 })
    .lean();

    // Get nested replies for each reply
    for (let reply of replies) {
      reply.level = currentDepth + 1;
      reply.replies = await getReplies(reply._id, currentDepth + 1);
      reply.replyCount = reply.replies.length;
    }

    return replies;
  };

  comment.replies = await getReplies(comment._id);
  comment.replyCount = comment.replies.length;
  comment.level = 0;

  return comment;
};

// Static method to search comments
commentSchema.statics.searchComments = function(query, options = {}) {
  const { limit = 20, skip = 0, sortBy = 'createdAt', sortOrder = -1 } = options;
  
  const searchRegex = new RegExp(query, 'i');
  
  return this.find({
    content: searchRegex,
    isActive: true
  })
  .populate('author', 'username displayName avatar isVerified')
  .populate('post', 'content author')
  .sort({ [sortBy]: sortOrder })
  .limit(limit)
  .skip(skip);
};

// Static method to get user's comments
commentSchema.statics.getUserComments = function(userId, options = {}) {
  const { limit = 20, skip = 0, sortBy = 'createdAt', sortOrder = -1 } = options;
  
  return this.find({
    author: userId,
    isActive: true
  })
  .populate('post', 'content author')
  .sort({ [sortBy]: sortOrder })
  .limit(limit)
  .skip(skip);
};

// Pre-save middleware to extract mentions
commentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    // Extract mentions from content (@username)
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(this.content)) !== null) {
      mentions.push(match[1]);
    }
    
    // Store mention usernames for later processing
    this._mentionUsernames = mentions;
  }
  next();
});

// Post-save middleware to resolve mentions to user IDs
commentSchema.post('save', async function(doc) {
  if (doc._mentionUsernames && doc._mentionUsernames.length > 0) {
    try {
      const User = mongoose.model('User');
      const users = await User.find({
        username: { $in: doc._mentionUsernames }
      }).select('_id');
      
      doc.mentions = users.map(user => user._id);
      await doc.save();
    } catch (error) {
      console.error('Error resolving mentions:', error);
    }
  }
});

module.exports = mongoose.model('Comment', commentSchema);
