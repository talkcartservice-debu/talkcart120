const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { LiquidityPool, LendingPool, YieldFarm, UserDefiPosition, DefiTransaction } = require('../models/DeFi');
const defiService = require('../services/defiService');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
    });
  }

  // Allow mock tokens for testing
  if (token.startsWith('mock-token-')) {
    const userId = token.replace('mock-token-', '');
    req.userId = userId;
    return next();
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
    req.userId = decoded.userId;
    next();
  });
};

// @route   GET /api/defi/pools
// @desc    Get all DeFi pools (liquidity, lending, yield farms)
// @access  Public
router.get('/pools', async (req, res) => {
  try {
    const [liquidityPools, lendingPools, yieldFarms] = await Promise.all([
      LiquidityPool.find({ isActive: true }).sort({ tvl: -1 }),
      LendingPool.find({ isActive: true }).sort({ totalSupplied: -1 }),
      YieldFarm.find({ isActive: true }).sort({ totalStaked: -1 })
    ]);

    // Get market data
    const marketData = await defiService.getMarketData();

    res.json({
      success: true,
      data: {
        liquidityPools,
        lendingPools,
        yieldFarms,
        marketData
      }
    });
  } catch (error) {
    console.error('Error fetching DeFi pools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DeFi pools'
    });
  }
});

// @route   GET /api/defi/portfolio
// @desc    Get user's DeFi portfolio
// @access  Private
router.get('/portfolio', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'User wallet not connected'
      });
    }

    // Update user positions from blockchain
    const userPosition = await defiService.updateUserPositions(req.userId, user.walletAddress);

    // Get recent transactions
    const transactions = await defiService.getUserTransactions(req.userId, 20);

    res.json({
      success: true,
      data: {
        portfolio: userPosition,
        transactions
      }
    });
  } catch (error) {
    console.error('Error fetching DeFi portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch DeFi portfolio'
    });
  }
});

// @route   POST /api/defi/stake
// @desc    Stake tokens in a pool
// @access  Private
router.post('/stake', authenticateToken, async (req, res) => {
  try {
    const { poolId, amount, poolType } = req.body;

    if (!poolId || !amount || !poolType) {
      return res.status(400).json({
        success: false,
        error: 'Pool ID, amount, and pool type are required'
      });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'User wallet not connected'
      });
    }

    // Get pool information
    let pool;
    if (poolType === 'liquidity') {
      pool = await LiquidityPool.findOne({ id: poolId, isActive: true });
    } else if (poolType === 'farm') {
      pool = await YieldFarm.findOne({ id: poolId, isActive: true });
    }

    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found'
      });
    }

    // Estimate gas for the transaction
    const gasEstimate = await defiService.estimateStakeGas(
      user.walletAddress,
      pool.contractAddress,
      amount,
      pool.networkId
    );

    res.json({
      success: true,
      data: {
        pool,
        gasEstimate,
        message: 'Ready to stake. Please confirm the transaction in your wallet.'
      }
    });
  } catch (error) {
    console.error('Error preparing stake transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to prepare stake transaction'
    });
  }
});

// @route   POST /api/defi/unstake
// @desc    Unstake tokens from a pool
// @access  Private
router.post('/unstake', authenticateToken, async (req, res) => {
  try {
    const { poolId, amount, poolType } = req.body;

    if (!poolId || !amount || !poolType) {
      return res.status(400).json({
        success: false,
        error: 'Pool ID, amount, and pool type are required'
      });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'User wallet not connected'
      });
    }

    // Get pool information
    let pool;
    if (poolType === 'liquidity') {
      pool = await LiquidityPool.findOne({ id: poolId, isActive: true });
    } else if (poolType === 'farm') {
      pool = await YieldFarm.findOne({ id: poolId, isActive: true });
    }

    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found'
      });
    }

    // Get user's current position
    const userPosition = await defiService.getUserStakingPosition(
      user.walletAddress,
      pool.contractAddress,
      pool.networkId
    );

    if (parseFloat(userPosition.staked) < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient staked balance'
      });
    }

    res.json({
      success: true,
      data: {
        pool,
        currentStaked: userPosition.staked,
        message: 'Ready to unstake. Please confirm the transaction in your wallet.'
      }
    });
  } catch (error) {
    console.error('Error preparing unstake transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to prepare unstake transaction'
    });
  }
});

// @route   POST /api/defi/harvest
// @desc    Harvest rewards from a pool
// @access  Private
router.post('/harvest', authenticateToken, async (req, res) => {
  try {
    const { poolId, poolType } = req.body;

    if (!poolId || !poolType) {
      return res.status(400).json({
        success: false,
        error: 'Pool ID and pool type are required'
      });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'User wallet not connected'
      });
    }

    // Get pool information
    let pool;
    if (poolType === 'liquidity') {
      pool = await LiquidityPool.findOne({ id: poolId, isActive: true });
    } else if (poolType === 'farm') {
      pool = await YieldFarm.findOne({ id: poolId, isActive: true });
    }

    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found'
      });
    }

    // Get user's pending rewards
    const userPosition = await defiService.getUserStakingPosition(
      user.walletAddress,
      pool.contractAddress,
      pool.networkId
    );

    if (parseFloat(userPosition.earned) === 0) {
      return res.status(400).json({
        success: false,
        error: 'No rewards to harvest'
      });
    }

    res.json({
      success: true,
      data: {
        pool,
        pendingRewards: userPosition.earned,
        message: 'Ready to harvest rewards. Please confirm the transaction in your wallet.'
      }
    });
  } catch (error) {
    console.error('Error preparing harvest transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to prepare harvest transaction'
    });
  }
});

// @route   POST /api/defi/supply
// @desc    Supply tokens to lending pool
// @access  Private
router.post('/supply', authenticateToken, async (req, res) => {
  try {
    const { poolId, amount } = req.body;

    if (!poolId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Pool ID and amount are required'
      });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'User wallet not connected'
      });
    }

    const pool = await LendingPool.findOne({ id: poolId, isActive: true });
    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Lending pool not found'
      });
    }

    res.json({
      success: true,
      data: {
        pool,
        message: 'Ready to supply. Please confirm the transaction in your wallet.'
      }
    });
  } catch (error) {
    console.error('Error preparing supply transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to prepare supply transaction'
    });
  }
});

// @route   POST /api/defi/transaction/record
// @desc    Record a completed DeFi transaction
// @access  Private
router.post('/transaction/record', authenticateToken, async (req, res) => {
  try {
    const { txHash, type, protocol, poolId, amount, token, networkId } = req.body;

    if (!txHash || !type || !protocol || !poolId || !amount || !token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required transaction data'
      });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'User wallet not connected'
      });
    }

    const transaction = await defiService.recordTransaction(req.userId, user.walletAddress, {
      type,
      protocol,
      poolId,
      amount,
      token,
      txHash,
      networkId: networkId || 1,
      status: 'pending'
    });

    res.json({
      success: true,
      data: {
        transaction,
        message: 'Transaction recorded successfully'
      }
    });
  } catch (error) {
    console.error('Error recording transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record transaction'
    });
  }
});

// @route   GET /api/defi/transactions
// @desc    Get user's DeFi transaction history
// @access  Private
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const transactions = await defiService.getUserTransactions(req.userId, limit);

    res.json({
      success: true,
      data: {
        transactions
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

module.exports = router;