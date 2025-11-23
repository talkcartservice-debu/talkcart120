const mongoose = require('mongoose');

const RefundEventSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['submitted', 'failed'], required: true },
    at: { type: Date, default: Date.now }, // TTL / time-based indexes defined below
    // Payment/amount context
    paymentIntentId: { type: String, index: true },
    currency: { type: String, uppercase: true, index: true },
    amountCents: { type: Number },
    // Optional error info
    error: { type: String },
    // Actor and metadata
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Compound indexes for common queries
RefundEventSchema.index({ type: 1, at: -1 });
RefundEventSchema.index({ currency: 1, at: -1 });

// Configure TTL if REFUND_EVENT_TTL_DAYS is set; otherwise ensure a time index exists for sorting
const ttlDays = Number(process.env.REFUND_EVENT_TTL_DAYS || 0);
if (ttlDays > 0) {
  RefundEventSchema.index({ at: 1 }, { expireAfterSeconds: Math.floor(ttlDays * 86400), name: 'refundEventTTL' });
} else {
  RefundEventSchema.index({ at: -1 }, { name: 'refundEventAt' });
}

module.exports = mongoose.model('RefundEvent', RefundEventSchema);