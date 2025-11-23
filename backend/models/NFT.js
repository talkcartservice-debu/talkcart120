const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NFTSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    enum: ['ETH', 'MATIC', 'BNB', 'USDC', 'USDT'],
    default: 'ETH',
  },
  collectionName: {
    type: String,
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  tokenId: {
    type: String,
    sparse: true,
  },
  contractAddress: {
    type: String,
    sparse: true,
  },
  blockchain: {
    type: String,
    enum: ['ethereum', 'polygon', 'binance', 'arbitrum'],
    default: 'ethereum',
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
    default: 'common',
  },
  attributes: [
    {
      trait_type: String,
      value: String,
    },
  ],
  status: {
    type: String,
    enum: ['draft', 'minting', 'minted', 'listed', 'sold'],
    default: 'draft',
  },
  mintTxHash: {
    type: String,
    sparse: true,
  },
  listingTxHash: {
    type: String,
    sparse: true,
  },
  saleTxHash: {
    type: String,
    sparse: true,
  },
}, { timestamps: true });

// Create a compound index for tokenId and contractAddress
NFTSchema.index({ tokenId: 1, contractAddress: 1 }, { unique: true, sparse: true });

// Static method to find NFTs by owner
NFTSchema.statics.findByOwner = function(ownerId) {
  return this.find({ owner: ownerId }).sort({ createdAt: -1 });
};

// Static method to find NFTs by creator
NFTSchema.statics.findByCreator = function(creatorId) {
  return this.find({ creator: creatorId }).sort({ createdAt: -1 });
};

// Static method to find NFTs by collection
NFTSchema.statics.findByCollection = function(collectionName) {
  return this.find({ collectionName }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('NFT', NFTSchema);