﻿const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Joi = require('joi');
const { User, RefundEvent, Refund, Product, Order, Settings, EmailLog, WebhookEvent, ChatbotConversation, ChatbotMessage } = require('../models');
const { authenticateTokenStrict } = require('./auth');
const emailService = require('../services/emailService');


// Simple admin check middleware
async function requireAdmin(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await User.findById(userId).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/admin/me
// Get current admin user information
router.get('/me', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId).select('username email role createdAt lastLogin');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (err) {
    console.error('admin me error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch admin user info' });
  }
});

// GET /api/admin/webhooks/events/recent
// List recent processed webhook events with filters (admin-only)
router.get('/webhooks/events/recent', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { limit: limitRaw, page: pageRaw, source, tx_ref, eventId, since, until } = req.query;
    const limit = Math.min(200, Math.max(1, Number(limitRaw) || 50));
    const page = Math.max(1, Number(pageRaw) || 1);

    const q = {};
    if (source) q.source = String(source);
    if (tx_ref) q.tx_ref = String(tx_ref);
    if (eventId) q.eventId = String(eventId);
    if (since || until) {
      q.createdAt = {};
      if (since) q.createdAt.$gte = new Date(Number(since));
      if (until) q.createdAt.$lte = new Date(Number(until));
    }

    const [items, total] = await Promise.all([
      WebhookEvent.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      WebhookEvent.countDocuments(q)
    ]);

    res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('admin webhooks events recent error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch webhook events' });
  }
});

// Build query helper for refunds
function buildRefundsQuery(params) {
  const { status, currency, since, until, paymentIntentId, userId } = params;
  const q = {};
  if (status && (status === 'submitted' || status === 'failed')) q.type = status;
  if (currency) q.currency = String(currency).toUpperCase();
  if (paymentIntentId) q.paymentIntentId = String(paymentIntentId);
  if (userId) {
    try {
      q.userId = new mongoose.Types.ObjectId(String(userId));
    } catch (e) {
      q.userId = null; // invalid will return empty set
    }
  }
  const sinceMs = since ? Number(since) : null;
  const untilMs = until ? Number(until) : null;
  if (sinceMs || untilMs) q.at = {};
  if (sinceMs) q.at.$gte = new Date(sinceMs);
  if (untilMs) q.at.$lte = new Date(untilMs);
  return q;
}

// GET /api/admin/refunds/recent
// Query params: limit (1..200), page (>=1), status, currency, since (ms), until (ms), paymentIntentId, userId
router.get('/refunds/recent', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { limit: limitRaw, page: pageRaw } = req.query;
    const limit = Math.min(200, Math.max(1, Number(limitRaw) || 50));
    const page = Math.max(1, Number(pageRaw) || 1);

    const q = buildRefundsQuery(req.query);

    const [items, total] = await Promise.all([
      RefundEvent.find(q).sort({ at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      RefundEvent.countDocuments(q),
    ]);

    res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('admin refunds recent error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch recent refunds' });
  }
});

// GET /api/admin/refunds/export.csv
// Streams CSV for large datasets with same filters as /recent
router.get('/refunds/export.csv', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const q = buildRefundsQuery(req.query);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="refund-events-${Date.now()}.csv"`);

    // CSV header
    const headers = ['_id', 'type', 'at', 'currency', 'amount', 'paymentIntentId', 'userId', 'error'];
    res.write(headers.join(',') + '\n');

    // Helper to escape CSV values
    const csvEscape = (val) => {
      if (val === null || val === undefined) return '';
      const s = String(val);
      if (/[",\n]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const cursor = RefundEvent.find(q).sort({ at: -1 }).cursor();
    cursor.on('data', (doc) => {
      const row = [
        csvEscape(doc._id),
        csvEscape(doc.type),
        csvEscape(new Date(doc.at).toISOString()),
        csvEscape(doc.currency),
        csvEscape(((doc.amountCents || 0) / 100).toFixed(2)),
        csvEscape(doc.paymentIntentId || ''),
        csvEscape(doc.userId || ''),
        csvEscape(doc.error || ''),
      ];
      res.write(row.join(',') + '\n');
    });
    cursor.on('end', () => res.end());
    cursor.on('error', (err) => {
      console.error('CSV export cursor error:', err);
      if (!res.headersSent) res.status(500);
      res.end();
    });
  } catch (err) {
    console.error('admin refunds export error:', err);
    if (!res.headersSent) res.status(500).end();
  }
});

// GET /api/admin/refunds/analytics
// Get refund analytics and statistics
router.get('/refunds/analytics', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const q = {};

    if (from || to) {
      q.at = {};
      if (from) q.at.$gte = new Date(Number(from));
      if (to) q.at.$lte = new Date(Number(to));
    }

    const [totalRefunds, submittedRefunds, failedRefunds, amountStats] = await Promise.all([
      RefundEvent.countDocuments(q),
      RefundEvent.countDocuments({ ...q, type: 'submitted' }),
      RefundEvent.countDocuments({ ...q, type: 'failed' }),
      RefundEvent.aggregate([
        { $match: q },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amountCents' },
            avgAmount: { $avg: '$amountCents' },
            currencies: { $addToSet: '$currency' }
          }
        }
      ])
    ]);

    const stats = amountStats[0] || { totalAmount: 0, avgAmount: 0, currencies: [] };

    res.json({
      success: true,
      data: {
        totalRefunds,
        submittedRefunds,
        failedRefunds,
        successRate: totalRefunds > 0 ? ((submittedRefunds / totalRefunds) * 100).toFixed(1) : '0',
        totalAmount: (stats.totalAmount || 0) / 100,
        avgAmount: (stats.avgAmount || 0) / 100,
        currencies: stats.currencies || []
      }
    });
  } catch (err) {
    console.error('admin refunds analytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch refund analytics' });
  }
});

// POST /api/admin/refunds/process
// Process a manual refund
router.post('/refunds/process', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { paymentIntentId, amount, currency, reason } = req.body;

    if (!paymentIntentId || !amount || !currency) {
      return res.status(400).json({
        success: false,
        message: 'Payment Intent ID, amount, and currency are required'
      });
    }

    // Validate amount
    const amountCents = Math.round(amount * 100);
    if (amountCents <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Here you would integrate with your payment processor (Stripe, etc.)
    // For now, we'll create a refund event
    const refundEvent = new RefundEvent({
      type: 'submitted',
      paymentIntentId,
      currency: currency.toUpperCase(),
      amountCents,
      userId: req.user.id,
      metadata: {
        reason: reason || 'Manual refund by admin',
        processedBy: req.user.id,
        processedAt: new Date()
      }
    });

    await refundEvent.save();

    // Broadcast to WebSocket if available
    const socketService = req.app.get('socketService');
    if (socketService) {
      socketService.broadcastRefundSubmitted({
        currency: currency.toUpperCase(),
        amountCents,
        paymentIntentId,
        userId: req.user.id,
        status: 'submitted'
      });
    }

    res.json({
      success: true,
      data: refundEvent,
      message: 'Refund processed successfully'
    });
  } catch (err) {
    console.error('admin process refund error:', err);
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
});

// ============================================================================
// COMPREHENSIVE REFUND MANAGEMENT ENDPOINTS
// ============================================================================

// GET /api/admin/refunds/management
// Get all refunds with comprehensive filtering and pagination
router.get('/refunds/management', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      refundType,
      reason,
      customerId,
      orderId,
      priority,
      from,
      to,
      search
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(200, Math.max(1, Number(limit)));

    // Build query
    const query = {};
    if (status) query.status = status;
    if (refundType) query.refundType = refundType;
    if (reason) query.reason = reason;
    if (customerId) query.customerId = customerId;
    if (orderId) query.orderId = orderId;
    if (priority) query.priority = priority;

    // Date range filter
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { refundId: { $regex: search, $options: 'i' } },
        { paymentIntentId: { $regex: search, $options: 'i' } },
        { reasonDetails: { $regex: search, $options: 'i' } }
      ];
    }

    const [refunds, total] = await Promise.all([
      Refund.find(query)
        .populate('customerId', 'username email')
        .populate('orderId', 'orderNumber totalAmount')
        .populate('requestedBy', 'username')
        .populate('approvedBy', 'username')
        .populate('processedBy', 'username')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Refund.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: refunds,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('admin refunds management error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch refunds' });
  }
});

// POST /api/admin/refunds/create
// Create a new refund request
router.post('/refunds/create', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const {
      orderId,
      paymentIntentId,
      customerId,
      refundAmount,
      originalAmount,
      currency,
      refundType,
      reason,
      reasonDetails,
      priority = 'normal',
      requiresApproval = true
    } = req.body;

    // Validation
    if (!orderId || !paymentIntentId || !customerId || !refundAmount || !currency || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Create refund
    const refund = new Refund({
      orderId,
      paymentIntentId,
      customerId,
      refundAmount: Math.round(refundAmount * 100), // Convert to cents
      originalAmount: originalAmount ? Math.round(originalAmount * 100) : order.totalAmount,
      currency: currency.toUpperCase(),
      refundType: refundType || (refundAmount >= order.totalAmount ? 'full' : 'partial'),
      reason,
      reasonDetails,
      priority,
      requiresApproval,
      requestedBy: req.user.id,
      isPartialRefund: refundAmount < (originalAmount || order.totalAmount),
      status: requiresApproval ? 'pending' : 'approved'
    });

    // Add initial status history
    refund.statusHistory.push({
      status: refund.status,
      changedBy: req.user.id,
      changedAt: new Date(),
      notes: 'Refund request created'
    });

    await refund.save();

    // Populate for response
    await refund.populate([
      { path: 'customerId', select: 'username email' },
      { path: 'orderId', select: 'orderNumber totalAmount' },
      { path: 'requestedBy', select: 'username' }
    ]);

    res.json({
      success: true,
      data: refund,
      message: 'Refund request created successfully'
    });
  } catch (err) {
    console.error('admin create refund error:', err);
    res.status(500).json({ success: false, message: 'Failed to create refund request' });
  }
});

// PATCH /api/admin/refunds/:id/status
// Update refund status (approve, reject, process, complete, etc.)
router.patch('/refunds/:id/status', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, externalRefundId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid refund ID' });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'processing', 'completed', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    // Use model methods for status changes
    switch (status) {
      case 'approved':
        await refund.approve(req.user.id, notes);
        break;
      case 'rejected':
        await refund.reject(req.user.id, notes);
        break;
      case 'processing':
        await refund.process(req.user.id, externalRefundId);
        break;
      case 'completed':
        await refund.complete(req.user.id);
        break;
      case 'failed':
        await refund.fail(notes || 'Processing failed', { failedBy: req.user.id });
        break;
      default:
        refund.status = status;
        refund.statusHistory.push({
          status,
          changedBy: req.user.id,
          changedAt: new Date(),
          notes: notes || `Status changed to ${status}`
        });
        await refund.save();
    }

    // Populate for response
    await refund.populate([
      { path: 'customerId', select: 'username email' },
      { path: 'orderId', select: 'orderNumber totalAmount' },
      { path: 'requestedBy', select: 'username' },
      { path: 'approvedBy', select: 'username' },
      { path: 'processedBy', select: 'username' }
    ]);

    res.json({
      success: true,
      data: refund,
      message: `Refund ${status} successfully`
    });
  } catch (err) {
    console.error('admin update refund status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update refund status' });
  }
});

// GET /api/admin/refunds/:id
// Get detailed refund information
router.get('/refunds/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid refund ID' });
    }

    const refund = await Refund.findById(id)
      .populate('customerId', 'username email phone')
      .populate('orderId', 'orderNumber totalAmount items status')
      .populate('requestedBy', 'username email')
      .populate('approvedBy', 'username email')
      .populate('processedBy', 'username email')
      .populate('statusHistory.changedBy', 'username')
      .lean();

    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    res.json({ success: true, data: refund });
  } catch (err) {
    console.error('admin get refund error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch refund details' });
  }
});

// POST /api/admin/refunds/:id/communicate
// Add communication to refund
router.post('/refunds/:id/communicate', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, content, recipient } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid refund ID' });
    }

    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    refund.communications.push({
      type,
      content,
      sentBy: req.user.id,
      recipient,
      sentAt: new Date()
    });

    await refund.save();

    res.json({
      success: true,
      data: refund.communications[refund.communications.length - 1],
      message: 'Communication added successfully'
    });
  } catch (err) {
    console.error('admin refund communicate error:', err);
    res.status(500).json({ success: false, message: 'Failed to add communication' });
  }
});

// GET /api/admin/refunds/analytics/comprehensive
// Get comprehensive refund analytics
router.get('/refunds/analytics/comprehensive', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;

    // Build date filter
    const dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) dateFilter.createdAt.$lte = new Date(to);
    }

    // Get basic analytics
    const basicAnalytics = await Refund.getAnalytics(dateFilter);

    // Get refunds by reason
    const refundsByReason = await Refund.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 },
          totalAmount: { $sum: '$refundAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get refunds by status over time
    const timeGrouping = groupBy === 'month'
      ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }
      : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };

    const refundsOverTime = await Refund.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            ...timeGrouping,
            status: '$status'
          },
          count: { $sum: 1 },
          amount: { $sum: '$refundAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get processing time analytics
    const processingTimeStats = await Refund.aggregate([
      {
        $match: {
          ...dateFilter,
          processedAt: { $exists: true },
          requestedAt: { $exists: true }
        }
      },
      {
        $project: {
          processingTimeHours: {
            $divide: [
              { $subtract: ['$processedAt', '$requestedAt'] },
              1000 * 60 * 60
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingTimeHours' },
          minProcessingTime: { $min: '$processingTimeHours' },
          maxProcessingTime: { $max: '$processingTimeHours' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        basic: basicAnalytics,
        byReason: refundsByReason,
        overTime: refundsOverTime,
        processingTime: processingTimeStats[0] || {
          avgProcessingTime: 0,
          minProcessingTime: 0,
          maxProcessingTime: 0
        }
      }
    });
  } catch (err) {
    console.error('admin comprehensive refund analytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch comprehensive analytics' });
  }
});

// POST /api/admin/refunds/bulk-action
// Perform bulk actions on refunds
router.post('/refunds/bulk-action', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { refundIds, action, data = {} } = req.body;

    if (!Array.isArray(refundIds) || refundIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid refund IDs' });
    }

    const validActions = ['approve', 'reject', 'cancel', 'update-priority'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const results = [];

    for (const refundId of refundIds) {
      try {
        const refund = await Refund.findById(refundId);
        if (!refund) {
          results.push({ refundId, success: false, message: 'Refund not found' });
          continue;
        }

        switch (action) {
          case 'approve':
            await refund.approve(req.user.id, data.notes || 'Bulk approval');
            break;
          case 'reject':
            await refund.reject(req.user.id, data.reason || 'Bulk rejection');
            break;
          case 'cancel':
            refund.status = 'cancelled';
            refund.statusHistory.push({
              status: 'cancelled',
              changedBy: req.user.id,
              changedAt: new Date(),
              notes: data.notes || 'Bulk cancellation'
            });
            await refund.save();
            break;
          case 'update-priority':
            refund.priority = data.priority || 'normal';
            await refund.save();
            break;
        }

        results.push({ refundId, success: true, message: `${action} completed` });
      } catch (error) {
        results.push({ refundId, success: false, message: error.message });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Bulk ${action} completed`
    });
  } catch (err) {
    console.error('admin bulk refund action error:', err);
    res.status(500).json({ success: false, message: 'Failed to perform bulk action' });
  }
});

