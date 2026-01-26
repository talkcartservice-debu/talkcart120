const jwt = require('jsonwebtoken');
const config = require('../config/config');

class SocketService {
  constructor(io) {
    this.io = io;
    this.onlineUsers = new Map();
    this.userRooms = new Map();
    
    this.initializeSocketEvents();
  }

  initializeSocketEvents() {
    this.io.on('connection', (socket) => {
      console.log('.Socket client connected:', socket.id);
      
      // Handle authentication
      socket.on('authenticate', async (data) => {
        try {
          const { userId } = data;
          
          if (userId) {
            socket.userId = userId;
            
            // Add user to online users
            this.onlineUsers.set(userId, {
              socketId: socket.id,
              lastSeen: new Date()
            });
            
            // Join user's personal room
            socket.join(`user_${userId}`);
            
            // Emit user online status to all connected clients
            this.io.emit('user:status', {
              userId,
              isOnline: true,
              timestamp: new Date().toISOString()
            });
            
            console.log(`.User ${userId} authenticated and joined room`);
          }
        } catch (error) {
          console.error('Socket authentication error:', error);
        }
      });

      // Handle joining conversation rooms
      socket.on('join-conversation', (data) => {
        try {
          const { conversationId } = data;
          
          if (conversationId && socket.userId) {
            const roomName = `conversation_${conversationId}`;
            socket.join(roomName);
            
            // Track user's room membership
            if (!this.userRooms.has(socket.userId)) {
              this.userRooms.set(socket.userId, new Set());
            }
            this.userRooms.get(socket.userId).add(conversationId);
            
            console.log(`.User ${socket.userId} joined conversation ${conversationId}`);
          }
        } catch (error) {
          console.error('Error joining conversation:', error);
        }
      });

      // Handle leaving conversation rooms
      socket.on('leave-conversation', (data) => {
        try {
          const { conversationId } = data;
          
          if (conversationId && socket.userId) {
            const roomName = `conversation_${conversationId}`;
            socket.leave(roomName);
            
            // Remove from user's room tracking
            if (this.userRooms.has(socket.userId)) {
              this.userRooms.get(socket.userId).delete(conversationId);
            }
            
            console.log(`.User ${socket.userId} left conversation ${conversationId}`);
          }
        } catch (error) {
          console.error('Error leaving conversation:', error);
        }
      });

      // Handle typing indicators
      socket.on('typing', (data) => {
        try {
          const { conversationId, isTyping } = data;
          
          if (conversationId && socket.userId) {
            const roomName = `conversation_${conversationId}`;
            
            // Broadcast typing indicator to conversation participants
            socket.to(roomName).emit('typing', {
              conversationId,
              userId: socket.userId,
              isTyping: isTyping !== undefined ? isTyping : true,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error handling typing indicator:', error);
        }
      });

      // Handle message sending
      socket.on('message:send', async (data) => {
        try {
          const { conversationId, message } = data;
          
          if (conversationId && message && socket.userId) {
            const roomName = `conversation_${conversationId}`;
            
            // Broadcast message to conversation participants
            this.io.to(roomName).emit('message:new', {
              conversationId,
              message: {
                ...message,
                senderId: socket.userId,
                timestamp: new Date().toISOString()
              }
            });
            
            console.log(`.Message sent to conversation ${conversationId} by user ${socket.userId}`);
          }
        } catch (error) {
          console.error('Error sending message via socket:', error);
        }
      });

      // Handle message read status
      socket.on('message:read', (data) => {
        try {
          const { messageId } = data;
          
          if (messageId && socket.userId) {
            // Broadcast read status to relevant conversation
            // This would typically be handled by the message service
            console.log(`.Message ${messageId} marked as read by user ${socket.userId}`);
          }
        } catch (error) {
          console.error('Error handling message read status:', error);
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', (data) => {
        socket.emit('pong', {
          timestamp: data.timestamp,
          serverTime: new Date().toISOString()
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('.Socket client disconnected:', socket.id);
        
        if (socket.userId) {
          // Remove user from online users
          this.onlineUsers.delete(socket.userId);
          
          // Clean up room memberships
          if (this.userRooms.has(socket.userId)) {
            this.userRooms.delete(socket.userId);
          }
          
          // Emit user offline status
          this.io.emit('user:status', {
            userId: socket.userId,
            isOnline: false,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error('Socket connection error:', error);
      });
    });
  }

  // Utility methods for external use
  getUserSocketId(userId) {
    const userData = this.onlineUsers.get(userId);
    return userData ? userData.socketId : null;
  }

  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  broadcastToUser(userId, event, data) {
    const socketId = this.getUserSocketId(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  broadcastToRoom(roomName, event, data) {
    this.io.to(roomName).emit(event, data);
  }

  getOnlineUsersCount() {
    return this.onlineUsers.size;
  }

  getOnlineUsers() {
    return Array.from(this.onlineUsers.keys());
  }
}

module.exports = SocketService;