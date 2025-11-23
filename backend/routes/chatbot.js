const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, authenticateTokenStrict } = require('./auth');
const { uploadSingle } = require('../config/cloudinary');
const { ChatbotConversation, ChatbotMessage, Product, User, Order } = require('../models');
const NotificationService = require('../services/notificationService');
const { asyncHandler, sendSuccess, sendError } = require('../middleware/errorHandler');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Chatbot service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// @route   GET /api/chatbot/search/vendors
// @desc    Search vendors for messaging
// @access  Private (Vendors only)
router.get('/search/vendors', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { search, limit = 20, page = 1 } = req.query;

    // Verify that the requesting user is a vendor
    const user = await User.findById(userId);
    if (!user || user.role !== 'vendor') {
      return sendError(res, 'Access denied. Vendor access required.', 403);
    }

    // Build query for vendors with active products
    let vendorQuery = {};
    
    // Find vendors with active products
    const productVendors = await Product.distinct('vendorId', { isActive: true });
    
    if (productVendors.length === 0) {
      return sendSuccess(res, {
        vendors: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      });
    }
    
    vendorQuery._id = { $in: productVendors };
    
    // Exclude the current vendor from results
    vendorQuery._id.$ne = userId;
    
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

    return sendSuccess(res, {
      vendors: vendorsWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Search vendors error:', error);
    return sendError(res, 'Failed to search vendors', 500, error.message);
  }
});

// @route   GET /api/chatbot/search/customers
// @desc    Search customers for messaging
// @access  Private (Vendors only)
router.get('/search/customers', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { search, limit = 20, page = 1 } = req.query;

    // Verify that the requesting user is a vendor
    const user = await User.findById(userId);
    if (!user || user.role !== 'vendor') {
      return sendError(res, 'Access denied. Vendor access required.', 403);
    }

    // Build query for customers who have made purchases
    let customerQuery = { role: 'user' };
    
    // Find customers who have placed orders
    const orderCustomers = await Order.distinct('customerId');
    
    if (orderCustomers.length > 0) {
      customerQuery._id = { $in: orderCustomers };
    } else {
      // If no customers with orders, return empty result
      return sendSuccess(res, {
        customers: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      });
    }
    
    // Add search filter if provided
    if (search) {
      customerQuery.$or = [
        { username: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get customers
    const customers = await User.find(customerQuery, 'username displayName avatar isVerified createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await User.countDocuments(customerQuery);

    // Add order count for each customer
    const customersWithCounts = await Promise.all(customers.map(async (customer) => {
      const orderCount = await Order.countDocuments({ 
        customerId: customer._id
      });
      
      return {
        ...customer,
        id: customer._id,
        orderCount
      };
    }));

    return sendSuccess(res, {
      customers: customersWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Search customers error:', error);
    return sendError(res, 'Failed to search customers', 500, error.message);
  }
});

// @route   POST /api/chatbot/conversations
// @desc    Create new chatbot conversation
// @access  Private (Customers only)
router.post('/conversations', authenticateTokenStrict, async (req, res) => {
  try {
    const { vendorId, productId } = req.body;
    const customerId = req.user.userId;

    // Validation
    if (!vendorId || !productId) {
      return sendError(res, 'Vendor ID and Product ID are required', 400);
    }

    // Verify product exists and belongs to vendor
    const product = await Product.findOne({
      _id: productId,
      vendorId: vendorId,
      isActive: true
    });

    if (!product) {
      return sendError(res, 'Product not found or not active', 404);
    }

    // Verify vendor exists
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      return sendError(res, 'Vendor not found', 404);
    }

    // Check if conversation already exists
    const existingConversation = await ChatbotConversation.findOne({
      customerId,
      vendorId,
      productId
    });

    if (existingConversation) {
      return sendSuccess(res, {
        conversation: existingConversation,
        isNew: false
      }, 'Conversation already exists');
    }

    // Create new conversation
    const newConversation = new ChatbotConversation({
      customerId,
      vendorId,
      productId,
      productName: product.name
    });

    await newConversation.save();

    // Create welcome message from bot
    const welcomeMessage = new ChatbotMessage({
      conversationId: newConversation._id,
      senderId: vendorId, // Vendor is the sender for welcome message
      content: `Hello! I'm here to help you with questions about "${product.name}". How can I assist you today?`,
      type: 'system',
      isBotMessage: true,
      botConfidence: 1.0
    });

    await welcomeMessage.save();

    // Update conversation with last message
    newConversation.lastMessage = welcomeMessage._id;
    await newConversation.save();

    return sendSuccess(res, {
      conversation: newConversation,
      isNew: true
    }, 'Chatbot conversation created successfully');
  } catch (error) {
    console.error('Create chatbot conversation error:', error);
    return sendError(res, 'Failed to create chatbot conversation', 500, error.message);
  }
});

// @route   GET /api/chatbot/conversations
// @desc    Get user chatbot conversations
// @access  Private
router.get('/conversations', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, page = 1 } = req.query;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get conversations where user is either customer, vendor, or admin participant
    // For vendor-admin conversations, customerId is 'admin' string
    const conversations = await ChatbotConversation.find({
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin', vendorId: userId } // Vendor-admin conversations where user is vendor
      ],
      isActive: true
    })
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
      .sort({ lastActivity: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await ChatbotConversation.countDocuments({
      $or: [
        { customerId: userId },
        { vendorId: userId }
      ],
      isActive: true
    });

    return sendSuccess(res, {
      conversations,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalConversations: total,
        hasMore: skip + conversations.length < total
      }
    });
  } catch (error) {
    console.error('Get chatbot conversations error:', error);
    return sendError(res, 'Failed to get conversations', 500, error.message);
  }
});

