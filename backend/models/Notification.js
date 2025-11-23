const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'follow',
      'unfollow',
      'like',
      'comment',
      'mention',
      'share',
      'message',
      'order',
      'payment',
      'product_approved',
      'product_rejected',
      'post',
      'system',
      'admin'
    ],
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  relatedModel: {
    type: String,
    enum: ['Post', 'Comment', 'Product', 'Order', 'Message', 'User']
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  actionUrl: {
    type: String
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static methods
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();
    
    // Populate sender info for real-time delivery
    await notification.populate('sender', 'username displayName avatar');
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

notificationSchema.statics.markAsRead = async function(notificationIds, userId) {
  try {
    const result = await this.updateMany(
      { 
        _id: { $in: notificationIds }, 
        recipient: userId,
        isRead: false 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );
    return result;
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  try {
    const result = await this.updateMany(
      { 
        recipient: userId,
        isRead: false 
      },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );
    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  try {
    const count = await this.countDocuments({
      recipient: userId,
      isRead: false,
      type: { $ne: 'message' }  // Exclude message notifications from general unread count
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      unreadOnly = false
    } = options;

    let query = { recipient: userId };
    
    if (type) {
      query.type = type;
    }
    
    if (unreadOnly) {
      query.isRead = false;
    }

    const notifications = await this.find(query)
      .populate('sender', 'username displayName avatar isVerified')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await this.countDocuments(query);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

// Instance methods
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

module.exports = mongoose.model('Notification', notificationSchema);