// ============================================================================
// PRODUCT ADMIN ENDPOINTS
// ============================================================================

// List products with admin visibility (includes inactive)
// GET /api/admin/products
// Query: page, limit, search, category, vendorId, featured
router.get('/products', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      vendorId,
      featured,
    } = req.query || {};

    const pageN = Math.max(1, Number(page) || 1);
    const limitN = Math.min(200, Math.max(1, Number(limit) || 20));

    const q = {};
    if (category) q.category = category;
    if (vendorId && mongoose.Types.ObjectId.isValid(String(vendorId))) q.vendorId = String(vendorId);
    if (typeof featured !== 'undefined') q.featured = String(featured) === 'true';
    if (search) q.$text = { $search: String(search) };

    const [products, total] = await Promise.all([
      Product.find(q)
        .populate('vendorId', 'username displayName avatar isVerified walletAddress')
        .sort({ createdAt: -1 })
        .skip((pageN - 1) * limitN)
        .limit(limitN)
        .lean(),
      Product.countDocuments(q),
    ]);

    const transformed = products.map((p) => ({
      ...p,
      id: p._id,
      vendor: p.vendorId ? {
        id: p.vendorId._id,
        username: p.vendorId.username,
        displayName: p.vendorId.displayName,
        avatar: p.vendorId.avatar,
        isVerified: p.vendorId.isVerified,
        walletAddress: p.vendorId.walletAddress,
      } : undefined,
    }));

    return res.json({ success: true, data: { products: transformed, pagination: { page: pageN, limit: limitN, total, pages: Math.ceil(total / limitN) } } });
  } catch (e) {
    console.error('admin list products error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle product active/featured
router.patch('/products/:id/toggle', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, featured } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const update = {};
    if (typeof isActive === 'boolean') update.isActive = isActive;
    if (typeof featured === 'boolean') update.featured = featured;
    if (!Object.keys(update).length) return res.status(400).json({ success: false, message: 'No changes provided' });
    const doc = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, data: doc });
  } catch (e) {
    console.error('admin toggle product error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Edit product price/stock
router.patch('/products/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { price, stock } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const update = {};
    if (typeof price === 'number' && price >= 0) update.price = price;
    if (Number.isInteger(stock) && stock >= 0) update.stock = stock;
    if (!Object.keys(update).length) return res.status(400).json({ success: false, message: 'No changes provided' });
    const doc = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, data: doc });
  } catch (e) {
    console.error('admin edit product error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete product
router.delete('/products/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const doc = await Product.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, message: 'Product deleted' });
  } catch (e) {
    console.error('admin delete product error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create product as admin (allows setting isActive and featured)
router.post('/products/create', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      currency = 'USD',
      category,
      tags = [],
      stock = 1,
      images = [],
      isNFT = false,
      contractAddress,
      tokenId,
      featured = false,
      isActive = true
    } = req.body;

    // Validation
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, price, and category are required'
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0'
      });
    }

    // Create product with admin privileges
    const product = new Product({
      name: String(name).trim(),
      description: String(description).trim(),
      price: Number(price),
      currency: String(currency).toUpperCase(),
      category: String(category),
      tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
      stock: Math.max(0, Number(stock) || 0),
      images: Array.isArray(images) ? images : [],
      isNFT: !!isNFT,
      contractAddress: isNFT ? String(contractAddress || '') : undefined,
      tokenId: isNFT ? String(tokenId || '') : undefined,
      featured: !!featured,
      isActive: !!isActive,
      vendorId: req.user.userId, // Admin is the vendor
      sales: 0,
      views: 0,
      rating: 0,
      reviewCount: 0
    });

    await product.save();

    // Populate vendor info for response
    await product.populate('vendorId', 'username displayName avatar isVerified');

    res.json({
      success: true,
      data: {
        ...product.toObject(),
        id: product._id,
        vendor: product.vendorId ? {
          id: product.vendorId._id,
          username: product.vendorId.username,
          displayName: product.vendorId.displayName,
          avatar: product.vendorId.avatar,
          isVerified: product.vendorId.isVerified
        } : undefined
      },
      message: 'Product created successfully'
    });
  } catch (err) {
    console.error('admin create product error:', err);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// Approve vendor product (sets isActive true and optionally featured)
router.patch('/products/:id/approve', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { featured = false } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const doc = await Product.findByIdAndUpdate(id, { isActive: true, featured: !!featured }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, data: doc });
  } catch (e) {
    console.error('admin approve product error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/admin/settings
// Get all system settings
router.get('/settings', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    // Get all settings types
    const marketplaceSettings = await Settings.getOrCreateDefault('marketplace');
    const systemSettings = await Settings.getOrCreateDefault('system');
    const securitySettings = await Settings.getOrCreateDefault('security');
    const paymentSettings = await Settings.getOrCreateDefault('payment');

    res.json({
      success: true,
      data: {
        marketplace: marketplaceSettings,
        system: systemSettings,
        security: securitySettings,
        payment: paymentSettings
      }
    });
  } catch (error) {
    console.error('admin get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings
// Update system settings
router.put('/settings', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { type, updates } = req.body;
    
    if (!type || !updates) {
      return res.status(400).json({ 
        success: false, 
        message: 'Settings type and updates are required' 
      });
    }

    // Get or create settings document
    let settings = await Settings.getOrCreateDefault(type);
    
    // Update settings using the model method
    settings = await settings.updateSettings(updates, req.user.userId);
    
    res.json({
      success: true,
      message: `${type} settings updated successfully`,
      data: settings
    });
  } catch (error) {
    console.error('admin update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});


// Bulk actions (toggle featured/active, price/stock updates)
router.post('/products/bulk', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { ids = [], action, payload = {} } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'No ids provided' });
    const objectIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (objectIds.length === 0) return res.status(400).json({ success: false, message: 'No valid ids provided' });

    let result = null;
    switch (action) {
      case 'activate':
      case 'setActive':
        result = await Product.updateMany({ _id: { $in: objectIds } }, { $set: { isActive: true } });
        break;
      case 'deactivate':
        result = await Product.updateMany({ _id: { $in: objectIds } }, { $set: { isActive: false } });
        break;
      case 'feature':
      case 'setFeatured':
        result = await Product.updateMany({ _id: { $in: objectIds } }, { $set: { featured: true } });
        break;
      case 'unfeature':
        result = await Product.updateMany({ _id: { $in: objectIds } }, { $set: { featured: false } });
        break;
      case 'setPrice': {
        const price = Number(payload.value);
        if (!(price >= 0)) return res.status(400).json({ success: false, message: 'Invalid price' });
        result = await Product.updateMany({ _id: { $in: objectIds } }, { $set: { price } });
        break;
      }
      case 'setStock': {
        const stock = Number(payload.value);
        if (!Number.isInteger(stock) || stock < 0) return res.status(400).json({ success: false, message: 'Invalid stock' });
        result = await Product.updateMany({ _id: { $in: objectIds } }, { $set: { stock } });
        break;
      }
      case 'delete':
        result = await Product.deleteMany({ _id: { $in: objectIds } });
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unknown action' });
    }

    return res.json({ success: true, data: result });
  } catch (e) {
    console.error('admin bulk products error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Export products CSV
router.get('/products/export.csv', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { category, vendorId, featured, search } = req.query || {};
    const q = {};
    if (category) q.category = category;
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) q.vendorId = vendorId;
    if (typeof featured !== 'undefined') q.featured = featured === 'true';
    if (search) q.$text = { $search: String(search) };

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="products-${Date.now()}.csv"`);
    const headers = ['_id','name','price','currency','category','vendorId','isActive','featured','stock','sales','views','createdAt'];
    res.write(headers.join(',') + '\n');

    const csvEscape = (val) => {
      if (val == null) return '';
      const s = String(val);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const cursor = Product.find(q).sort({ createdAt: -1 }).cursor();
    cursor.on('data', (doc) => {
      const row = [
        csvEscape(doc._id),
        csvEscape(doc.name),
        csvEscape(doc.price),
        csvEscape(doc.currency),
        csvEscape(doc.category),
        csvEscape(doc.vendorId),
        csvEscape(doc.isActive),
        csvEscape(doc.featured),
        csvEscape(doc.stock),
        csvEscape(doc.sales),
        csvEscape(doc.views),
        csvEscape(new Date(doc.createdAt).toISOString()),
      ];
      res.write(row.join(',') + '\n');
    });
    cursor.on('end', () => res.end());
    cursor.on('error', () => { if (!res.headersSent) res.status(500); res.end(); });
  } catch (e) {
    console.error('admin export products error:', e);
    if (!res.headersSent) res.status(500).end();
  }
});

// ============================================================================
// PAYOUTS (Stripe-backed or internal) â€” stubs using Stripe if configured
// ============================================================================

const Stripe = require('stripe');
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2024-06-20' }) : null;

// GET /api/admin/payouts (cursor-based)
// Query: limit (1..100), after (starting_after id), before (ending_before id), status, destination
router.get('/payouts', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { status, destination, after, before, limit = 50 } = req.query;
    const limitN = Math.min(100, Math.max(1, Number(limit) || 50));
    if (!stripe) return res.json({ success: true, data: [], page_info: { has_more: false, limit: 0, after: null, before: null } });

    const list = await stripe.payouts.list({
      limit: limitN,
      status,
      destination,
      starting_after: after || undefined,
      ending_before: before || undefined,
    });

    const data = list.data || [];
    const firstId = data[0]?.id || null;
    const lastId = data[data.length - 1]?.id || null;
    res.json({ success: true, data, page_info: { has_more: !!list.has_more, limit: limitN, first_id: firstId, last_id: lastId, next_after: list.has_more ? lastId : null, before: firstId } });
  } catch (e) {
    console.error('admin payouts list error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch payouts' });
  }
});

// POST /api/admin/payouts - Create a new payout
const payoutCreateSchema = Joi.object({
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  destination: Joi.string().optional(),
  description: Joi.string().max(500).optional(),
  metadata: Joi.object().unknown(true).optional()
}).required();

router.post('/payouts', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ success: false, message: 'Stripe not configured' });

    const { error, value } = payoutCreateSchema.validate(req.body || {}, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: 'Validation failed', details: error.details.map(d=>d.message) });

    const { amount, currency, destination, description, metadata } = value;

    const payoutData = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      method: 'instant' // or 'standard'
    };

    if (destination) payoutData.destination = destination;
    if (description) payoutData.description = description;
    if (metadata) payoutData.metadata = metadata;

    const payout = await stripe.payouts.create(payoutData);
    res.json({ success: true, data: payout });
  } catch (e) {
    console.error('admin payout create error:', e);
    res.status(500).json({ success: false, message: 'Failed to create payout' });
  }
});

// POST /api/admin/payouts/:id/cancel
router.post('/payouts/:id/cancel', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!stripe) return res.status(400).json({ success: false, message: 'Stripe not configured' });
    const canceled = await stripe.payouts.cancel(id);
    res.json({ success: true, data: canceled });
  } catch (e) {
    console.error('admin payout cancel error:', e);
    res.status(500).json({ success: false, message: 'Failed to cancel payout' });
  }
});

// POST /api/admin/payouts/bulk/cancel - Cancel multiple payouts
const bulkCancelSchema = Joi.object({
  payout_ids: Joi.array().items(Joi.string().required()).min(1).max(50).required()
}).required();

router.post('/payouts/bulk/cancel', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ success: false, message: 'Stripe not configured' });

    const { error, value } = bulkCancelSchema.validate(req.body || {}, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: 'Validation failed', details: error.details.map(d=>d.message) });

    const { payout_ids } = value;
    const results = [];

    for (const id of payout_ids) {
      try {
        const canceled = await stripe.payouts.cancel(id);
        results.push({ id, success: true, data: canceled });
      } catch (e) {
        console.error(`Failed to cancel payout ${id}:`, e);
        results.push({ id, success: false, error: e.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount
        }
      }
    });
  } catch (e) {
    console.error('admin bulk payout cancel error:', e);
    res.status(500).json({ success: false, message: 'Failed to cancel payouts' });
  }
});

// GET /api/admin/payouts/analytics/overview - Get payouts analytics
router.get('/payouts/analytics/overview', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.json({ success: true, data: { total: 0, by_status: {}, by_destination: {}, recent_trend: [] } });

    const { timeRange = '30d' } = req.query;
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const payouts = await stripe.payouts.list({
      limit: 100,
      created: { gte: Math.floor(startDate.getTime() / 1000) }
    });

    const data = payouts.data || [];

    const analytics = {
      total: data.length,
      by_status: {},
      by_destination: {},
      total_amount: 0,
      average_amount: 0,
      recent_trend: []
    };

    data.forEach(payout => {
      analytics.by_status[payout.status] = (analytics.by_status[payout.status] || 0) + 1;
      if (payout.destination) {
        analytics.by_destination[payout.destination] = (analytics.by_destination[payout.destination] || 0) + 1;
      }
      analytics.total_amount += payout.amount;
    });

    analytics.average_amount = data.length > 0 ? analytics.total_amount / data.length : 0;

    // Generate 7-day trend
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = Math.floor(date.setHours(0, 0, 0, 0) / 1000);
      const dayEnd = Math.floor(date.setHours(23, 59, 59, 999) / 1000);

      const dayPayouts = data.filter(p => p.created >= dayStart && p.created <= dayEnd);
      analytics.recent_trend.push({
        date: new Date(dayStart * 1000).toISOString().split('T')[0],
        count: dayPayouts.length,
        amount: dayPayouts.reduce((sum, p) => sum + p.amount, 0)
      });
    }

    res.json({ success: true, data: analytics });
  } catch (e) {
    console.error('admin payouts analytics error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch payouts analytics' });
  }
});

// GET /api/admin/payouts/analytics/detailed - Get detailed payouts analytics
router.get('/payouts/analytics/detailed', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.json({ success: true, data: { monthly_trends: [], success_rate: {}, processing_times: {} } });

    const { timeRange = '90d' } = req.query;
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case '180d': startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    const payouts = await stripe.payouts.list({
      limit: 100,
      created: { gte: Math.floor(startDate.getTime() / 1000) }
    });

    const data = payouts.data || [];

    // Calculate monthly trends
    const monthlyTrends = [];
    const monthsToShow = timeRange === '180d' ? 6 : (timeRange === '90d' ? 3 : 1);

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const monthPayouts = data.filter(p => {
        const payoutDate = new Date(p.created * 1000);
        return payoutDate >= monthStart && payoutDate <= monthEnd;
      });

      monthlyTrends.push({
        month: monthStart.toISOString().slice(0, 7),
        count: monthPayouts.length,
        amount: monthPayouts.reduce((sum, p) => sum + p.amount, 0),
        successful: monthPayouts.filter(p => p.status === 'paid').length,
        failed: monthPayouts.filter(p => p.status === 'failed').length
      });
    }

    // Calculate success rate
    const totalPayouts = data.length;
    const successfulPayouts = data.filter(p => p.status === 'paid').length;
    const failedPayouts = data.filter(p => p.status === 'failed').length;

    const successRate = {
      total: totalPayouts,
      successful: successfulPayouts,
      failed: failedPayouts,
      success_percentage: totalPayouts > 0 ? (successfulPayouts / totalPayouts) * 100 : 0
    };

    // Calculate processing times (estimated)
    const processingTimes = {
      average_hours: 24, // Stripe typically processes in 1-2 business days
      fastest_hours: 2,
      slowest_hours: 72
    };

    res.json({
      success: true,
      data: {
        monthly_trends: monthlyTrends,
        success_rate: successRate,
        processing_times: processingTimes
      }
    });
  } catch (e) {
    console.error('admin detailed payouts analytics error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch detailed analytics' });
  }
});

// GET /api/admin/payouts/summary - Get payouts summary for dashboard
router.get('/payouts/summary', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.json({ success: true, data: { pending_count: 0, total_pending_amount: 0, failed_count: 0 } });

    // Get pending payouts
    const pendingPayouts = await stripe.payouts.list({
      status: 'pending',
      limit: 100
    });

    // Get failed payouts from last 7 days
    const weekAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const failedPayouts = await stripe.payouts.list({
      status: 'failed',
      created: { gte: weekAgo },
      limit: 100
    });

    const summary = {
      pending_count: pendingPayouts.data.length,
      total_pending_amount: pendingPayouts.data.reduce((sum, p) => sum + p.amount, 0),
      failed_count: failedPayouts.data.length,
      total_failed_amount: failedPayouts.data.reduce((sum, p) => sum + p.amount, 0)
    };

    res.json({ success: true, data: summary });
  } catch (e) {
    console.error('admin payouts summary error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch payouts summary' });
  }
});

// Export payouts CSV
router.get('/payouts/export.csv', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.status(200).end('id,status,amount,currency,destination,created\n');
    const { status, destination, timeRange } = req.query;

    let created = undefined;
    if (timeRange) {
      const now = new Date();
      let startDate;
      switch (timeRange) {
        case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      }
      if (startDate) {
        created = { gte: Math.floor(startDate.getTime() / 1000) };
      }
    }

    const payoutList = await stripe.payouts.list({ limit: 100, status, destination, created });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="payouts-${Date.now()}.csv"`);
    res.write('id,status,amount,currency,destination,created,arrival_date,description\n');
    payoutList.data.forEach(p => {
      const arrivalDate = p.arrival_date ? new Date(p.arrival_date * 1000).toISOString() : '';
      res.write(`${p.id},${p.status},${(p.amount/100).toFixed(2)},${p.currency},${p.destination || ''},${new Date(p.created*1000).toISOString()},${arrivalDate},"${(p.description || '').replace(/"/g, '""')}"\n`);
    });
    res.end();
  } catch (e) {
    console.error('admin payouts export error:', e);
    if (!res.headersSent) res.status(500).end();
  }
});

// GET /api/admin/payouts/:id - Get detailed payout information
router.get('/payouts/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ success: false, message: 'Stripe not configured' });
    const { id } = req.params;
    const payout = await stripe.payouts.retrieve(id);
    res.json({ success: true, data: payout });
  } catch (e) {
    console.error('admin payout details error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch payout details' });
  }
});

