const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  callId: {
    type: String,
    required: true,
    unique: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date
    },
    leftAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['invited', 'joined', 'declined', 'missed', 'left', 'seen', 'removed'],
      default: 'invited'
    },
    role: {
      type: String,
      enum: ['participant', 'moderator'],
      default: 'participant'
    },
    muted: {
      type: Boolean,
      default: false
    },
    mutedAt: Date,
    mutedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    onHold: {
      type: Boolean,
      default: false
    },
    holdAt: Date
  }],
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'active', 'ended', 'missed', 'declined'],
    default: 'initiated'
  },
  locked: {
    type: Boolean,
    default: false
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  initiatorOnHold: {
    type: Boolean,
    default: false
  },
  // WebRTC related data
  offer: {
    type: Object
  },
  answer: {
    type: Object
  },
  iceCandidates: [{
    candidate: Object,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Call quality metrics
  quality: {
    audioQuality: Number,
    videoQuality: Number,
    connectionQuality: Number,
    feedback: String
  },
  // Call recording information
  recording: {
    isRecording: {
      type: Boolean,
      default: false
    },
    recordingId: String,
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    stoppedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    startedAt: Date,
    stoppedAt: Date,
    duration: Number, // in seconds
    fileUrl: String,
    fileSize: Number // in bytes
  },
  // Call transfer information
  transfer: {
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    transferredTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    transferredAt: Date,
    acceptedAt: Date,
    declinedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
callSchema.index({ conversationId: 1, createdAt: -1 });
callSchema.index({ initiator: 1, createdAt: -1 });
callSchema.index({ 'participants.userId': 1, createdAt: -1 });
callSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Call', callSchema);