// @route   GET /api/chatbot/conversations/:id
// @desc    Get a specific chatbot conversation
// @access  Private
router.get('/conversations/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    // For vendor-admin conversations, customerId is 'admin' string
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin', vendorId: userId } // Vendor-admin conversations where user is vendor
      ],
      isActive: true
    })
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
        select: 'name description images price currency category'
      })
      .populate({
        path: 'lastMessage',
        select: 'content senderId createdAt isBotMessage'
      })
      .lean();

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    return sendSuccess(res, { conversation });
  } catch (error) {
    console.error('Get chatbot conversation error:', error);
    return sendError(res, 'Failed to fetch conversation', 500, error.message);
  }
});

// @route   GET /api/chatbot/conversations/:id/messages
// @desc    Get messages in a chatbot conversation
// @access  Private
router.get('/conversations/:id/messages', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, page = 1, before } = req.query;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Check if user is participant in conversation
    // For vendor-admin conversations, customerId is 'admin' string
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
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
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Populate sender data for each message, handling admin messages
    for (const message of messages) {
      if (message.senderId !== 'admin') {
        await message.populate({
          path: 'senderId',
          select: 'username displayName avatar isVerified'
        });
      }
      // For admin messages, senderId remains as 'admin' string
    }

    // Get total count
    const total = await ChatbotMessage.countDocuments(query);

    // Join the user to the conversation room for real-time updates
    const io = req.app.get('io');
    if (io) {
      // Join the chatbot conversation room
      io.to(`chatbot_conversation_${id}`).emit('chatbot:user-joined', {
        conversationId: id,
        userId: userId
      });
    }

    return sendSuccess(res, {
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalMessages: total,
        hasMore: skip + messages.length < total
      }
    });
  } catch (error) {
    console.error('Get chatbot messages error:', error);
    return sendError(res, 'Failed to get messages', 500, error.message);
  }
});

// Add this new route for file uploads in chatbot conversations
// @route   POST /api/chatbot/conversations/:id/messages/upload
// @desc    Upload file attachment for chatbot message
// @access  Private
router.post('/conversations/:id/messages/upload', authenticateTokenStrict, uploadSingle('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Check if user is participant in conversation
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Check if file was uploaded
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    // Process uploaded file
    const attachment = {
      type: req.file.mimetype.startsWith('image/') ? 'image' :
           req.file.mimetype.startsWith('video/') ? 'video' :
           req.file.mimetype.startsWith('audio/') ? 'audio' : 'file',
      url: req.file.secure_url || req.file.path,
      name: req.file.originalname,
      size: req.file.size,
      thumbnail: req.file.mimetype.startsWith('image/') || req.file.mimetype.startsWith('video/') 
        ? req.file.secure_url.replace('/upload/', '/upload/c_thumb,w_200,h_200,g_face/') 
        : null
    };

    // Return the attachment data for frontend to use in message
    return sendSuccess(res, {
      attachment
    }, 'File uploaded successfully');
  } catch (error) {
    console.error('Chatbot file upload error:', error);
    return sendError(res, 'Failed to upload file', 500, error.message);
  }
});

