
const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  // Email details
  recipient: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  template: {
    type: String,
    default: 'admin-notification'
  },
  
  // Recipient information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  
  // Sender information
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sentByEmail: {
    type: String,
    required: true
  },
  
  // Email status
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'bounced'],
    default: 'pending'
  },
  
  // Delivery information
  messageId: {
    type: String,
    sparse: true, // Allow null values but ensure uniqueness when present
    index: true
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  
  // Error information
  error: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0
  },
  
  // Email service information
  provider: {
    type: String,
    default: 'nodemailer'
  },
  isMock: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
emailLogSchema.index({ userId: 1, createdAt: -1 });
emailLogSchema.index({ sentBy: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ recipient: 1, createdAt: -1 });
// Note: messageId field already has index: true in field definition, so no separate index needed

// Virtual for formatted sent date
emailLogSchema.virtual('formattedSentAt').get(function() {
  if (!this.sentAt) return null;
  return this.sentAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Virtual for delivery status
emailLogSchema.virtual('deliveryStatus').get(function() {
  if (this.status === 'sent' && this.deliveredAt) return 'delivered';
  if (this.status === 'sent') return 'sent';
  if (this.status === 'failed') return 'failed';
  if (this.status === 'bounced') return 'bounced';
  return 'pending';
});

// Static method to create email log
emailLogSchema.statics.createLog = async function(emailData) {
  try {
    const log = new this(emailData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create email log:', error);
    throw error;
  }
};

// Static method to update email status
emailLogSchema.statics.updateStatus = async function(messageId, status, additionalData = {}) {
  try {
    const updateData = { status, ...additionalData };
    if (status === 'sent' && !additionalData.sentAt) {
      updateData.sentAt = new Date();
    }
    if (status === 'delivered' && !additionalData.deliveredAt) {
      updateData.deliveredAt = new Date();
    }
    
    const log = await this.findOneAndUpdate(
      { messageId: { $eq: messageId } },
      updateData,
      { new: true }
    );
    return log;
  } catch (error) {
    console.error('Failed to update email status:', error);
    throw error;
  }
};

// Static method to get user email history
emailLogSchema.statics.getUserEmailHistory = async function(userId, limit = 50) {
  try {
    const emails = await this.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sentBy', 'username email')
      .lean();
    
    return emails;
  } catch (error) {
    console.error('Failed to get user email history:', error);
    throw error;
  }
};

// Static method to get admin email statistics
emailLogSchema.statics.getEmailStats = async function(timeRange = '30d') {
  try {
    const days = parseInt(timeRange.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stats = await this.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalEmails: { $sum: 1 },
          sentEmails: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
          },
          failedEmails: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          pendingEmails: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);
    
    return stats[0] || {
      totalEmails: 0,
      sentEmails: 0,
      failedEmails: 0,
      pendingEmails: 0
    };
  } catch (error) {
    console.error('Failed to get email stats:', error);
    throw error;
  }
};

// Instance method to retry sending
emailLogSchema.methods.retry = async function() {
  this.retryCount += 1;
  this.status = 'pending';
  this.error = undefined;
  await this.save();
  return this;
};

// Pre-save middleware to set sentByEmail if not provided
emailLogSchema.pre('save', async function(next) {
  if (this.isNew && this.sentBy && !this.sentByEmail) {
    try {
      const User = mongoose.model('User');
      const sender = await User.findById(this.sentBy).select('email');
      if (sender) {
        this.sentByEmail = sender.email;
      }
    } catch (error) {
      console.error('Failed to populate sentByEmail:', error);
    }
  }
  next();
});

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

module.exports = EmailLog;