// GET /api/admin/disputes - Get disputes list
router.get('/disputes', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.json({ success: true, data: [] });

    let { status, payment_intent, timeRange } = req.query;
    let created = undefined;

    if (timeRange) {
      const now = new Date();
      let startDate;
      switch (timeRange) {
        case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      }
      if (startDate) created = { gte: Math.floor(startDate.getTime() / 1000) };
    }

    const disputes = await stripe.disputes.list({
      limit: 100,
      status,
      payment_intent,
      created
    });

    res.json({ success: true, data: disputes.data });
  } catch (e) {
    console.error('admin disputes list error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch disputes list' });
  }
});

// Export disputes CSV
router.get('/disputes/export.csv', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ 
        success: false, 
        message: 'Stripe not configured. Disputes export requires Stripe integration.' 
      });
    }
    const { status, paymentIntentId, timeRange } = req.query;

    let created = undefined;
    if (timeRange) {
      const now = new Date();
      let startDate;
      switch (timeRange) {
        case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      }
      if (startDate) created = { gte: Math.floor(startDate.getTime() / 1000) };
    }

    const disputes = await stripe.disputes.list({
      limit: 100,
      payment_intent: paymentIntentId,
      status,
      created
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="disputes-${Date.now()}.csv"`);
    res.write('id,status,reason,amount,currency,payment_intent,created,evidence_due_by\n');

    disputes.data.forEach(d => {
      const evidenceDueBy = d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000).toISOString() : '';
      res.write(`${d.id},${d.status},${d.reason || ''},${(d.amount/100).toFixed(2)},${d.currency},${d.payment_intent || ''},${new Date(d.created*1000).toISOString()},${evidenceDueBy}\n`);
    });
    res.end();
  } catch (e) {
    console.error('admin disputes export error:', e);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Failed to export disputes' });
  }
});

// ============================================================================
// PAYMENTS â€” Stripe-backed (Payment Intents, Charges, Payment Methods)
// ============================================================================

// GET /api/admin/payments (cursor-based)
// Query: limit (1..100), after, before, status, customer, created
router.get('/payments', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { status, customer, after, before, limit = 50, created, paymentMethod } = req.query;
    const limitN = Math.min(100, Math.max(1, Number(limit) || 50));

    // Build query
    const query = {};
    if (status) query.status = status;
    if (customer) query.userId = customer;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (created) {
      try {
        // Allow passing JSON string like {"gte": 1234567890}
        const createdObj = typeof created === 'string' && created.trim().startsWith('{')
          ? JSON.parse(created)
          : created;
        
        if (typeof createdObj === 'object') {
          query.createdAt = {};
          if (createdObj.gte) query.createdAt.$gte = new Date(createdObj.gte * 1000);
          if (createdObj.lte) query.createdAt.$lte = new Date(createdObj.lte * 1000);
        } else {
          query.createdAt = { $gte: new Date(createdObj * 1000) };
        }
      } catch (_) {
        // Fallback to simple date filter
        query.createdAt = { $gte: new Date(created * 1000) };
      }
    }

    // Pagination
    const options = {
      limit: limitN,
      sort: { createdAt: -1 }
    };

    if (after) {
      const afterOrder = await Order.findById(after);
      if (afterOrder) {
        query.createdAt = { ...query.createdAt, $lt: afterOrder.createdAt };
      }
    }

    // Get orders (payments)
    const orders = await Order.find(query, null, options);
    
    // Get total count for pagination
    const totalCount = await Order.countDocuments(query);
    
    const data = orders.map(order => ({
      id: order._id,
      status: order.status,
      amount: order.totalAmount,
      currency: order.currency,
      payment_method: order.paymentMethod,
      paymentMethod: order.paymentMethod,
      customer: order.userId,
      userId: order.userId,
      created: Math.floor(order.createdAt.getTime() / 1000),
      createdAt: order.createdAt,
      orderNumber: order.orderNumber
    }));

    const firstId = data[0]?.id || null;
    const lastId = data[data.length - 1]?.id || null;

    res.json({
      success: true,
      data,
      page_info: {
        has_more: data.length === limitN,
        limit: limitN,
        first_id: firstId,
        last_id: lastId,
        next_after: data.length === limitN ? lastId : null,
        before: firstId
      }
    });
  } catch (e) {
    console.error('admin payments list error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
});

// GET /api/admin/payments/analytics/overview - Get payments analytics
router.get('/payments/analytics/overview', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const query = { 
      createdAt: { $gte: startDate },
      status: 'completed'
    };

    // Get all completed orders in the time range
    const orders = await Order.find(query);
    
    const analytics = {
      total: orders.length,
      by_status: {},
      by_currency: {},
      by_payment_method: {},
      total_amount: 0,
      average_amount: 0,
      recent_trend: []
    };

    orders.forEach(order => {
      // Status distribution
      analytics.by_status[order.status] = (analytics.by_status[order.status] || 0) + 1;
      
      // Currency distribution
      const currency = order.currency?.toUpperCase() || 'USD';
      analytics.by_currency[currency] = (analytics.by_currency[currency] || 0) + 1;
      
      // Payment method distribution
      const paymentMethod = order.paymentMethod || 'unknown';
      analytics.by_payment_method[paymentMethod] = (analytics.by_payment_method[paymentMethod] || 0) + 1;
      
      // Total amount
      analytics.total_amount += order.totalAmount || 0;
    });

    analytics.average_amount = orders.length > 0 ? analytics.total_amount / orders.length : 0;

    // Generate 7-day trend
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayOrders = orders.filter(order => 
        order.createdAt >= dayStart && order.createdAt <= dayEnd
      );
      
      analytics.recent_trend.push({
        date: dayStart.toISOString().split('T')[0],
        count: dayOrders.length,
        amount: dayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      });
    }

    res.json({ success: true, data: analytics });
  } catch (e) {
    console.error('admin payments analytics error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch payments analytics' });
  }
});

// GET /api/admin/payments/analytics/detailed - Get detailed payments analytics
router.get('/payments/analytics/detailed', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { timeRange = '90d' } = req.query;
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case '180d': startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    const query = { 
      createdAt: { $gte: startDate },
      status: 'completed'
    };

    // Get all completed orders in the time range
    const orders = await Order.find(query);

    // Calculate success rate
    const successfulPayments = orders.length;
    const failedPayments = 0; // For now, we only count completed orders
    const totalAttempts = successfulPayments + failedPayments;

    const analytics = {
      monthly_trends: [],
      success_rate: {
        successful: successfulPayments,
        failed: failedPayments,
        rate: totalAttempts > 0 ? (successfulPayments / totalAttempts * 100).toFixed(2) : 0
      },
      payment_methods: {},
      revenue_by_currency: {},
      by_payment_method: {}
    };

    // Group by month
    const monthlyData = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, amount: 0, successful: 0 };
      }

      monthlyData[monthKey].count++;
      monthlyData[monthKey].amount += order.totalAmount || 0;
      monthlyData[monthKey].successful++;
    });

    analytics.monthly_trends = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      count: data.count,
      amount: data.amount,
      success_rate: data.count > 0 ? (data.successful / data.count * 100).toFixed(2) : 0
    }));

    // Payment methods analysis
    orders.forEach(order => {
      const method = order.paymentMethod || 'unknown';
      analytics.payment_methods[method] = (analytics.payment_methods[method] || 0) + 1;
      analytics.by_payment_method[method] = (analytics.by_payment_method[method] || 0) + 1;
    });

    // Revenue by currency
    orders.forEach(order => {
      const currency = order.currency?.toUpperCase() || 'USD';
      analytics.revenue_by_currency[currency] = 
        (analytics.revenue_by_currency[currency] || 0) + (order.totalAmount || 0);
    });

    res.json({ success: true, data: analytics });
  } catch (e) {
    console.error('admin detailed payments analytics error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch detailed analytics' });
  }
});

// GET /api/admin/payments/summary - Get payments summary for dashboard
router.get('/payments/summary', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    // Get recent payments for summary (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const query = { 
      createdAt: { $gte: weekAgo },
      status: 'completed'
    };

    const recentOrders = await Order.find(query);

    const summary = {
      pending_count: 0, // We don't have pending orders in this model
      successful_count: recentOrders.length,
      failed_count: 0, // We don't track failed orders in this model
      total_amount: recentOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      total_pending_amount: 0
    };

    res.json({ success: true, data: summary });
  } catch (e) {
    console.error('admin payments summary error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch payments summary' });
  }
});

// GET /api/admin/payments/:id - Get detailed payment information
router.get('/payments/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the order
    const order = await Order.findById(id)
      .populate('userId', 'username email')
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Format the payment data
    const payment = {
      id: order._id,
      status: order.status,
      amount: order.totalAmount,
      currency: order.currency,
      payment_method: order.paymentMethod,
      paymentMethod: order.paymentMethod,
      customer: order.userId?._id || order.userId,
      userId: order.userId?._id || order.userId,
      created: Math.floor(order.createdAt.getTime() / 1000),
      createdAt: order.createdAt,
      orderNumber: order.orderNumber,
      paymentDetails: order.paymentDetails,
      transactionReference: order.transactionReference,
      tx_ref: order.tx_ref
    };

    res.json({
      success: true,
      data: {
        payment,
        charges: [] // No charges in our model, but keeping for compatibility
      }
    });
  } catch (e) {
    console.error('admin payment detail error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch payment details' });
  }
});

// POST /api/admin/payments/:id/cancel - Cancel a payment
router.post('/payments/:id/cancel', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Find and update the order status to cancelled
    const order = await Order.findByIdAndUpdate(
      id,
      { 
        status: 'cancelled',
        cancelledAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    res.json({ 
      success: true, 
      data: {
        id: order._id,
        status: 'cancelled'
      }
    });
  } catch (e) {
    console.error('admin payment cancel error:', e);
    res.status(500).json({ success: false, message: 'Failed to cancel payment' });
  }
});

// GET /api/admin/charges - Get charges list
router.get('/charges', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.json({ success: true, data: [], page_info: { has_more: false, limit: 0, after: null, before: null } });

    const { customer, payment_intent, after, before, limit = 50, created } = req.query;
    const limitN = Math.min(100, Math.max(1, Number(limit) || 50));

    const listParams = {
      limit: limitN,
      starting_after: after || undefined,
      ending_before: before || undefined,
    };

    if (customer) listParams.customer = customer;
    if (payment_intent) listParams.payment_intent = payment_intent;
    if (created) {
      try {
        listParams.created = typeof created === 'string' && created.trim().startsWith('{')
          ? JSON.parse(created)
          : created;
      } catch (_) {
        listParams.created = created;
      }
    }

    const list = await stripe.charges.list(listParams);
    const data = list.data || [];
    const firstId = data[0]?.id || null;
    const lastId = data[data.length - 1]?.id || null;

    res.json({
      success: true,
      data,
      page_info: {
        has_more: !!list.has_more,
        limit: limitN,
        first_id: firstId,
        last_id: lastId,
        next_after: list.has_more ? lastId : null,
        before: firstId
      }
    });
  } catch (e) {
    console.error('admin charges list error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch charges' });
  }
});

// GET /api/admin/charges/:id - Get detailed charge information
router.get('/charges/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ success: false, message: 'Stripe not configured' });
    const { id } = req.params;

    const charge = await stripe.charges.retrieve(id);
    res.json({ success: true, data: charge });
  } catch (e) {
    console.error('admin charge detail error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch charge details' });
  }
});

// Export payments CSV
router.get('/payments/export.csv', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { status, customer, timeRange, paymentMethod } = req.query;

    // Build query
    const query = { status: 'completed' }; // Default to completed orders
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (customer) {
      query.userId = customer;
    }
    
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (timeRange) {
      const now = new Date();
      let startDate;
      switch (timeRange) {
        case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      }
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Get orders
    const orders = await Order.find(query).sort({ createdAt: -1 }).limit(1000);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="payments-${Date.now()}.csv"`);
    
    // Write CSV header
    res.write('id,status,amount,currency,payment_method,customer,created,order_number\n');

    // Write data rows
    orders.forEach(order => {
      const amount = (order.totalAmount || 0).toFixed(2);
      const created = order.createdAt ? new Date(order.createdAt).toISOString() : '';
      const orderNumber = order.orderNumber || '';
      const paymentMethod = order.paymentMethod || '';
      const customer = order.userId || '';
      const currency = (order.currency || 'USD').toUpperCase();
      const status = order.status || '';
      
      // Escape and format values for CSV
      const escapeCsv = (value) => {
        if (value == null) return '';
        const str = String(value);
        return str.includes(',') || str.includes('"') || str.includes('\n') 
          ? `"${str.replace(/"/g, '""')}"` 
          : str;
      };
      
      res.write(`${escapeCsv(order._id)},${escapeCsv(status)},${amount},${escapeCsv(currency)},${escapeCsv(paymentMethod)},${escapeCsv(customer)},${escapeCsv(created)},${escapeCsv(orderNumber)}\n`);
    });

    res.end();
  } catch (e) {
    console.error('admin payments export error:', e);
    if (!res.headersSent) res.status(500).end();
  }
});