// Modify the existing sendMessage route to handle attachments
// @route   POST /api/chatbot/conversations/:id/messages
// @desc    Send message in chatbot conversation
// @access  Private
router.post('/conversations/:id/messages', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, attachments } = req.body; // Add attachments to destructuring
    const userId = req.user.userId;

    // Validation - content or attachments required
    if ((!content || content.trim().length === 0) && (!attachments || attachments.length === 0)) {
      return sendError(res, 'Message content or attachment is required', 400);
    }

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Check if user is participant in conversation
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Determine if this is a customer, vendor, or admin message
    // For vendor-admin conversations, customerId is 'admin' string
    const isCustomer = userId === conversation.customerId.toString();
    const isVendor = userId === conversation.vendorId.toString();
    const isAdmin = req.user.role === 'admin' && conversation.customerId === 'admin';

    // Check if user is authorized to participate in this conversation
    const isParticipant = isCustomer || isVendor || isAdmin || 
      (req.user.role === 'admin' && conversation.customerId === 'admin');

    if (!isParticipant) {
      return sendError(res, 'Access denied', 403);
    }

    // Create new message
    const newMessage = new ChatbotMessage({
      conversationId: id,
      senderId: userId,
      content: content ? content.trim() : '',
      isBotMessage: false,
      // Add attachments if provided
      attachments: attachments || []
    });

    await newMessage.save();

    // Update conversation's last message and activity
    conversation.lastMessage = newMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Populate sender data (only if senderId is not 'admin')
    if (newMessage.senderId !== 'admin') {
      await newMessage.populate('senderId', 'username displayName avatar isVerified');
    }

    // Send notification to other participants
    try {
      // Determine recipient based on message sender
      let recipientId;
      if (isCustomer) {
        // Customer message - notify vendor or admin
        recipientId = conversation.vendorId.toString() === userId ? 'admin' : conversation.vendorId;
      } else if (isVendor) {
        // Vendor message - notify customer or admin
        recipientId = conversation.customerId === 'admin' ? 'admin' : conversation.customerId;
      } else if (isAdmin) {
        // Admin message - notify vendor or customer
        recipientId = conversation.customerId === 'admin' ? conversation.vendorId : conversation.customerId;
      }

      // Only send notification if recipient is different from sender
      if (recipientId && recipientId !== userId) {
        // Get sender info for notification
        const sender = await User.findById(userId).select('username displayName');
        
        if (sender) {
          // Create notification
          await NotificationService.createMessageNotification(
            userId, // senderId
            recipientId, // recipientId
            id, // conversationId
            content ? content.trim() : 'sent an attachment' // messageContent
          );
        }
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the message send if notification fails
    }

    // If this is a customer message and bot is enabled, generate bot response
    if (isCustomer && conversation.botEnabled) {
      // In a real implementation, this would call an AI service
      // For now, we'll simulate a simple bot response
      setTimeout(async () => {
        try {
          const botResponse = new ChatbotMessage({
            conversationId: id,
            senderId: conversation.vendorId,
            content: `Thanks for your message about "${conversation.productName}". A vendor representative will respond to you shortly.`,
            type: 'system',
            isBotMessage: true,
            botConfidence: 0.8,
            suggestedResponses: [
              { text: "What's the price?", action: "ask_price" },
              { text: "Is it available?", action: "ask_availability" },
              { text: "Can I get more details?", action: "ask_details" }
            ]
          });

          await botResponse.save();

          // Update conversation's last message
          conversation.lastMessage = botResponse._id;
          conversation.lastActivity = new Date();
          await conversation.save();

          // Emit socket event for real-time updates (if implemented)
          const io = req.app.get('io');
          if (io) {
            io.to(`chatbot_conversation_${id}`).emit('chatbot:message:new', {
              conversationId: id,
              message: botResponse
            });
          }
        } catch (botError) {
          console.error('Bot response error:', botError);
        }
      }, 1000); // Simulate bot thinking time
    }

    // Emit socket event for real-time updates for all messages
    const io = req.app.get('io');
    if (io) {
      io.to(`chatbot_conversation_${id}`).emit('chatbot:message:new', {
        conversationId: id,
        message: newMessage
      });
    }

    return sendSuccess(res, {
      message: newMessage
    }, 'Message sent successfully');
  } catch (error) {
    console.error('Send chatbot message error:', error);
    return sendError(res, 'Failed to send message', 500, error.message);
  }
});




// @route   PUT /api/chatbot/conversations/:id/resolve
// @desc    Mark chatbot conversation as resolved
// @access  Private (Vendor only)
router.put('/conversations/:id/resolve', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Find the conversation and ensure the requesting user is the vendor or admin
    // For vendor-admin conversations, allow admin to resolve them
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { vendorId: userId },
        { customerId: 'admin', vendorId: { $ne: null } } // Vendor-admin conversation
      ],
      isActive: true
    });

    // Additional check for admin resolving vendor-admin conversations
    const isAdminResolvingVendorAdminConversation = 
      req.user.role === 'admin' && 
      conversation && 
      conversation.customerId === 'admin';

    // Check if user is authorized to resolve this conversation
    const canResolve = conversation && (
      userId === conversation.vendorId.toString() || 
      isAdminResolvingVendorAdminConversation
    );

    if (!canResolve) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Mark as resolved
    conversation.isResolved = true;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Determine senderId for resolution message
    // For vendor-admin conversations, use 'admin' if admin is resolving
    const resolutionSenderId = isAdminResolvingVendorAdminConversation ? 'admin' : userId;

    // Create resolution message
    const resolutionMessage = new ChatbotMessage({
      conversationId: id,
      senderId: resolutionSenderId,
      content: 'This conversation has been marked as resolved. If you have any more questions, feel free to start a new conversation.',
      type: 'system',
      isBotMessage: true
    });

    await resolutionMessage.save();

    return sendSuccess(res, {
      conversation
    }, 'Conversation marked as resolved');
  } catch (error) {
    console.error('Resolve chatbot conversation error:', error);
    return sendError(res, 'Failed to resolve conversation', 500, error.message);
  }
});

// @route   DELETE /api/chatbot/conversations/:id
// @desc    Delete/Close chatbot conversation
// @access  Private (Participants only)
router.delete('/conversations/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    // For vendor-admin conversations, customerId is 'admin' string
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Mark as inactive
    conversation.isActive = false;
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {}, 'Conversation closed successfully');
  } catch (error) {
    console.error('Delete chatbot conversation error:', error);
    return sendError(res, 'Failed to close conversation', 500, error.message);
  }
});

