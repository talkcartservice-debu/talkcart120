const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, authenticateTokenStrict } = require('./auth');
const { Conversation, Message } = require('../models');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Messages service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// @route   GET /api/messages/unread-count
// @desc    Get total unread messages count for user
// @access  Private
router.get('/unread-count', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Count unread messages across all conversations for the user
    const unreadCount = await Conversation.aggregate([
      {
        $match: {
          participants: { $in: [new mongoose.Types.ObjectId(userId)] },
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalUnread: { $sum: "$unreadCount" }
        }
      }
    ]);

    const totalUnread = unreadCount.length > 0 ? unreadCount[0].totalUnread : 0;

    res.json({
      success: true,
      data: {
        totalUnread
      }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
});

// @route   GET /api/messages/conversations
// @desc    Get user conversations
// @access  Private
router.get('/conversations', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, page = 1, search } = req.query;

    // Build query
    let query = {
      participants: { $in: [new mongoose.Types.ObjectId(userId)] },
      isActive: true
    };

    // Add search filter if provided
    if (search) {
      query.$or = [
        { groupName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get conversations
    const conversations = await Conversation.find(query)
      .populate({
        path: 'participants',
        select: 'username displayName avatar isVerified lastSeen isOnline',
        match: { _id: { $ne: userId } }
      })
      .populate({
        path: 'lastMessage',
        select: 'content senderId createdAt isRead'
      })
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await Conversation.countDocuments(query);

    // Transform conversations to include other participant info for direct messages
    const transformedConversations = conversations.map(conv => {
      let otherParticipant = null;
      if (!conv.isGroup && conv.participants && conv.participants.length > 0) {
        otherParticipant = conv.participants[0];
      }

      return {
        ...conv,
        id: conv._id,
        otherParticipant,
        isOnline: otherParticipant ? otherParticipant.isOnline : false,
        lastSeen: otherParticipant ? otherParticipant.lastSeen : null
      };
    });

    res.json({
      success: true,
      data: {
        conversations: transformedConversations,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalConversations: total,
          hasMore: skip + transformedConversations.length < total
        }
      }
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations'
    });
  }
});

// @route   POST /api/messages/conversations
// @desc    Create new conversation
// @access  Private
router.post('/conversations', authenticateTokenStrict, async (req, res) => {
  try {
    console.log('=== Create Conversation Request ===');
    console.log('User ID:', req.user.userId);
    console.log('Request Body:', req.body);
    
    const userId = req.user.userId;
    let { participantId, isGroup = false, groupName, participantIds = [] } = req.body;
    
    console.log('Parsed parameters:', { participantId, isGroup, groupName, participantIds });

    // Validation
    if (isGroup) {
      console.log('Creating group conversation');
      if (!groupName || groupName.trim().length === 0) {
        console.log('Group name validation failed');
        return res.status(400).json({
          success: false,
          message: 'Group name is required for group conversations'
        });
      }
      if (!participantIds || participantIds.length === 0) {
        console.log('Participant IDs validation failed');
        return res.status(400).json({
          success: false,
          message: 'At least one participant is required for group conversations'
        });
      }
      // Add current user to participants if not already included
      if (!participantIds.includes(userId)) {
        console.log('Adding current user to participants');
        participantIds.push(userId);
      }
    } else {
      console.log('Creating direct message conversation');
      if (!participantId) {
        console.log('Participant ID validation failed');
        return res.status(400).json({
          success: false,
          message: 'Participant ID is required for direct messages'
        });
      }
      // Create participant array for direct message
      participantIds = [userId, participantId];
    }
    
    console.log('Final participant IDs:', participantIds);
    
    // Validate all participant IDs
    console.log('Validating participant IDs');
    for (const id of participantIds) {
      console.log('Validating ID:', id);
      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('Invalid ObjectId:', id);
        return res.status(400).json({
          success: false,
          message: `Invalid participant ID: ${id}`
        });
      }
    }

    // Check if conversation already exists for direct messages
    if (!isGroup) {
      console.log('Checking for existing conversation');
      const existingConversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: participantIds, $size: 2 },
        isActive: true
      });
      
      console.log('Existing conversation check result:', existingConversation);

      if (existingConversation) {
        console.log('Conversation already exists, returning existing');
        return res.json({
          success: true,
          data: existingConversation,
          message: 'Conversation already exists'
        });
      }
    }

    // Create new conversation
    console.log('Creating new conversation');
    const newConversation = new Conversation({
      participants: participantIds.map(id => {
        console.log('Converting ID:', id);
        const objectId = new mongoose.Types.ObjectId(id);
        console.log('Converted ObjectId:', objectId);
        return objectId;
      }),
      isGroup,
      groupName: isGroup ? groupName : undefined,
      createdBy: userId,
      isActive: true
    });
    
    console.log('New conversation object:', newConversation);

    await newConversation.save();
    console.log('Conversation saved successfully');

    // Populate participants and return
    await newConversation.populate({
      path: 'participants',
      select: 'username displayName avatar isVerified lastSeen isOnline'
    });
    
    console.log('Conversation populated:', newConversation);

    res.status(201).json({
      success: true,
      data: newConversation,
      message: 'Conversation created successfully'
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create conversation',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/messages/conversations/:id
// @desc    Get specific conversation
// @access  Private
router.get('/conversations/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID'
      });
    }

    // Find conversation and ensure user is participant
    const conversation = await Conversation.findOne({
      _id: id,
      participants: { $in: [new mongoose.Types.ObjectId(userId)] },
      isActive: true
    })
    .populate({
      path: 'participants',
      select: 'username displayName avatar isVerified lastSeen isOnline'
    })
    .populate({
      path: 'lastMessage',
      select: 'content senderId createdAt isRead'
    })
    .lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    // Transform conversation to include other participant info for direct messages
    let otherParticipant = null;
    if (!conversation.isGroup && conversation.participants && conversation.participants.length > 0) {
      otherParticipant = conversation.participants.find(p => p._id.toString() !== userId);
    }

    const transformedConversation = {
      ...conversation,
      id: conversation._id,
      otherParticipant,
      isOnline: otherParticipant ? otherParticipant.isOnline : false,
      lastSeen: otherParticipant ? otherParticipant.lastSeen : null
    };

    res.json({
      success: true,
      data: transformedConversation
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation'
    });
  }
});

