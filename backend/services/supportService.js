const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const SupportTicketMessage = require('../models/SupportTicketMessage');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const config = require('../config/config');

/**
 * Support Service
 * Provides comprehensive support ticket management functionality
 */
class SupportService {
  /**
   * Create a new support ticket
   * @param {Object} ticketData - Ticket creation data
   * @param {string} userId - User ID creating the ticket
   * @returns {Object} Created ticket
   */
  async createTicket(ticketData, userId) {
    try {
      const { subject, description, category, priority, productId, orderId } = ticketData;
      
      // Validate required fields
      if (!subject || !description || !category) {
        throw new Error('Subject, description, and category are required');
      }

      // Generate unique ticket ID
      const ticketId = SupportTicket.generateTicketId();

      // Create new ticket
      const ticket = new SupportTicket({
        ticketId,
        userId,
        subject,
        description,
        category,
        priority: priority || 'medium',
        productId: productId || null,
        orderId: orderId || null
      });

      await ticket.save();

      // Send notification email to user
      await this.sendTicketNotification(ticket, 'created');

      return {
        success: true,
        message: 'Support ticket created successfully',
        ticket
      };
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw new Error(`Failed to create support ticket: ${error.message}`);
    }
  }

  /**
   * Get all support tickets for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Object} Tickets and pagination info
   */
  async getUserTickets(userId, filters = {}) {
    try {
      const { status, category, page = 1, limit = 10 } = filters;
      
      // Build query
      const query = { userId: new mongoose.Types.ObjectId(userId) };
      
      if (status && status !== 'all') {
        query.status = status;
      }
      
      if (category && category !== 'all') {
        query.category = category;
      }

      // Execute query with pagination
      const tickets = await SupportTicket.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('userId', 'name email')
        .populate('vendorId', 'name')
        .populate('assignedTo', 'name');

      // Get total count for pagination
      const total = await SupportTicket.countDocuments(query);

      return {
        success: true,
        tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTickets: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching user support tickets:', error);
      throw new Error(`Failed to fetch user support tickets: ${error.message}`);
    }
  }

  /**
   * Get vendor support tickets
   * @param {string} vendorId - Vendor ID
   * @param {Object} filters - Filter options
   * @returns {Object} Tickets and pagination info
   */
  async getVendorTickets(vendorId, filters = {}) {
    try {
      const { status, category, page = 1, limit = 10 } = filters;
      
      // Build query
      // Validate vendorId before creating ObjectId
      let query = { vendorId: vendorId };
      if (mongoose.Types.ObjectId.isValid(vendorId)) {
        query = { vendorId: new mongoose.Types.ObjectId(vendorId) };
      }
      
      if (status && status !== 'all') {
        query.status = status;
      }
      
      if (category && category !== 'all') {
        query.category = category;
      }

      // Execute query with pagination
      const tickets = await SupportTicket.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('userId', 'name email')
        .populate('vendorId', 'name')
        .populate('assignedTo', 'name');

      // Get total count for pagination
      const total = await SupportTicket.countDocuments(query);

      return {
        success: true,
        tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTickets: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching vendor support tickets:', error);
      throw new Error(`Failed to fetch vendor support tickets: ${error.message}`);
    }
  }

  /**
   * Get all support tickets (admin)
   * @param {Object} filters - Filter options
   * @returns {Object} Tickets and pagination info
   */
  async getAdminTickets(filters = {}) {
    try {
      const { status, category, priority, assignedTo, page = 1, limit = 20 } = filters;
      
      // Build query
      const query = {};
      
      if (status && status !== 'all') {
        query.status = status;
      }
      
      if (category && category !== 'all') {
        query.category = category;
      }
      
      if (priority && priority !== 'all') {
        query.priority = priority;
      }
      
      if (assignedTo) {
        if (assignedTo === 'unassigned') {
          query.assignedTo = { $exists: false };
        } else {
          query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
        }
      }

      // Execute query with pagination
      const tickets = await SupportTicket.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('userId', 'name email')
        .populate('vendorId', 'name')
        .populate('assignedTo', 'name');

      // Get total count for pagination
      const total = await SupportTicket.countDocuments(query);

      return {
        success: true,
        tickets,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalTickets: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error fetching admin support tickets:', error);
      throw new Error(`Failed to fetch admin support tickets: ${error.message}`);
    }
  }

  /**
   * Get a specific support ticket with messages
   * @param {string} ticketId - Ticket ID
   * @param {string} userId - User ID requesting the ticket
   * @param {string} userRole - User role
   * @returns {Object} Ticket and messages
   */
  async getTicketById(ticketId, userId, userRole) {
    try {
      const ticket = await SupportTicket.findOne({ ticketId })
        .populate('userId', 'name email avatar')
        .populate('vendorId', 'name')
        .populate('assignedTo', 'name');

      if (!ticket) {
        throw new Error('Support ticket not found');
      }

      // Check permissions - user can access their own tickets, vendors their vendor tickets, admins all tickets
      const isAdmin = userRole === 'admin';
      const isOwner = ticket.userId.toString() === userId;
      const isVendor = ticket.vendorId && ticket.vendorId.toString() === userId;
      
      if (!isAdmin && !isOwner && !isVendor) {
        throw new Error('Access denied to this support ticket');
      }

      // Get ticket messages
      const messages = await SupportTicketMessage.find({ ticketId: ticket._id })
        .sort({ createdAt: 1 })
        .populate('senderId', 'name email role avatar');

      return {
        success: true,
        ticket,
        messages
      };
    } catch (error) {
      console.error('Error fetching support ticket:', error);
      throw new Error(`Failed to fetch support ticket: ${error.message}`);
    }
  }

  /**
   * Update ticket status
   * @param {string} ticketId - Ticket ID
   * @param {string} status - New status
   * @param {string} resolutionNotes - Resolution notes
   * @param {string} userId - User ID updating the ticket
   * @param {string} userRole - User role
   * @returns {Object} Updated ticket
   */
  async updateTicketStatus(ticketId, status, resolutionNotes, userId, userRole) {
    try {
      const ticket = await SupportTicket.findOne({ ticketId });
      
      if (!ticket) {
        throw new Error('Support ticket not found');
      }

      // Check permissions - only admins and assigned agents can change status
      const isAdmin = userRole === 'admin';
      const isAssignedAgent = ticket.assignedTo && ticket.assignedTo.toString() === userId;
      
      if (!isAdmin && !isAssignedAgent) {
        throw new Error('Access denied to update ticket status');
      }

      // Update status
      await ticket.updateStatus(status, resolutionNotes);

      // Send notification email to user
      await this.sendTicketNotification(ticket, 'status_updated');

      return {
        success: true,
        message: 'Ticket status updated successfully',
        ticket
      };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw new Error(`Failed to update ticket status: ${error.message}`);
    }
  }

  /**
   * Assign ticket to agent
   * @param {string} ticketId - Ticket ID
   * @param {string} agentId - Agent ID to assign to
   * @param {string} adminId - Admin ID performing the assignment
   * @returns {Object} Updated ticket
   */
  async assignTicket(ticketId, agentId, adminId) {
    try {
      const ticket = await SupportTicket.findOne({ ticketId });
      
      if (!ticket) {
        throw new Error('Support ticket not found');
      }

      // Assign ticket to agent
      await ticket.assignTo(agentId);

      // Send notification email to assigned agent
      await this.sendTicketNotification(ticket, 'assigned', agentId);

      return {
        success: true,
        message: 'Ticket assigned successfully',
        ticket
      };
    } catch (error) {
      console.error('Error assigning ticket:', error);
      throw new Error(`Failed to assign ticket: ${error.message}`);
    }
  }

  /**
   * Add a message to a support ticket
   * @param {string} ticketId - Ticket ID
   * @param {Object} messageData - Message data
   * @param {string} senderId - Sender ID
   * @returns {Object} Added message
   */
  async addMessage(ticketId, messageData, senderId) {
    try {
      const { content, messageType = 'customer', isPublic = true } = messageData;
      
      if (!content) {
        throw new Error('Message content is required');
      }

      // Find the ticket
      const ticket = await SupportTicket.findOne({ ticketId });
      
      if (!ticket) {
        throw new Error('Support ticket not found');
      }

      // Create new message
      const message = new SupportTicketMessage({
        ticketId: ticket._id,
        senderId,
        content,
        messageType,
        isPublic
      });

      await message.save();

      // Populate sender info
      await message.populate('senderId', 'name email role avatar');

      // Send notification email to relevant parties
      await this.sendTicketNotification(ticket, 'message_added');

      return {
        success: true,
        message: 'Message added successfully',
        messageData: message
      };
    } catch (error) {
      console.error('Error adding message to support ticket:', error);
      throw new Error(`Failed to add message to support ticket: ${error.message}`);
    }
  }

  /**
   * Get messages for a support ticket
   * @param {string} ticketId - Ticket ID
   * @param {string} userId - User ID requesting messages
   * @param {string} userRole - User role
   * @returns {Object} Ticket messages
   */
  async getTicketMessages(ticketId, userId, userRole) {
    try {
      // Find the ticket
      const ticket = await SupportTicket.findOne({ ticketId });
      
      if (!ticket) {
        throw new Error('Support ticket not found');
      }

      // Check permissions - user can access their own tickets, vendors their vendor tickets, admins all tickets
      const isAdmin = userRole === 'admin';
      const isOwner = ticket.userId.toString() === userId;
      const isVendor = ticket.vendorId && ticket.vendorId.toString() === userId;
      const isAssignedAgent = ticket.assignedTo && ticket.assignedTo.toString() === userId;
      
      if (!isAdmin && !isOwner && !isVendor && !isAssignedAgent) {
        throw new Error('Access denied to view messages for this support ticket');
      }

      // Get ticket messages
      const messages = await SupportTicketMessage.find({ ticketId: ticket._id })
        .sort({ createdAt: 1 })
        .populate('senderId', 'name email role avatar');

      return {
        success: true,
        messages
      };
    } catch (error) {
      console.error('Error fetching support ticket messages:', error);
      throw new Error(`Failed to fetch support ticket messages: ${error.message}`);
    }
  }

  /**
   * Send notification emails for ticket events
   * @param {Object} ticket - Ticket object
   * @param {string} eventType - Type of event
   * @param {string} recipientId - Specific recipient ID (for agent assignment)
   */
  async sendTicketNotification(ticket, eventType, recipientId = null) {
    try {
      // Only send emails in production or if explicitly enabled in development
      if (process.env.NODE_ENV !== 'production' && !config.email.enableDevelopmentEmails) {
        return;
      }

      // Get user details
      const user = await User.findById(ticket.userId);
      if (!user) return;

      // Set up email transporter
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: config.email.supportEmail,
          pass: config.email.supportPassword
        }
      });

      let subject, text;

      switch (eventType) {
        case 'created':
          subject = `Support Ticket #${ticket.ticketId} Created`;
          text = `Hello ${user.name},

Your support ticket "${ticket.subject}" has been created successfully. Ticket ID: ${ticket.ticketId}

We will respond to your ticket as soon as possible.

Thank you for contacting support.`;
          break;
          
        case 'status_updated':
          subject = `Support Ticket #${ticket.ticketId} Status Updated`;
          text = `Hello ${user.name},

The status of your support ticket "${ticket.subject}" has been updated to: ${ticket.status}.

Ticket ID: ${ticket.ticketId}

If you have any questions, please reply to this ticket.`;
          break;
          
        case 'assigned':
          if (recipientId) {
            const agent = await User.findById(recipientId);
            if (agent) {
              subject = `Support Ticket #${ticket.ticketId} Assigned to You`;
              text = `Hello ${agent.name},

You have been assigned to support ticket "${ticket.subject}".

Ticket ID: ${ticket.ticketId}

Please review and respond to this ticket as soon as possible.`;
              // Send to agent instead of user
              await transporter.sendMail({
                from: config.email.supportEmail,
                to: agent.email,
                subject,
                text
              });
              return;
            }
          }
          break;
          
        case 'message_added':
          subject = `New Message on Support Ticket #${ticket.ticketId}`;
          text = `Hello ${user.name},

A new message has been added to your support ticket "${ticket.subject}".

Ticket ID: ${ticket.ticketId}

Please log in to view the message and respond if needed.`;
          break;
          
        default:
          return;
      }

      // Send email to user
      await transporter.sendMail({
        from: config.email.supportEmail,
        to: user.email,
        subject,
        text
      });
    } catch (error) {
      console.error('Error sending ticket notification:', error);
      // Don't throw error as this is just a notification
    }
  }

  /**
   * Get ticket statistics
   * @returns {Object} Ticket statistics
   */
  async getTicketStats() {
    try {
      const totalTickets = await SupportTicket.countDocuments();
      
      const statusCounts = await SupportTicket.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const categoryCounts = await SupportTicket.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const priorityCounts = await SupportTicket.aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);
      
      // Get tickets created in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentTickets = await SupportTicket.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });
      
      return {
        success: true,
        stats: {
          totalTickets,
          statusCounts,
          categoryCounts,
          priorityCounts,
          recentTickets
        }
      };
    } catch (error) {
      console.error('Error fetching ticket statistics:', error);
      throw new Error(`Failed to fetch ticket statistics: ${error.message}`);
    }
  }
}

module.exports = new SupportService();