// @route   PUT /api/chatbot/conversations/:id/messages/:messageId
// @desc    Edit a chatbot message
// @access  Private (Message sender only)
router.put('/conversations/:id/messages/:messageId', authenticateTokenStrict, async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!content || content.trim().length === 0) {
      return sendError(res, 'Message content is required', 400);
    }

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return sendError(res, 'Invalid message ID', 400);
    }

    // Check if user is participant in conversation
    // For vendor-admin conversations, customerId is 'admin' string
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Find the message and ensure the requesting user is the sender
    const message = await ChatbotMessage.findOne({
      _id: messageId,
      conversationId: id,
      $or: [
        { senderId: userId },
        { senderId: 'admin' } // Allow admin to edit admin messages
      ],
      isDeleted: false
    });

    if (!message) {
      return sendError(res, 'Message not found or access denied', 404);
    }

    // Check if message is a system message (cannot be edited)
    if (message.type === 'system') {
      return sendError(res, 'System messages cannot be edited', 403);
    }

    // Update message content
    message.content = content.trim();
    message.isEdited = true;
    message.updatedAt = new Date();
    
    await message.save();

    // Populate sender data (only if senderId is not 'admin')
    if (message.senderId !== 'admin') {
      await message.populate('senderId', 'username displayName avatar isVerified');
    }

    return sendSuccess(res, {
      message
    }, 'Message updated successfully');
  } catch (error) {
    console.error('Edit chatbot message error:', error);
    return sendError(res, 'Failed to update message', 500, error.message);
  }
});

// @route   DELETE /api/chatbot/conversations/:id/messages/:messageId
// @desc    Delete a chatbot message (soft delete)
// @access  Private (Message sender only)
router.delete('/conversations/:id/messages/:messageId', authenticateTokenStrict, async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return sendError(res, 'Invalid message ID', 400);
    }

    // Check if user is participant in conversation
    // For vendor-admin conversations, customerId is 'admin' string
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Find the message and ensure the requesting user is the sender
    const message = await ChatbotMessage.findOne({
      _id: messageId,
      conversationId: id,
      $or: [
        { senderId: userId },
        { senderId: 'admin' } // Allow admin to delete admin messages
      ]
    });

    if (!message) {
      return sendError(res, 'Message not found or access denied', 404);
    }

    // Check if message is a system message (cannot be deleted)
    if (message.type === 'system') {
      return sendError(res, 'System messages cannot be deleted', 403);
    }

    // Soft delete the message
    message.isDeleted = true;
    message.content = '[Message deleted]';
    message.updatedAt = new Date();
    
    await message.save();

    return sendSuccess(res, {}, 'Message deleted successfully');
  } catch (error) {
    console.error('Delete chatbot message error:', error);
    return sendError(res, 'Failed to delete message', 500, error.message);
  }
});

// @route   POST /api/chatbot/conversations/:id/messages/:messageId/reply
// @desc    Reply to a chatbot message
// @access  Private (Conversation participants only)
router.post('/conversations/:id/messages/:messageId/reply', authenticateTokenStrict, async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!content || content.trim().length === 0) {
      return sendError(res, 'Message content is required', 400);
    }

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return sendError(res, 'Invalid message ID', 400);
    }

    // Check if user is participant in conversation
    // For vendor-admin conversations, customerId is 'admin' string
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Find the message being replied to
    const originalMessage = await ChatbotMessage.findOne({
      _id: messageId,
      conversationId: id,
      isDeleted: false
    });

    if (!originalMessage) {
      return sendError(res, 'Original message not found', 404);
    }

    // Create reply message
    const newMessage = new ChatbotMessage({
      conversationId: id,
      senderId: userId,
      content: content.trim(),
      isBotMessage: false,
      // Store reference to original message if needed for UI
      metadata: {
        replyTo: messageId
      }
    });

    await newMessage.save();

    // Update conversation's last message and activity
    conversation.lastMessage = newMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Populate sender data (only if senderId is not 'admin')
    if (newMessage.senderId !== 'admin') {
      await newMessage.populate('senderId', 'username displayName avatar isVerified');
    }

    return sendSuccess(res, {
      message: newMessage
    }, 'Reply sent successfully');
  } catch (error) {
    console.error('Reply to chatbot message error:', error);
    return sendError(res, 'Failed to send reply', 500, error.message);
  }
});

// @route   GET /api/chatbot/conversations/vendor-admin
// @desc    Get vendor-admin conversation
// @access  Private (Vendors only)
router.get('/conversations/vendor-admin', authenticateTokenStrict, async (req, res) => {
  try {
    const vendorId = req.user.userId;

    // Validate vendorId format
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return sendError(res, 'Invalid vendor ID format', 400);
    }

    // Verify that the requesting user is a vendor
    const user = await User.findById(vendorId);
    if (!user || user.role !== 'vendor') {
      return sendError(res, 'Access denied. Vendor access required.', 403);
    }

    // Find existing conversation between vendor and admin
    const conversation = await ChatbotConversation.findOne({
      vendorId: vendorId,
      customerId: 'admin', // Special identifier for admin conversations
      isActive: true
    })
      .populate({
        path: 'customerId',
        select: 'username displayName avatar isVerified'
      })
      .populate({
        path: 'vendorId',
        select: 'username displayName avatar isVerified'
      })
      .populate({
        path: 'lastMessage',
        select: 'content senderId createdAt isBotMessage'
      })
      .lean();

    if (conversation) {
      return sendSuccess(res, { conversation });
    }

    // No existing conversation found
    return sendSuccess(res, { conversation: null });
  } catch (error) {
    console.error('Get vendor-admin conversation error:', error);
    return sendError(res, 'Failed to get conversation', 500, error.message);
  }
});

