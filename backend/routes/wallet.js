const express = require('express');
const router = express.Router();
const { User } = require('../models');
const walletService = require('../services/walletService');
const web3Service = require('../services/web3Service');

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

// @route   GET /api/wallet/balance
// @desc    Get wallet balance and portfolio
// @access  Private
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'No wallet address associated with this account'
      });
    }

    // Get wallet balance and portfolio
    const portfolio = await walletService.getWalletPortfolio(user.walletAddress);
    
    res.json({
      success: true,
      data: {
        walletAddress: user.walletAddress,
        ...portfolio
      }
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance'
    });
  }
});

// @route   GET /api/wallet/transactions
// @desc    Get wallet transaction history
// @access  Private
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'No wallet address found'
      });
    }

    const transactions = await walletService.getTransactionHistory(
      user.walletAddress,
      { page: parseInt(page), limit: parseInt(limit), type }
    );

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history'
    });
  }
});

// @route   GET /api/wallet/tokens
// @desc    Get wallet token balances
// @access  Private
router.get('/tokens', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'No wallet address found'
      });
    }

    const tokens = await walletService.getTokenBalances(user.walletAddress);

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Error fetching token balances:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch token balances'
    });
  }
});

// @route   GET /api/wallet/nfts
// @desc    Get wallet NFT collection
// @access  Private
router.get('/nfts', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'No wallet address found'
      });
    }

    const nfts = await walletService.getNFTCollection(
      user.walletAddress,
      { page: parseInt(page), limit: parseInt(limit) }
    );

    res.json({
      success: true,
      data: nfts
    });
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch NFT collection'
    });
  }
});

// @route   POST /api/wallet/send
// @desc    Send cryptocurrency
// @access  Private
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { to, amount, token, gasPrice } = req.body;
    
    if (!to || !amount || !token) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, amount, token'
      });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'No wallet address found'
      });
    }

    // Validate transaction
    const validation = await walletService.validateTransaction({
      from: user.walletAddress,
      to,
      amount,
      token,
      gasPrice
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    // Create transaction (this would typically require user's private key or signature)
    const transaction = await walletService.createTransaction({
      from: user.walletAddress,
      to,
      amount,
      token,
      gasPrice: gasPrice || validation.suggestedGasPrice
    });

    res.json({
      success: true,
      data: {
        transactionHash: transaction.hash,
        status: 'pending',
        gasUsed: transaction.gasUsed,
        gasPrice: transaction.gasPrice
      }
    });
  } catch (error) {
    console.error('Error sending transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send transaction'
    });
  }
});

// @route   GET /api/wallet/gas-estimate
// @desc    Get gas estimate for transaction
// @access  Private
router.get('/gas-estimate', authenticateToken, async (req, res) => {
  try {
    const { to, amount, token } = req.query;
    
    if (!to || !amount || !token) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: to, amount, token'
      });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'No wallet address found'
      });
    }

    const gasEstimate = await walletService.estimateGas({
      from: user.walletAddress,
      to,
      amount,
      token
    });

    res.json({
      success: true,
      data: gasEstimate
    });
  } catch (error) {
    console.error('Error estimating gas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to estimate gas'
    });
  }
});

// @route   POST /api/wallet/import-nft
// @desc    Import NFT to wallet
// @access  Private
router.post('/import-nft', authenticateToken, async (req, res) => {
  try {
    const { contractAddress, tokenId, networkId = 1 } = req.body;
    
    if (!contractAddress || !tokenId) {
      return res.status(400).json({
        success: false,
        message: 'Contract address and token ID are required'
      });
    }

    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'No wallet address found'
      });
    }

    // Verify ownership
    const isOwner = await web3Service.verifyNFTOwnership(
      user.walletAddress,
      tokenId,
      contractAddress,
      networkId
    );

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this NFT'
      });
    }

    // Sync NFT from blockchain
    const nft = await web3Service.syncNFTFromBlockchain(tokenId, contractAddress, networkId);
    
    if (!nft) {
      return res.status(500).json({
        success: false,
        message: 'Failed to import NFT'
      });
    }

    res.json({
      success: true,
      data: nft,
      message: 'NFT imported successfully'
    });
  } catch (error) {
    console.error('Error importing NFT:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import NFT'
    });
  }
});

// @route   GET /api/wallet/defi-positions
// @desc    Get DeFi positions and yields
// @access  Private
router.get('/defi-positions', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'No wallet address found'
      });
    }

    const defiPositions = await walletService.getDeFiPositions(user.walletAddress);

    res.json({
      success: true,
      data: defiPositions
    });
  } catch (error) {
    console.error('Error fetching DeFi positions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch DeFi positions'
    });
  }
});

// @route   POST /api/wallet/refresh
// @desc    Refresh wallet data from blockchain
// @access  Private
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'No wallet address found'
      });
    }

    // Refresh all wallet data
    await walletService.refreshWalletData(user.walletAddress);

    res.json({
      success: true,
      message: 'Wallet data refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing wallet data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh wallet data'
    });
  }
});

module.exports = router;