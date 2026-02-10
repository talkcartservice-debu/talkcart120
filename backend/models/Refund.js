const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema(
  {
    // Basic refund information
    refundId: {
      type: String,
      required: true,
      unique: true,
      default: () => `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    
    // Order and payment context
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    transactionReference: {
      type: String,
      required: true,
      index: true
    },
    
    // Customer information
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Refund amounts
    originalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      index: true
    },
    
    // Refund type and reason
    refundType: {
      type: String,
      enum: ['full', 'partial'],
      required: true,
      default: 'full'
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'customer_request',
        'defective_product',
        'wrong_item',
        'not_as_described',
        'shipping_issue',
        'duplicate_charge',
        'fraud_prevention',
        'admin_decision',
        'other'
      ]
    },
    reasonDetails: {
      type: String,
      maxlength: 1000
    },
    
    // Status and workflow
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed', 'cancelled'],
      required: true,
      default: 'pending',
      index: true
    },
    
    // Approval workflow
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: {
      type: Date
    },
    
    // Processing details
    processingMethod: {
      type: String,
      enum: ['manual', 'crypto', 'bank_transfer'],
      default: 'manual'
    },
    externalRefundId: {
      type: String // External gateway refund ID or other reference
    },
    
    // Additional metadata
    attachments: [{
      filename: String,
      url: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    
    // Communication log
    communications: [{
      type: { type: String, enum: ['note', 'email', 'sms', 'call'] },
      content: String,
      sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      sentAt: { type: Date, default: Date.now },
      recipient: String // email or phone
    }],
    
    // Error tracking
    error: {
      type: String
    },
    errorDetails: {
      type: mongoose.Schema.Types.Mixed
    },
    
    // Audit trail
    statusHistory: [{
      status: String,
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      changedAt: { type: Date, default: Date.now },
      reason: String,
      notes: String
    }],
    
    // Flags and settings
    isPartialRefund: {
      type: Boolean,
      default: false
    },
    requiresApproval: {
      type: Boolean,
      default: true
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    
    // Expiry and deadlines
    expiresAt: {
      type: Date
    },
    deadlineAt: {
      type: Date
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
RefundSchema.index({ status: 1, createdAt: -1 });
RefundSchema.index({ customerId: 1, createdAt: -1 });
// Note: orderId field already has index: true in field definition, so no separate index needed
RefundSchema.index({ refundType: 1, status: 1 });
RefundSchema.index({ reason: 1, createdAt: -1 });
RefundSchema.index({ requestedAt: -1 });
RefundSchema.index({ priority: 1, status: 1 });

// Virtual for refund percentage
RefundSchema.virtual('refundPercentage').get(function() {
  if (this.originalAmount > 0) {
    return ((this.refundAmount / this.originalAmount) * 100).toFixed(2);
  }
  return 0;
});

// Virtual for processing time
RefundSchema.virtual('processingTime').get(function() {
  if (this.processedAt && this.requestedAt) {
    return Math.round((this.processedAt - this.requestedAt) / (1000 * 60 * 60)); // hours
  }
  return null;
});

// Instance methods
RefundSchema.methods.approve = async function(approvedBy, notes) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  
  this.statusHistory.push({
    status: 'approved',
    changedBy: approvedBy,
    changedAt: new Date(),
    notes: notes || 'Refund approved'
  });
  
  return this.save();
};

RefundSchema.methods.reject = async function(rejectedBy, reason) {
  this.status = 'rejected';
  
  this.statusHistory.push({
    status: 'rejected',
    changedBy: rejectedBy,
    changedAt: new Date(),
    reason: reason || 'Refund rejected',
    notes: reason
  });
  
  return this.save();
};

RefundSchema.methods.process = async function(processedBy, externalRefundId) {
  this.status = 'processing';
  this.processedBy = processedBy;
  this.processedAt = new Date();
  if (externalRefundId) this.externalRefundId = externalRefundId;
  
  this.statusHistory.push({
    status: 'processing',
    changedBy: processedBy,
    changedAt: new Date(),
    notes: 'Refund processing started'
  });
  
  return this.save();
};

RefundSchema.methods.complete = async function(completedBy) {
  this.status = 'completed';
  
  this.statusHistory.push({
    status: 'completed',
    changedBy: completedBy,
    changedAt: new Date(),
    notes: 'Refund completed successfully'
  });
  
  return this.save();
};

RefundSchema.methods.fail = async function(error, errorDetails) {
  this.status = 'failed';
  this.error = error;
  this.errorDetails = errorDetails;
  
  this.statusHistory.push({
    status: 'failed',
    changedAt: new Date(),
    notes: `Refund failed: ${error}`
  });
  
  return this.save();
};

// Static methods
RefundSchema.statics.getAnalytics = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalRefunds: { $sum: 1 },
        totalAmount: { $sum: '$refundAmount' },
        avgAmount: { $avg: '$refundAmount' },
        pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        approvedCount: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        rejectedCount: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        partialRefunds: { $sum: { $cond: ['$isPartialRefund', 1, 0] } },
        fullRefunds: { $sum: { $cond: [{ $not: '$isPartialRefund' }, 1, 0] } }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalRefunds: 0,
    totalAmount: 0,
    avgAmount: 0,
    pendingCount: 0,
    approvedCount: 0,
    completedCount: 0,
    rejectedCount: 0,
    partialRefunds: 0,
    fullRefunds: 0
  };
};

module.exports = mongoose.model('Refund', RefundSchema);
