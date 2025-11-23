const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('./auth');
const { DAO, Proposal, User } = require('../models');
const daoService = require('../services/daoService');

// DAO and Proposal models are imported from ../models

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DAO service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// @route   GET /api/dao/proposals
// @desc    Get all proposals
// @access  Public
router.get('/proposals', async (req, res) => {
  try {
    const { limit = 20, page = 1, status, search, daoId } = req.query;
    
    // Build query
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (daoId) {
      query.daoId = daoId;
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get proposals from database
    const proposals = await Proposal.find(query)
      .populate('daoId', 'name symbol logo')
      .populate('proposerId', 'username displayName avatar isVerified walletAddress')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    // Get total count
    const total = await Proposal.countDocuments(query);
    
    // Transform data for compatibility
    const transformedProposals = proposals.map(proposal => ({
      ...proposal,
      id: proposal._id,
      dao: {
        id: proposal.daoId._id,
        name: proposal.daoId.name,
        symbol: proposal.daoId.symbol,
        logo: proposal.daoId.logo
      },
      proposer: {
        id: proposal.proposerId._id,
        username: proposal.proposerId.username,
        displayName: proposal.proposerId.displayName,
        avatar: proposal.proposerId.avatar,
        isVerified: proposal.proposerId.isVerified,
        walletAddress: proposal.proposerId.walletAddress
      },
      votesFor: proposal.votes.for,
      votesAgainst: proposal.votes.against,
      votesAbstain: proposal.votes.abstain,
      totalVotes: proposal.votes.for + proposal.votes.against + proposal.votes.abstain
    }));

    res.json({
      success: true,
      data: { 
        proposals: transformedProposals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
    });
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get proposals',
      message: error.message,
    });
  }
});

// @route   GET /api/dao/verify-membership/:contractAddress
// @desc    Verify if a user is a member of a DAO
// @access  Private
router.get('/verify-membership/:contractAddress', authenticateToken, async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { networkId = 1 } = req.query;
    
    // Get user wallet address
    const user = await User.findById(req.user.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'User has no connected wallet',
      });
    }
    
    // Verify membership on blockchain
    const isMember = await daoService.verifyDAOMembership(
      user.walletAddress,
      contractAddress,
      parseInt(networkId)
    );
    
    // Get voting power if member
    let votingPower = '0';
    if (isMember) {
      votingPower = await daoService.getMemberVotingPower(
        user.walletAddress,
        contractAddress,
        parseInt(networkId)
      );
    }
    
    res.json({
      success: true,
      data: {
        isMember,
        votingPower
      }
    });
  } catch (error) {
    console.error('Verify DAO membership error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify DAO membership',
      message: error.message,
    });
  }
});

// @route   GET /api/dao/sync/:contractAddress
// @desc    Sync DAO data from blockchain
// @access  Private
router.get('/sync/:contractAddress', authenticateToken, async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { networkId = 1 } = req.query;
    
    // Sync DAO from blockchain
    const dao = await daoService.syncDAOFromBlockchain(contractAddress, parseInt(networkId));
    
    if (!dao) {
      return res.status(404).json({
        success: false,
        error: 'Failed to sync DAO from blockchain',
      });
    }
    
    // Populate creator data
    await dao.populate('creatorId', 'username displayName avatar isVerified');
    
    const responseData = {
      ...dao.toObject(),
      id: dao._id,
      creator: dao.creatorId ? {
        id: dao.creatorId._id,
        username: dao.creatorId.username,
        displayName: dao.creatorId.displayName,
        avatar: dao.creatorId.avatar,
        isVerified: dao.creatorId.isVerified
      } : null
    };
    
    res.json({
      success: true,
      data: responseData,
      message: 'DAO synced successfully'
    });
  } catch (error) {
    console.error('Sync DAO error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync DAO',
      message: error.message,
    });
  }
});

// @route   GET /api/dao
// @desc    Get all DAOs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { limit = 20, page = 1, search } = req.query;
    
    // Build query
    let query = { isActive: true };
    
    if (search) {
      query.$text = { $search: search };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get DAOs from database
    const daos = await DAO.find(query)
      .populate('creatorId', 'username displayName avatar isVerified')
      .sort(search ? { score: { $meta: 'textScore' } } : { memberCount: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    // Get total count
    const total = await DAO.countDocuments(query);
    
    // Transform data for compatibility
    const transformedDAOs = daos.map(dao => ({
      ...dao,
      id: dao._id,
      creator: {
        id: dao.creatorId._id,
        username: dao.creatorId.username,
        displayName: dao.creatorId.displayName,
        avatar: dao.creatorId.avatar,
        isVerified: dao.creatorId.isVerified
      }
    }));

    res.json({
      success: true,
      data: { 
        daos: transformedDAOs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
    });
  } catch (error) {
    console.error('Get DAOs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get DAOs',
      message: error.message,
    });
  }
});

