const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  // Ticket ID
  ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // User who created the ticket
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Vendor associated with the ticket (if applicable)
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Product associated with the ticket (if applicable)
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    index: true
  },
  
  // Order associated with the ticket (if applicable)
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    index: true
  },
  
  // Ticket subject
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  // Ticket description
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  
  // Ticket category
  category: {
    type: String,
    required: true,
    enum: [
      'account',
      'billing',
      'orders',
      'products',
      'technical',
      'vendor',
      'refund',
      'other'
    ],
    default: 'other'
  },
  
  // Ticket priority
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Ticket status
  status: {
    type: String,
    required: true,
    enum: [
      'open',
      'pending',
      'in-progress',
      'resolved',
      'closed',
      'spam'
    ],
    default: 'open'
  },
  
  // Assigned agent (admin user)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Tags for categorization
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  
  // Custom fields for different ticket types
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Is this ticket visible to the customer?
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Resolution details
  resolvedAt: {
    type: Date
  },
  
  resolutionNotes: {
    type: String,
    trim: true,
    maxlength: 2000
  }
}, {
  timestamps: true
});

// Indexes for better query performance
supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ vendorId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: -1 });
supportTicketSchema.index({ category: 1, status: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });

// Pre-save middleware to update the updatedAt field
supportTicketSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Generate a unique ticket ID
supportTicketSchema.statics.generateTicketId = function() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TKT-${timestamp}-${random}`;
};

// Method to update ticket status
supportTicketSchema.methods.updateStatus = function(newStatus, resolutionNotes = null) {
  this.status = newStatus;
  if (newStatus === 'resolved' || newStatus === 'closed') {
    this.resolvedAt = new Date();
  }
  if (resolutionNotes) {
    this.resolutionNotes = resolutionNotes;
  }
  this.updatedAt = new Date();
  return this.save();
};

// Method to assign ticket to an agent
supportTicketSchema.methods.assignTo = function(agentId) {
  this.assignedTo = agentId;
  this.status = 'in-progress';
  this.updatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('SupportTicket', supportTicketSchema);