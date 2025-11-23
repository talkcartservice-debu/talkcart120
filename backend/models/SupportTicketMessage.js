const mongoose = require('mongoose');

const supportTicketMessageSchema = new mongoose.Schema({
  // Reference to the support ticket
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportTicket',
    required: true,
    index: true
  },
  
  // User who sent the message
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Message content
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  
  // Message type
  messageType: {
    type: String,
    required: true,
    enum: ['customer', 'vendor', 'admin', 'system'],
    default: 'customer'
  },
  
  // Is this message visible to the customer?
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Attachments (file URLs, etc.)
  attachments: [{
    filename: String,
    url: String,
    type: String, // image, document, etc.
    size: Number
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
supportTicketMessageSchema.index({ ticketId: 1, createdAt: 1 });
supportTicketMessageSchema.index({ senderId: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicketMessage', supportTicketMessageSchema);