// @route   POST /api/dao
// @desc    Create new DAO
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      symbol,
      description,
      logo,
      contractAddress,
      tokenAddress,
      settings = {}
    } = req.body;

    // Validation
    if (!name || !symbol || !description || !contractAddress || !tokenAddress) {
      return res.status(400).json({
        success: false,
        error: 'Name, symbol, description, contract address, and token address are required',
      });
    }

    // Check if DAO with same name or symbol exists
    const existingDAO = await DAO.findOne({
      $or: [
        { name: new RegExp(`^${name}$`, 'i') },
        { symbol: symbol.toUpperCase() }
      ]
    });

    if (existingDAO) {
      return res.status(400).json({
        success: false,
        error: 'DAO with this name or symbol already exists',
      });
    }

    // Create new DAO
    const newDAO = new DAO({
      name: name.trim(),
      symbol: symbol.toUpperCase().trim(),
      description: description.trim(),
      logo,
      contractAddress,
      tokenAddress,
      creatorId: req.user.userId,
      memberCount: 1, // Creator is first member
      settings: {
        minProposalStake: settings.minProposalStake || 1000,
        votingPeriod: settings.votingPeriod || 7,
        quorumPercentage: settings.quorumPercentage || 10,
        executionDelay: settings.executionDelay || 2
      }
    });

    await newDAO.save();

    // Populate creator data
    await newDAO.populate('creatorId', 'username displayName avatar isVerified');

    const responseData = {
      ...newDAO.toObject(),
      id: newDAO._id,
      creator: {
        id: newDAO.creatorId._id,
        username: newDAO.creatorId.username,
        displayName: newDAO.creatorId.displayName,
        avatar: newDAO.creatorId.avatar,
        isVerified: newDAO.creatorId.isVerified
      }
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'DAO created successfully'
    });
  } catch (error) {
    console.error('Create DAO error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create DAO',
      message: error.message,
    });
  }
});

// @route   POST /api/dao/:id/proposals/:proposalId/blockchain
// @desc    Create proposal on blockchain
// @access  Private
router.post('/:id/proposals/:proposalId/blockchain', authenticateToken, async (req, res) => {
  try {
    const { id, proposalId } = req.params;
    const { networkId = 1 } = req.body;
    
    // Check if DAO exists
    const dao = await DAO.findById(id);
    if (!dao) {
      return res.status(404).json({
        success: false,
        error: 'DAO not found',
      });
    }
    
    // Check if proposal exists
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found',
      });
    }
    
    // Get user
    const user = await User.findById(req.user.userId);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'User has no connected wallet',
      });
    }
    
    // For demo purposes, we're not using private keys
    // In production, you would use a signing service or ask user to sign transaction
    const result = await daoService.createProposalOnBlockchain(
      id,
      proposal.title,
      proposal.description,
      JSON.stringify(proposal.executionData),
      'DEMO_PRIVATE_KEY', // This would be handled differently in production
      parseInt(networkId)
    );
    
    if (result.success) {
      // Update proposal with blockchain data
      proposal.onChainId = result.proposalId;
      proposal.transactionHash = result.transactionHash;
      proposal.networkId = parseInt(networkId);
      await proposal.save();
      
      res.json({
        success: true,
        data: {
          proposalId: proposal._id,
          onChainId: proposal.onChainId,
          transactionHash: proposal.transactionHash
        },
        message: 'Proposal created on blockchain successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to create proposal on blockchain'
      });
    }
  } catch (error) {
    console.error('Create proposal on blockchain error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create proposal on blockchain',
      message: error.message,
    });
  }
});

