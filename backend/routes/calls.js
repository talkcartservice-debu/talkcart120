const express = require('express');
const router = express.Router();
const { Call, Conversation, User } = require('../models');
const { authenticateTokenStrict } = require('./auth');
const crypto = require('crypto');

// Initiate a call
router.post('/initiate', authenticateTokenStrict, async (req, res) => {
  try {
    const { conversationId, type } = req.body; // type: 'audio' or 'video'
    const initiatorId = req.user.userId;

    // Validate input
    if (!conversationId || !type || !['audio', 'video'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID or call type'
      });
    }

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'id displayName avatar isOnline');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const isParticipant = conversation.participants.some(p => p.id === initiatorId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this conversation'
      });
    }

    // Check if there's already an active call in this conversation
    let activeCall = await Call.findOne({
      conversationId,
      status: { $in: ['initiated', 'ringing', 'active'] }
    });

    if (activeCall) {
      // Consider stale calls as ended if no one joined within 60s
      const now = Date.now();
      const createdAt = new Date(activeCall.createdAt || activeCall.startedAt || Date.now()).getTime();
      const ageMs = now - createdAt;
      const hasJoined = (activeCall.participants || []).some(p => p.status === 'joined');
      const isStale = (['initiated', 'ringing'].includes(activeCall.status) && ageMs > 60_000 && !hasJoined);

      console.log('Found active call:', { id: activeCall._id, status: activeCall.status, ageMs, hasJoined, isStale });

      if (isStale) {
        console.log('Marking call as ended due to staleness');
        activeCall.status = 'ended';
        activeCall.endedAt = new Date();
        await activeCall.save();
      } else {
        // Return the existing active call so the client can join instead of failing
        console.log('Returning existing active call instead of 409');
        await activeCall.populate([
          { path: 'initiator', select: 'id displayName avatar' },
          { path: 'participants.userId', select: 'id displayName avatar' }
        ]);

        return res.status(200).json({
          success: true,
          message: 'Returning existing active call',
          data: {
            call: {
              id: activeCall._id,
              callId: activeCall.callId,
              conversationId: activeCall.conversationId,
              initiator: activeCall.initiator,
              participants: activeCall.participants,
              type: activeCall.type,
              status: activeCall.status,
              startedAt: activeCall.startedAt
            }
          }
        });
      }
    }

    // Create call participants (exclude initiator, they'll be added when they join)
    const participants = conversation.participants
      .filter(p => p.id !== initiatorId)
      .map(p => ({
        userId: p.id,
        status: 'invited'
      }));

    // Create new call
    const call = new Call({
      callId: crypto.randomUUID(),
      conversationId,
      initiator: initiatorId,
      participants,
      type,
      status: 'initiated'
    });

    await call.save();

    // Populate the call with user details
    await call.populate([
      { path: 'initiator', select: 'id displayName avatar' },
      { path: 'participants.userId', select: 'id displayName avatar' }
    ]);

    // Emit call initiation to all participants via socket
    const io = req.app.get('io');
    if (io) {
      // Notify all participants except initiator
      participants.forEach(participant => {
        io.to(`user_${participant.userId}`).emit('call:incoming', {
          call: {
            id: call._id,
            callId: call.callId,
            conversationId: call.conversationId,
            initiator: call.initiator,
            type: call.type,
            status: call.status,
            startedAt: call.startedAt
          }
        });
      });
    }

    res.status(201).json({
      success: true,
      message: 'Call initiated successfully',
      data: {
        call: {
          id: call._id,
          callId: call.callId,
          conversationId: call.conversationId,
          initiator: call.initiator,
          participants: call.participants,
          type: call.type,
          status: call.status,
          startedAt: call.startedAt
        }
      }
    });

  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate call'
    });
  }
});