// @route   POST /api/chatbot/conversations/vendor-admin
// @desc    Create vendor-admin conversation
// @access  Private (Vendors only)
router.post('/conversations/vendor-admin', authenticateTokenStrict, async (req, res) => {
  try {
    const vendorId = req.user.userId;

    // Validate vendorId format
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return sendError(res, 'Invalid vendor ID format', 400);
    }

    // Verify that the requesting user is a vendor
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      return sendError(res, 'Access denied. Vendor access required.', 403);
    }

    // Check if conversation already exists
    const existingConversation = await ChatbotConversation.findOne({
      vendorId: vendorId,
      customerId: 'admin', // Special identifier for admin conversations
      isActive: true
    });

    if (existingConversation) {
      return sendSuccess(res, {
        conversation: existingConversation,
        isNew: false
      }, 'Conversation already exists');
    }

    // Create new conversation with admin
    const newConversation = new ChatbotConversation({
      customerId: 'admin', // Special identifier for admin conversations
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
      senderId: 'admin', // Special identifier for admin
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

    return sendSuccess(res, {
      conversation: newConversation,
      isNew: true
    }, 'Vendor-admin conversation created successfully');
  } catch (error) {
    console.error('Create vendor-admin conversation error:', error);
    return sendError(res, 'Failed to create conversation', 500, error.message);
  }
});

module.exports = router;












// @route   PUT /api/chatbot/conversations/:id/pin
// @desc    Pin/unpin a conversation
// @access  Private
router.put('/conversations/:id/pin', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { isPinned } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });



    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Update pinned status
    conversation.isPinned = isPinned !== undefined ? isPinned : !conversation.isPinned;
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, `Conversation ${conversation.isPinned ? 'pinned' : 'unpinned'} successfully`);
  } catch (error) {
    console.error('Pin conversation error:', error);
    return sendError(res, 'Failed to update conversation pin status', 500, error.message);
  }
});

// @route   PUT /api/chatbot/conversations/:id/mute
// @desc    Mute/unmute a conversation
// @access  Private
router.put('/conversations/:id/mute', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { isMuted } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Update muted status
    conversation.isMuted = isMuted !== undefined ? isMuted : !conversation.isMuted;
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, `Conversation ${conversation.isMuted ? 'muted' : 'unmuted'} successfully`);
  } catch (error) {
    console.error('Mute conversation error:', error);
    return sendError(res, 'Failed to update conversation mute status', 500, error.message);
  }
});

// @route   PUT /api/chatbot/conversations/:id/priority
// @desc    Set conversation priority
// @access  Private (Admin/Vendor only)
router.put('/conversations/:id/priority', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { priority } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return sendError(res, 'Invalid priority level', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Update priority
    conversation.priority = priority;
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, `Conversation priority set to ${priority}`);
  } catch (error) {
    console.error('Set conversation priority error:', error);
    return sendError(res, 'Failed to set conversation priority', 500, error.message);
  }
});

// @route   PUT /api/chatbot/conversations/:id/theme
// @desc    Set conversation theme
// @access  Private
router.put('/conversations/:id/theme', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { theme } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Validate theme
    const validThemes = ['light', 'dark', 'auto'];
    if (!validThemes.includes(theme)) {
      return sendError(res, 'Invalid theme', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Update theme
    conversation.theme = theme;
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, `Conversation theme set to ${theme}`);
  } catch (error) {
    console.error('Set conversation theme error:', error);
    return sendError(res, 'Failed to set conversation theme', 500, error.message);
  }
});

// @route   POST /api/chatbot/conversations/:id/tags
// @desc    Add tags to conversation
// @access  Private
router.post('/conversations/:id/tags', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { tags } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Validate tags
    if (!Array.isArray(tags) || tags.length === 0) {
      return sendError(res, 'Tags must be a non-empty array', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Add tags (avoid duplicates)
    const newTags = [...new Set([...(conversation.tags || []), ...tags])];
    conversation.tags = newTags;
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, 'Tags added successfully');
  } catch (error) {
    console.error('Add conversation tags error:', error);
    return sendError(res, 'Failed to add tags to conversation', 500, error.message);
  }
});

// @route   DELETE /api/chatbot/conversations/:id/tags/:tag
// @desc    Remove tag from conversation
// @access  Private
router.delete('/conversations/:id/tags/:tag', authenticateTokenStrict, async (req, res) => {
  try {
    const { id, tag } = req.params;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Remove tag
    conversation.tags = (conversation.tags || []).filter(t => t !== tag);
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, 'Tag removed successfully');
  } catch (error) {
    console.error('Remove conversation tag error:', error);
    return sendError(res, 'Failed to remove tag from conversation', 500, error.message);
  }
});

