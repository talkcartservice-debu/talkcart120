const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authenticateToken } = require('./auth');
const Order = require('../models/Order');
const { initializePayment: initializePaystackPayment, verifyPayment: verifyPaystackPayment } = require('../services/paystackService');

// Paystack initialization

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

module.exports = router;
