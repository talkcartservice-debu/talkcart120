const mongoose = require('mongoose');

// Stores processed webhook events to ensure idempotency
// Unique constraints prevent double-processing on retries
const webhookEventSchema = new mongoose.Schema({
  source: { type: String, required: true, enum: ['flutterwave'] },
  eventId: { type: String, required: true }, // Stripe: event.id, Flutterwave: transaction id
  tx_ref: { type: String }, // Flutterwave primary linkage (optional)
  meta: { type: Object },
}, {
  timestamps: true
});

// Only use schema-level indexes to avoid duplicates
webhookEventSchema.index({ source: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);