// @route   POST /api/chatbot/conversations/:id/assign
// @desc    Assign conversation to admin
// @access  Private (Admin only)
router.post('/conversations/:id/assign', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { adminId } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Verify that the requesting user is an admin
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return sendError(res, 'Access denied. Admin access required.', 403);
    }

    // Find the conversation
    const conversation = await ChatbotConversation.findById(id);
    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    // Validate admin ID if provided
    if (adminId) {
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        return sendError(res, 'Invalid admin ID', 400);
      }
      conversation.assignedAdmin = adminId;
    } else {
      // Unassign conversation
      conversation.assignedAdmin = null;
    }

    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, adminId ? 'Conversation assigned to admin successfully' : 'Conversation unassigned successfully');
  } catch (error) {
    console.error('Assign conversation error:', error);
    return sendError(res, 'Failed to assign conversation', 500, error.message);
  }
});

// @route   POST /api/chatbot/messages/:id/reactions
// @desc    Add reaction to message
// @access  Private
router.post('/messages/:id/reactions', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { emoji } = req.body;

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid message ID', 400);
    }

    // Validate emoji
    if (!emoji) {
      return sendError(res, 'Emoji is required', 400);
    }

    // Find the message
    const message = await ChatbotMessage.findById(id);
    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    // Find the conversation to verify user access
    const conversation = await ChatbotConversation.findOne({
      _id: message.conversationId,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Access denied', 403);
    }

    // Find existing reaction or create new one
    let reaction = message.reactions.find(r => r.emoji === emoji);
    if (!reaction) {
      reaction = {
        emoji,
        userIds: [],
        count: 0
      };
      message.reactions.push(reaction);
    }

    // Check if user already reacted
    const userIndex = reaction.userIds.findIndex(uid => uid.equals(userId));
    if (userIndex === -1) {
      // Add user to reaction
      reaction.userIds.push(userId);
      reaction.count++;
    } else {
      // Remove user from reaction
      reaction.userIds.splice(userIndex, 1);
      reaction.count--;
      
      // Remove reaction if no users left
      if (reaction.count <= 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
      }
    }

    await message.save();

    return sendSuccess(res, {
      message
    }, userIndex === -1 ? 'Reaction added successfully' : 'Reaction removed successfully');
  } catch (error) {
    console.error('Add reaction error:', error);
    return sendError(res, 'Failed to add reaction', 500, error.message);
  }
});

// @route   POST /api/chatbot/messages/:id/forward
// @desc    Forward message to another conversation
// @access  Private
router.post('/messages/:id/forward', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { conversationId } = req.body;

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid message ID', 400);
    }

    // Validate target conversation ID
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return sendError(res, 'Invalid target conversation ID', 400);
    }

    // Find the original message
    const originalMessage = await ChatbotMessage.findById(id);
    if (!originalMessage) {
      return sendError(res, 'Message not found', 404);
    }

    // Find the original conversation to verify user access
    const originalConversation = await ChatbotConversation.findOne({
      _id: originalMessage.conversationId,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!originalConversation) {
      return sendError(res, 'Access denied to original message', 403);
    }

    // Find the target conversation
    const targetConversation = await ChatbotConversation.findOne({
      _id: conversationId,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!targetConversation) {
      return sendError(res, 'Access denied to target conversation', 403);
    }

    // Create forwarded message
    const forwardedMessage = new ChatbotMessage({
      conversationId: targetConversation._id,
      senderId: userId,
      content: originalMessage.content,
      type: originalMessage.type,
      isForwarded: true,
      forwardedFrom: originalMessage._id,
      richContent: originalMessage.richContent,
      attachments: originalMessage.attachments
    });

    await forwardedMessage.save();

    // Update target conversation's last message and activity
    targetConversation.lastMessage = forwardedMessage._id;
    targetConversation.lastActivity = new Date();
    await targetConversation.save();

    return sendSuccess(res, {
      message: forwardedMessage
    }, 'Message forwarded successfully');
  } catch (error) {
    console.error('Forward message error:', error);
    return sendError(res, 'Failed to forward message', 500, error.message);
  }
});

// @route   GET /api/chatbot/conversations/pinned
// @desc    Get all pinned conversations for user
// @access  Private
router.get('/conversations/pinned', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20 } = req.query;

    // Get pinned conversations where user is participant
    const conversations = await ChatbotConversation.find({
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin', vendorId: userId } // Vendor-admin conversations where user is vendor
      ],
      isActive: true,
      isPinned: true
    })
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
      .sort({ lastActivity: -1 })
      .limit(parseInt(limit))
      .lean();

    return sendSuccess(res, {
      conversations
    });
  } catch (error) {
    console.error('Get pinned conversations error:', error);
    return sendError(res, 'Failed to get pinned conversations', 500, error.message);
  }
});

// @route   GET /api/chatbot/conversations/priority/:level
// @desc    Get conversations by priority level
// @access  Private (Admin only)
router.get('/conversations/priority/:level', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { level } = req.params;
    const { limit = 20 } = req.query;

    // Verify that the requesting user is an admin
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return sendError(res, 'Access denied. Admin access required.', 403);
    }

    // Validate priority level
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(level)) {
      return sendError(res, 'Invalid priority level', 400);
    }

    // Get conversations with specified priority
    const conversations = await ChatbotConversation.find({
      priority: level,
      isActive: true
    })
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
      .lean();

    return sendSuccess(res, {
      conversations
    });
  } catch (error) {
    console.error('Get priority conversations error:', error);
    return sendError(res, 'Failed to get priority conversations', 500, error.message);
  }
});

