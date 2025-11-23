const Order = require('../models/Order');
const User = require('../models/User');
const Notification = require('../models/Notification');

class OrderTrackingService {
  /**
   * Update order status and send notifications
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New status
   * @param {Object} updateData - Additional update data
   * @param {string} updatedBy - User ID who updated the status
   * @returns {Object} Update result
   */
  async updateOrderStatus(orderId, newStatus, updateData = {}, updatedBy = null) {
    try {
      console.log(`Updating order ${orderId} status to ${newStatus}`, updateData);
      
      // Validate order exists
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Validate status
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}`);
      }
      
      // Add status to history
      const statusEntry = {
        status: newStatus,
        timestamp: new Date(),
        notes: updateData.notes || '',
        updatedBy: updatedBy || null
      };
      
      // Update order
      const updateFields = {
        status: newStatus,
        statusHistory: [...(order.statusHistory || []), statusEntry],
        timeline: [...(order.timeline || []), {
          event: `status_${newStatus}`,
          timestamp: new Date(),
          details: updateData
        }]
      };
      
      // Add specific timestamp fields
      const timestampFields = {
        pending: 'createdAt',
        processing: 'processingAt',
        shipped: 'shippedAt',
        delivered: 'deliveredAt',
        completed: 'completedAt',
        cancelled: 'cancelledAt',
        refunded: 'refundedAt'
      };
      
      if (timestampFields[newStatus]) {
        updateFields[timestampFields[newStatus]] = new Date();
      }
      
      // Add specific fields based on status
      if (newStatus === 'shipped') {
        if (updateData.trackingNumber) {
          updateFields.trackingNumber = updateData.trackingNumber;
        }
        if (updateData.carrier) {
          updateFields.carrier = updateData.carrier;
        }
        if (updateData.estimatedDelivery) {
          updateFields.estimatedDelivery = updateData.estimatedDelivery;
        }
        if (updatedBy) {
          updateFields.shippedBy = updatedBy;
        }
      } else if (newStatus === 'delivered') {
        if (updatedBy) {
          updateFields.deliveredBy = updatedBy;
        }
      } else if (newStatus === 'cancelled') {
        if (updateData.reason) {
          updateFields.cancellationReason = updateData.reason;
        }
      } else if (newStatus === 'refunded') {
        if (updateData.reason) {
          updateFields.refundReason = updateData.reason;
        }
      }
      
      // Update order
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { $set: updateFields },
        { new: true }
      );
      
      console.log(`Order ${orderId} status updated to ${newStatus}`);
      
      // Send notifications
      await this.sendOrderStatusNotification(order, newStatus, updateData);
      
      return {
        success: true,
        message: 'Order status updated successfully',
        data: updatedOrder
      };
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }
  
  /**
   * Send order status notification
   * @param {Object} order - Order object
   * @param {string} status - New status
   * @param {Object} updateData - Update data
   */
  async sendOrderStatusNotification(order, status, updateData = {}) {
    try {
      console.log(`Sending order status notification for order ${order._id}`, { status, updateData });
      
      // Get user
      const user = await User.findById(order.userId);
      if (!user) {
        console.warn(`User not found for order ${order._id}`);
        return;
      }
      
      // Create notification based on status
      let notificationData = {
        userId: order.userId,
        type: 'order_status_update',
        title: `Order ${order.orderNumber} Status Update`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: status,
          ...updateData
        }
      };
      
      // Customize message based on status
      switch (status) {
        case 'processing':
          notificationData.message = `Your order ${order.orderNumber} is now being processed.`;
          break;
        case 'shipped':
          notificationData.message = `Your order ${order.orderNumber} has been shipped.`;
          if (updateData.trackingNumber) {
            notificationData.message += ` Tracking number: ${updateData.trackingNumber}`;
          }
          break;
        case 'delivered':
          notificationData.message = `Your order ${order.orderNumber} has been delivered.`;
          break;
        case 'completed':
          notificationData.message = `Your order ${order.orderNumber} is completed. Thank you for your purchase!`;
          break;
        case 'cancelled':
          notificationData.message = `Your order ${order.orderNumber} has been cancelled.`;
          if (updateData.reason) {
            notificationData.message += ` Reason: ${updateData.reason}`;
          }
          break;
        case 'refunded':
          notificationData.message = `Your order ${order.orderNumber} has been refunded.`;
          if (updateData.reason) {
            notificationData.message += ` Reason: ${updateData.reason}`;
          }
          break;
        default:
          notificationData.message = `Your order ${order.orderNumber} status has been updated to ${status}.`;
      }
      
      // Create notification
      await Notification.create(notificationData);
      
      // Also notify vendors
      const vendorNotifications = [];
      for (const item of order.items) {
        if (item.productId && item.productId.vendorId) {
          const vendorId = item.productId.vendorId;
          
          // Check if we've already notified this vendor
          if (vendorNotifications.includes(vendorId.toString())) {
            continue;
          }
          
          vendorNotifications.push(vendorId.toString());
          
          // Get vendor
          const vendor = await User.findById(vendorId);
          if (vendor) {
            const vendorNotificationData = {
              userId: vendorId,
              type: 'vendor_order_status_update',
              title: `Order ${order.orderNumber} Status Update`,
              message: `Order ${order.orderNumber} status has been updated to ${status}.`,
              data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                status: status,
                ...updateData
              }
            };
            
            await Notification.create(vendorNotificationData);
          }
        }
      }
      
      console.log(`Order status notifications sent for order ${order._id}`);
    } catch (error) {
      console.error('Error sending order status notification:', error);
    }
  }
  
  /**
   * Add notification to order
   * @param {string} orderId - Order ID
   * @param {Object} notificationData - Notification data
   * @returns {Object} Result
   */
  async addOrderNotification(orderId, notificationData) {
    try {
      console.log(`Adding notification to order ${orderId}`, notificationData);
      
      // Validate order exists
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Add notification to order
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          $push: {
            notifications: {
              ...notificationData,
              timestamp: new Date(),
              read: false
            }
          }
        },
        { new: true }
      );
      
      console.log(`Notification added to order ${orderId}`);
      
      return {
        success: true,
        message: 'Notification added successfully',
        data: updatedOrder
      };
    } catch (error) {
      console.error('Error adding order notification:', error);
      throw new Error(`Failed to add order notification: ${error.message}`);
    }
  }
  
  /**
   * Mark order notifications as read
   * @param {string} orderId - Order ID
   * @param {Array} notificationIds - Notification IDs to mark as read
   * @returns {Object} Result
   */
  async markNotificationsAsRead(orderId, notificationIds = []) {
    try {
      console.log(`Marking notifications as read for order ${orderId}`, notificationIds);
      
      // Validate order exists
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      // If no notification IDs provided, mark all as read
      let updateQuery;
      if (notificationIds.length === 0) {
        updateQuery = { $set: { 'notifications.$[].read': true } };
      } else {
        updateQuery = { 
          $set: { 
            'notifications.$[elem].read': true 
          } 
        };
      }
      
      const updateOptions = notificationIds.length === 0 
        ? {} 
        : { 
            arrayFilters: [{ 'elem._id': { $in: notificationIds.map(id => mongoose.Types.ObjectId(id)) } }] 
          };
      
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        updateQuery,
        { new: true, ...updateOptions }
      );
      
      console.log(`Notifications marked as read for order ${orderId}`);
      
      return {
        success: true,
        message: 'Notifications marked as read successfully',
        data: updatedOrder
      };
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw new Error(`Failed to mark notifications as read: ${error.message}`);
    }
  }
  
  /**
   * Get order timeline
   * @param {string} orderId - Order ID
   * @returns {Object} Timeline data
   */
  async getOrderTimeline(orderId) {
    try {
      console.log(`Getting timeline for order ${orderId}`);
      
      // Validate order exists
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Get timeline data
      const timeline = order.timeline || [];
      
      // Sort by timestamp
      timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log(`Timeline retrieved for order ${orderId}`);
      
      return {
        success: true,
        data: timeline
      };
    } catch (error) {
      console.error('Error getting order timeline:', error);
      throw new Error(`Failed to get order timeline: ${error.message}`);
    }
  }
  
  /**
   * Add timeline event to order
   * @param {string} orderId - Order ID
   * @param {Object} eventData - Event data
   * @returns {Object} Result
   */
  async addTimelineEvent(orderId, eventData) {
    try {
      console.log(`Adding timeline event to order ${orderId}`, eventData);
      
      // Validate order exists
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Add timeline event
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          $push: {
            timeline: {
              ...eventData,
              timestamp: new Date()
            }
          }
        },
        { new: true }
      );
      
      console.log(`Timeline event added to order ${orderId}`);
      
      return {
        success: true,
        message: 'Timeline event added successfully',
        data: updatedOrder
      };
    } catch (error) {
      console.error('Error adding timeline event:', error);
      throw new Error(`Failed to add timeline event: ${error.message}`);
    }
  }
}

module.exports = new OrderTrackingService();