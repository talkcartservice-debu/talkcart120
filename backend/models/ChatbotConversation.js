const mongoose = require('mongoose');

const chatbotConversationSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatbotMessage'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  // Chatbot-specific settings
  botEnabled: {
    type: Boolean,
    default: true
  },
  botPersonality: {
    type: String,
    enum: ['friendly', 'professional', 'concise'],
    default: 'friendly'
  },
  // Modern chat features
  isPinned: {
    type: Boolean,
    default: false
  },
  isMuted: {
    type: Boolean,
    default: false
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  tags: [String],
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Chat container features
  containerType: {
    type: String,
    enum: ['standard', 'fullscreen', 'sidebar', 'popup'],
    default: 'standard'
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'auto'
  },
  notificationSettings: {
    desktop: {
      type: Boolean,
      default: true
    },
    sound: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatbotConversationSchema.index({ customerId: 1, vendorId: 1, productId: 1 });
chatbotConversationSchema.index({ vendorId: 1, isActive: 1 });
chatbotConversationSchema.index({ productId: 1 });
chatbotConversationSchema.index({ lastActivity: -1 });
chatbotConversationSchema.index({ isPinned: 1, lastActivity: -1 });
chatbotConversationSchema.index({ priority: 1 });
chatbotConversationSchema.index({ assignedAdmin: 1 });

module.exports = mongoose.model('ChatbotConversation', chatbotConversationSchema);