// @route   GET /api/chatbot/conversations/assigned
// @desc    Get conversations assigned to admin
// @access  Private (Admin only)
router.get('/conversations/assigned', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20 } = req.query;

    // Verify that the requesting user is an admin
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return sendError(res, 'Access denied. Admin access required.', 403);
    }

    // Get conversations assigned to this admin
    const conversations = await ChatbotConversation.find({
      assignedAdmin: userId,
      isActive: true
    })
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
      .sort({ lastActivity: -1 })
      .limit(parseInt(limit))
      .lean();

    return sendSuccess(res, {
      conversations
    });
  } catch (error) {
    console.error('Get assigned conversations error:', error);
    return sendError(res, 'Failed to get assigned conversations', 500, error.message);
  }
});

// @route   GET /api/chatbot/stats
// @desc    Get chatbot statistics
// @access  Private (Admin only)
router.get('/stats', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Verify that the requesting user is an admin
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return sendError(res, 'Access denied. Admin access required.', 403);
    }

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

    return sendSuccess(res, {
      totalConversations,
      totalMessages,
      activeConversations,
      resolvedConversations,
      pinnedConversations,
      priorityStats,
      statusStats
    });
  } catch (error) {
    console.error('Get chatbot stats error:', error);
    return sendError(res, 'Failed to get chatbot statistics', 500, error.message);
  }
});

// @route   POST /api/chatbot/messages/:id/forward
// @desc    Forward message to another conversation
// @access  Private
router.post('/messages/:id/forward', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { conversationId } = req.body;

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid message ID', 400);
    }

    // Validate target conversation ID
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return sendError(res, 'Invalid target conversation ID', 400);
    }

    // Find the original message
    const originalMessage = await ChatbotMessage.findById(id);
    if (!originalMessage) {
      return sendError(res, 'Message not found', 404);
    }

    // Find the original conversation to verify user access
    const originalConversation = await ChatbotConversation.findOne({
      _id: originalMessage.conversationId,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!originalConversation) {
      return sendError(res, 'Access denied to original message', 403);
    }

    // Find the target conversation
    const targetConversation = await ChatbotConversation.findOne({
      _id: conversationId,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!targetConversation) {
      return sendError(res, 'Access denied to target conversation', 403);
    }

    // Create forwarded message
    const forwardedMessage = new ChatbotMessage({
      conversationId: targetConversation._id,
      senderId: userId,
      content: originalMessage.content,
      type: originalMessage.type,
      isForwarded: true,
      forwardedFrom: originalMessage._id,
      richContent: originalMessage.richContent,
      attachments: originalMessage.attachments
    });

    await forwardedMessage.save();

    // Update target conversation's last message and activity
    targetConversation.lastMessage = forwardedMessage._id;
    targetConversation.lastActivity = new Date();
    await targetConversation.save();

    return sendSuccess(res, {
      message: forwardedMessage
    }, 'Message forwarded successfully');
  } catch (error) {
    console.error('Forward message error:', error);
    return sendError(res, 'Failed to forward message', 500, error.message);
  }
});

// @route   PUT /api/chatbot/conversations/:id/pin
// @desc    Pin/unpin a conversation
// @access  Private
router.put('/conversations/:id/pin', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { isPinned } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Update pinned status
    conversation.isPinned = isPinned !== undefined ? isPinned : !conversation.isPinned;
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, `Conversation ${conversation.isPinned ? 'pinned' : 'unpinned'} successfully`);
  } catch (error) {
    console.error('Pin conversation error:', error);
    return sendError(res, 'Failed to update conversation pin status', 500, error.message);
  }
});

// @route   PUT /api/chatbot/conversations/:id/mute
// @desc    Mute/unmute a conversation
// @access  Private
router.put('/conversations/:id/mute', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { isMuted } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Update muted status
    conversation.isMuted = isMuted !== undefined ? isMuted : !conversation.isMuted;
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, `Conversation ${conversation.isMuted ? 'muted' : 'unmuted'} successfully`);
  } catch (error) {
    console.error('Mute conversation error:', error);
    return sendError(res, 'Failed to update conversation mute status', 500, error.message);
  }
});

module.exports = router;

// @access  Private
router.put('/conversations/:id/theme', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { theme } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Validate theme
    const validThemes = ['light', 'dark', 'auto'];
    if (!validThemes.includes(theme)) {
      return sendError(res, 'Invalid theme', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Update theme
    conversation.theme = theme;
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, `Conversation theme set to ${theme}`);
  } catch (error) {
    console.error('Set conversation theme error:', error);
    return sendError(res, 'Failed to set conversation theme', 500, error.message);
  }
});

// @route   POST /api/chatbot/conversations/:id/tags
// @desc    Add tags to conversation
// @access  Private
router.post('/conversations/:id/tags', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { tags } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Validate tags
    if (!Array.isArray(tags) || tags.length === 0) {
      return sendError(res, 'Tags must be a non-empty array', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Add tags (avoid duplicates)
    const newTags = [...new Set([...(conversation.tags || []), ...tags])];
    conversation.tags = newTags;
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, 'Tags added successfully');
  } catch (error) {
    console.error('Add conversation tags error:', error);
    return sendError(res, 'Failed to add tags to conversation', 500, error.message);
  }
});