// Join a call
router.post('/:callId/join', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId })
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is the initiator or a participant
    const isInitiator = call.initiator.id === userId;
    const participantIndex = call.participants.findIndex(p => p.userId.id === userId);

    if (!isInitiator && participantIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to join this call'
      });
    }

    // Update call status
    if (call.status === 'initiated') {
      call.status = 'ringing';
    }

    // Update participant status
    if (isInitiator) {
      // Add initiator as participant if not already added
      const initiatorParticipant = call.participants.find(p => p.userId.id === userId);
      if (!initiatorParticipant) {
        call.participants.push({
          userId: userId,
          joinedAt: new Date(),
          status: 'joined',
          role: 'moderator'
        });
      } else {
        initiatorParticipant.joinedAt = new Date();
        initiatorParticipant.status = 'joined';
        initiatorParticipant.role = 'moderator';
      }
    } else {
      call.participants[participantIndex].joinedAt = new Date();
      call.participants[participantIndex].status = 'joined';
    }

    // If this is the first person to join, mark call as active
    const joinedParticipants = call.participants.filter(p => p.status === 'joined');
    if (joinedParticipants.length >= 1) {
      call.status = 'active';
    }

    await call.save();

    // Emit to all participants that someone joined
    const io = req.app.get('io');
    if (io) {
      const allParticipantIds = [call.initiator.id, ...call.participants.map(p => p.userId.id)];
      allParticipantIds.forEach(participantId => {
        if (participantId !== userId) {
          io.to(`user_${participantId}`).emit('call:participant-joined', {
            callId: call.callId,
            userId,
            call: {
              id: call._id,
              status: call.status,
              participants: call.participants
            }
          });
        }
      });
    }

    res.json({
      success: true,
      message: 'Joined call successfully',
      data: {
        call: {
          id: call._id,
          callId: call.callId,
          conversationId: call.conversationId,
          initiator: call.initiator,
          participants: call.participants,
          type: call.type,
          status: call.status,
          startedAt: call.startedAt
        }
      }
    });

  } catch (error) {
    console.error('Error joining call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join call'
    });
  }
});

// Leave a call
router.post('/:callId/leave', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId })
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Find and update participant status
    const participantIndex = call.participants.findIndex(p => p.userId.id === userId);
    const isInitiator = call.initiator.id === userId;

    if (!isInitiator && participantIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this call'
      });
    }

    // Update participant status
    if (participantIndex !== -1) {
      call.participants[participantIndex].leftAt = new Date();
      call.participants[participantIndex].status = 'left';
    }

    // Check if all participants have left or if initiator left
    const activeParticipants = call.participants.filter(p => p.status === 'joined');

    if (activeParticipants.length === 0 || isInitiator) {
      // End the call
      call.status = 'ended';
      call.endedAt = new Date();

      if (call.startedAt) {
        call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
      }
    }

    await call.save();

    // Emit to all participants that someone left
    const io = req.app.get('io');
    if (io) {
      const allParticipantIds = [call.initiator.id, ...call.participants.map(p => p.userId.id)];
      allParticipantIds.forEach(participantId => {
        if (participantId !== userId) {
          io.to(`user_${participantId}`).emit('call:participant-left', {
            callId: call.callId,
            userId,
            call: {
              id: call._id,
              status: call.status,
              participants: call.participants,
              endedAt: call.endedAt
            }
          });
        }
      });

      // If call ended, notify all participants
      if (call.status === 'ended') {
        allParticipantIds.forEach(participantId => {
          io.to(`user_${participantId}`).emit('call:ended', {
            callId: call.callId,
            call: {
              id: call._id,
              status: call.status,
              endedAt: call.endedAt,
              duration: call.duration
            }
          });
        });
      }
    }

    res.json({
      success: true,
      message: 'Left call successfully',
      data: {
        call: {
          id: call._id,
          status: call.status,
          endedAt: call.endedAt,
          duration: call.duration
        }
      }
    });

  } catch (error) {
    console.error('Error leaving call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave call'
    });
  }
});

