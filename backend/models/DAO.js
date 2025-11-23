const mongoose = require('mongoose');

const daoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  symbol: {
    type: String,
    required: true,
    maxlength: 10,
    uppercase: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  logo: String,
  contractAddress: {
    type: String,
    required: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  tokenAddress: {
    type: String,
    required: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  memberCount: {
    type: Number,
    default: 0,
    min: 0
  },
  proposalCount: {
    type: Number,
    default: 0,
    min: 0
  },
  treasuryValue: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    minProposalStake: { type: Number, default: 1000 },
    votingPeriod: { type: Number, default: 7 }, // days
    quorumPercentage: { type: Number, default: 10 },
    executionDelay: { type: Number, default: 2 } // days
  },
  networkId: {
    type: Number,
    default: 1, // Default to Ethereum mainnet
    enum: [1, 5, 137, 80001] // Ethereum, Goerli, Polygon, Mumbai
  }
}, {
  timestamps: true
});

daoSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('DAO', daoSchema);