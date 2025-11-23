const mongoose = require('mongoose');

const chatbotMessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatbotConversation',
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['text', 'system', 'suggestion', 'image', 'file', 'link'],
    default: 'text'
  },
  // Bot-specific fields
  isBotMessage: {
    type: Boolean,
    default: false
  },
  botConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },
  suggestedResponses: [{
    text: String,
    action: String // e.g., 'ask_price', 'ask_availability', 'request_demo'
  }],
  // Metadata for analytics
  responseTime: Number, // in milliseconds
  userSatisfaction: {
    type: Number,
    min: 1,
    max: 5
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  metadata: {
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatbotMessage'
    }
  },
  // Modern chat features
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'audio', 'file'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    name: String,
    size: Number,
    thumbnail: String
  }],
  reactions: [{
    emoji: String,
    userIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    count: {
      type: Number,
      default: 0
    }
  }],
  mentions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  // Rich content support
  richContent: {
    title: String,
    description: String,
    imageUrl: String,
    url: String,
    metadata: Object
  },
  // Forwarding
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatbotMessage'
  },
  isForwarded: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

chatbotMessageSchema.index({ conversationId: 1, createdAt: -1 });
chatbotMessageSchema.index({ senderId: 1 });
chatbotMessageSchema.index({ isBotMessage: 1 });
chatbotMessageSchema.index({ 'reactions.emoji': 1 });
chatbotMessageSchema.index({ mentions: 1 });
chatbotMessageSchema.index({ status: 1 });

module.exports = mongoose.model('ChatbotMessage', chatbotMessageSchema);
