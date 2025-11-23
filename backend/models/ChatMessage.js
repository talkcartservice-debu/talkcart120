const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['message', 'system', 'donation', 'gift', 'subscription'],
    default: 'message'
  },
  metadata: {
    // For donations
    donationAmount: Number,
    donationCurrency: String,
    // For gifts
    giftType: String,
    giftValue: Number,
    // For system messages
    systemType: String, // 'user_joined', 'user_left', 'stream_started', etc.
    // For moderation
    isModerated: { type: Boolean, default: false },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderationReason: String
  },
  reactions: {
    likes: { type: Number, default: 0 },
    hearts: { type: Number, default: 0 },
    laughs: { type: Number, default: 0 }
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance
chatMessageSchema.index({ streamId: 1, createdAt: -1 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });
chatMessageSchema.index({ streamId: 1, isPinned: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);