// @route   DELETE /api/chatbot/conversations/:id/tags/:tag
// @desc    Remove tag from conversation
// @access  Private
router.delete('/conversations/:id/tags/:tag', authenticateTokenStrict, async (req, res) => {
  try {
    const { id, tag } = req.params;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Find the conversation and ensure the requesting user is participant
    const conversation = await ChatbotConversation.findOne({
      _id: id,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Conversation not found or access denied', 404);
    }

    // Remove tag
    conversation.tags = (conversation.tags || []).filter(t => t !== tag);
    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, 'Tag removed successfully');
  } catch (error) {
    console.error('Remove conversation tag error:', error);
    return sendError(res, 'Failed to remove tag from conversation', 500, error.message);
  }
});

// @route   POST /api/chatbot/conversations/:id/assign
// @desc    Assign conversation to admin
// @access  Private (Admin only)
router.post('/conversations/:id/assign', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { adminId } = req.body;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid conversation ID', 400);
    }

    // Verify that the requesting user is an admin
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return sendError(res, 'Access denied. Admin access required.', 403);
    }

    // Find the conversation
    const conversation = await ChatbotConversation.findById(id);
    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    // Validate admin ID if provided
    if (adminId) {
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        return sendError(res, 'Invalid admin ID', 400);
      }
      conversation.assignedAdmin = adminId;
    } else {
      // Unassign conversation
      conversation.assignedAdmin = null;
    }

    conversation.lastActivity = new Date();
    await conversation.save();

    return sendSuccess(res, {
      conversation
    }, adminId ? 'Conversation assigned to admin successfully' : 'Conversation unassigned successfully');
  } catch (error) {
    console.error('Assign conversation error:', error);
    return sendError(res, 'Failed to assign conversation', 500, error.message);
  }
});

// @route   POST /api/chatbot/messages/:id/reactions
// @desc    Add reaction to message
// @access  Private
router.post('/messages/:id/reactions', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { emoji } = req.body;

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid message ID', 400);
    }

    // Validate emoji
    if (!emoji) {
      return sendError(res, 'Emoji is required', 400);
    }

    // Find the message
    const message = await ChatbotMessage.findById(id);
    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    // Find the conversation to verify user access
    const conversation = await ChatbotConversation.findOne({
      _id: message.conversationId,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!conversation) {
      return sendError(res, 'Access denied', 403);
    }

    // Find existing reaction or create new one
    let reaction = message.reactions.find(r => r.emoji === emoji);
    if (!reaction) {
      reaction = {
        emoji,
        userIds: [],
        count: 0
      };
      message.reactions.push(reaction);
    }

    // Check if user already reacted
    const userIndex = reaction.userIds.findIndex(uid => uid.equals(userId));
    if (userIndex === -1) {
      // Add user to reaction
      reaction.userIds.push(userId);
      reaction.count++;
    } else {
      // Remove user from reaction
      reaction.userIds.splice(userIndex, 1);
      reaction.count--;
      
      // Remove reaction if no users left
      if (reaction.count <= 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
      }
    }

    await message.save();

    return sendSuccess(res, {
      message
    }, userIndex === -1 ? 'Reaction added successfully' : 'Reaction removed successfully');
  } catch (error) {
    console.error('Add reaction error:', error);
    return sendError(res, 'Failed to add reaction', 500, error.message);
  }
});

// @route   POST /api/chatbot/messages/:id/forward
// @desc    Forward message to another conversation
// @access  Private
router.post('/messages/:id/forward', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { conversationId } = req.body;

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid message ID', 400);
    }

    // Validate target conversation ID
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return sendError(res, 'Invalid target conversation ID', 400);
    }

    // Find the original message
    const originalMessage = await ChatbotMessage.findById(id);
    if (!originalMessage) {
      return sendError(res, 'Message not found', 404);
    }

    // Find the original conversation to verify user access
    const originalConversation = await ChatbotConversation.findOne({
      _id: originalMessage.conversationId,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!originalConversation) {
      return sendError(res, 'Access denied to original message', 403);
    }

    // Find the target conversation
    const targetConversation = await ChatbotConversation.findOne({
      _id: conversationId,
      $or: [
        { customerId: userId },
        { vendorId: userId },
        { customerId: 'admin' } // Allow admin conversations
      ],
      isActive: true
    });

    if (!targetConversation) {
      return sendError(res, 'Access denied to target conversation', 403);
    }

    // Create forwarded message
    const forwardedMessage = new ChatbotMessage({
      conversationId: targetConversation._id,
      senderId: userId,
      content: originalMessage.content,
      type: originalMessage.type,
      isForwarded: true,
      forwardedFrom: originalMessage._id,
      richContent: originalMessage.richContent,
      attachments: originalMessage.attachments
    });

    await forwardedMessage.save();

    // Update target conversation's last message and activity
    targetConversation.lastMessage = forwardedMessage._id;
    targetConversation.lastActivity = new Date();
    await targetConversation.save();

    return sendSuccess(res, {
      message: forwardedMessage
    }, 'Message forwarded successfully');
  } catch (error) {
    console.error('Forward message error:', error);
    return sendError(res, 'Failed to forward message', 500, error.message);
  }
});

module.exports = router;
