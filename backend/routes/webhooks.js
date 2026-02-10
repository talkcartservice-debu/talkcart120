const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
// Cart model removed as part of cart functionality removal
const WebhookEvent = require('../models/WebhookEvent');
const crypto = require('crypto');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY; // For API verification
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET; // For webhook verification

// Paystack webhook verification middleware
const verifyPaystackSignature = (req, res, next) => {
  try {
    if (!PAYSTACK_WEBHOOK_SECRET) {
      return res.status(400).json({ success: false, message: 'Paystack webhook not configured' });
    }

    const paystackSignature = req.headers['x-paystack-signature'];
    const raw = req.body; // Buffer provided by express.raw({ type: 'application/json' })

    if (!paystackSignature || !raw) {
      return res.status(400).json({ success: false, message: 'Invalid Paystack signature' });
    }

    // Compute expected signature
    const computed = crypto.createHmac('sha512', PAYSTACK_WEBHOOK_SECRET).update(raw).digest('hex');
    
    if (computed !== paystackSignature) {
      return res.status(400).json({ success: false, message: 'Invalid Paystack signature' });
    }

    next();
  } catch (err) {
    console.error('Paystack signature verification failed:', err.message);
    return res.status(400).json({ success: false, message: 'Invalid Paystack signature' });
  }
};

// @route   POST /api/webhooks/paystack
// @desc    Handle Paystack webhook events (payment completion)
// @access  Public (with signature verification)
router.post('/paystack', express.raw({ type: 'application/json' }), verifyPaystackSignature, async (req, res) => {
  try {
    // Idempotency guard: store processed Paystack event IDs
    const data = JSON.parse(req.body);
    const eventId = String(data.event || '');
    const reference = String(data.data?.reference || '');
    
    // Only process successful payment events
    if (eventId !== 'charge.success') {
      return res.status(200).json({ success: true, received: true });
    }
    
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Invalid Paystack event data' });
    }

    try {
      await WebhookEvent.create({ source: 'paystack', eventId: reference, meta: { event: eventId } });
    } catch (e) {
      // Duplicate (unique index) → already processed
      return res.status(200).json({ success: true, received: true, duplicate: true });
    }

    // Verify with Paystack API before fulfilling
    const verify = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
    });
    const verifyResponse = await verify.json();
    const vdata = verifyResponse?.data || {};
    const ok = (vdata.status || '').toLowerCase() === 'success' && String(vdata.reference) === String(reference);

    if (ok) {
      // Update order if it exists and references this transaction reference
      try {
        const order = await Order.findOne({ transactionReference: reference });
        if (order) {
          order.status = 'paid';
          order.paymentStatus = 'confirmed';
          order.paymentConfirmedAt = new Date();
          await order.save();
          console.log(`📦 Order ${order.orderNumber} marked as paid via Paystack webhook`);
        }
      } catch (orderErr) {
        console.warn('Order update via Paystack webhook failed:', orderErr.message);
      }
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('Paystack webhook handler error:', error);
    return res.status(400).json({ success: false, message: 'Paystack webhook handler failed' });
  }
});

module.exports = router;