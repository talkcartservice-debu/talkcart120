const mongoose = require('mongoose');

// Liquidity Pool Schema
const liquidityPoolSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  protocol: { type: String, required: true },
  apy: { type: Number, required: true },
  tvl: { type: Number, required: true },
  risk: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  logo: { type: String, required: true },
  contractAddress: { type: String, required: true },
  networkId: { type: Number, default: 1 },
  tokens: [{
    symbol: String,
    address: String,
    decimals: Number
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Lending Pool Schema
const lendingPoolSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  asset: { type: String, required: true },
  supplyApy: { type: Number, required: true },
  borrowApy: { type: Number, required: true },
  collateralFactor: { type: Number, required: true },
  risk: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  logo: { type: String, required: true },
  contractAddress: { type: String, required: true },
  networkId: { type: Number, default: 1 },
  totalSupplied: { type: Number, default: 0 },
  totalBorrowed: { type: Number, default: 0 },
  utilizationRate: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Yield Farm Schema
const yieldFarmSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  apy: { type: Number, required: true },
  multiplier: { type: String, required: true },
  totalStaked: { type: Number, default: 0 },
  risk: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  logo: { type: String, required: true },
  contractAddress: { type: String, required: true },
  networkId: { type: Number, default: 1 },
  rewardToken: {
    symbol: String,
    address: String,
    decimals: Number
  },
  stakingToken: {
    symbol: String,
    address: String,
    decimals: Number
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User DeFi Position Schema
const userDefiPositionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  walletAddress: { type: String, required: true },
  
  // Liquidity Pool Positions
  liquidityPositions: [{
    poolId: String,
    userStaked: { type: Number, default: 0 },
    userEarned: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }],
  
  // Lending Positions
  lendingPositions: [{
    poolId: String,
    supplied: { type: Number, default: 0 },
    borrowed: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }],
  
  // Yield Farm Positions
  farmPositions: [{
    farmId: String,
    userStaked: { type: Number, default: 0 },
    pendingRewards: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }],
  
  // Portfolio Summary
  totalValueLocked: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// DeFi Transaction Schema
const defiTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  walletAddress: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['stake', 'unstake', 'supply', 'withdraw', 'borrow', 'repay', 'harvest', 'swap'],
    required: true 
  },
  protocol: { type: String, required: true },
  poolId: { type: String, required: true },
  amount: { type: Number, required: true },
  token: { type: String, required: true },
  txHash: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  gasUsed: { type: Number },
  gasFee: { type: Number },
  networkId: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create models
const LiquidityPool = mongoose.model('LiquidityPool', liquidityPoolSchema);
const LendingPool = mongoose.model('LendingPool', lendingPoolSchema);
const YieldFarm = mongoose.model('YieldFarm', yieldFarmSchema);
const UserDefiPosition = mongoose.model('UserDefiPosition', userDefiPositionSchema);
const DefiTransaction = mongoose.model('DefiTransaction', defiTransactionSchema);

module.exports = {
  LiquidityPool,
  LendingPool,
  YieldFarm,
  UserDefiPosition,
  DefiTransaction
};