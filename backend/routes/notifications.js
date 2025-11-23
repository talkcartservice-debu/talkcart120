const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateTokenStrict } = require('./auth');

// Helper function to get Socket.IO instance
const getIo = (req) => req.app.get('io');

// @route   GET /api/notifications/health
// @desc    Health check for notifications service
// @access  Public
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Notifications service is healthy',
    timestamp: new Date().toISOString(),
    features: ['real-time', 'push', 'email', 'in-app']
  });
});

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      page = 1,
      limit = 20,
      type,
      unreadOnly = false
    } = req.query;

    const result = await Notification.getUserNotifications(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      unreadOnly: unreadOnly === 'true'
    });

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      message: error.message
    });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notifications count
// @access  Private
router.get('/unread-count', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const count = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: { unreadCount: count }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      message: error.message
    });
  }
});

// @route   POST /api/notifications/mark-read
// @desc    Mark specific notifications as read
// @access  Private
router.post('/mark-read', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        error: 'notificationIds array is required'
      });
    }

    const result = await Notification.markAsRead(notificationIds, userId);

    // Emit real-time update for unread count
    const io = getIo(req);
    if (io) {
      const newUnreadCount = await Notification.getUnreadCount(userId);
      io.to(`user_${userId}`).emit('notification:unread-count', {
        unreadCount: newUnreadCount
      });
    }

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} notifications marked as read`
      }
    });

  } catch (error) {
    console.error('Mark notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read',
      message: error.message
    });
  }
});

// @route   POST /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.post('/mark-all-read', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await Notification.markAllAsRead(userId);

    // Emit real-time update for unread count
    const io = getIo(req);
    if (io) {
      io.to(`user_${userId}`).emit('notification:unread-count', {
        unreadCount: 0
      });
    }

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: `${result.modifiedCount} notifications marked as read`
      }
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: error.message
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id: notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Emit real-time update for unread count if notification was unread
    if (!notification.isRead) {
      const io = getIo(req);
      if (io) {
        const newUnreadCount = await Notification.getUnreadCount(userId);
        io.to(`user_${userId}`).emit('notification:unread-count', {
          unreadCount: newUnreadCount
        });
      }
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      message: error.message
    });
  }
});

// @route   POST /api/notifications/create
// @desc    Create a notification (internal use)
// @access  Private
router.post('/create', authenticateTokenStrict, async (req, res) => {
  try {
    const {
      recipient,
      type,
      title,
      message,
      data = {},
      relatedId,
      relatedModel,
      priority = 'normal',
      actionUrl
    } = req.body;

    const senderId = req.user.userId;

    // Don't send notifications to self
    if (recipient === senderId) {
      return res.json({
        success: true,
        message: 'Self-notification skipped'
      });
    }

    const notificationData = {
      recipient,
      sender: senderId,
      type,
      title,
      message,
      data,
      priority,
      actionUrl
    };

    if (relatedId) notificationData.relatedId = relatedId;
    if (relatedModel) notificationData.relatedModel = relatedModel;

    const notification = await Notification.createNotification(notificationData);

    // Send real-time notification
    const io = getIo(req);
    if (io) {
      // Send the notification
      io.to(`user_${recipient}`).emit('notification:new', notification);
      
      // Update unread count
      const unreadCount = await Notification.getUnreadCount(recipient);
      io.to(`user_${recipient}`).emit('notification:unread-count', {
        unreadCount
      });
    }

    res.json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create notification',
      message: error.message
    });
  }
});

// @route   GET /api/notifications/types
// @desc    Get available notification types
// @access  Private
router.get('/types', authenticateTokenStrict, async (req, res) => {
  try {
    const types = [
      { value: 'follow', label: 'New Follower', icon: 'person_add' },
      { value: 'like', label: 'Post Liked', icon: 'favorite' },
      { value: 'comment', label: 'New Comment', icon: 'comment' },
      { value: 'mention', label: 'Mentioned', icon: 'alternate_email' },
      { value: 'share', label: 'Post Shared', icon: 'share' },
      { value: 'message', label: 'New Message', icon: 'message' },
      { value: 'order', label: 'Order Update', icon: 'shopping_cart' },
      { value: 'payment', label: 'Payment', icon: 'payment' },
      { value: 'product_approved', label: 'Product Approved', icon: 'check_circle' },
      { value: 'product_rejected', label: 'Product Rejected', icon: 'cancel' },
      { value: 'system', label: 'System', icon: 'info' },
      { value: 'admin', label: 'Admin', icon: 'admin_panel_settings' }
    ];

    res.json({
      success: true,
      data: types
    });

  } catch (error) {
    console.error('Get notification types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification types',
      message: error.message
    });
  }
});

// @route   POST /api/notifications/test
// @desc    Send test notification (development only)
// @access  Private
router.post('/test', authenticateTokenStrict, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test notifications not allowed in production'
      });
    }

    const userId = req.user.userId;
    const { type = 'system', title = 'Test Notification', message = 'This is a test notification' } = req.body;

    const notification = await Notification.createNotification({
      recipient: userId,
      sender: userId,
      type,
      title,
      message,
      data: { test: true },
      priority: 'normal'
    });

    // Send real-time notification
    const io = getIo(req);
    if (io) {
      io.to(`user_${userId}`).emit('notification:new', notification);
      
      const unreadCount = await Notification.getUnreadCount(userId);
      io.to(`user_${userId}`).emit('notification:unread-count', {
        unreadCount
      });
    }

    res.json({
      success: true,
      data: notification,
      message: 'Test notification sent successfully'
    });

  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
      message: error.message
    });
  }
});

module.exports = router;