// ============================================================================
// DISPUTES â€” Stripe-backed
// ============================================================================

// GET /api/admin/disputes (cursor-based)
// Query: limit (1..100), after, before, status, paymentIntentId
router.get('/disputes', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.json({ success: true, data: [], page_info: { has_more: false, limit: 0, after: null, before: null } });
    const { status, paymentIntentId, after, before, limit = 50 } = req.query;
    const limitN = Math.min(100, Math.max(1, Number(limit)||50));
    const list = await stripe.disputes.list({ limit: limitN, payment_intent: paymentIntentId, status, starting_after: after || undefined, ending_before: before || undefined });
    const data = list.data || [];
    const firstId = data[0]?.id || null;
    const lastId = data[data.length - 1]?.id || null;
    res.json({ success: true, data, page_info: { has_more: !!list.has_more, limit: limitN, first_id: firstId, last_id: lastId, next_after: list.has_more ? lastId : null, before: firstId } });
  } catch (e) {
    console.error('admin disputes list error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
  }
});

// POST /api/admin/disputes/:id/submit-evidence
const disputeEvidenceSchema = Joi.object({
  evidence: Joi.object({
    product_description: Joi.string().allow(''),
    customer_communication: Joi.string().allow(''),
    refund_policy: Joi.string().allow(''),
    service_date: Joi.string().allow(''),
    service_documentation: Joi.string().allow(''),
    shipping_carrier: Joi.string().allow(''),
    shipping_tracking_number: Joi.string().allow(''),
    uncategorized_text: Joi.string().allow(''),
  }).unknown(true).required(),
}).required();

router.post('/disputes/:id/submit-evidence', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ success: false, message: 'Stripe not configured' });
    const { id } = req.params;
    const { error, value } = disputeEvidenceSchema.validate(req.body || {}, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: 'Validation failed', details: error.details.map(d=>d.message) });
    const { evidence } = value;
    // Update evidence then submit
    const updated = await stripe.disputes.update(id, { evidence });
    const submitted = await stripe.disputes.submit(id);
    res.json({ success: true, data: submitted });
  } catch (e) {
    console.error('admin disputes submit error:', e);
    res.status(500).json({ success: false, message: 'Failed to submit evidence' });
  }
});

// GET /api/admin/disputes/analytics/overview - Get disputes analytics
router.get('/disputes/analytics/overview', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.json({ success: true, data: { total: 0, by_status: {}, by_reason: {}, recent_trend: [] } });

    const { timeRange = '30d' } = req.query;
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch all disputes in the time range
    const disputes = await stripe.disputes.list({
      limit: 100,
      created: { gte: Math.floor(startDate.getTime() / 1000) }
    });

    const data = disputes.data || [];

    // Calculate analytics
    const analytics = {
      total: data.length,
      by_status: {},
      by_reason: {},
      total_amount: 0,
      average_amount: 0,
      recent_trend: []
    };

    // Group by status and reason
    data.forEach(dispute => {
      analytics.by_status[dispute.status] = (analytics.by_status[dispute.status] || 0) + 1;
      analytics.by_reason[dispute.reason] = (analytics.by_reason[dispute.reason] || 0) + 1;
      analytics.total_amount += dispute.amount;
    });

    analytics.average_amount = data.length > 0 ? analytics.total_amount / data.length : 0;

    // Calculate daily trend for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = Math.floor(date.setHours(0, 0, 0, 0) / 1000);
      const dayEnd = Math.floor(date.setHours(23, 59, 59, 999) / 1000);

      const dayDisputes = data.filter(d => d.created >= dayStart && d.created <= dayEnd);
      analytics.recent_trend.push({
        date: new Date(dayStart * 1000).toISOString().split('T')[0],
        count: dayDisputes.length,
        amount: dayDisputes.reduce((sum, d) => sum + d.amount, 0)
      });
    }

    res.json({ success: true, data: analytics });
  } catch (e) {
    console.error('admin disputes analytics error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch disputes analytics' });
  }
});

// GET /api/admin/disputes/analytics/detailed - Get detailed dispute analytics
router.get('/disputes/analytics/detailed', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.json({ success: true, data: { monthly_trends: [], win_loss_ratio: {}, response_times: {} } });

    const { timeRange = '90d' } = req.query;
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case '180d': startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); break;
      case '365d': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    // Fetch all disputes in the time range
    const disputes = await stripe.disputes.list({
      limit: 100,
      created: { gte: Math.floor(startDate.getTime() / 1000) }
    });

    const data = disputes.data || [];

    // Calculate monthly trends
    const monthlyTrends = {};
    data.forEach(dispute => {
      const month = new Date(dispute.created * 1000).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = { count: 0, amount: 0, won: 0, lost: 0 };
      }
      monthlyTrends[month].count++;
      monthlyTrends[month].amount += dispute.amount;
      if (dispute.status === 'won') monthlyTrends[month].won++;
      if (dispute.status === 'lost') monthlyTrends[month].lost++;
    });

    // Calculate win/loss ratio
    const winLossRatio = {
      won: data.filter(d => d.status === 'won').length,
      lost: data.filter(d => d.status === 'lost').length,
      pending: data.filter(d => ['needs_response', 'under_review'].includes(d.status)).length
    };

    // Calculate average response times (mock data - would need actual response tracking)
    const responseTimes = {
      average_response_hours: 24,
      fastest_response_hours: 2,
      slowest_response_hours: 72,
      on_time_responses: Math.floor(data.length * 0.85)
    };

    const analytics = {
      monthly_trends: Object.entries(monthlyTrends).map(([month, stats]) => ({
        month,
        ...stats
      })).sort((a, b) => a.month.localeCompare(b.month)),
      win_loss_ratio: winLossRatio,
      response_times: responseTimes,
      total_disputes: data.length,
      total_amount: data.reduce((sum, d) => sum + d.amount, 0)
    };

    res.json({ success: true, data: analytics });
  } catch (e) {
    console.error('admin detailed disputes analytics error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch detailed analytics' });
  }
});

// GET /api/admin/disputes/summary - Get dispute summary for dashboard
router.get('/disputes/summary', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.json({ success: true, data: { urgent_count: 0, total_pending: 0, total_amount_at_risk: 0 } });

    // Get disputes that need immediate attention
    const urgentDisputes = await stripe.disputes.list({
      status: 'needs_response',
      limit: 100
    });

    const allPending = await stripe.disputes.list({
      limit: 100
    });

    const pendingDisputes = allPending.data.filter(d =>
      ['needs_response', 'under_review'].includes(d.status)
    );

    // Calculate urgent disputes (evidence due within 24 hours)
    const now = Math.floor(Date.now() / 1000);
    const urgentCount = urgentDisputes.data.filter(d =>
      d.evidence_details?.due_by && (d.evidence_details.due_by - now) < 86400
    ).length;

    const summary = {
      urgent_count: urgentCount,
      total_pending: pendingDisputes.length,
      total_amount_at_risk: pendingDisputes.reduce((sum, d) => sum + d.amount, 0),
      needs_response: urgentDisputes.data.length,
      overdue_evidence: urgentDisputes.data.filter(d =>
        d.evidence_details?.due_by && d.evidence_details.due_by < now
      ).length
    };

    res.json({ success: true, data: summary });
  } catch (e) {
    console.error('admin disputes summary error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch dispute summary' });
  }
});

// GET /api/admin/disputes/:id - Get detailed dispute information
router.get('/disputes/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ success: false, message: 'Stripe not configured' });
    const { id } = req.params;
    const dispute = await stripe.disputes.retrieve(id);
    res.json({ success: true, data: dispute });
  } catch (e) {
    console.error('admin dispute detail error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch dispute details' });
  }
});

// POST /api/admin/disputes/:id/notes - Add internal notes to dispute
const disputeNotesSchema = Joi.object({
  note: Joi.string().required().min(1).max(1000),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium')
}).required();

router.post('/disputes/:id/notes', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = disputeNotesSchema.validate(req.body || {}, { abortEarly: false });
    if (error) return res.status(400).json({ success: false, message: 'Validation failed', details: error.details.map(d=>d.message) });

    const { note, priority } = value;
    const userId = req.user.userId;

    // Store note in metadata (since Stripe doesn't have a notes field)
    // In a real implementation, you might want to store this in your own database
    const noteData = {
      note,
      priority,
      added_by: userId,
      added_at: new Date().toISOString()
    };

    // For now, we'll just return success - in production you'd store this in your database
    res.json({ success: true, data: noteData });
  } catch (e) {
    console.error('admin dispute notes error:', e);
    res.status(500).json({ success: false, message: 'Failed to add note' });
  }
});