// @route   POST /api/dao/:id/proposals
// @desc    Create new proposal
// @access  Private
router.post('/:id/proposals', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      type,
      executionData = {}
    } = req.body;

    // Validation
    if (!title || !description || !type) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, and type are required',
      });
    }

    // Check if DAO exists
    const dao = await DAO.findById(id);
    if (!dao) {
      return res.status(404).json({
        success: false,
        error: 'DAO not found',
      });
    }

    // Create new proposal
    const newProposal = new Proposal({
      daoId: id,
      proposerId: req.user.userId,
      title: title.trim(),
      description: description.trim(),
      type,
      quorum: dao.settings.quorumPercentage,
      status: 'active', // Set to active immediately for blockchain integration
      executionData
    });
    
    // If DAO has a contract address, create proposal on blockchain
    let onChainProposalId = null;
    let transactionHash = null;
    
    if (dao.contractAddress && req.body.createOnChain) {
      // Get user
      const user = await User.findById(req.user.userId);
      if (!user || !user.walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'User has no connected wallet',
        });
      }
      
      // For demo purposes, we're not using private keys
      // In production, you would use a signing service or ask user to sign transaction
      // This is just a placeholder for the integration
      const result = await daoService.createProposalOnBlockchain(
        id,
        title,
        description,
        JSON.stringify(executionData),
        'DEMO_PRIVATE_KEY', // This would be handled differently in production
        req.body.networkId || 1
      );
      
      if (result.success) {
        onChainProposalId = result.proposalId;
        transactionHash = result.transactionHash;
        newProposal.onChainId = onChainProposalId;
        newProposal.transactionHash = transactionHash;
      }
    }

    await newProposal.save();

    // Update DAO proposal count
    await DAO.findByIdAndUpdate(id, { $inc: { proposalCount: 1 } });

    // Populate data
    await newProposal.populate([
      { path: 'daoId', select: 'name symbol logo' },
      { path: 'proposerId', select: 'username displayName avatar isVerified walletAddress' }
    ]);

    const responseData = {
      ...newProposal.toObject(),
      id: newProposal._id,
      dao: {
        id: newProposal.daoId._id,
        name: newProposal.daoId.name,
        symbol: newProposal.daoId.symbol,
        logo: newProposal.daoId.logo
      },
      proposer: {
        id: newProposal.proposerId._id,
        username: newProposal.proposerId.username,
        displayName: newProposal.proposerId.displayName,
        avatar: newProposal.proposerId.avatar,
        isVerified: newProposal.proposerId.isVerified,
        walletAddress: newProposal.proposerId.walletAddress
      },
      votesFor: newProposal.votes.for,
      votesAgainst: newProposal.votes.against,
      votesAbstain: newProposal.votes.abstain,
      totalVotes: 0
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: 'Proposal created successfully'
    });
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create proposal',
      message: error.message,
    });
  }
});

// @route   POST /api/dao/proposals/:id/vote
// @desc    Vote on proposal
// @access  Private
router.post('/proposals/:id/vote', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { vote, votingPower = 1 } = req.body;

    // Validation
    if (!['for', 'against', 'abstain'].includes(vote)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vote option',
      });
    }

    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found',
      });
    }

    // Check if proposal is active
    if (proposal.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Proposal is not active for voting',
      });
    }

    // Check if user already voted
    const existingVote = proposal.voters.find(
      voter => voter.userId.toString() === req.user.userId
    );

    if (existingVote) {
      return res.status(400).json({
        success: false,
        error: 'User has already voted on this proposal',
      });
    }

    // Add vote
    proposal.voters.push({
      userId: req.user.userId,
      vote,
      votingPower: parseInt(votingPower),
      timestamp: new Date()
    });

    // Update vote counts
    proposal.votes[vote] += parseInt(votingPower);
    
    // If proposal has onChainId, vote on blockchain
    let transactionHash = null;
    if (proposal.onChainId && req.body.voteOnChain) {
      // Get user
      const user = await User.findById(req.user.userId);
      if (user && user.walletAddress) {
        // For demo purposes, we're not using private keys
        // In production, you would use a signing service or ask user to sign transaction
        const result = await daoService.voteOnProposalOnBlockchain(
          proposal._id,
          vote,
          'DEMO_PRIVATE_KEY', // This would be handled differently in production
          req.body.networkId || 1
        );
        
        if (result.success) {
          transactionHash = result.transactionHash;
          proposal.voteTransactionHashes = proposal.voteTransactionHashes || [];
          proposal.voteTransactionHashes.push({
            userId: req.user.userId,
            transactionHash
          });
        }
      }
    }

    await proposal.save();

    res.json({
      success: true,
      data: {
        votesFor: proposal.votes.for,
        votesAgainst: proposal.votes.against,
        votesAbstain: proposal.votes.abstain,
        totalVotes: proposal.votes.for + proposal.votes.against + proposal.votes.abstain,
        userVote: vote
      },
      message: 'Vote recorded successfully'
    });
  } catch (error) {
    console.error('Vote on proposal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record vote',
      message: error.message,
    });
  }
});

module.exports = router;
