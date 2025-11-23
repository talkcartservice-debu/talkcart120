const express = require('express');
const router = express.Router();
// Stripe require removed as part of Stripe cleanup
const Joi = require('joi');
const { authenticateToken } = require('./auth');
const Order = require('../models/Order');
const { initializePayment: initializePaystackPayment, verifyPayment: verifyPaystackPayment } = require('../services/paystackService');
const { initializePayment: initializeFlutterwavePayment, verifyPayment: verifyFlutterwavePayment } = require('../services/flutterwaveService');

// Stripe initialization removed as part of Stripe cleanup

// Flutterwave config
const FLW_PUBLIC_KEY = process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || process.env.FLW_PUBLIC_KEY; // for reference
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;

// Validation schema for Flutterwave init
const flwInitSchema = Joi.object({
  amount: Joi.number().positive().required(), // major units
  currency: Joi.string().uppercase().valid('RWF', 'USD', 'EUR', 'KES', 'UGX', 'TZS', 'SOS').required(),
  tx_ref: Joi.string().min(8).required(),
  customer: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().optional(),
    phonenumber: Joi.string().optional(),
  }).required(),
  meta: Joi.object().unknown(true).default({}),
}).required();

// Validation schema for Paystack init
const paystackInitSchema = Joi.object({
  amount: Joi.number().positive().required(), // amount in kobo (smallest currency unit)
  email: Joi.string().email().required(),
  currency: Joi.string().uppercase().valid('NGN', 'GHS', 'ZAR', 'USD', 'KES').default('NGN'),
  reference: Joi.string().optional(),
  callback_url: Joi.string().uri().optional(),
  metadata: Joi.object().unknown(true).optional(),
  channels: Joi.array().items(Joi.string()).optional(),
}).required();

// @route   POST /api/payments/flutterwave/init
// @desc    Initialize Flutterwave payment (Inline/Standard)
// @access  Private
router.post('/flutterwave/init', authenticateToken, async (req, res) => {
  try {
    if (!FLW_SECRET_KEY) {
      return res.status(400).json({ success: false, error: 'Flutterwave not configured' });
    }
    const { error, value } = flwInitSchema.validate(req.body || {}, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.details.map(d => d.message) });
    }

    // Add user's currency information to meta for tracking
    const enhancedMeta = {
      ...value.meta,
      user_currency: req.user?.currency || 'USD',
      original_amount: value.amount,
      original_currency: value.currency,
    };

    const payload = {
      ...value,
      meta: enhancedMeta,
      // Set redirect_url for Standard; Inline can ignore
      redirect_url: value.redirect_url || undefined,
    };

    const resp = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data) {
      return res.status(500).json({ success: false, error: 'Failed to init Flutterwave', details: data });
    }

    // Return ids needed for client Inline checkout if applicable
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Flutterwave init error:', err);
    return res.status(500).json({ success: false, error: 'Failed to initialize payment', message: err.message });
  }
});

// @route   POST /api/payments/paystack/init
// @desc    Initialize Paystack payment
// @access  Private
router.post('/paystack/init', authenticateToken, async (req, res) => {
  try {
    const { error, value } = paystackInitSchema.validate(req.body || {}, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: error.details.map(d => d.message) });
    }

    // Add metadata for tracking
    const enhancedMetadata = {
      ...value.metadata,
      user_id: req.user?.userId || 'unknown',
      custom_fields: [
        {
          display_name: 'User ID',
          variable_name: 'user_id',
          value: req.user?.userId || 'unknown'
        }
      ]
    };

    const payload = {
      ...value,
      metadata: enhancedMetadata
    };

    const data = await initializePaystackPayment(payload);
    
    if (!data || !data.status) {
      return res.status(500).json({ success: false, error: 'Failed to init Paystack', details: data });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Paystack init error:', err);
    return res.status(500).json({ success: false, error: 'Failed to initialize payment', message: err.message });
  }
});

// @route   GET /api/payments/paystack/verify/:reference
// @desc    Verify Paystack payment
// @access  Private
router.get('/paystack/verify/:reference', authenticateToken, async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({ success: false, error: 'Reference is required' });
    }

    const data = await verifyPaystackPayment(reference);
    
    if (!data || !data.status) {
      return res.status(500).json({ success: false, error: 'Failed to verify Paystack payment', details: data });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Paystack verify error:', err);
    return res.status(500).json({ success: false, error: 'Failed to verify payment', message: err.message });
  }
});

// @route   POST /api/payments/intent
// @desc    Create a test payment intent for admin testing
// @access  Private (Admin only in practice, but using general auth for simplicity)
router.post('/intent', authenticateToken, async (req, res) => {
  try {
    const { amount, currency } = req.body;

    // Validate input
    if (!amount || !currency) {
      return res.status(400).json({
        success: false,
        message: 'Amount and currency are required'
      });
    }

    // For testing purposes, we'll just return a mock payment intent
    // In a real implementation, this would create an actual payment intent
    const paymentIntent = {
      id: `pi_test_${Date.now()}`,
      amount: amount * 100, // Convert to cents/smallest unit
      currency: currency.toLowerCase(),
      status: 'requires_payment_method',
      client_secret: `pi_test_${Date.now()}_secret_${Math.random().toString(36).substr(2, 10)}`,
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      payment_method_types: ['card'],
      description: 'Test Payment Intent'
    };

    res.json({
      success: true,
      data: paymentIntent
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent'
    });
  }
});

// @route   GET /api/payments/history
// @desc    Get user's payment history (based on completed orders)
// @access  Private
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;
    
    const query = { 
      userId,
      status: 'completed'  // Only show completed payments
    };

    // Find completed orders for this user
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Transform orders into payment history format
    const payments = orders.map(order => ({
      id: order._id,
      orderId: order._id,
      amount: order.totalAmount,
      currency: order.currency,
      status: order.status,
      method: order.paymentMethod,
      createdAt: order.createdAt,
      completedAt: order.completedAt
    }));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// @route   GET /api/payments/:id
// @desc    Get specific payment details
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const paymentId = req.params.id;

    // Find the order that matches this payment
    const order = await Order.findOne({ 
      _id: paymentId, 
      userId,
      status: 'completed'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = {
      id: order._id,
      orderId: order._id,
      amount: order.totalAmount,
      currency: order.currency,
      status: order.status,
      method: order.paymentMethod,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      items: order.items,
      shippingAddress: order.shippingAddress
    };

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment'
    });
  }
});

// Stripe intent route removed as part of Stripe cleanup

module.exports = router;