// Export disputes CSV
router.get('/disputes/export.csv', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(400).json({ 
        success: false, 
        message: 'Stripe not configured. Disputes export requires Stripe integration.' 
      });
    }
    const { status, paymentIntentId, timeRange } = req.query;

    let created = undefined;
    if (timeRange) {
      const now = new Date();
      let startDate;
      switch (timeRange) {
        case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      }
      if (startDate) created = { gte: Math.floor(startDate.getTime() / 1000) };
    }

    const disputes = await stripe.disputes.list({
      limit: 100,
      payment_intent: paymentIntentId,
      status,
      created
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="disputes-${Date.now()}.csv"`);
    res.write('id,status,reason,amount,currency,payment_intent,created,evidence_due_by\n');

    disputes.data.forEach(d => {
      const evidenceDueBy = d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000).toISOString() : '';
      res.write(`${d.id},${d.status},${d.reason || ''},${(d.amount/100).toFixed(2)},${d.currency},${d.payment_intent || ''},${new Date(d.created*1000).toISOString()},${evidenceDueBy}\n`);
    });
    res.end();
  } catch (e) {
    console.error('admin disputes export error:', e);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Failed to export disputes' });
  }
});

// ============================================================================
// USERS / VENDORS MANAGEMENT
// ============================================================================

// GET /api/admin/users - Enhanced user listing with comprehensive data
router.get('/users', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const {
      role,
      kycStatus,
      status,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    let vendorIds = null;

    // Role filtering with special vendor handling
    if (role === 'vendor') {
      const ids = await Product.distinct('vendorId', {});
      vendorIds = ids.filter(Boolean).map(id => new mongoose.Types.ObjectId(id));
      if (!vendorIds.length) {
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 0, total: 0, pages: 0 }
        });
      }
      query._id = { $in: vendorIds };
    } else if (role && role !== 'all') {
      query.role = role;
    }

    // Status filtering
    if (kycStatus && kycStatus !== 'all') {
      query.kycStatus = kycStatus;
    }
    if (status === 'active') {
      query.isSuspended = false;
    } else if (status === 'suspended') {
      query.isSuspended = true;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { username: new RegExp(String(search), 'i') },
        { email: new RegExp(String(search), 'i') },
        { fullName: new RegExp(String(search), 'i') }
      ];
    }

    const limitN = Math.min(200, Math.max(1, Number(limit) || 50));
    const pageN = Math.max(1, Number(page) || 1);
    const skip = (pageN - 1) * limitN;

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Enhanced aggregation pipeline for comprehensive user data
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'vendorId',
          as: 'products'
        }
      },
      {
        $lookup: {
          from: 'orders',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$userId', '$$userId'] },
                    { $in: ['$$userId', '$items.vendorId'] }
                  ]
                },
                status: 'completed'
              }
            }
          ],
          as: 'orders'
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' },
          activeProductCount: {
            $size: {
              $filter: {
                input: '$products',
                cond: { $eq: ['$$this.isActive', true] }
              }
            }
          },
          totalOrders: { $size: '$orders' },
          totalRevenue: {
            $reduce: {
              input: '$orders',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.total'] }
            }
          },
          lastOrderDate: {
            $max: '$orders.createdAt'
          },
          avgOrderValue: {
            $cond: {
              if: { $gt: [{ $size: '$orders' }, 0] },
              then: {
                $divide: [
                  {
                    $reduce: {
                      input: '$orders',
                      initialValue: 0,
                      in: { $add: ['$$value', '$$this.total'] }
                    }
                  },
                  { $size: '$orders' }
                ]
              },
              else: 0
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          fullName: 1,
          role: 1,
          kycStatus: 1,
          isSuspended: 1,
          isVerified: 1,
          avatar: 1,
          createdAt: 1,
          lastLoginAt: 1,
          productCount: 1,
          activeProductCount: 1,
          totalOrders: 1,
          totalRevenue: 1,
          lastOrderDate: 1,
          avgOrderValue: 1
        }
      },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: limitN }
    ];

    const [users, totalCount] = await Promise.all([
      User.aggregate(pipeline),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: pageN,
        limit: limitN,
        total: totalCount,
        pages: Math.ceil(totalCount / limitN)
      }
    });
  } catch (e) {
    console.error('admin users list error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// POST /api/admin/users/:id/suspend
router.post('/users/:id/suspend', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const doc = await User.findByIdAndUpdate(id, { isSuspended: true }, { new: true }).select('_id isSuspended');
    if (!doc) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: doc });
  } catch (e) {
    console.error('admin users suspend error:', e);
    res.status(500).json({ success: false, message: 'Failed to suspend user' });
  }
});

// POST /api/admin/users/:id/unsuspend
router.post('/users/:id/unsuspend', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const doc = await User.findByIdAndUpdate(id, { isSuspended: false }, { new: true }).select('_id isSuspended');
    if (!doc) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: doc });
  } catch (e) {
    console.error('admin users unsuspend error:', e);
    res.status(500).json({ success: false, message: 'Failed to unsuspend user' });
  }
});

// POST /api/admin/users/:id/kyc
router.post('/users/:id/kyc', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const status = String(req.query.status || '').toLowerCase();
    if (!['approved','rejected','pending','none'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    const doc = await User.findByIdAndUpdate(id, { kycStatus: status }, { new: true }).select('_id kycStatus');
    if (!doc) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: doc });
  } catch (e) {
    console.error('admin users kyc error:', e);
    res.status(500).json({ success: false, message: 'Failed to update KYC' });
  }
});

// GET /api/admin/users/:id/sales
// Aggregates from Orders: completed-only by default, optional from/to (ISO), currency filter
router.get('/users/:id/sales', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, currency } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const match = { status: 'completed' };
    if (from) match.createdAt = Object.assign(match.createdAt || {}, { $gte: new Date(from) });
    if (to) match.createdAt = Object.assign(match.createdAt || {}, { $lte: new Date(to) });

    // Join Order->Order.items->Product to filter by vendorId
    const pipeline = [
      { $match: match },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'prod' } },
      { $unwind: '$prod' },
      { $match: { 'prod.vendorId': new mongoose.Types.ObjectId(id) } },
      ...(currency ? [{ $match: { 'items.currency': String(currency).toUpperCase() } }] : []),
      { $group: {
          _id: null,
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
      }}
    ];
    const resAgg = await Order.aggregate(pipeline);
    res.json({ success: true, data: resAgg[0] || { totalSales: 0, totalRevenue: 0 } });
  } catch (e) {
    console.error('admin users sales error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch sales' });
  }
});

// GET /api/admin/users/:id/fees
// 10% platform fee based on Orders revenue, same filters as sales
router.get('/users/:id/fees', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, currency } = req.query;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });

    const match = { status: 'completed' };
    if (from) match.createdAt = Object.assign(match.createdAt || {}, { $gte: new Date(from) });
    if (to) match.createdAt = Object.assign(match.createdAt || {}, { $lte: new Date(to) });

    const pipeline = [
      { $match: match },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'prod' } },
      { $unwind: '$prod' },
      { $match: { 'prod.vendorId': new mongoose.Types.ObjectId(id) } },
      ...(currency ? [{ $match: { 'items.currency': String(currency).toUpperCase() } }] : []),
      { $group: {
          _id: null,
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
      }},
      { $project: { _id: 0, fees: { $multiply: ['$totalRevenue', 0.10] } } }
    ];
    const resAgg = await Order.aggregate(pipeline);
    res.json({ success: true, data: resAgg[0] || { fees: 0 } });
  } catch (e) {
    console.error('admin users fees error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch fees' });
  }
});

// GET /api/admin/users/analytics/overview - User analytics overview
router.get('/users/analytics/overview', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;

    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      newUsers,
      suspendedUsers,
      kycStats,
      roleDistribution,
      userGrowth
    ] = await Promise.all([
      // Total users
      User.countDocuments({}),

      // Active users (not suspended)
      User.countDocuments({ isSuspended: false }),

      // New users in time range
      User.countDocuments({ createdAt: { $gte: startDate } }),

      // Suspended users
      User.countDocuments({ isSuspended: true }),

      // KYC status distribution
      User.aggregate([
        {
          $group: {
            _id: '$kycStatus',
            count: { $sum: 1 }
          }
        }
      ]),

      // Role distribution
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]),

      // User growth over time
      User.aggregate([
        {
          $match: { createdAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ])
    ]);

    // Calculate growth rate
    const previousPeriodStart = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
    const previousPeriodUsers = await User.countDocuments({
      createdAt: { $gte: previousPeriodStart, $lt: startDate }
    });

    const growthRate = previousPeriodUsers > 0
      ? ((newUsers - previousPeriodUsers) / previousPeriodUsers) * 100
      : newUsers > 0 ? 100 : 0;

    // Format KYC stats
    const kycDistribution = {};
    kycStats.forEach(stat => {
      kycDistribution[stat._id || 'none'] = stat.count;
    });

    // Format role distribution
    const roles = {};
    roleDistribution.forEach(role => {
      roles[role._id || 'user'] = role.count;
    });

    res.json({
      success: true,
      data: {
        total_users: totalUsers,
        active_users: activeUsers,
        new_users: newUsers,
        suspended_users: suspendedUsers,
        user_growth_rate: growthRate,
        kyc_distribution: kycDistribution,
        role_distribution: roles,
        growth_chart: userGrowth,
        time_range: timeRange
      }
    });
  } catch (e) {
    console.error('admin users analytics error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch user analytics' });
  }
});

// GET /api/admin/users/summary - User summary for dashboard
router.get('/users/summary', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      kycApprovedUsers,
      recentUsers,
      vendorUsers
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isSuspended: false }),
      User.countDocuments({ kycStatus: 'approved' }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      User.countDocuments({ role: 'vendor' })
    ]);

    const summary = {
      total_users: totalUsers,
      active_users: activeUsers,
      kyc_approved: kycApprovedUsers,
      recent_signups: recentUsers,
      vendor_users: vendorUsers,
      approval_rate: totalUsers > 0 ? (kycApprovedUsers / totalUsers) * 100 : 0
    };

    res.json({ success: true, data: summary });
  } catch (e) {
    console.error('admin users summary error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch user summary' });
  }
});

// GET /api/admin/users/:id - Get detailed user information
router.get('/users/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get user's products (if vendor)
    const products = await Product.find({ vendorId: id });

    // Get user's orders
    const orders = await Order.find({
      $or: [
        { userId: id },
        { 'items.vendorId': id }
      ]
    }).sort({ createdAt: -1 }).limit(10);

    // Calculate user statistics
    const stats = {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.isActive).length,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      avgOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + (order.total || 0), 0) / orders.length : 0,
      recentOrders: orders.slice(0, 5)
    };

    res.json({
      success: true,
      data: {
        user,
        products,
        stats
      }
    });
  } catch (e) {
    console.error('admin user detail error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch user details' });
  }
});

// PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/role', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const validRoles = ['user', 'vendor', 'moderator', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (e) {
    console.error('admin user role update error:', e);
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
});

// PUT /api/admin/users/:id/verify - Update user verification status
router.put('/users/:id/verify', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isVerified: Boolean(isVerified) },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (e) {
    console.error('admin user verify error:', e);
    res.status(500).json({ success: false, message: 'Failed to update verification status' });
  }
});

// GET /api/admin/users/:id/activity - Get user activity log
router.get('/users/:id/activity', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // Get recent orders
    const orders = await Order.find({
      $or: [
        { userId: id },
        { 'items.vendorId': id }
      ]
    }).sort({ createdAt: -1 }).limit(Number(limit));

    // Get recent products (if vendor)
    const products = await Product.find({ vendorId: id })
      .sort({ createdAt: -1 })
      .limit(10);

    // Combine activity
    const activity = [
      ...orders.map(order => ({
        type: 'order',
        id: order._id,
        description: `Order ${order.status}`,
        amount: order.total,
        date: order.createdAt
      })),
      ...products.map(product => ({
        type: 'product',
        id: product._id,
        description: `Product ${product.isActive ? 'created' : 'deactivated'}: ${product.name}`,
        date: product.createdAt
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, Number(limit));

    res.json({ success: true, data: activity });
  } catch (e) {
    console.error('admin user activity error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch user activity' });
  }
});

// PUT /api/admin/users/:id - Update user information
router.put('/users/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, fullName, bio, phone, address } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // Check if username or email already exists (excluding current user)
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: id } },
        {
          $or: [
            { username: username },
            { email: email }
          ]
        }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.username === username ? 'Username already exists' : 'Email already exists'
      });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (fullName !== undefined) updateData.fullName = fullName;
    if (bio !== undefined) updateData.bio = bio;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (e) {
    console.error('admin user update error:', e);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - Delete user (soft delete)
router.delete('/users/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deletion of admin users unless permanent flag is set
    if (user.role === 'admin' && !permanent) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users. Use permanent=true to force deletion.'
      });
    }

    if (permanent === 'true') {
      // Hard delete - remove user and all associated data
      await Promise.all([
        User.findByIdAndDelete(id),
        Product.deleteMany({ vendorId: id }),
        Order.updateMany(
          { userId: id },
          { $set: { userId: null, userDeleted: true } }
        )
      ]);

      res.json({
        success: true,
        message: 'User permanently deleted',
        data: { deleted: true, permanent: true }
      });
    } else {
      // Soft delete - mark as deleted but keep data
      const deletedUser = await User.findByIdAndUpdate(
        id,
        {
          isDeleted: true,
          deletedAt: new Date(),
          isSuspended: true
        },
        { new: true }
      ).select('-password');

      res.json({
        success: true,
        message: 'User soft deleted',
        data: deletedUser
      });
    }
  } catch (e) {
    console.error('admin user delete error:', e);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// POST /api/admin/users/:id/restore - Restore soft-deleted user
router.post('/users/:id/restore', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        $unset: { isDeleted: 1, deletedAt: 1 },
        isSuspended: false
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (e) {
    console.error('admin user restore error:', e);
    res.status(500).json({ success: false, message: 'Failed to restore user' });
  }
});

// POST /api/admin/users/:id/send-email - Send email to user
router.post('/users/:id/send-email', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message, template = 'admin-notification' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    const user = await User.findById(id).select('email username fullName');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Create email log record
    const emailLogData = {
      recipient: user.email,
      userId: id,
      userEmail: user.email,
      subject,
      message,
      template,
      sentBy: req.user.userId,
      sentByEmail: req.user.email || 'admin@talkcart.com',
      status: 'pending'
    };

    let emailLog;
    try {
      // Create email log entry
      emailLog = await EmailLog.createLog(emailLogData);

      // Send email using email service
      const emailResult = await emailService.sendEmail({
        to: user.email,
        subject,
        message,
        template,
        user
      });

      // Update email log with result
      emailLog.status = 'sent';
      emailLog.messageId = emailResult.messageId;
      emailLog.sentAt = emailResult.sentAt;
      emailLog.isMock = emailResult.mock || false;
      await emailLog.save();

      res.json({
        success: true,
        message: 'Email sent successfully',
        data: {
          recipient: user.email,
          subject,
          sentAt: emailResult.sentAt,
          messageId: emailResult.messageId,
          mock: emailResult.mock || false
        }
      });
    } catch (emailError) {
      // Update email log with error
      if (emailLog) {
        emailLog.status = 'failed';
        emailLog.error = emailError.message;
        await emailLog.save();
      }

      console.error('Email sending failed:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: emailError.message
      });
    }
  } catch (e) {
    console.error('admin send email error:', e);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

// POST /api/admin/users/bulk-email - Send bulk email to multiple users
router.post('/users/bulk-email', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { userIds, subject, message, template = 'admin-notification' } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    // Validate all user IDs
    const invalidIds = userIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid user IDs: ${invalidIds.join(', ')}`
      });
    }

    const users = await User.find({
      _id: { $in: userIds }
    }).select('email username fullName');

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'No users found' });
    }

    const results = {
      total: users.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Send emails to all users
    for (const user of users) {
      let emailLog;
      try {
        // Create email log entry
        const emailLogData = {
          recipient: user.email,
          userId: user._id,
          userEmail: user.email,
          subject,
          message,
          template,
          sentBy: req.user.userId,
          sentByEmail: req.user.email || 'admin@talkcart.com',
          status: 'pending'
        };

        emailLog = await EmailLog.createLog(emailLogData);

        // Send email using email service
        const emailResult = await emailService.sendEmail({
          to: user.email,
          subject,
          message,
          template,
          user
        });

        // Update email log with result
        emailLog.status = 'sent';
        emailLog.messageId = emailResult.messageId;
        emailLog.sentAt = emailResult.sentAt;
        emailLog.isMock = emailResult.mock || false;
        await emailLog.save();

        results.sent++;
      } catch (emailError) {
        // Update email log with error
        if (emailLog) {
          emailLog.status = 'failed';
          emailLog.error = emailError.message;
          await emailLog.save();
        }

        results.failed++;
        results.errors.push({
          userId: user._id,
          email: user.email,
          error: emailError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk email completed. Sent: ${results.sent}, Failed: ${results.failed}`,
      data: results
    });
  } catch (e) {
    console.error('admin bulk email error:', e);
    res.status(500).json({ success: false, message: 'Failed to send bulk email' });
  }
});

// GET /api/admin/users/:id/email-history - Get user's email history
router.get('/users/:id/email-history', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // Get email history from EmailLog collection
    const emailHistory = await EmailLog.getUserEmailHistory(id, Number(limit));

    res.json({
      success: true,
      data: emailHistory
    });
  } catch (e) {
    console.error('admin email history error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch email history' });
  }
});

// GET /api/admin/email/status - Get email service status
router.get('/email/status', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const status = emailService.getServiceStatus();

    res.json({
      success: true,
      data: {
        ...status,
        configured: status.configured,
        provider: status.provider,
        ready: status.ready
      }
    });
  } catch (e) {
    console.error('admin email status error:', e);
    res.status(500).json({ success: false, message: 'Failed to get email service status' });
  }
});

// GET /api/admin/email/stats - Get email statistics
router.get('/email/stats', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const stats = await EmailLog.getEmailStats(timeRange);

    res.json({
      success: true,
      data: stats
    });
  } catch (e) {
    console.error('admin email stats error:', e);
    res.status(500).json({ success: false, message: 'Failed to get email statistics' });
  }
});

// ============================================================================
// MARKETPLACE CATEGORIES MANAGEMENT
// ============================================================================

// GET /api/admin/categories
router.get('/categories', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    // Get categories with product counts
    const pipeline = [
      { $group: { _id: '$category', count: { $sum: 1 }, activeCount: { $sum: { $cond: ['$isActive', 1, 0] } } } },
      { $sort: { _id: 1 } }
    ];
    const categoriesWithCounts = await Product.aggregate(pipeline);

    // Default categories from Product model
    const defaultCategories = ['Digital Art', 'Electronics', 'Fashion', 'Gaming', 'Music', 'Books', 'Collectibles', 'Other'];

    const categories = defaultCategories.map(cat => {
      const found = categoriesWithCounts.find(c => c._id === cat);
      return {
        name: cat,
        productCount: found?.count || 0,
        activeProductCount: found?.activeCount || 0
      };
    });

    res.json({ success: true, data: categories });
  } catch (e) {
    console.error('admin categories error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// ============================================================================
// ORDERS MANAGEMENT
// ============================================================================

// GET /api/admin/orders
router.get('/orders', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      userId,
      vendorId,
      from,
      to,
      search,
      paymentMethod
    } = req.query;

    const pageN = Math.max(1, Number(page) || 1);
    const limitN = Math.min(200, Math.max(1, Number(limit) || 20));

    const q = {};
    if (status) q.status = status;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) q.userId = userId;
    if (paymentMethod) q.paymentMethod = paymentMethod;
    if (search) q.orderNumber = new RegExp(String(search), 'i');

    // Date range filter
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }

    let pipeline = [
      { $match: q },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      }
    ];

    // Filter by vendor if specified
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      pipeline.push({
        $match: {
          'productDetails.vendorId': new mongoose.Types.ObjectId(vendorId)
        }
      });
    } else if (vendorId) {
      // Handle case where vendorId is not a valid ObjectId
      pipeline.push({
        $match: {
          'productDetails.vendorId': vendorId
        }
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: (pageN - 1) * limitN },
      { $limit: limitN }
    );

    const [orders, total] = await Promise.all([
      Order.aggregate(pipeline),
      Order.countDocuments(q)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageN,
          limit: limitN,
          total,
          pages: Math.ceil(total / limitN)
        }
      }
    });
  } catch (e) {
    console.error('admin orders error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    if (!['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('userId', 'username email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (e) {
    console.error('admin order status update error:', e);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// ============================================================================
// MARKETPLACE ANALYTICS
// ============================================================================

// GET /api/admin/analytics/overview
router.get('/analytics/overview', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) dateFilter.createdAt.$lte = new Date(to);
    }

    const [
      totalProducts,
      activeProducts,
      totalOrders,
      completedOrders,
      totalRevenue,
      totalUsers,
      totalVendors
    ] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(dateFilter),
      Order.countDocuments({ ...dateFilter, status: 'completed' }),
      Order.aggregate([
        { $match: { ...dateFilter, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      User.countDocuments(dateFilter),
      Product.distinct('vendorId').then(ids => ids.length)
    ]);

    const revenue = totalRevenue[0]?.total || 0;

    res.json({
      success: true,
      data: {
        products: { total: totalProducts, active: activeProducts },
        orders: { total: totalOrders, completed: completedOrders },
        revenue: revenue,
        users: totalUsers,
        vendors: totalVendors
      }
    });
  } catch (e) {
    console.error('admin analytics overview error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// GET /api/admin/analytics/sales-trends
router.get('/analytics/sales-trends', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    let groupBy, dateRange;
    const now = new Date();

    switch (period) {
      case '24h':
        groupBy = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
        dateRange = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        dateRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        dateRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        dateRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const salesTrends = await Order.aggregate([
      { $match: { createdAt: { $gte: dateRange }, status: 'completed' } },
      {
        $group: {
          _id: groupBy,
          sales: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          items: { $sum: { $size: '$items' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, data: salesTrends });
  } catch (e) {
    console.error('admin sales trends error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch sales trends' });
  }
});

// GET /api/admin/analytics/top-products
router.get('/analytics/top-products', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { limit = 10, period = '30d' } = req.query;
    const limitN = Math.min(50, Math.max(1, Number(limit) || 10));

    const now = new Date();
    const dateRange = new Date(now.getTime() - (period === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000);

    const topProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: dateRange }, status: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          orderCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'users',
          localField: 'product.vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },
      {
        $project: {
          productName: '$product.name',
          category: '$product.category',
          vendorName: '$vendor.username',
          totalSales: 1,
          totalRevenue: 1,
          orderCount: 1
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limitN }
    ]);

    res.json({ success: true, data: topProducts });
  } catch (e) {
    console.error('admin top products error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch top products' });
  }
});

// GET /api/admin/analytics/vendor-performance
router.get('/analytics/vendor-performance', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { limit = 10, period = '30d' } = req.query;
    const limitN = Math.min(50, Math.max(1, Number(limit) || 10));

    const now = new Date();
    const dateRange = new Date(now.getTime() - (period === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000);

    const vendorPerformance = await Order.aggregate([
      { $match: { createdAt: { $gte: dateRange }, status: 'completed' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.vendorId',
          totalSales: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          orderCount: { $sum: 1 },
          productCount: { $addToSet: '$product._id' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },
      {
        $project: {
          vendorName: '$vendor.username',
          vendorEmail: '$vendor.email',
          totalSales: 1,
          totalRevenue: 1,
          orderCount: 1,
          productCount: { $size: '$productCount' },
          avgOrderValue: { $divide: ['$totalRevenue', '$orderCount'] }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limitN }
    ]);

    res.json({ success: true, data: vendorPerformance });
  } catch (e) {
    console.error('admin vendor performance error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor performance' });
  }
});

// ============================================================================
// VENDOR MANAGEMENT
// ============================================================================

// GET /api/admin/vendors - Get all vendors with comprehensive data
router.get('/vendors', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      kycStatus,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageN = Math.max(1, Number(page) || 1);
    const limitN = Math.min(100, Math.max(1, Number(limit) || 20));

    // Get vendor IDs from products
    const vendorIds = await Product.distinct('vendorId', {});
    const validVendorIds = vendorIds.filter(Boolean).map(id => new mongoose.Types.ObjectId(id));

    if (!validVendorIds.length) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: pageN, limit: limitN, total: 0, pages: 0 }
      });
    }

    // Build query
    const query = { _id: { $in: validVendorIds } };

    if (search) {
      query.$or = [
        { username: new RegExp(String(search), 'i') },
        { email: new RegExp(String(search), 'i') },
        { fullName: new RegExp(String(search), 'i') }
      ];
    }

    if (kycStatus) {
      query.kycStatus = kycStatus;
    }

    if (status === 'active') {
      query.isSuspended = false;
    } else if (status === 'suspended') {
      query.isSuspended = true;
    }

    // Get vendors with aggregation for enhanced data
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'vendorId',
          as: 'products'
        }
      },
      {
        $lookup: {
          from: 'orders',
          let: { vendorId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $in: ['$$vendorId', '$items.vendorId'] }
                  ]
                }
              }
            }
          ],
          as: 'orders'
        }
      },
      {
        $addFields: {
          productCount: { $size: '$products' },
          activeProductCount: {
            $size: {
              $filter: {
                input: '$products',
                cond: { $eq: ['$$this.isActive', true] }
              }
            }
          },
          totalSales: { $size: '$orders' },
          totalRevenue: {
            $reduce: {
              input: '$orders',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.total'] }
            }
          },
          avgOrderValue: {
            $cond: {
              if: { $gt: [{ $size: '$orders' }, 0] },
              then: {
                $divide: [
                  {
                    $reduce: {
                      input: '$orders',
                      initialValue: 0,
                      in: { $add: ['$$value', '$$this.total'] }
                    }
                  },
                  { $size: '$orders' }
                ]
              },
              else: 0
            }
          }
        }
      },
      {
        $project: {
          username: 1,
          email: 1,
          fullName: 1,
          avatar: 1,
          kycStatus: 1,
          isSuspended: 1,
          isVerified: 1,
          createdAt: 1,
          lastLoginAt: 1,
          productCount: 1,
          activeProductCount: 1,
          totalSales: 1,
          totalRevenue: 1,
          avgOrderValue: 1
        }
      }
    ];

    // Add sorting
    const sortField = sortBy === 'revenue' ? 'totalRevenue' :
                     sortBy === 'sales' ? 'totalSales' :
                     sortBy === 'products' ? 'productCount' : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    // Add pagination
    pipeline.push(
      { $skip: (pageN - 1) * limitN },
      { $limit: limitN }
    );

    // Get total count
    const countPipeline = [
      { $match: query },
      { $count: 'total' }
    ];

    const [vendors, totalCount] = await Promise.all([
      User.aggregate(pipeline),
      User.aggregate(countPipeline)
    ]);

    const total = totalCount[0]?.total || 0;

    res.json({
      success: true,
      data: vendors,
      pagination: {
        page: pageN,
        limit: limitN,
        total,
        pages: Math.ceil(total / limitN)
      }
    });
  } catch (e) {
    console.error('admin vendors error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch vendors' });
  }
});

// GET /api/admin/vendors/analytics/overview - Get vendor analytics overview
router.get('/vendors/analytics/overview', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get vendor statistics
    const vendorIds = await Product.distinct('vendorId', {});
    const validVendorIds = vendorIds.filter(Boolean).map(id => new mongoose.Types.ObjectId(id));

    const [
      totalVendors,
      activeVendors,
      kycApprovedVendors,
      suspendedVendors,
      newVendors,
      vendorRevenue
    ] = await Promise.all([
      User.countDocuments({ _id: { $in: validVendorIds } }),
      User.countDocuments({ _id: { $in: validVendorIds }, isSuspended: false }),
      User.countDocuments({ _id: { $in: validVendorIds }, kycStatus: 'approved' }),
      User.countDocuments({ _id: { $in: validVendorIds }, isSuspended: true }),
      User.countDocuments({
        _id: { $in: validVendorIds },
        createdAt: { $gte: startDate }
      }),
      Order.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: startDate }
          }
        },
        { $unwind: '$items' },
        {
          $match: {
            'items.vendorId': { $in: validVendorIds }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalOrders: { $sum: 1 }
          }
        }
      ])
    ]);

    const revenue = vendorRevenue[0] || { totalRevenue: 0, totalOrders: 0 };

    const analytics = {
      total_vendors: totalVendors,
      active_vendors: activeVendors,
      kyc_approved: kycApprovedVendors,
      suspended_vendors: suspendedVendors,
      new_vendors: newVendors,
      total_revenue: revenue.totalRevenue,
      total_orders: revenue.totalOrders,
      avg_revenue_per_vendor: totalVendors > 0 ? revenue.totalRevenue / totalVendors : 0,
      vendor_growth_rate: totalVendors > 0 ? (newVendors / totalVendors) * 100 : 0
    };

    res.json({ success: true, data: analytics });
  } catch (e) {
    console.error('admin vendor analytics error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor analytics' });
  }
});

// GET /api/admin/vendors/:id - Get detailed vendor information
router.get('/vendors/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }

    const vendor = await User.findById(id).select('-password');
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Get vendor's products
    const products = await Product.find({ vendorId: id });

    // Get vendor's orders
    const orders = await Order.find({
      'items.vendorId': id,
      status: 'completed'
    }).sort({ createdAt: -1 }).limit(10);

    // Calculate vendor statistics
    const stats = {
      totalProducts: products.length,
      activeProducts: products.filter(p => p.isActive).length,
      totalSales: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      avgOrderValue: orders.length > 0 ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
      recentOrders: orders.slice(0, 5)
    };

    res.json({
      success: true,
      data: {
        vendor,
        products,
        stats
      }
    });
  } catch (e) {
    console.error('admin vendor detail error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor details' });
  }
});

// GET /api/admin/vendors/:id/sales - Get vendor sales data
router.get('/vendors/:id/sales', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - (period === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000);

    const salesData = await Order.aggregate([
      {
        $match: {
          'items.vendorId': new mongoose.Types.ObjectId(id),
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]);

    const sales = salesData[0] || {
      totalSales: 0,
      totalRevenue: 0,
      avgOrderValue: 0
    };

    res.json({ success: true, data: sales });
  } catch (e) {
    console.error('admin vendor sales error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor sales' });
  }
});

// GET /api/admin/vendors/:id/fees - Get vendor platform fees
router.get('/vendors/:id/fees', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '30d' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }

    const now = new Date();
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get commission rate from settings
    const Settings = require('../models/Settings');
    const settings = await Settings.getOrCreateDefault('marketplace');
    const commissionRate = settings.commissionRate || 0.10; // Default 10%

    // Calculate platform fees from completed orders using dynamic commission rate
    const feesData = await Order.aggregate([
      {
        $match: {
          'items.vendorId': new mongoose.Types.ObjectId(id),
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          platformFees: { $sum: { $multiply: ['$total', commissionRate] } }, // Dynamic commission rate
          processingFees: { $sum: { $multiply: ['$total', 0.029] } } // 2.9% processing fee
        }
      }
    ]);

    const fees = feesData[0] || {
      totalOrders: 0,
      totalAmount: 0,
      platformFees: 0,
      processingFees: 0
    };

    // Add total fees and commission rate info
    fees.totalFees = fees.platformFees + fees.processingFees;
    fees.commissionRate = commissionRate;

    res.json({ success: true, data: fees });
  } catch (e) {
    console.error('admin vendor fees error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor fees' });
  }
});

// GET /api/admin/commission/report - Get comprehensive commission report for super admin
router.get('/commission/report', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const now = new Date();
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get commission rate from settings
    const Settings = require('../models/Settings');
    const settings = await Settings.getOrCreateDefault('marketplace');
    const commissionRate = settings.commissionRate || 0.10; // Default 10%

    // Calculate comprehensive commission report
    const reportData = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'users',
          localField: 'product.vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: '$vendor' },
      {
        $group: {
          _id: '$product.vendorId',
          vendorName: { $first: '$vendor.username' },
          vendorEmail: { $first: '$vendor.email' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          totalCommission: { $sum: { $multiply: [{ $multiply: ['$items.quantity', '$items.price'] }, commissionRate] } }
        }
      },
      {
        $sort: { totalCommission: -1 }
      }
    ]);

    // Calculate totals
    const totals = reportData.reduce((acc, vendor) => {
      acc.totalOrders += vendor.totalOrders;
      acc.totalRevenue += vendor.totalRevenue;
      acc.totalCommission += vendor.totalCommission;
      return acc;
    }, { totalOrders: 0, totalRevenue: 0, totalCommission: 0 });

    res.json({
      success: true,
      data: {
        vendors: reportData,
        totals: totals,
        commissionRate: commissionRate,
        period: period
      }
    });
  } catch (e) {
    console.error('admin commission report error:', e);
    res.status(500).json({ success: false, message: 'Failed to generate commission report' });
  }
});

// GET /api/admin/vendors/:id/payout-history - Get vendor payout history (admin access)
router.get('/vendors/:id/payout-history', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id: vendorId } = req.params;
    const { limit = 50, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, message: 'Invalid vendor ID' });
    }

    // Check if vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Get vendor's payout history
    const history = await vendorPayoutService.getVendorPayoutHistory(vendorId, {
      limit: parseInt(limit),
      status
    });

    res.json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          username: vendor.username,
          displayName: vendor.displayName,
          email: vendor.email
        },
        payoutHistory: history
      }
    });
  } catch (error) {
    console.error('Admin get vendor payout history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor payout history',
      error: error.message
    });
  }
});

// ============================================================================
// CHAT MANAGEMENT
// ============================================================================

// GET /api/admin/chat/conversations
// Get all chatbot conversations with filters
router.get('/chat/conversations', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      vendorId,
      customerId,
      sortBy = 'lastActivity',
      sortOrder = 'desc'
    } = req.query;

    const pageN = Math.max(1, Number(page) || 1);
    const limitN = Math.min(100, Math.max(1, Number(limit) || 20));

    // Build query
    const query = {};
    
    if (status === 'active') {
      query.isActive = true;
      query.isResolved = false;
    } else if (status === 'resolved') {
      query.isResolved = true;
    } else if (status === 'closed') {
      query.isActive = false;
    }
    
    if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
      query.vendorId = vendorId;
    }
    
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      query.customerId = customerId;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { productName: new RegExp(String(search), 'i') }
      ];
    }

    // Aggregation pipeline for enhanced data
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $lookup: {
          from: 'chatbotmessages',
          localField: 'lastMessage',
          foreignField: '_id',
          as: 'lastMessageData'
        }
      },
      {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$vendor',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$lastMessageData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          customerId: 1,
          vendorId: 1,
          productId: 1,
          productName: 1,
          lastActivity: 1,
          isActive: 1,
          isResolved: 1,
          botEnabled: 1,
          createdAt: 1,
          updatedAt: 1,
          customer: {
            _id: '$customer._id',
            username: '$customer.username',
            displayName: '$customer.displayName',
            avatar: '$customer.avatar',
            isVerified: '$customer.isVerified'
          },
          vendor: {
            _id: '$vendor._id',
            username: '$vendor.username',
            displayName: '$vendor.displayName',
            avatar: '$vendor.avatar',
            isVerified: '$vendor.isVerified'
          },
          product: {
            _id: '$product._id',
            name: '$product.name',
            images: '$product.images'
          },
          lastMessage: {
            content: '$lastMessageData.content',
            senderId: '$lastMessageData.senderId',
            createdAt: '$lastMessageData.createdAt'
          }
        }
      }
    ];

    // Add sorting
    const sortField = sortBy === 'createdAt' ? 'createdAt' : 'lastActivity';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    // Add pagination
    pipeline.push(
      { $skip: (pageN - 1) * limitN },
      { $limit: limitN }
    );

    // Get total count
    const countPipeline = [
      { $match: query },
      { $count: 'total' }
    ];

    const [conversations, totalCount] = await Promise.all([
      ChatbotConversation.aggregate(pipeline),
      ChatbotConversation.aggregate(countPipeline)
    ]);

    const total = totalCount[0]?.total || 0;

    res.json({
      success: true,
      data: conversations,
      pagination: {
        page: pageN,
        limit: limitN,
        total,
        pages: Math.ceil(total / limitN)
      }
    });
  } catch (e) {
    console.error('admin chat conversations error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch chat conversations' });
  }
});

// GET /api/admin/chat/conversations/:id
// Get specific chatbot conversation with messages
router.get('/chat/conversations/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    const conversation = await ChatbotConversation.findById(id)
      .populate({
        path: 'customerId',
        select: 'username displayName avatar isVerified'
      })
      .populate({
        path: 'vendorId',
        select: 'username displayName avatar isVerified'
      })
      .populate({
        path: 'productId',
        select: 'name images price currency'
      })
      .populate({
        path: 'lastMessage',
        select: 'content senderId createdAt isBotMessage'
      })
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (e) {
    console.error('admin chat conversation detail error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch conversation details' });
  }
});

// GET /api/admin/chat/conversations/:id/messages
// Get messages for a specific conversation
router.get('/chat/conversations/:id/messages', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, page = 1, before } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Check if conversation exists
    const conversation = await ChatbotConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Build query
    let query = {
      conversationId: id,
      isDeleted: false
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get messages
    const messages = await ChatbotMessage.find(query)
      .populate({
        path: 'senderId',
        select: 'username displayName avatar isVerified'
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await ChatbotMessage.countDocuments(query);

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalMessages: total,
          hasMore: skip + messages.length < total
        }
      }
    });
  } catch (e) {
    console.error('admin chat messages error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// POST /api/admin/chat/conversations/:id/messages
// Send message in chatbot conversation as admin
router.post('/chat/conversations/:id/messages', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Find the conversation
    const conversation = await ChatbotConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Create new message from admin
    const newMessage = new ChatbotMessage({
      conversationId: id,
      senderId: req.user.userId, // Admin is the sender
      content: content.trim(),
      isBotMessage: false,
      type: 'text'
    });

    await newMessage.save();

    // Update conversation's last message and activity
    conversation.lastMessage = newMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Populate sender data
    await newMessage.populate('senderId', 'username displayName avatar isVerified');

    res.json({
      success: true,
      data: {
        message: newMessage
      },
      message: 'Message sent successfully'
    });
  } catch (e) {
    console.error('admin send chat message error:', e);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// PUT /api/admin/chat/conversations/:id/resolve
// Mark chatbot conversation as resolved
router.put('/chat/conversations/:id/resolve', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Find the conversation
    const conversation = await ChatbotConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Mark as resolved
    conversation.isResolved = true;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Create resolution message
    const resolutionMessage = new ChatbotMessage({
      conversationId: id,
      senderId: req.user.userId, // Admin is the sender
      content: 'This conversation has been marked as resolved by an administrator.',
      type: 'system',
      isBotMessage: true
    });

    await resolutionMessage.save();

    res.json({
      success: true,
      data: {
        conversation
      },
      message: 'Conversation marked as resolved'
    });
  } catch (e) {
    console.error('admin resolve chat conversation error:', e);
    res.status(500).json({ success: false, message: 'Failed to resolve conversation' });
  }
});

// DELETE /api/admin/chat/conversations/:id
// Close/deactivate chatbot conversation
router.delete('/chat/conversations/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Find the conversation
    const conversation = await ChatbotConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Mark as inactive
    conversation.isActive = false;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Create closure message
    const closureMessage = new ChatbotMessage({
      conversationId: id,
      senderId: req.user.userId, // Admin is the sender
      content: 'This conversation has been closed by an administrator.',
      type: 'system',
      isBotMessage: true
    });

    await closureMessage.save();

    res.json({
      success: true,
      message: 'Conversation closed successfully'
    });
  } catch (e) {
    console.error('admin close chat conversation error:', e);
    res.status(500).json({ success: false, message: 'Failed to close conversation' });
  }
});

// GET /api/admin/chat/search/vendors
// Search vendors for chat purposes
router.get('/chat/search/vendors', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { search, limit = 20, page = 1 } = req.query;

    // Build query for vendors with active products
    let vendorQuery = { role: 'vendor' };
    
    // Find vendors with active products
    const productVendors = await Product.distinct('vendorId', { isActive: true });
    
    if (productVendors.length === 0) {
      return res.json({
        success: true,
        data: {
          vendors: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0,
          },
        },
      });
    }
    
    vendorQuery._id = { $in: productVendors };
    
    // Add search filter if provided
    if (search) {
      vendorQuery.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get vendors
    const vendors = await User.find(vendorQuery, 'username displayName avatar isVerified walletAddress followerCount followingCount')
      .sort({ followerCount: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await User.countDocuments(vendorQuery);

    // Add product count for each vendor
    const vendorsWithCounts = await Promise.all(vendors.map(async (vendor) => {
      const productCount = await Product.countDocuments({ 
        vendorId: vendor._id,
        isActive: true 
      });
      
      return {
        ...vendor,
        id: vendor._id,
        productCount
      };
    }));

    return res.json({
      success: true,
      data: {
        vendors: vendorsWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Search vendors for chat error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search vendors', error: error.message });
  }
});

// POST /api/admin/chat/vendor-admin
// Create vendor-admin conversation
router.post('/chat/vendor-admin', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { vendorId } = req.body;

    // Validation
    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'Vendor ID is required' });
    }

    // Verify vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Check if conversation already exists
    const existingConversation = await ChatbotConversation.findOne({
      vendorId: vendorId,
      customerId: req.user.userId, // Use actual admin user ID
      isActive: true
    });

    if (existingConversation) {
      return res.json({
        success: true,
        data: {
          conversation: existingConversation,
          isNew: false
        },
        message: 'Conversation already exists'
      });
    }

    // Create new conversation with admin
    const newConversation = new ChatbotConversation({
      customerId: req.user.userId, // Use actual admin user ID
      vendorId: vendorId,
      productId: null,
      productName: 'Vendor Support',
      isResolved: false,
      botEnabled: false
    });

    await newConversation.save();

    // Create welcome message from admin
    const welcomeMessage = new ChatbotMessage({
      conversationId: newConversation._id,
      senderId: req.user.userId, // Admin is the sender
      content: `Hello ${vendor.displayName || vendor.username}! How can I help you with your vendor account today?`,
      type: 'system',
      isBotMessage: false
    });

    await welcomeMessage.save();

    // Update conversation with last message
    newConversation.lastMessage = welcomeMessage._id;
    await newConversation.save();

    // Populate the conversation
    await newConversation.populate({
      path: 'customerId',
      select: 'username displayName avatar isVerified'
    });
    await newConversation.populate({
      path: 'vendorId',
      select: 'username displayName avatar isVerified'
    });
    await newConversation.populate({
      path: 'lastMessage',
      select: 'content senderId createdAt isBotMessage'
    });

    return res.json({
      success: true,
      data: {
        conversation: newConversation,
        isNew: true
      },
      message: 'Vendor-admin conversation created successfully'
    });
  } catch (error) {
    console.error('Create vendor-admin conversation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create conversation', error: error.message });
  }
});

// GET /api/admin/chat/analytics
// Get chat analytics
router.get('/chat/analytics', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get chat statistics
    const [
      totalConversations,
      activeConversations,
      resolvedConversations,
      closedConversations,
      totalMessages,
      vendorResponseRate,
      avgResponseTime
    ] = await Promise.all([
      ChatbotConversation.countDocuments({ createdAt: { $gte: startDate } }),
      ChatbotConversation.countDocuments({ isActive: true, isResolved: false }),
      ChatbotConversation.countDocuments({ isResolved: true }),
      ChatbotConversation.countDocuments({ isActive: false }),
      ChatbotMessage.countDocuments({ createdAt: { $gte: startDate } }),
      // Calculate vendor response rate (messages sent by vendors vs total messages)
      ChatbotMessage.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'sender'
          }
        },
        {
          $unwind: '$sender'
        },
        {
          $match: {
            'sender.role': 'vendor',
            createdAt: { $gte: startDate }
          }
        }
      ]).then(vendorMessages => vendorMessages.length),
      // Calculate average response time (simplified)
      ChatbotMessage.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$conversationId',
            messageCount: { $sum: 1 },
            firstMessage: { $min: '$createdAt' },
            lastMessage: { $max: '$createdAt' }
          }
        },
        {
          $project: {
            duration: {
              $subtract: ['$lastMessage', '$firstMessage']
            },
            messageCount: 1
          }
        },
        {
          $match: {
            messageCount: { $gt: 1 }
          }
        },
        {
          $group: {
            _id: null,
            avgDuration: { $avg: '$duration' }
          }
        }
      ]).then(result => result[0] ? result[0].avgDuration / (1000 * 60) : 0) // Convert to minutes
    ]);

    const analytics = {
      total_conversations: totalConversations,
      active_conversations: activeConversations,
      resolved_conversations: resolvedConversations,
      closed_conversations: closedConversations,
      total_messages: totalMessages,
      vendor_response_rate: totalMessages > 0 ? (vendorResponseRate / totalMessages) * 100 : 0,
      avg_response_time: avgResponseTime || 0
    };

    res.json({ success: true, data: analytics });
  } catch (e) {
    console.error('admin chat analytics error:', e);
    res.status(500).json({ success: false, message: 'Failed to fetch chat analytics' });
  }
});

// @route   GET /api/admin/chat/conversations
// @desc    Get all chatbot conversations (admin only)
// @access  Private (Admin only)
router.get('/chat/conversations', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, page = 1, status, priority, assignedToMe } = req.query;
    const userId = req.user.userId;

    // Build query
    const query = { isActive: true };

    // Add status filter
    if (status === 'resolved') {
      query.isResolved = true;
    } else if (status === 'active') {
      query.isResolved = false;
    } else if (status === 'pinned') {
      query.isPinned = true;
    }

    // Add priority filter
    if (priority) {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (validPriorities.includes(priority)) {
        query.priority = priority;
      }
    }

    // Add assigned to me filter
    if (assignedToMe === 'true') {
      query.assignedAdmin = userId;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get conversations
    const conversations = await ChatbotConversation.find(query)
      .populate({
        path: 'customerId',
        select: 'username displayName avatar isVerified'
      })
      .populate({
        path: 'vendorId',
        select: 'username displayName avatar isVerified'
      })
      .populate({
        path: 'productId',
        select: 'name images price currency'
      })
      .populate({
        path: 'lastMessage',
        select: 'content senderId createdAt isBotMessage'
      })
      .populate({
        path: 'assignedAdmin',
        select: 'username displayName'
      })
      .sort({ lastActivity: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await ChatbotConversation.countDocuments(query);

    return res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalConversations: total,
          hasMore: skip + conversations.length < total
        }
      }
    });
  } catch (error) {
    console.error('Admin get conversations error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get conversations' });
  }
});

// @route   GET /api/admin/chat/conversations/:id
// @desc    Get specific chatbot conversation details (admin only)
// @access  Private (Admin only)
router.get('/chat/conversations/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Find the conversation
    const conversation = await ChatbotConversation.findById(id)
      .populate({
        path: 'customerId',
        select: 'username displayName avatar isVerified email'
      })
      .populate({
        path: 'vendorId',
        select: 'username displayName avatar isVerified email'
      })
      .populate({
        path: 'productId',
        select: 'name description images price currency category'
      })
      .populate({
        path: 'lastMessage',
        select: 'content senderId createdAt isBotMessage'
      })
      .populate({
        path: 'assignedAdmin',
        select: 'username displayName'
      })
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    return res.json({
      success: true,
      data: { conversation }
    });
  } catch (error) {
    console.error('Admin get conversation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get conversation' });
  }
});

// @route   PUT /api/admin/chat/conversations/:id/assign
// @desc    Assign/unassign conversation to admin (admin only)
// @access  Private (Admin only)
router.put('/chat/conversations/:id/assign', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Find the conversation
    const conversation = await ChatbotConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Validate admin ID if provided
    if (adminId) {
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        return res.status(400).json({ success: false, message: 'Invalid admin ID' });
      }
      conversation.assignedAdmin = adminId;
    } else {
      // Unassign conversation
      conversation.assignedAdmin = null;
    }

    conversation.lastActivity = new Date();
    await conversation.save();

    // Populate the updated conversation
    const updatedConversation = await ChatbotConversation.findById(id)
      .populate({
        path: 'customerId',
        select: 'username displayName avatar isVerified'
      })
      .populate({
        path: 'vendorId',
        select: 'username displayName avatar isVerified'
      })
      .populate({
        path: 'productId',
        select: 'name images price currency'
      })
      .populate({
        path: 'lastMessage',
        select: 'content senderId createdAt isBotMessage'
      })
      .populate({
        path: 'assignedAdmin',
        select: 'username displayName'
      })
      .lean();

    return res.json({
      success: true,
      data: { conversation: updatedConversation },
      message: adminId ? 'Conversation assigned successfully' : 'Conversation unassigned successfully'
    });
  } catch (error) {
    console.error('Admin assign conversation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign conversation' });
  }
});

// @route   PUT /api/admin/chat/conversations/:id/priority
// @desc    Set conversation priority (admin only)
// @access  Private (Admin only)
router.put('/chat/conversations/:id/priority', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority level' });
    }

    // Find the conversation
    const conversation = await ChatbotConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Update priority
    conversation.priority = priority;
    conversation.lastActivity = new Date();
    await conversation.save();

    return res.json({
      success: true,
      data: { conversation },
      message: `Conversation priority set to ${priority}`
    });
  } catch (error) {
    console.error('Admin set priority error:', error);
    return res.status(500).json({ success: false, message: 'Failed to set conversation priority' });
  }
});

// @route   PUT /api/admin/chat/conversations/:id/resolve
// @desc    Resolve/unresolve conversation (admin only)
// @access  Private (Admin only)
router.put('/chat/conversations/:id/resolve', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isResolved } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Find the conversation
    const conversation = await ChatbotConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Update resolved status
    conversation.isResolved = isResolved !== undefined ? isResolved : !conversation.isResolved;
    conversation.lastActivity = new Date();
    await conversation.save();

    return res.json({
      success: true,
      data: { conversation },
      message: `Conversation ${conversation.isResolved ? 'resolved' : 'reopened'}`
    });
  } catch (error) {
    console.error('Admin resolve conversation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update conversation status' });
  }
});

// @route   DELETE /api/admin/chat/conversations/:id
// @desc    Delete/close conversation (admin only)
// @access  Private (Admin only)
router.delete('/chat/conversations/:id', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    // Find the conversation
    const conversation = await ChatbotConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Mark as inactive
    conversation.isActive = false;
    conversation.lastActivity = new Date();
    await conversation.save();

    return res.json({
      success: true,
      message: 'Conversation closed successfully'
    });
  } catch (error) {
    console.error('Admin delete conversation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to close conversation' });
  }
});

// @route   GET /api/admin/chat/messages
// @desc    Search messages across all conversations (admin only)
// @access  Private (Admin only)
router.get('/chat/messages', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { query, limit = 50, page = 1 } = req.query;

    // Validate search query
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
    }

    // Build search query
    const searchQuery = {
      content: { $regex: query, $options: 'i' },
      isDeleted: false
    };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get messages
    const messages = await ChatbotMessage.find(searchQuery)
      .populate({
        path: 'conversationId',
        select: 'customerId vendorId productName',
        populate: [
          { path: 'customerId', select: 'username displayName' },
          { path: 'vendorId', select: 'username displayName' }
        ]
      })
      .populate({
        path: 'senderId',
        select: 'username displayName'
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await ChatbotMessage.countDocuments(searchQuery);

    return res.json({
      success: true,
      data: {
        messages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalMessages: total,
          hasMore: skip + messages.length < total
        }
      }
    });
  } catch (error) {
    console.error('Admin search messages error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search messages' });
  }
});

// @route   GET /api/admin/chat/stats
// @desc    Get chat statistics (admin only)
// @access  Private (Admin only)
router.get('/chat/stats', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    // Get statistics
    const totalConversations = await ChatbotConversation.countDocuments({ isActive: true });
    const totalMessages = await ChatbotMessage.countDocuments();
    const activeConversations = await ChatbotConversation.countDocuments({ 
      isActive: true, 
      lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    });
    const resolvedConversations = await ChatbotConversation.countDocuments({ 
      isResolved: true, 
      isActive: true 
    });
    const pinnedConversations = await ChatbotConversation.countDocuments({ 
      isPinned: true, 
      isActive: true 
    });

    // Get conversation counts by priority
    const priorityStats = await ChatbotConversation.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Get conversation counts by status
    const statusStats = await ChatbotConversation.aggregate([
      { $match: { isActive: true } },
      { 
        $group: { 
          _id: { 
            isResolved: '$isResolved', 
            isPinned: '$isPinned' 
          }, 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const stats = {
      totalConversations,
      totalMessages,
      activeConversations,
      resolvedConversations,
      pinnedConversations,
      priorityStats,
      statusStats
    };

    return res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Admin chat stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get chat statistics' });
  }
});

// GET /api/admin/settings - Get all admin settings
router.get('/settings', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    
    // Get all settings types
    const marketplaceSettings = await Settings.getOrCreateDefault('marketplace');
    const paymentSettings = await Settings.getOrCreateDefault('payment');
    const shippingSettings = await Settings.getOrCreateDefault('shipping');
    const notificationSettings = await Settings.getOrCreateDefault('notification');
    
    res.json({
      success: true,
      data: {
        marketplace: marketplaceSettings,
        payment: paymentSettings,
        shipping: shippingSettings,
        notification: notificationSettings
      }
    });
  } catch (error) {
    console.error('admin get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings - Update admin settings
router.put('/settings', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { type, updates } = req.body;
    
    if (!type || !updates) {
      return res.status(400).json({ success: false, message: 'Type and updates are required' });
    }
    
    const Settings = require('../models/Settings');
    
    // Update settings based on type
    const updatedSettings = await Settings.updateSettings(type, updates, req.user.userId);
    
    res.json({
      success: true,
      message: `${type} settings updated successfully`,
      data: updatedSettings
    });
  } catch (error) {
    console.error('admin update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// Admin Payment Preferences Routes
const AdminPaymentPreferences = require('../models/AdminPaymentPreferences');

// GET /api/admin/payment-preferences - Get admin payment preferences
router.get('/payment-preferences', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId;
    let preferences = await AdminPaymentPreferences.findOne({ adminId });
    
    if (!preferences) {
      preferences = new AdminPaymentPreferences({ adminId });
      await preferences.save();
    }
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('admin get payment preferences error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment preferences' });
  }
});

// PUT /api/admin/payment-preferences - Update admin payment preferences
router.put('/payment-preferences', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const updates = req.body;
    
    // Remove adminId from updates for security
    delete updates.adminId;
    
    let preferences = await AdminPaymentPreferences.findOne({ adminId });
    
    if (!preferences) {
      preferences = new AdminPaymentPreferences({ adminId, ...updates });
    } else {
      Object.assign(preferences, updates);
    }
    
    await preferences.save();
    
    res.json({
      success: true,
      message: 'Payment preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    console.error('admin update payment preferences error:', error);
    res.status(500).json({ success: false, message: 'Failed to update payment preferences' });
  }
});

// Admin Commission Withdrawal Routes
const adminCommissionService = require('../services/adminCommissionService');

// GET /api/admin/commission/total - Get total admin commission
router.get('/commission/total', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const commissionData = await adminCommissionService.calculateTotalCommission();
    
    res.json({
      success: true,
      data: commissionData
    });
  } catch (error) {
    console.error('admin get total commission error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch total commission' });
  }
});

// POST /api/admin/commission/withdraw - Withdraw admin commission
router.post('/commission/withdraw', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { amount, currency = 'RWF', withdrawalDetails } = req.body;
    const adminId = req.user.userId;
    
    // Ensure currency is RWF
    if (currency !== 'RWF') {
      return res.status(400).json({ success: false, message: 'Commission withdrawals must be processed in Rwandan Francs (RWF)' });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }
    
    // Get admin user
    const User = require('../models/User');
    const admin = await User.findById(adminId);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }
    
    // Process withdrawal
    const result = await adminCommissionService.processCommissionWithdrawal(
      admin,
      amount,
      currency,
      withdrawalDetails || {}
    );
    
    res.json({
      success: true,
      message: 'Commission withdrawal processed successfully',
      data: result
    });
  } catch (error) {
    console.error('admin commission withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Failed to process commission withdrawal' });
  }
});

// GET /api/admin/commission/history - Get admin commission withdrawal history
router.get('/commission/history', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { limit, status } = req.query;
    
    const history = await adminCommissionService.getAdminWithdrawalHistory(adminId, {
      limit: limit ? parseInt(limit) : undefined,
      status
    });
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('admin get commission history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch commission history' });
  }
});

// GET /api/admin/dashboard/recent-activity
// Fetch recent activities across the platform
router.get('/dashboard/recent-activity', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const limitN = Math.min(50, Math.max(1, Number(limit) || 20));
    
    // Get recent orders
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(limitN)
      .populate('userId', 'username')
      .lean();
    
    // Get recent products
    const recentProducts = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(limitN)
      .populate('vendorId', 'username')
      .lean();
    
    // Get recent users
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(limitN)
      .lean();
    
    // Combine and sort all activities by timestamp
    const allActivities = [];
    
    recentOrders.forEach(order => {
      allActivities.push({
        type: 'order',
        message: `New order #${order.orderNumber} placed by ${order.userId?.username || 'Unknown User'}`,
        timestamp: order.createdAt,
        status: order.status,
        id: order._id
      });
    });
    
    recentProducts.forEach(product => {
      allActivities.push({
        type: 'product',
        message: `New product "${product.name}" added by ${product.vendorId?.username || 'Unknown Vendor'}`,
        timestamp: product.createdAt,
        status: product.isActive ? 'success' : 'warning',
        id: product._id
      });
    });
    
    recentUsers.forEach(user => {
      allActivities.push({
        type: 'user',
        message: `New user registered: ${user.username || user.email}`,
        timestamp: user.createdAt,
        status: 'success',
        id: user._id
      });
    });
    
    // Sort by timestamp, most recent first
    allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit to the specified number
    const recentActivity = allActivities.slice(0, limitN);
    
    res.json({
      success: true,
      data: recentActivity
    });
  } catch (error) {
    console.error('admin recent activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch recent activity' });
  }
});

// GET /api/admin/dashboard/system-health
// Check system health status
router.get('/dashboard/system-health', authenticateTokenStrict, requireAdmin, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'error';
    
    // Check API status (self-check)
    const apiStatus = 'healthy';
    
    // Check storage (check if uploads directory is accessible)
    const fs = require('fs');
    const path = require('path');
    const uploadsPath = path.join(__dirname, '../uploads');
    let storageStatus = 'healthy';
    try {
      await fs.promises.access(uploadsPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      storageStatus = 'error';
    }
    
    // Check payment services (check if Stripe is configured)
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const paymentsStatus = stripeSecret ? 'healthy' : 'warning';
    
    const healthData = {
      database: dbStatus,
      api: apiStatus,
      storage: storageStatus,
      payments: paymentsStatus
    };
    
    res.json({
      success: true,
      data: healthData
    });
  } catch (error) {
    console.error('admin system health error:', error);
    res.status(500).json({ success: false, message: 'Failed to check system health' });
  }
});

module.exports = router;

