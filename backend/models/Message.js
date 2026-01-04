const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: false,
    default: '',
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'system', 'post_share'],
    default: 'text'
  },
  media: {
    public_id: String,
    secure_url: String,
    url: String,
    resource_type: String,
    format: String,
    bytes: Number
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
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
  isDeleted: {
    type: Boolean,
    default: false
  },
  isForwarded: {
    type: Boolean,
    default: false
  },
  forwardedFrom: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation'
    },
    originalSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

module.exports = mongoose.model('Message', messageSchema);
