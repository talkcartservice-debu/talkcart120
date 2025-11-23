/**
 * Socket Service for real-time messaging
 * This service handles socket.io events for messaging features
 */

const mongoose = require('mongoose');
const { Message, Conversation, ChatbotConversation, ChatbotMessage, User, Product, RefundEvent } = require('../models');

class SocketService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> userId
    this.typingUsers = new Map(); // conversationId -> Set of userIds

    // Simple in-memory refund event log (admin)
    this.refundEvents = [];

    // Set up socket event handlers
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    // Note: Connection handling is now done in server.js with JWT authentication
    // This method now only sets up event handlers for authenticated sockets
  }

  // Method to register an authenticated socket (called from server.js)
  registerAuthenticatedSocket(socket) {
    const userId = socket.userId;

    if (!userId) {
      console.error('Cannot register socket without userId');
      return;
    }

    console.log(`SocketService: Registering authenticated socket for user ${userId}`);

    // Store user socket mapping
    this.userSockets.set(userId, socket.id);
    this.socketUsers.set(socket.id, userId);

    // Join user's personal room for direct messages
    socket.join(`user_${userId}`);

    // Update user's online status
    this.updateUserOnlineStatus(userId, true);

    // Broadcast user's online status to their contacts
    this.broadcastUserStatus(userId, true);

    // Set up socket event handlers for this authenticated socket
    this.setupSocketEventHandlers(socket);
  }

  async updateUserOnlineStatus(userId, isOnline) {
    if (userId === 'anonymous-user' || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`Skipping online status update for invalid userId: ${userId}`);
      return;
    }
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  }

  setupSocketEventHandlers(socket) {
    const userId = socket.userId;

    // Join notifications room
    socket.on('join-notifications', () => {
      try {
        // Join user's notification room
        socket.join(`notifications_${userId}`);
        console.log(`User ${userId} joined notifications room`);

        socket.emit('notifications-joined');
      } catch (error) {
        console.error('Join notifications room error:', error);
        socket.emit('error', { message: 'Failed to join notifications room' });
      }
    });

    // Leave notifications room
    socket.on('leave-notifications', () => {
      try {
        // Leave user's notification room
        socket.leave(`notifications_${userId}`);
        console.log(`User ${userId} left notifications room`);

        socket.emit('notifications-left');
      } catch (error) {
        console.error('Leave notifications room error:', error);
        socket.emit('error', { message: 'Failed to leave notifications room' });
      }
    });

    // Mark notification as read
    socket.on('notification:mark-read', async (data) => {
      try {
        const { notificationId } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !notificationId) {
          socket.emit('error', { message: 'Invalid request' });
          return;
        }

        // Import NotificationService here to avoid circular dependencies
        const NotificationService = require('./notificationService');
        
        // Mark notification as read
        await NotificationService.markAsRead([notificationId], userId);

        socket.emit('notification:marked-read', { notificationId });
      } catch (error) {
        console.error('Mark notification as read error:', error);
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    // Mark all notifications as read
    socket.on('notification:mark-all-read', async () => {
      try {
        const userId = this.socketUsers.get(socket.id);

        if (!userId) {
          socket.emit('error', { message: 'Invalid request' });
          return;
        }

        // Import NotificationService here to avoid circular dependencies
        const NotificationService = require('./notificationService');
        
        // Mark all notifications as read
        await NotificationService.markAllAsRead(userId);

        socket.emit('notification:all-marked-read');
      } catch (error) {
        console.error('Mark all notifications as read error:', error);
        socket.emit('error', { message: 'Failed to mark all notifications as read' });
      }
    });

    // Join conversation room
    socket.on('join-conversation', async (data) => {
      try {
        const { conversationId } = data;
        const userId = this.socketUsers.get(socket.id);

        console.log('Socket join-conversation event received:', { conversationId, userId });

        if (!userId || !conversationId) {
          console.log('Invalid join-conversation request:', { userId, conversationId });
          socket.emit('error', { message: 'Invalid request' });
          return;
        }

        // Check if user is a participant in the conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
          isActive: true
        });

        if (!conversation) {
          console.log('User not authorized to join conversation:', { userId, conversationId });
          socket.emit('error', { message: 'Access denied to conversation' });
          return;
        }

        // Join conversation room
        const roomName = `conversation_${conversationId}`;
        socket.join(roomName);
        console.log(`User ${userId} joined conversation room ${roomName}`);

        // Notify other participants that user has joined
        socket.to(roomName).emit('user-joined', {
          conversationId,
          userId
        });
      } catch (error) {
        console.error('Join conversation error:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Join chatbot conversation room
    socket.on('join-chatbot-conversation', async (data) => {
      try {
        const { conversationId } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !conversationId) {
          socket.emit('error', { message: 'Invalid request' });
          return;
        }

        // Check if user is a participant in the chatbot conversation
        const conversation = await ChatbotConversation.findOne({
          _id: conversationId,
          $or: [
            { customerId: userId },
            { vendorId: userId },
            { customerId: 'admin' } // Allow admin conversations
          ],
          isActive: true
        });

        if (!conversation) {
          socket.emit('error', { message: 'Access denied to chatbot conversation' });
          return;
        }

        // Join chatbot conversation room
        socket.join(`chatbot_conversation_${conversationId}`);
        console.log(`User ${userId} joined chatbot conversation ${conversationId}`);

        // Notify other participants that user has joined
        socket.to(`chatbot_conversation_${conversationId}`).emit('chatbot:user-joined', {
          conversationId,
          userId
        });
      } catch (error) {
        console.error('Join chatbot conversation error:', error);
        socket.emit('error', { message: 'Failed to join chatbot conversation' });
      }
    });

    // Join post room for real-time updates
    socket.on('join-post', async (data) => {
      try {
        const { postId } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!postId) {
          socket.emit('error', { message: 'Post ID is required' });
          return;
        }

        // Join post room for real-time like/comment updates (standardized)
        socket.join(`post:${postId}`);
        console.log(`User ${userId || 'anonymous'} joined post room ${postId}`);

        socket.emit('post-joined', { postId });
      } catch (error) {
        console.error('Join post room error:', error);
        socket.emit('error', { message: 'Failed to join post room' });
      }
    });

    // Leave post room
    socket.on('leave-post', (data) => {
      try {
        const { postId } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!postId) {
          socket.emit('error', { message: 'Post ID is required' });
          return;
        }

        // Leave post room (standardized)
        socket.leave(`post:${postId}`);
        console.log(`User ${userId || 'anonymous'} left post room ${postId}`);

        socket.emit('post-left', { postId });
      } catch (error) {
        console.error('Leave post room error:', error);
        socket.emit('error', { message: 'Failed to leave post room' });
      }
    });

    // Leave conversation room
    socket.on('leave-conversation', (data) => {
      try {
        const { conversationId } = data;
        const userId = this.socketUsers.get(socket.id);

        console.log('Socket leave-conversation event received:', { conversationId, userId });

        if (!userId || !conversationId) {
          console.log('Invalid leave-conversation request:', { userId, conversationId });
          socket.emit('error', { message: 'Invalid request' });
          return;
        }

        // Leave conversation room
        const roomName = `conversation_${conversationId}`;
        socket.leave(roomName);
        console.log(`User ${userId} left conversation room ${roomName}`);

        // Remove from typing users
        this.removeTypingUser(conversationId, userId);

        // Notify other participants that user has left
        socket.to(roomName).emit('user-left', {
          conversationId,
          userId
        });
      } catch (error) {
        console.error('Leave conversation error:', error);
        socket.emit('error', { message: 'Failed to leave conversation' });
      }
    });

    // Leave chatbot conversation room
    socket.on('leave-chatbot-conversation', (data) => {
      try {
        const { conversationId } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !conversationId) {
          socket.emit('error', { message: 'Invalid request' });
          return;
        }

        // Leave chatbot conversation room
        socket.leave(`chatbot_conversation_${conversationId}`);
        console.log(`User ${userId} left chatbot conversation ${conversationId}`);

        // Notify other participants that user has left
        socket.to(`chatbot_conversation_${conversationId}`).emit('chatbot:user-left', {
          conversationId,
          userId
        });
      } catch (error) {
        console.error('Leave chatbot conversation error:', error);
        socket.emit('error', { message: 'Failed to leave chatbot conversation' });
      }
    });

    // Chatbot message status update
    socket.on('chatbot:message:status', async (data) => {
      try {
        const { conversationId, messageId, status } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !conversationId || !messageId || !status) {
          socket.emit('error', { message: 'Invalid request' });
          return;
        }

        // Validate status value
        if (!['delivered', 'read'].includes(status)) {
          socket.emit('error', { message: 'Invalid status value' });
          return;
        }

        // Find the chatbot message
        const message = await ChatbotMessage.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if user is a participant in the chatbot conversation
        const conversation = await ChatbotConversation.findOne({
          _id: conversationId,
          $or: [
            { customerId: userId },
            { vendorId: userId },
            { customerId: 'admin' } // Allow admin conversations
          ],
          isActive: true
        });

        if (!conversation) {
          socket.emit('error', { message: 'Access denied to chatbot conversation' });
          return;
        }

        // Update message status
        message.status = status;
        await message.save();

        // Broadcast status update to all participants in the chatbot conversation
        socket.to(`chatbot_conversation_${conversationId}`).emit('chatbot:message:status', {
          conversationId,
          messageId,
          status
        });
      } catch (error) {
        console.error('Chatbot message status update error:', error);
        socket.emit('error', { message: 'Failed to update message status' });
      }
    });

    // Chatbot typing indicator
    socket.on('chatbot:typing', (data) => {
      try {
        const { conversationId, isTyping } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !conversationId) {
          socket.emit('error', { message: 'Invalid request' });
          return;
        }

        if (isTyping) {
          this.addTypingUser(conversationId, userId);
        } else {
          this.removeTypingUser(conversationId, userId);
        }

        // Broadcast typing status to all participants in the chatbot conversation
        socket.to(`chatbot_conversation_${conversationId}`).emit('chatbot:typing', {
          conversationId,
          userId,
          isTyping
        });
      } catch (error) {
        console.error('Chatbot typing indicator error:', error);
        socket.emit('error', { message: 'Failed to send typing indicator' });
      }
    });

    // Send message
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, message } = data;
        const userId = this.socketUsers.get(socket.id);

        console.log('Socket message:send event received:', { conversationId, userId, message });

        if (!userId || !conversationId || !message) {
          console.log('Invalid message:send request:', { userId, conversationId, message });
          socket.emit('error', { message: 'Invalid request' });
          return;
        }

        // Remove from typing users
        this.removeTypingUser(conversationId, userId);

        // Broadcast to all participants in the conversation
        const roomName = `conversation_${conversationId}`;
        console.log(`Broadcasting message to room ${roomName}`);
        this.io.to(roomName).emit('message:new', {
          conversationId,
          message: {
            ...message,
            senderId: userId,
            createdAt: new Date().toISOString()
          }
        });
        console.log(`Message broadcasted to room ${roomName}`);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      try {
        const { conversationId, isTyping } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !conversationId) {
          socket.emit('error', { message: 'Invalid request' });
          return;
        }

        if (isTyping) {
          this.addTypingUser(conversationId, userId);
        } else {
          this.removeTypingUser(conversationId, userId);
        }

        // Broadcast typing status to all participants in the conversation
        socket.to(`conversation_${conversationId}`).emit('typing', {
          conversationId,
          userId,
          isTyping
        });
      } catch (error) {
        console.error('Typing indicator error:', error);
        socket.emit('error', { message: 'Failed to send typing indicator' });
      }
    });

    // Mark message as read
    socket.on('message:read', async (data) => {
      try {
        const { messageId } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !messageId) {
          socket.emit('error', { message: 'Invalid request' });
          return;
        }

        // Find message
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }

        // Check if user is a participant in the conversation
        const conversation = await Conversation.findOne({
          _id: message.conversationId,
          participants: userId,
          isActive: true
        });

        if (!conversation) {
          socket.emit('error', { message: 'Access denied to message' });
          return;
        }

        // Add read receipt if not already read
        const alreadyRead = message.readBy.some(read => read.userId.toString() === userId);

        if (!alreadyRead) {
          message.readBy.push({ userId, readAt: new Date() });
          await message.save();

          // Broadcast to all participants in the conversation
          this.io.to(`conversation_${message.conversationId}`).emit('message:read', {
            messageId,
            userId,
            readAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Mark message as read error:', error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    // Marketplace events
    // Join marketplace for real-time updates
    socket.on('join-marketplace', (data) => {
      socket.join('marketplace');
      console.log(`Socket ${socket.id} joined marketplace`);
    });

    // Leave marketplace
    socket.on('leave-marketplace', (data) => {
      socket.leave('marketplace');
      console.log(`Socket ${socket.id} left marketplace`);
    });

    // Join specific product page for updates
    socket.on('join-product', (data) => {
      const { productId } = data;
      if (productId) {
        socket.join(`product_${productId}`);
        console.log(`Socket ${socket.id} joined product ${productId}`);
      }
    });

    // Leave product page
    socket.on('leave-product', (data) => {
      const { productId } = data;
      if (productId) {
        socket.leave(`product_${productId}`);
        console.log(`Socket ${socket.id} left product ${productId}`);
      }
    });

    // Admin room join for refund events
    socket.on('join-admin', async () => {
      try {
        const userId = this.socketUsers.get(socket.id);
        if (!userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }
        const user = await User.findById(userId).select('role');
        if (user && user.role === 'admin') {
          socket.join('admin');
          console.log(`Admin user ${userId} joined admin room`);
          socket.emit('admin:joined');
        } else {
          socket.emit('error', { message: 'Admin access required' });
        }
      } catch (err) {
        console.error('join-admin error:', err);
        socket.emit('error', { message: 'Failed to join admin room' });
      }
    });

    // WebRTC Signaling Events

    // Call offer
    socket.on('call:offer', (data) => {
      try {
        const { callId, offer, targetUserId } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !callId || !offer || !targetUserId) {
          socket.emit('error', { message: 'Invalid call offer data' });
          return;
        }

        // Forward offer to target user
        socket.to(`user_${targetUserId}`).emit('call:offer', {
          callId,
          offer,
          fromUserId: userId
        });
      } catch (error) {
        console.error('Call offer error:', error);
        socket.emit('error', { message: 'Failed to send call offer' });
      }
    });

    // Call answer
    socket.on('call:answer', (data) => {
      try {
        const { callId, answer, targetUserId } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !callId || !answer || !targetUserId) {
          socket.emit('error', { message: 'Invalid call answer data' });
          return;
        }

        // Forward answer to target user
        socket.to(`user_${targetUserId}`).emit('call:answer', {
          callId,
          answer,
          fromUserId: userId
        });
      } catch (error) {
        console.error('Call answer error:', error);
        socket.emit('error', { message: 'Failed to send call answer' });
      }
    });

    // ICE candidate
    socket.on('call:ice-candidate', (data) => {
      try {
        const { callId, candidate, targetUserId } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !callId || !candidate || !targetUserId) {
          socket.emit('error', { message: 'Invalid ICE candidate data' });
          return;
        }

        // Forward ICE candidate to target user
        socket.to(`user_${targetUserId}`).emit('call:ice-candidate', {
          callId,
          candidate,
          fromUserId: userId
        });
      } catch (error) {
        console.error('ICE candidate error:', error);
        socket.emit('error', { message: 'Failed to send ICE candidate' });
      }
    });

    // Call status updates
    socket.on('call:status', (data) => {
      try {
        const { callId, status, targetUserIds } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !callId || !status) {
          socket.emit('error', { message: 'Invalid call status data' });
          return;
        }

        // Broadcast status to target users
        if (targetUserIds && Array.isArray(targetUserIds)) {
          targetUserIds.forEach(targetUserId => {
            socket.to(`user_${targetUserId}`).emit('call:status', {
              callId,
              status,
              fromUserId: userId
            });
          });
        }
      } catch (error) {
        console.error('Call status error:', error);
        socket.emit('error', { message: 'Failed to send call status' });
      }
    });

    // Screen sharing events
    socket.on('call:screen-share-start', (data) => {
      try {
        const { callId, targetUserIds } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !callId) {
          socket.emit('error', { message: 'Invalid screen share data' });
          return;
        }

        // Broadcast screen share start to target users
        if (targetUserIds && Array.isArray(targetUserIds)) {
          targetUserIds.forEach(targetUserId => {
            socket.to(`user_${targetUserId}`).emit('call:screen-share-start', {
              callId,
              fromUserId: userId
            });
          });
        }
      } catch (error) {
        console.error('Screen share start error:', error);
        socket.emit('error', { message: 'Failed to start screen share' });
      }
    });

    socket.on('call:screen-share-stop', (data) => {
      try {
        const { callId, targetUserIds } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !callId) {
          socket.emit('error', { message: 'Invalid screen share data' });
          return;
        }

        // Broadcast screen share stop to target users
        if (targetUserIds && Array.isArray(targetUserIds)) {
          targetUserIds.forEach(targetUserId => {
            socket.to(`user_${targetUserId}`).emit('call:screen-share-stop', {
              callId,
              fromUserId: userId
            });
          });
        }
      } catch (error) {
        console.error('Screen share stop error:', error);
        socket.emit('error', { message: 'Failed to stop screen share' });
      }
    });

    // Call transfer events
    socket.on('call:transfer', (data) => {
      try {
        const { callId, targetUserId } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !callId || !targetUserId) {
          socket.emit('error', { message: 'Invalid transfer data' });
          return;
        }

        // Notify target user about transfer
        socket.to(`user_${targetUserId}`).emit('call:transfer-request', {
          callId,
          fromUserId: userId,
          transferId: Date.now().toString()
        });
      } catch (error) {
        console.error('Call transfer error:', error);
        socket.emit('error', { message: 'Failed to transfer call' });
      }
    });

    socket.on('call:transfer-response', (data) => {
      try {
        const { callId, accepted, transferId, originalUserId } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !callId || !originalUserId) {
          socket.emit('error', { message: 'Invalid transfer response data' });
          return;
        }

        // Notify original user about transfer response
        socket.to(`user_${originalUserId}`).emit('call:transfer-response', {
          callId,
          accepted,
          transferId,
          targetUserId: userId
        });
      } catch (error) {
        console.error('Call transfer response error:', error);
        socket.emit('error', { message: 'Failed to respond to transfer' });
      }
    });

    // Participant mute events
    socket.on('call:mute-participant', (data) => {
      try {
        const { callId, participantId, muted } = data;
        const userId = this.socketUsers.get(socket.id);

        if (!userId || !callId || !participantId) {
          socket.emit('error', { message: 'Invalid mute data' });
          return;
        }

        // Notify participant about mute status change
        socket.to(`user_${participantId}`).emit('call:muted', {
          callId,
          muted,
          mutedBy: userId
        });

        // Notify other participants about the mute change
        socket.broadcast.emit('call:participant-muted', {
          callId,
          participantId,
          muted,
          mutedBy: userId
        });
      } catch (error) {
        console.error('Participant mute error:', error);
        socket.emit('error', { message: 'Failed to mute participant' });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      await this.handleSocketDisconnect(socket.id);
    });
  }

  // Handle socket disconnect (can be called from server.js or socket event)
  async handleSocketDisconnect(socketId) {
    try {
      const userId = this.socketUsers.get(socketId);

      if (userId) {
        console.log(`SocketService: User ${userId} disconnected from socket ${socketId}`);

        // Remove from maps
        this.userSockets.delete(userId);
        this.socketUsers.delete(socketId);

        // Remove from all typing indicators
        this.removeUserFromAllTyping(userId);

        // Update user's online status
        await this.updateUserOnlineStatus(userId, false);

        // Broadcast user's offline status to their contacts
        this.broadcastUserStatus(userId, false);
      }
    } catch (error) {
      console.error('Socket disconnect error:', error);
    }
  }

  // Helper methods

  // Add user to typing users for a conversation
  addTypingUser(conversationId, userId) {
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }
    this.typingUsers.get(conversationId).add(userId);
  }

  // Remove user from typing users for a conversation
  removeTypingUser(conversationId, userId) {
    if (this.typingUsers.has(conversationId)) {
      this.typingUsers.get(conversationId).delete(userId);

      // Clean up empty sets
      if (this.typingUsers.get(conversationId).size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }
  }

  // Remove user from all typing indicators
  removeUserFromAllTyping(userId) {
    for (const [conversationId, users] of this.typingUsers.entries()) {
      if (users.has(userId)) {
        users.delete(userId);

        // Broadcast typing status update
        this.io.to(`conversation_${conversationId}`).emit('typing', {
          conversationId,
          userId,
          isTyping: false
        });

        // Clean up empty sets
        if (users.size === 0) {
          this.typingUsers.delete(conversationId);
        }
      }
    }
  }

  // Broadcast user's online status to their contacts
  async broadcastUserStatus(userId, isOnline) {
    if (userId === 'anonymous-user' || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`Skipping broadcast user status for invalid userId: ${userId}`);
      return;
    }
    try {
      // Find all conversations where user is a participant
      const conversations = await Conversation.find({
        participants: userId,
        isActive: true
      });

      // Get all unique participants from these conversations
      const participantIds = new Set();
      conversations.forEach(conversation => {
        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== userId) {
            participantIds.add(participantId.toString());
          }
        });
      });

      // Broadcast status to all contacts
      participantIds.forEach(contactId => {
        const socketId = this.userSockets.get(contactId);
        if (socketId) {
          this.io.to(socketId).emit('user:status', {
            userId,
            isOnline,
            lastSeen: new Date().toISOString()
          });
        }
      });
    } catch (error) {
      console.error('Broadcast user status error:', error);
    }
  }

  // Marketplace real-time methods
  broadcastProductUpdate(product) {
    this.io.to('marketplace').emit('product:updated', {
      product: {
        id: product._id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        stock: product.stock,
        sales: product.sales,
        views: product.views,
        featured: product.featured,
        updatedAt: product.updatedAt
      }
    });

    // Broadcast to specific product page
    this.io.to(`product_${product._id}`).emit('product:details-updated', {
      product
    });
  }

  broadcastNewProduct(product) {
    this.io.to('marketplace').emit('product:new', {
      product: {
        id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        category: product.category,
        vendor: product.vendorId,
        featured: product.featured,
        isNFT: product.isNFT,
        createdAt: product.createdAt
      }
    });
  }

  broadcastProductSale(product, buyerInfo) {
    // Broadcast to marketplace
    this.io.to('marketplace').emit('product:sold', {
      productId: product._id,
      productName: product.name,
      price: product.price,
      currency: product.currency,
      newSalesCount: product.sales,
      buyer: buyerInfo
    });

    // Broadcast to specific product page
    this.io.to(`product_${product._id}`).emit('product:sale-update', {
      sales: product.sales,
      stock: product.stock
    });
  }

  broadcastProductViews(productId, newViewCount) {
    this.io.to(`product_${productId}`).emit('product:view-update', {
      views: newViewCount
    });
  }

  broadcastMarketplaceStats(stats) {
    this.io.to('marketplace').emit('marketplace:stats-update', stats);
  }

  // Payments / refunds real-time methods
  async broadcastRefundSubmitted(payload) {
    const doc = await RefundEvent.create({ type: 'submitted', at: new Date(), ...payload });
    this.refundEvents.unshift({ ...doc.toObject() });
    this.refundEvents = this.refundEvents.slice(0, 200);
    this.io.to('admin').emit('refund:submitted', payload);
  }

  async broadcastRefundFailed(payload) {
    const doc = await RefundEvent.create({ type: 'failed', at: new Date(), ...payload });
    this.refundEvents.unshift({ ...doc.toObject() });
    this.refundEvents = this.refundEvents.slice(0, 200);
    this.io.to('admin').emit('refund:failed', payload);
  }

  // Method to increment product views in real-time
  async incrementProductViews(productId, userId = null) {
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        { $inc: { views: 1 } },
        { new: true }
      );

      if (product) {
        this.broadcastProductViews(productId, product.views);
      }
    } catch (error) {
      console.error('Error incrementing product views:', error);
    }
  }
}

module.exports = SocketService;