/**
 * Notification Service
 * Handles creation, distribution, and management of notifications
 */

const Notification = require('../models/Notification');

class NotificationService {
  /**
   * Create a new notification
   * @param {Object} notificationData - The notification data
   * @returns {Promise<Object>} The created notification
   */
  static async createNotification(notificationData) {
    try {
      // Validate required fields
      if (!notificationData.recipient || !notificationData.sender || !notificationData.type || !notificationData.title || !notificationData.message) {
        throw new Error('Missing required notification fields');
      }

      // Create the notification
      const notification = await Notification.createNotification(notificationData);
      
      // Emit real-time notification if io instance is available
      if (global.io) {
        // Send the notification to the recipient
        global.io.to(`user_${notification.recipient}`).emit('notification:new', notification);
        
        // Update unread count
        const unreadCount = await Notification.getUnreadCount(notification.recipient);
        global.io.to(`user_${notification.recipient}`).emit('notification:unread-count', {
          unreadCount
        });
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Create multiple notifications
   * @param {Array} notificationsData - Array of notification data objects
   * @returns {Promise<Array>} Array of created notifications
   */
  static async createNotifications(notificationsData) {
    try {
      const notifications = [];
      
      for (const notificationData of notificationsData) {
        const notification = await this.createNotification(notificationData);
        notifications.push(notification);
      }
      
      return notifications;
    } catch (error) {
      console.error('Error creating notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notifications as read
   * @param {Array} notificationIds - Array of notification IDs
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  static async markAsRead(notificationIds, userId) {
    try {
      const result = await Notification.markAsRead(notificationIds, userId);
      
      // Emit real-time update for unread count
      if (global.io) {
        const newUnreadCount = await Notification.getUnreadCount(userId);
        global.io.to(`user_${userId}`).emit('notification:unread-count', {
          unreadCount: newUnreadCount
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Update result
   */
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.markAllAsRead(userId);
      
      // Emit real-time update for unread count
      if (global.io) {
        global.io.to(`user_${userId}`).emit('notification:unread-count', {
          unreadCount: 0
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });
      
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      // Emit real-time update for unread count if notification was unread
      if (!notification.isRead && global.io) {
        const newUnreadCount = await Notification.getUnreadCount(userId);
        global.io.to(`user_${userId}`).emit('notification:unread-count', {
          unreadCount: newUnreadCount
        });
      }
      
      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Notifications and pagination info
   */
  static async getUserNotifications(userId, options = {}) {
    try {
      return await Notification.getUserNotifications(userId, options);
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notifications count
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  static async getUnreadCount(userId) {
    try {
      return await Notification.getUnreadCount(userId);
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Create a follow notification
   * @param {string} followerId - User who followed
   * @param {string} followedUserId - User who was followed
   * @returns {Promise<Object>} Created notification
   */
  static async createFollowNotification(followerId, followedUserId) {
    try {
      // Don't send notifications to self
      if (followerId === followedUserId) {
        return null;
      }
      
      const notificationData = {
        recipient: followedUserId,
        sender: followerId,
        type: 'follow',
        title: 'New Follower',
        message: 'started following you',
        priority: 'normal'
      };
      
      return await this.createNotification(notificationData);
    } catch (error) {
      console.error('Error creating follow notification:', error);
      throw error;
    }
  }

  /**
   * Create a like notification
   * @param {string} likerId - User who liked
   * @param {string} postOwnerId - User who owns the post
   * @param {string} postId - Post ID
   * @param {string} postContent - Post content preview
   * @returns {Promise<Object>} Created notification
   */
  static async createLikeNotification(likerId, postOwnerId, postId, postContent = '') {
    try {
      // Don't send notifications to self
      if (likerId === postOwnerId) {
        return null;
      }
      
      // Truncate post content for notification message
      const truncatedContent = postContent.length > 50 
        ? postContent.substring(0, 50) + '...' 
        : postContent;
      
      const notificationData = {
        recipient: postOwnerId,
        sender: likerId,
        type: 'like',
        title: 'Post Liked',
        message: truncatedContent 
          ? `liked your post: "${truncatedContent}"` 
          : 'liked your post',
        relatedId: postId,
        relatedModel: 'Post',
        priority: 'normal',
        actionUrl: `/post/${postId}`
      };
      
      return await this.createNotification(notificationData);
    } catch (error) {
      console.error('Error creating like notification:', error);
      throw error;
    }
  }

  /**
   * Create a comment notification
   * @param {string} commenterId - User who commented
   * @param {string} postOwnerId - User who owns the post
   * @param {string} postId - Post ID
   * @param {string} commentContent - Comment content
   * @returns {Promise<Object>} Created notification
   */
  static async createCommentNotification(commenterId, postOwnerId, postId, commentContent = '') {
    try {
      // Don't send notifications to self
      if (commenterId === postOwnerId) {
        return null;
      }
      
      // Truncate comment content for notification message
      const truncatedContent = commentContent.length > 50 
        ? commentContent.substring(0, 50) + '...' 
        : commentContent;
      
      const notificationData = {
        recipient: postOwnerId,
        sender: commenterId,
        type: 'comment',
        title: 'New Comment',
        message: truncatedContent 
          ? `commented on your post: "${truncatedContent}"` 
          : 'commented on your post',
        relatedId: postId,
        relatedModel: 'Post',
        priority: 'normal',
        actionUrl: `/post/${postId}`
      };
      
      return await this.createNotification(notificationData);
    } catch (error) {
      console.error('Error creating comment notification:', error);
      throw error;
    }
  }

  /**
   * Create a mention notification
   * @param {string} mentionerId - User who mentioned
   * @param {string} mentionedUserId - User who was mentioned
   * @param {string} postId - Post ID
   * @param {string} postContent - Post content preview
   * @returns {Promise<Object>} Created notification
   */
  static async createMentionNotification(mentionerId, mentionedUserId, postId, postContent = '') {
    try {
      // Don't send notifications to self
      if (mentionerId === mentionedUserId) {
        return null;
      }
      
      // Truncate post content for notification message
      const truncatedContent = postContent.length > 50 
        ? postContent.substring(0, 50) + '...' 
        : postContent;
      
      const notificationData = {
        recipient: mentionedUserId,
        sender: mentionerId,
        type: 'mention',
        title: 'You Were Mentioned',
        message: truncatedContent 
          ? `mentioned you in a post: "${truncatedContent}"` 
          : 'mentioned you in a post',
        relatedId: postId,
        relatedModel: 'Post',
        priority: 'high',
        actionUrl: `/post/${postId}`
      };
      
      return await this.createNotification(notificationData);
    } catch (error) {
      console.error('Error creating mention notification:', error);
      throw error;
    }
  }

  /**
   * Create a message notification
   * @param {string} senderId - User who sent the message
   * @param {string} recipientId - User who received the message
   * @param {string} conversationId - Conversation ID
   * @param {string} messageContent - Message content
   * @returns {Promise<Object>} Created notification
   */
  static async createMessageNotification(senderId, recipientId, conversationId, messageContent = '') {
    try {
      // Don't send notifications to self
      if (senderId === recipientId) {
        return null;
      }
      
      // Truncate message content for notification message
      const truncatedContent = messageContent.length > 50 
        ? messageContent.substring(0, 50) + '...' 
        : messageContent;
      
      const notificationData = {
        recipient: recipientId,
        sender: senderId,
        type: 'message',
        title: 'New Message',
        message: truncatedContent 
          ? `sent you a message: "${truncatedContent}"` 
          : 'sent you a message',
        relatedId: conversationId,
        relatedModel: 'Message',
        priority: 'normal',
        actionUrl: `/messages?conversation=${conversationId}`
      };
      
      return await this.createNotification(notificationData);
    } catch (error) {
      console.error('Error creating message notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;