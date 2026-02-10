const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { authenticateTokenStrict } = require('./auth');
const { verifyPayment: verifyPaystackPayment } = require('../services/paystackService');

// @route   GET /api/orders
// @desc    Get user's order history
// @access  Private
router.get('/', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { userId };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate({
        path: 'items.productId',
        select: 'name images category vendorId color'
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Get specific order details
// @access  Private
router.get('/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = req.params.id;

    const order = await Order.findOne({ _id: orderId, userId })
      .populate({
        path: 'items.productId',
        select: 'name images category description vendorId color'
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
});

// @route   POST /api/orders/:id/cancel
// @desc    Cancel an order
// @access  Private
router.post('/:id/cancel', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = req.params.id;

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending' && order.status !== 'processing') {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled'
      });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order'
    });
  }
});

// @route   POST /api/orders/:id/track
// @desc    Get tracking information for an order
// @access  Private
router.post('/:id/track', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = req.params.id;

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // In a real implementation, this would integrate with a shipping carrier API
    // For now, we'll return mock tracking data
    const trackingInfo = {
      trackingNumber: order.trackingNumber || 'TRK-' + Date.now(),
      carrier: order.carrier || 'Standard Shipping',
      estimatedDelivery: order.estimatedDelivery || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: order.status,
      events: [
        {
          timestamp: order.createdAt,
          location: 'Order Placed',
          description: 'Your order has been placed successfully'
        },
        {
          timestamp: order.processingAt || order.createdAt,
          location: 'Processing Center',
          description: 'Your order is being processed'
        },
        ...(order.status === 'shipped' || order.status === 'delivered' ? [{
          timestamp: order.shippedAt || new Date(),
          location: 'Shipping Facility',
          description: 'Your order has been shipped'
        }] : []),
        ...(order.status === 'delivered' ? [{
          timestamp: order.deliveredAt || new Date(),
          location: order.shippingAddress?.city || 'Delivery Location',
          description: 'Your order has been delivered'
        }] : [])
      ]
    };

    res.json({
      success: true,
      data: trackingInfo
    });

  } catch (error) {
    console.error('Error fetching tracking info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tracking information'
    });
  }
});

// @route   GET /api/orders/:id/invoice
// @desc    Download invoice for an order
// @access  Private
router.get('/:id/invoice', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = req.params.id;

    const order = await Order.findOne({ _id: orderId, userId })
      .populate({
        path: 'items.productId',
        select: 'name description'
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

    // For now, we'll return a simple text invoice
    // In a real implementation, this would generate a proper PDF
    const invoiceContent = `
INVOICE
=======
Order ID: ${order._id}
Date: ${new Date(order.createdAt).toLocaleDateString()}
Customer: ${req.user.name}

Items:
${order.items.map(item => 
  `${item.productId?.name || item.name} - Qty: ${item.quantity} - Price: $${item.price.toFixed(2)} - Total: $${(item.quantity * item.price).toFixed(2)}`
).join('\n')}

Subtotal: $${order.totalAmount.toFixed(2)}
Shipping: $0.00
Tax: $0.00
Total: $${order.totalAmount.toFixed(2)}

Shipping Address:
${order.shippingAddress.fullName}
${order.shippingAddress.address}
${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}
${order.shippingAddress.country}

Thank you for your purchase!
    `.trim();

    res.send(invoiceContent);

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice'
    });
  }
});

// @route   POST /api/orders/:id/confirm-payment
// @desc    Confirm payment for an order using Paystack reference
// @access  Private
router.post('/:id/confirm-payment', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orderId = req.params.id;
    const { paymentMethod, transactionReference } = req.body;

    if (!transactionReference) {
      return res.status(400).json({ success: false, message: 'Transaction reference is required' });
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'pending' && order.status !== 'failed') {
      return res.status(400).json({ success: false, message: 'Order is already processed or paid' });
    }

    // Verify with Paystack API
    const verify = await verifyPaystackPayment(transactionReference);
    
    if (!verify || !verify.status || verify.data.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Update order status
    order.status = 'paid';
    order.paymentStatus = 'confirmed';
    order.paymentConfirmedAt = new Date();
    order.transactionReference = transactionReference;
    order.paymentMethod = paymentMethod || order.paymentMethod;
    
    await order.save();

    // Increment sales for products
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { sales: item.quantity, stock: -item.quantity }
      });
    }

    // Clear user's cart
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });

    res.json({
      success: true,
      message: 'Payment confirmed and order updated',
      data: order
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message
    });
  }
});

module.exports = router;