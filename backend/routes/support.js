const express = require('express');
const router = express.Router();
const supportService = require('../services/supportService');
const auth = require('../src/middleware/auth');
const adminAuth = require('../src/middleware/adminAuth');

/**
 * @route   POST /api/support/tickets
 * @desc    Create a new support ticket
 * @access  Private (authenticated users)
 */
router.post('/tickets', auth, async (req, res) => {
  try {
    const result = await supportService.createTicket(req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating support ticket'
    });
  }
});

/**
 * @route   GET /api/support/tickets
 * @desc    Get all support tickets for a user
 * @access  Private (authenticated users)
 */
router.get('/tickets', auth, async (req, res) => {
  try {
    const result = await supportService.getUserTickets(req.user.id, req.query);
    res.json(result);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching support tickets'
    });
  }
});

/**
 * @route   GET /api/support/tickets/vendor
 * @desc    Get all support tickets for a vendor
 * @access  Private (vendors)
 */
router.get('/tickets/vendor', auth, async (req, res) => {
  try {
    const result = await supportService.getVendorTickets(req.user.id, req.query);
    res.json(result);
  } catch (error) {
    console.error('Error fetching vendor support tickets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching vendor support tickets'
    });
  }
});

/**
 * @route   GET /api/support/tickets/admin
 * @desc    Get all support tickets (admin)
 * @access  Private (admin)
 */
router.get('/tickets/admin', adminAuth, async (req, res) => {
  try {
    const result = await supportService.getAdminTickets(req.query);
    res.json(result);
  } catch (error) {
    console.error('Error fetching admin support tickets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching admin support tickets'
    });
  }
});

/**
 * @route   GET /api/support/tickets/stats
 * @desc    Get support ticket statistics (admin)
 * @access  Private (admin)
 */
router.get('/tickets/stats', adminAuth, async (req, res) => {
  try {
    const result = await supportService.getTicketStats();
    res.json(result);
  } catch (error) {
    console.error('Error fetching ticket statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching ticket statistics'
    });
  }
});

/**
 * @route   GET /api/support/tickets/:ticketId
 * @desc    Get a specific support ticket with messages
 * @access  Private (ticket owner, vendor, admin)
 */
router.get('/tickets/:ticketId', auth, async (req, res) => {
  try {
    const result = await supportService.getTicketById(req.params.ticketId, req.user.id, req.user.role);
    res.json(result);
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    
    if (error.message === 'Support ticket not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Access denied to this support ticket') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching support ticket'
    });
  }
});

/**
 * @route   PUT /api/support/tickets/:ticketId/status
 * @desc    Update ticket status
 * @access  Private (ticket owner, vendor, admin)
 */
router.put('/tickets/:ticketId/status', auth, async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const result = await supportService.updateTicketStatus(
      req.params.ticketId, 
      status, 
      resolutionNotes, 
      req.user.id, 
      req.user.role
    );
    res.json(result);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    
    if (error.message === 'Support ticket not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Access denied to update ticket status') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating ticket status'
    });
  }
});

/**
 * @route   PUT /api/support/tickets/:ticketId/assign
 * @desc    Assign ticket to agent (admin only)
 * @access  Private (admin)
 */
router.put('/tickets/:ticketId/assign', adminAuth, async (req, res) => {
  try {
    const { agentId } = req.body;
    const result = await supportService.assignTicket(req.params.ticketId, agentId, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error assigning ticket:', error);
    
    if (error.message === 'Support ticket not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while assigning ticket'
    });
  }
});

/**
 * @route   POST /api/support/tickets/:ticketId/messages
 * @desc    Add a message to a support ticket
 * @access  Private (ticket participants)
 */
router.post('/tickets/:ticketId/messages', auth, async (req, res) => {
  try {
    const result = await supportService.addMessage(req.params.ticketId, req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding message to support ticket:', error);
    
    if (error.message === 'Support ticket not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Message content is required') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while adding message to support ticket'
    });
  }
});

/**
 * @route   GET /api/support/tickets/:ticketId/messages
 * @desc    Get messages for a support ticket
 * @access  Private (ticket participants)
 */
router.get('/tickets/:ticketId/messages', auth, async (req, res) => {
  try {
    const result = await supportService.getTicketMessages(req.params.ticketId, req.user.id, req.user.role);
    res.json(result);
  } catch (error) {
    console.error('Error fetching support ticket messages:', error);
    
    if (error.message === 'Support ticket not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'Access denied to view messages for this support ticket') {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching support ticket messages'
    });
  }
});

module.exports = router;