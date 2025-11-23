const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  daoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DAO',
    required: true
  },
  proposerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  type: {
    type: String,
    enum: ['treasury', 'governance', 'technical', 'community'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'failed', 'cancelled'],
    default: 'draft'
  },
  votingStartTime: Date,
  votingEndTime: Date,
  executionTime: Date,
  quorum: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  votes: {
    for: { type: Number, default: 0 },
    against: { type: Number, default: 0 },
    abstain: { type: Number, default: 0 }
  },
  voters: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vote: {
      type: String,
      enum: ['for', 'against', 'abstain']
    },
    votingPower: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  executionData: {
    target: String,
    value: Number,
    data: String
  },
  // Blockchain integration fields
  onChainId: {
    type: String,
    index: true
  },
  transactionHash: String,
  voteTransactionHashes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    transactionHash: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  networkId: {
    type: Number,
    default: 1 // Default to Ethereum mainnet
  }
}, {
  timestamps: true
});

proposalSchema.index({ daoId: 1, status: 1 });
proposalSchema.index({ status: 1, votingEndTime: 1 });

module.exports = mongoose.model('Proposal', proposalSchema);