// @route   PUT /api/messages/conversations/:id
// @desc    Update conversation settings (group name, description, etc.)
// @access  Private
router.put('/conversations/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { groupName, groupDescription, groupAvatar } = req.body;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID'
      });
    }

    // Find conversation and ensure user is participant
    const conversation = await Conversation.findOne({
      _id: id,
      participants: { $in: [new mongoose.Types.ObjectId(userId)] },
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    // Only allow group conversation updates
    if (!conversation.isGroup) {
      return res.status(400).json({
        success: false,
        message: 'Only group conversations can be updated'
      });
    }

    // Check if user is admin of the group
    if (conversation.adminId && conversation.adminId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can update conversation settings'
      });
    }

    // Update allowed fields
    if (groupName !== undefined) {
      if (groupName === null || groupName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Group name cannot be empty'
        });
      }
      conversation.groupName = groupName.trim();
    }

    if (groupDescription !== undefined) {
      conversation.groupDescription = groupDescription;
    }

    if (groupAvatar !== undefined) {
      conversation.groupAvatar = groupAvatar;
    }

    conversation.updatedAt = new Date();
    await conversation.save();

    // Populate participants and return
    await conversation.populate({
      path: 'participants',
      select: 'username displayName avatar isVerified lastSeen isOnline'
    });

    res.json({
      success: true,
      data: conversation,
      message: 'Conversation updated successfully'
    });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update conversation'
    });
  }
});

// @route   GET /api/messages/conversations/:id/messages
// @desc    Get messages in conversation
// @access  Private
router.get('/conversations/:id/messages', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, page = 1, before } = req.query;
    const userId = req.user.userId;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID'
      });
    }

    // Check if user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: { $in: [new mongoose.Types.ObjectId(userId)] },
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
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
    const messages = await Message.find(query)
      .populate({
        path: 'senderId',
        select: 'username displayName avatar isVerified'
      })
      .populate({
        path: 'replyTo',
        select: 'content senderId',
        populate: {
          path: 'senderId',
          select: 'username displayName'
        }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const total = await Message.countDocuments(query);

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
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages'
    });
  }
});

// @route   POST /api/messages/conversations/:id/messages
// @desc    Send message in conversation
// @access  Private
router.post('/conversations/:id/messages', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, type = 'text', media, replyTo } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID'
      });
    }

    // Check if user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: id,
      participants: { $in: [new mongoose.Types.ObjectId(userId)] },
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    // Create new message
    const newMessage = new Message({
      conversationId: id,
      senderId: userId,
      content: content.trim(),
      type,
      media,
      replyTo: replyTo ? new mongoose.Types.ObjectId(replyTo) : undefined
    });

    await newMessage.save();

    // Populate sender data
    await newMessage.populate({
      path: 'senderId',
      select: 'username displayName avatar isVerified'
    });

    // Populate replyTo data if exists
    if (replyTo) {
      await newMessage.populate({
        path: 'replyTo',
        select: 'content senderId',
        populate: {
          path: 'senderId',
          select: 'username displayName'
        }
      });
    }

    // Update conversation's last message and activity
    conversation.lastMessage = newMessage._id;
    conversation.updatedAt = new Date();
    conversation.unreadCount = conversation.unreadCount + 1;
    await conversation.save();

    // Broadcast new message to all participants in the conversation via sockets
    try {
      console.log('Broadcasting message via socket to conversation:', id);
      // Emit the new message to the conversation room using the global io instance
      if (global.io) {
        const roomName = `conversation_${id}`;
        console.log(`Emitting to room ${roomName}`);
        global.io.to(roomName).emit('message:new', {
          conversationId: id,
          message: newMessage
        });
        console.log(`Message emitted to room ${roomName}`);
      } else {
        console.log('Global io instance not available for broadcasting');
      }
    } catch (socketError) {
      console.error('Failed to broadcast message via socket:', socketError);
      // Continue with the response even if socket broadcast fails
    }

    res.status(201).json({
      success: true,
      data: {
        message: newMessage
      },
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
});

// @route   DELETE /api/messages/messages/:id
// @desc    Delete message
// @access  Private
router.delete('/messages/:id', authenticateTokenStrict, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID'
      });
    }

    // Find the message
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Find the conversation to verify user access
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: { $in: [new mongoose.Types.ObjectId(userId)] },
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    // Delete the message
    message.isDeleted = true;
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message'
    });
  }
});

module.exports = router;




