// Decline a call
router.post('/:callId/decline', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId })
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Find participant
    const participantIndex = call.participants.findIndex(p => p.userId.id === userId);

    if (participantIndex === -1) {
      return res.status(403).json({
        success: false,
        message: 'You are not invited to this call'
      });
    }

    // Update participant status
    call.participants[participantIndex].status = 'declined';

    // Check if all participants declined
    const pendingParticipants = call.participants.filter(p => p.status === 'invited');

    if (pendingParticipants.length === 0) {
      call.status = 'declined';
      call.endedAt = new Date();
    }

    await call.save();

    // Emit to initiator that participant declined
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${call.initiator.id}`).emit('call:declined', {
        callId: call.callId,
        userId,
        call: {
          id: call._id,
          status: call.status,
          participants: call.participants
        }
      });
    }

    res.json({
      success: true,
      message: 'Call declined successfully'
    });

  } catch (error) {
    console.error('Error declining call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline call'
    });
  }
});

// Get call details
router.get('/:callId', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId })
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar')
      .populate('conversationId', 'id isGroup groupName');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user has access to this call
    const isInitiator = call.initiator.id === userId;
    const isParticipant = call.participants.some(p => p.userId.id === userId);

    if (!isInitiator && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this call'
      });
    }

    res.json({
      success: true,
      data: {
        call: {
          id: call._id,
          callId: call.callId,
          conversationId: call.conversationId,
          initiator: call.initiator,
          participants: call.participants,
          type: call.type,
          status: call.status,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
          duration: call.duration
        }
      }
    });

  } catch (error) {
    console.error('Error getting call details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get call details'
    });
  }
});

// Get call history for a conversation
router.get('/conversation/:conversationId/history', authenticateTokenStrict, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    // Check if user has access to this conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const isParticipant = conversation.participants.includes(userId);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this conversation'
      });
    }

    // Get call history
    const calls = await Call.find({ conversationId })
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalCalls = await Call.countDocuments({ conversationId });

    res.json({
      success: true,
      data: {
        calls: calls.map(call => ({
          id: call._id,
          callId: call.callId,
          initiator: call.initiator,
          participants: call.participants,
          type: call.type,
          status: call.status,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
          duration: call.duration
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCalls / limit),
          totalCalls,
          hasMore: page * limit < totalCalls
        }
      }
    });

  } catch (error) {
    console.error('Error getting call history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get call history'
    });
  }
});

// Report call quality
router.post('/:callId/quality', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const { audioQuality, videoQuality, connectionQuality, feedback } = req.body;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId });
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user was part of the call
    const isInitiator = call.initiator.toString() === userId;
    const isParticipant = call.participants.some(p => p.userId.toString() === userId);

    if (!isInitiator && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You were not part of this call'
      });
    }

    // Update call quality
    call.quality = {
      audioQuality: audioQuality || call.quality?.audioQuality,
      videoQuality: videoQuality || call.quality?.videoQuality,
      connectionQuality: connectionQuality || call.quality?.connectionQuality,
      feedback: feedback || call.quality?.feedback
    };

    await call.save();

    res.json({
      success: true,
      message: 'Call quality reported successfully'
    });

  } catch (error) {
    console.error('Error reporting call quality:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report call quality'
    });
  }
});

// Get missed calls for user
router.get('/missed', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    // Find calls where user was invited but didn't join or declined
    const missedCalls = await Call.find({
      $or: [
        {
          // User was invited but call ended without them joining
          'participants.userId': userId,
          'participants.status': { $in: ['invited', 'missed'] },
          status: { $in: ['ended', 'missed'] }
        },
        {
          // User declined the call
          'participants.userId': userId,
          'participants.status': 'declined',
          status: 'declined'
        }
      ]
    })
      .populate('initiator', 'id displayName avatar')
      .populate('conversationId', 'id isGroup groupName participants')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalMissedCalls = await Call.countDocuments({
      $or: [
        {
          'participants.userId': userId,
          'participants.status': { $in: ['invited', 'missed'] },
          status: { $in: ['ended', 'missed'] }
        },
        {
          'participants.userId': userId,
          'participants.status': 'declined',
          status: 'declined'
        }
      ]
    });

    res.json({
      success: true,
      data: {
        missedCalls: missedCalls.map(call => ({
          id: call._id,
          callId: call.callId,
          initiator: call.initiator,
          conversationId: call.conversationId,
          type: call.type,
          status: call.status,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
          duration: call.duration
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMissedCalls / limit),
          totalMissedCalls,
          hasMore: page * limit < totalMissedCalls
        }
      }
    });

  } catch (error) {
    console.error('Error getting missed calls:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get missed calls'
    });
  }
});

// Mark missed calls as seen
router.post('/missed/mark-seen', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { callIds } = req.body;

    if (!callIds || !Array.isArray(callIds)) {
      return res.status(400).json({
        success: false,
        message: 'Call IDs array is required'
      });
    }

    // Update participant status to 'seen' for missed calls
    await Call.updateMany(
      {
        callId: { $in: callIds },
        'participants.userId': userId,
        'participants.status': { $in: ['missed', 'declined'] }
      },
      {
        $set: { 'participants.$.status': 'seen' }
      }
    );

    res.json({
      success: true,
      message: 'Missed calls marked as seen'
    });

  } catch (error) {
    console.error('Error marking missed calls as seen:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark missed calls as seen'
    });
  }
});

// Get active calls for user
router.get('/active', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;

    const activeCalls = await Call.find({
      $or: [
        { initiator: userId },
        { 'participants.userId': userId }
      ],
      status: { $in: ['initiated', 'ringing', 'active'] }
    })
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar')
      .populate('conversationId', 'id isGroup groupName');

    res.json({
      success: true,
      data: {
        activeCalls: activeCalls.map(call => ({
          id: call._id,
          callId: call.callId,
          conversationId: call.conversationId,
          initiator: call.initiator,
          participants: call.participants,
          type: call.type,
          status: call.status,
          startedAt: call.startedAt
        }))
      }
    });

  } catch (error) {
    console.error('Error getting active calls:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active calls'
    });
  }
});

// Start call recording
router.post('/:callId/recording/start', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId });
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is part of the call
    const isInitiator = call.initiator.toString() === userId;
    const isParticipant = call.participants.some(p => p.userId.toString() === userId);

    if (!isInitiator && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this call'
      });
    }

    // Check if call is active
    if (call.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Call must be active to start recording'
      });
    }

    // Update call with recording info
    call.recording = {
      isRecording: true,
      startedBy: userId,
      startedAt: new Date(),
      recordingId: `rec_${callId}_${Date.now()}`
    };

    await call.save();

    res.json({
      success: true,
      message: 'Call recording started',
      data: {
        recordingId: call.recording.recordingId
      }
    });

  } catch (error) {
    console.error('Error starting call recording:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start call recording'
    });
  }
});

// Stop call recording
router.post('/:callId/recording/stop', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId });
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is part of the call
    const isInitiator = call.initiator.toString() === userId;
    const isParticipant = call.participants.some(p => p.userId.toString() === userId);

    if (!isInitiator && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this call'
      });
    }

    // Check if recording is active
    if (!call.recording || !call.recording.isRecording) {
      return res.status(400).json({
        success: false,
        message: 'No active recording found'
      });
    }

    // Update call with recording stop info
    call.recording.isRecording = false;
    call.recording.stoppedBy = userId;
    call.recording.stoppedAt = new Date();
    call.recording.duration = Math.floor((call.recording.stoppedAt - call.recording.startedAt) / 1000);

    await call.save();

    res.json({
      success: true,
      message: 'Call recording stopped',
      data: {
        recordingId: call.recording.recordingId,
        duration: call.recording.duration
      }
    });

  } catch (error) {
    console.error('Error stopping call recording:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop call recording'
    });
  }
});

// Get call recordings
router.get('/:callId/recordings', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId });
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user was part of the call
    const isInitiator = call.initiator.toString() === userId;
    const isParticipant = call.participants.some(p => p.userId.toString() === userId);

    if (!isInitiator && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You were not part of this call'
      });
    }

    res.json({
      success: true,
      data: {
        recording: call.recording || null
      }
    });

  } catch (error) {
    console.error('Error getting call recordings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get call recordings'
    });
  }
});

// Transfer call to another user
router.post('/:callId/transfer', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const { targetUserId } = req.body;
    const userId = req.user.userId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID is required'
      });
    }

    const call = await Call.findOne({ callId });
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is part of the call
    const isInitiator = call.initiator.toString() === userId;
    const isParticipant = call.participants.some(p => p.userId.toString() === userId);

    if (!isInitiator && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this call'
      });
    }

    // Check if call is active
    if (call.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Call must be active to transfer'
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    // Add transfer information to call
    call.transfer = {
      transferredBy: userId,
      transferredTo: targetUserId,
      transferredAt: new Date(),
      status: 'pending'
    };

    await call.save();

    res.json({
      success: true,
      message: 'Call transfer initiated',
      data: {
        transferId: call.transfer.transferredAt.getTime().toString()
      }
    });

  } catch (error) {
    console.error('Error transferring call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer call'
    });
  }
});

// Accept call transfer
router.post('/:callId/transfer/accept', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId });
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is the transfer target
    if (!call.transfer || call.transfer.transferredTo.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not the transfer target'
      });
    }

    // Check if transfer is pending
    if (call.transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Transfer is not pending'
      });
    }

    // Update transfer status
    call.transfer.status = 'accepted';
    call.transfer.acceptedAt = new Date();

    // Add new participant
    call.participants.push({
      userId: userId,
      joinedAt: new Date(),
      status: 'joined'
    });

    await call.save();

    res.json({
      success: true,
      message: 'Call transfer accepted'
    });

  } catch (error) {
    console.error('Error accepting call transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept call transfer'
    });
  }
});

// Decline call transfer
router.post('/:callId/transfer/decline', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId });
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is the transfer target
    if (!call.transfer || call.transfer.transferredTo.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not the transfer target'
      });
    }

    // Check if transfer is pending
    if (call.transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Transfer is not pending'
      });
    }

    // Update transfer status
    call.transfer.status = 'declined';
    call.transfer.declinedAt = new Date();

    await call.save();

    res.json({
      success: true,
      message: 'Call transfer declined'
    });

  } catch (error) {
    console.error('Error declining call transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline call transfer'
    });
  }
});

// Mute/unmute participant
router.post('/:callId/mute', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const { participantId, muted } = req.body;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId });
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is the initiator (only initiator can mute others)
    if (call.initiator.toString() !== userId && participantId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only call initiator can mute other participants'
      });
    }

    // Find participant
    const participant = call.participants.find(p => p.userId.toString() === participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Update mute status
    participant.muted = muted;
    participant.mutedAt = muted ? new Date() : null;
    participant.mutedBy = muted ? userId : null;

    await call.save();

    res.json({
      success: true,
      message: `Participant ${muted ? 'muted' : 'unmuted'} successfully`
    });

  } catch (error) {
    console.error('Error muting participant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mute participant'
    });
  }
});

// Put call on hold
router.post('/:callId/hold', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const { onHold } = req.body;
    const userId = req.user.userId;

    const call = await Call.findOne({ callId });
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is part of the call
    const isInitiator = call.initiator.toString() === userId;
    const participant = call.participants.find(p => p.userId.toString() === userId);

    if (!isInitiator && !participant) {
      return res.status(403).json({
        success: false,
        message: 'You are not part of this call'
      });
    }

    // Update hold status
    if (isInitiator) {
      call.initiatorOnHold = onHold;
    } else if (participant) {
      participant.onHold = onHold;
      participant.holdAt = onHold ? new Date() : null;
    }

    await call.save();

    res.json({
      success: true,
      message: `Call ${onHold ? 'put on hold' : 'resumed'} successfully`
    });

  } catch (error) {
    console.error('Error updating hold status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update hold status'
    });
  }
});

// Get call waiting queue
router.get('/waiting-queue', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find calls where user is being called but hasn't responded yet
    const waitingCalls = await Call.find({
      'participants.userId': userId,
      'participants.status': 'invited',
      status: { $in: ['initiated', 'ringing'] }
    })
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar')
      .populate('conversationId', 'id isGroup groupName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        waitingCalls: waitingCalls.map(call => ({
          id: call._id,
          callId: call.callId,
          conversationId: call.conversationId,
          initiator: call.initiator,
          participants: call.participants,
          type: call.type,
          status: call.status,
          startedAt: call.startedAt
        }))
      }
    });

  } catch (error) {
    console.error('Error getting waiting queue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get waiting queue'
    });
  }
});

// Get call statistics
router.get('/stats', authenticateTokenStrict, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { period = '30d' } = req.query;

    // Calculate date range
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get all calls for the user in the period
    const calls = await Call.find({
      $or: [
        { initiator: userId },
        { 'participants.userId': userId }
      ],
      createdAt: { $gte: startDate }
    });

    // Calculate statistics
    const totalCalls = calls.length;
    const completedCalls = calls.filter(call => call.status === 'ended' && call.duration > 0).length;
    const missedCalls = calls.filter(call => {
      const userParticipant = call.participants.find(p => p.userId.toString() === userId);
      return call.status === 'missed' || (userParticipant && userParticipant.status === 'missed');
    }).length;
    const declinedCalls = calls.filter(call => {
      const userParticipant = call.participants.find(p => p.userId.toString() === userId);
      return call.status === 'declined' || (userParticipant && userParticipant.status === 'declined');
    }).length;

    const totalDuration = calls
      .filter(call => call.duration > 0)
      .reduce((sum, call) => sum + call.duration, 0);

    const averageDuration = completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0;

    // Call type breakdown
    const audioCalls = calls.filter(call => call.type === 'audio').length;
    const videoCalls = calls.filter(call => call.type === 'video').length;

    // Calls by day (for charts)
    const callsByDay = {};
    const currentDate = new Date(startDate);
    while (currentDate <= new Date()) {
      const dateKey = currentDate.toISOString().split('T')[0];
      callsByDay[dateKey] = {
        date: dateKey,
        total: 0,
        completed: 0,
        missed: 0,
        audio: 0,
        video: 0
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    calls.forEach(call => {
      const dateKey = call.createdAt.toISOString().split('T')[0];
      if (callsByDay[dateKey]) {
        callsByDay[dateKey].total++;
        if (call.status === 'ended' && call.duration > 0) {
          callsByDay[dateKey].completed++;
        }
        const userParticipant = call.participants.find(p => p.userId.toString() === userId);
        if (call.status === 'missed' || (userParticipant && userParticipant.status === 'missed')) {
          callsByDay[dateKey].missed++;
        }
        if (call.type === 'audio') {
          callsByDay[dateKey].audio++;
        } else {
          callsByDay[dateKey].video++;
        }
      }
    });

    // Quality statistics
    const callsWithQuality = calls.filter(call => call.quality && call.quality.audioQuality);
    const averageAudioQuality = callsWithQuality.length > 0
      ? callsWithQuality.reduce((sum, call) => sum + call.quality.audioQuality, 0) / callsWithQuality.length
      : 0;
    const averageVideoQuality = callsWithQuality.length > 0
      ? callsWithQuality.reduce((sum, call) => sum + (call.quality.videoQuality || 0), 0) / callsWithQuality.length
      : 0;
    const averageConnectionQuality = callsWithQuality.length > 0
      ? callsWithQuality.reduce((sum, call) => sum + (call.quality.connectionQuality || 0), 0) / callsWithQuality.length
      : 0;

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalCalls,
          completedCalls,
          missedCalls,
          declinedCalls,
          totalDuration,
          averageDuration,
          audioCalls,
          videoCalls,
          completionRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0,
          missedRate: totalCalls > 0 ? Math.round((missedCalls / totalCalls) * 100) : 0
        },
        quality: {
          averageAudioQuality: Math.round(averageAudioQuality * 10) / 10,
          averageVideoQuality: Math.round(averageVideoQuality * 10) / 10,
          averageConnectionQuality: Math.round(averageConnectionQuality * 10) / 10,
          totalRatedCalls: callsWithQuality.length
        },
        timeline: Object.values(callsByDay)
      }
    });

  } catch (error) {
    console.error('Error getting call statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get call statistics'
    });
  }
});

// Invite participants to an existing call (moderator feature)
router.post('/:callId/invite', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const { userIds } = req.body; // array of user IDs to invite
    const initiatorId = req.user.userId;

    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds must be a non-empty array'
      });
    }

    // Find the call
    const call = await Call.findById(callId)
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if caller is a moderator
    const callerParticipant = call.participants.find(p => p.userId.id === initiatorId);
    const isModerator = callerParticipant && callerParticipant.role === 'moderator';

    if (!isModerator) {
      return res.status(403).json({
        success: false,
        message: 'Only moderators can invite participants to this call'
      });
    }

    // Check if call is locked
    if (call.locked) {
      return res.status(403).json({
        success: false,
        message: 'Call is locked, cannot invite new participants'
      });
    }

    // Find the conversation to verify users are participants
    const conversation = await Conversation.findById(call.conversationId)
      .populate('participants', 'id displayName avatar isOnline');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Filter valid user IDs (must be conversation participants and not already in call)
    const validUserIds = userIds.filter(userId =>
      conversation.participants.some(p => p.id === userId) &&
      !call.participants.some(p => p.userId.id === userId) &&
      userId !== initiatorId
    );

    if (validUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid users to invite (users must be conversation participants and not already in the call)'
      });
    }

    // Add new participants to the call
    const newParticipants = validUserIds.map(userId => ({
      userId,
      status: 'invited'
    }));

    call.participants.push(...newParticipants);
    await call.save();

    // Populate the new participants
    await call.populate([
      { path: 'participants.userId', select: 'id displayName avatar' }
    ]);

    // Emit call invitation to new participants
    const io = req.app.get('io');
    if (io) {
      validUserIds.forEach(userId => {
        io.to(`user_${userId}`).emit('call:incoming', {
          call: {
            id: call._id,
            callId: call.callId,
            conversationId: call.conversationId,
            initiator: call.initiator,
            type: call.type,
            status: call.status,
            startedAt: call.startedAt
          }
        });
      });
    }

    res.json({
      success: true,
      message: 'Participants invited successfully',
      data: {
        call: {
          id: call._id,
          callId: call.callId,
          conversationId: call.conversationId,
          initiator: call.initiator,
          participants: call.participants,
          type: call.type,
          status: call.status,
          startedAt: call.startedAt
        },
        invitedUsers: validUserIds
      }
    });

  } catch (error) {
    console.error('Error inviting participants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invite participants'
    });
  }
});

// Remove participant from call (moderator feature)
router.post('/:callId/remove', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const { userId } = req.body; // user ID to remove
    const initiatorId = req.user.userId;

    // Validate input
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Find the call
    const call = await Call.findById(callId)
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if caller is a moderator
    const callerParticipant = call.participants.find(p => p.userId.id === initiatorId);
    const isModerator = callerParticipant && callerParticipant.role === 'moderator';

    if (!isModerator) {
      return res.status(403).json({
        success: false,
        message: 'Only moderators can remove participants'
      });
    }

    // Cannot remove yourself
    if (userId === initiatorId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove yourself from the call'
      });
    }

    // Find and remove the participant
    const participantIndex = call.participants.findIndex(p => p.userId.id === userId);
    if (participantIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User is not a participant in this call'
      });
    }

    const removedParticipant = call.participants.splice(participantIndex, 1)[0];
    removedParticipant.leftAt = new Date();
    removedParticipant.status = 'removed';

    // Add back as removed for history
    call.participants.push(removedParticipant);

    await call.save();

    // Emit to all participants that user was removed
    const io = req.app.get('io');
    if (io) {
      const allParticipantIds = [call.initiator.id, ...call.participants.map(p => p.userId.id)];
      allParticipantIds.forEach(participantId => {
        if (participantId !== userId) {
          io.to(`user_${participantId}`).emit('call:participant-removed', {
            callId: call.callId,
            removedUserId: userId,
            call: {
              id: call._id,
              status: call.status,
              participants: call.participants
            }
          });
        }
      });

      // Notify the removed user
      io.to(`user_${userId}`).emit('call:removed', {
        callId: call.callId,
        call: {
          id: call._id,
          status: call.status
        }
      });
    }

    res.json({
      success: true,
      message: 'Participant removed successfully',
      data: {
        call: {
          id: call._id,
          callId: call.callId,
          conversationId: call.conversationId,
          initiator: call.initiator,
          participants: call.participants,
          type: call.type,
          status: call.status,
          startedAt: call.startedAt
        },
        removedUserId: userId
      }
    });

  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove participant'
    });
  }
});

// Mute all participants (moderator feature)
router.post('/:callId/mute-all', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const moderatorId = req.user.userId;

    // Find the call
    const call = await Call.findById(callId)
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is a moderator
    const moderatorParticipant = call.participants.find(p => p.userId.id === moderatorId);
    if (!moderatorParticipant || moderatorParticipant.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Only moderators can mute all participants'
      });
    }

    // Mute all participants except the moderator
    call.participants.forEach(participant => {
      if (participant.userId.id !== moderatorId && participant.status === 'joined') {
        participant.muted = true;
        participant.mutedAt = new Date();
        participant.mutedBy = moderatorId;
      }
    });

    await call.save();

    // Emit mute all event to all participants
    const io = req.app.get('io');
    if (io) {
      const allParticipantIds = [call.initiator.id, ...call.participants.map(p => p.userId.id)];
      allParticipantIds.forEach(participantId => {
        io.to(`user_${participantId}`).emit('call:mute-all', {
          callId: call.callId,
          mutedBy: moderatorId,
          call: {
            id: call._id,
            participants: call.participants
          }
        });
      });
    }

    res.json({
      success: true,
      message: 'All participants muted successfully',
      data: {
        call: {
          id: call._id,
          callId: call.callId,
          participants: call.participants
        }
      }
    });

  } catch (error) {
    console.error('Error muting all participants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mute all participants'
    });
  }
});

// Promote participant to moderator
router.post('/:callId/promote', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const { userId } = req.body;
    const moderatorId = req.user.userId;

    // Validate input
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Find the call
    const call = await Call.findById(callId)
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if requester is a moderator
    const requesterParticipant = call.participants.find(p => p.userId.id === moderatorId);
    if (!requesterParticipant || requesterParticipant.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Only moderators can promote participants'
      });
    }

    // Find the target participant
    const targetParticipant = call.participants.find(p => p.userId.id === userId);
    if (!targetParticipant) {
      return res.status(404).json({
        success: false,
        message: 'User is not a participant in this call'
      });
    }

    // Promote to moderator
    targetParticipant.role = 'moderator';
    await call.save();

    // Emit promotion event
    const io = req.app.get('io');
    if (io) {
      const allParticipantIds = [call.initiator.id, ...call.participants.map(p => p.userId.id)];
      allParticipantIds.forEach(participantId => {
        io.to(`user_${participantId}`).emit('call:participant-promoted', {
          callId: call.callId,
          promotedUserId: userId,
          promotedBy: moderatorId,
          call: {
            id: call._id,
            participants: call.participants
          }
        });
      });
    }

    res.json({
      success: true,
      message: 'Participant promoted to moderator successfully',
      data: {
        call: {
          id: call._id,
          callId: call.callId,
          participants: call.participants
        },
        promotedUserId: userId
      }
    });

  } catch (error) {
    console.error('Error promoting participant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to promote participant'
    });
  }
});

// Lock call (prevent new participants from joining)
router.post('/:callId/lock', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const moderatorId = req.user.userId;

    // Find the call
    const call = await Call.findById(callId)
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is a moderator
    const moderatorParticipant = call.participants.find(p => p.userId.id === moderatorId);
    if (!moderatorParticipant || moderatorParticipant.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Only moderators can lock the call'
      });
    }

    // Lock the call
    call.locked = true;
    await call.save();

    // Emit lock event
    const io = req.app.get('io');
    if (io) {
      const allParticipantIds = [call.initiator.id, ...call.participants.map(p => p.userId.id)];
      allParticipantIds.forEach(participantId => {
        io.to(`user_${participantId}`).emit('call:locked', {
          callId: call.callId,
          lockedBy: moderatorId,
          call: {
            id: call._id,
            locked: call.locked
          }
        });
      });
    }

    res.json({
      success: true,
      message: 'Call locked successfully',
      data: {
        call: {
          id: call._id,
          callId: call.callId,
          locked: call.locked
        }
      }
    });

  } catch (error) {
    console.error('Error locking call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lock call'
    });
  }
});

// Unlock call
router.post('/:callId/unlock', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const moderatorId = req.user.userId;

    // Find the call
    const call = await Call.findById(callId)
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is a moderator
    const moderatorParticipant = call.participants.find(p => p.userId.id === moderatorId);
    if (!moderatorParticipant || moderatorParticipant.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Only moderators can unlock the call'
      });
    }

    // Unlock the call
    call.locked = false;
    await call.save();

    // Emit unlock event
    const io = req.app.get('io');
    if (io) {
      const allParticipantIds = [call.initiator.id, ...call.participants.map(p => p.userId.id)];
      allParticipantIds.forEach(participantId => {
        io.to(`user_${participantId}`).emit('call:unlocked', {
          callId: call.callId,
          unlockedBy: moderatorId,
          call: {
            id: call._id,
            locked: call.locked
          }
        });
      });
    }

    res.json({
      success: true,
      message: 'Call unlocked successfully',
      data: {
        call: {
          id: call._id,
          callId: call.callId,
          locked: call.locked
        }
      }
    });

  } catch (error) {
    console.error('Error unlocking call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock call'
    });
  }
});

// End call for all participants (moderator feature)
router.post('/:callId/end-all', authenticateTokenStrict, async (req, res) => {
  try {
    const { callId } = req.params;
    const moderatorId = req.user.userId;

    // Find the call
    const call = await Call.findById(callId)
      .populate('initiator', 'id displayName avatar')
      .populate('participants.userId', 'id displayName avatar');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is a moderator
    const moderatorParticipant = call.participants.find(p => p.userId.id === moderatorId);
    if (!moderatorParticipant || moderatorParticipant.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Only moderators can end the call for all participants'
      });
    }

    // End the call
    call.status = 'ended';
    call.endedAt = new Date();
    call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);

    await call.save();

    // Emit end call event to all participants
    const io = req.app.get('io');
    if (io) {
      const allParticipantIds = [call.initiator.id, ...call.participants.map(p => p.userId.id)];
      allParticipantIds.forEach(participantId => {
        io.to(`user_${participantId}`).emit('call:ended', {
          callId: call.callId,
          endedBy: moderatorId,
          reason: 'ended_by_moderator',
          call: {
            id: call._id,
            status: call.status,
            endedAt: call.endedAt,
            duration: call.duration
          }
        });
      });
    }

    res.json({
      success: true,
      message: 'Call ended for all participants successfully',
      data: {
        call: {
          id: call._id,
          callId: call.callId,
          status: call.status,
          endedAt: call.endedAt,
          duration: call.duration
        }
      }
    });

  } catch (error) {
    console.error('Error ending call for all:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end call for all participants'
    });
  }
});

module.exports = router;