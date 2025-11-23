const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const User = require('../models/User');
const NFT = require('../models/NFT');
const web3Service = require('../services/web3Service');

// Mock NFT data for development
const mockNFTs = [
  {
    id: '1',
    name: 'Cosmic Dreams #123',
    description: 'A beautiful cosmic landscape NFT',
    image: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=400&fit=crop',
    price: 0.5,
    currency: 'ETH',
    collectionName: 'Cosmic Dreams',
    owner: '6890a30f72de3fbda9b14f47', // Mock user ID
    creator: '6890a30f72de3fbda9b14f47',
    tokenId: '123',
    contractAddress: '0x1234567890123456789012345678901234567890',
    blockchain: 'ethereum',
    rarity: 'rare',
    attributes: [
      { trait_type: 'Background', value: 'Cosmic' },
      { trait_type: 'Style', value: 'Digital Art' },
      { trait_type: 'Rarity', value: 'Rare' }
    ],
    createdAt: new Date('2025-08-01T00:00:00Z'),
    updatedAt: new Date('2025-08-01T00:00:00Z'),
  },
  {
    id: '2',
    name: 'Digital Portrait #456',
    description: 'An artistic digital portrait',
    image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop',
    price: 0.3,
    currency: 'ETH',
    collectionName: 'Digital Portraits',
    owner: '6890a30f72de3fbda9b14f47', // Mock user ID
    creator: '6890a30f72de3fbda9b14f47',
    tokenId: '456',
    contractAddress: '0x1234567890123456789012345678901234567890',
    blockchain: 'ethereum',
    rarity: 'common',
    attributes: [
      { trait_type: 'Background', value: 'Abstract' },
      { trait_type: 'Style', value: 'Portrait' },
      { trait_type: 'Rarity', value: 'Common' }
    ],
    createdAt: new Date('2025-08-02T00:00:00Z'),
    updatedAt: new Date('2025-08-02T00:00:00Z'),
  },
];

// @route   GET /api/nfts
// @desc    Get all NFTs
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/nfts - Request received');
    const { limit = 20, page = 1, collection, owner, creator, useMock = false } = req.query;

    // Use mock data if requested or if database is empty
    let nfts;
    const nftCount = await NFT.countDocuments();
    
    if (useMock === 'true' || nftCount === 0) {
      console.log('Using mock NFT data');
      let filteredNFTs = [...mockNFTs];

      // Filter by collection
      if (collection) {
        filteredNFTs = filteredNFTs.filter(nft => 
          nft.collectionName.toLowerCase().includes(collection.toLowerCase())
        );
      }

      // Filter by owner
      if (owner) {
        filteredNFTs = filteredNFTs.filter(nft => nft.owner === owner);
      }

      // Filter by creator
      if (creator) {
        filteredNFTs = filteredNFTs.filter(nft => nft.creator === creator);
      }

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginatedNFTs = filteredNFTs.slice(skip, skip + parseInt(limit));

      console.log(`Found ${paginatedNFTs.length} mock NFTs (${filteredNFTs.length} total)`);

      return res.json({
        success: true,
        data: {
          nfts: paginatedNFTs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filteredNFTs.length,
            pages: Math.ceil(filteredNFTs.length / parseInt(limit)),
          },
          source: 'mock',
        },
      });
    }
    
    // Build query for real data
    const query = {};
    
    if (collection) {
      query.collectionName = new RegExp(collection, 'i');
    }
    
    if (owner) {
      query.owner = owner;
    }
    
    if (creator) {
      query.creator = creator;
    }
    
    // Get total count for pagination
    const total = await NFT.countDocuments(query);
    
    // Get paginated NFTs
    const skip = (parseInt(page) - 1) * parseInt(limit);
    nfts = await NFT.find(query)
      .populate('owner', 'username displayName avatar walletAddress')
      .populate('creator', 'username displayName avatar walletAddress')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    console.log(`Found ${nfts.length} NFTs from database (${total} total)`);
    
    res.json({
      success: true,
      data: {
        nfts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        source: 'blockchain',
      },
    });
  } catch (error) {
    console.error('Get NFTs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get NFTs',
      message: error.message,
    });
  }
});

// @route   GET /api/nfts/:id
// @desc    Get NFT by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`GET /api/nfts/${id} - Request received`);

    const nft = mockNFTs.find(nft => nft.id === id);

    if (!nft) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found',
      });
    }

    console.log(`NFT found: ${nft.name}`);

    res.json({
      success: true,
      data: nft,
    });
  } catch (error) {
    console.error('Get NFT error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get NFT',
      message: error.message,
    });
  }
});

// @route   GET /api/nfts/username/:username
// @desc    Get NFTs by username
// @access  Public
router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { limit = 20, page = 1 } = req.query;

    console.log(`GET /api/nfts/username/${username} - Request received`);

    // For now, return empty array since we don't have real NFT data
    // In a real implementation, you would:
    // 1. Find user by username
    // 2. Query NFTs from blockchain or database by user's wallet address

    const userNFTs = []; // Empty for now

    console.log(`Found ${userNFTs.length} NFTs for user ${username}`);

    res.json({
      success: true,
      data: userNFTs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: userNFTs.length,
        pages: Math.ceil(userNFTs.length / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get user NFTs by username error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user NFTs',
      message: error.message,
    });
  }
});

// @route   GET /api/nfts/user/:userId
// @desc    Get NFTs by user ID
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    console.log(`GET /api/nfts/user/${userId} - Request received`);

    // Filter NFTs by owner
    const userNFTs = mockNFTs.filter(nft => nft.owner === userId);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedNFTs = userNFTs.slice(skip, skip + parseInt(limit));

    console.log(`Found ${paginatedNFTs.length} NFTs for user ${userId} (${userNFTs.length} total)`);

    res.json({
      success: true,
      data: {
        nfts: paginatedNFTs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: userNFTs.length,
          pages: Math.ceil(userNFTs.length / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get user NFTs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user NFTs',
      message: error.message,
    });
  }
});

// @route   POST /api/nfts
// @desc    Create new NFT
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/nfts - Request received');
    const {
      name,
      description,
      image,
      price,
      currency = 'ETH',
      collection,
      tokenId,
      contractAddress,
      blockchain = 'ethereum',
      attributes = [],
      useMock = false
    } = req.body;

    // Validation
    if (!name || !description || !image) {
      return res.status(400).json({
        success: false,
        error: 'Name, description, and image are required',
      });
    }

    // Get user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Use mock data if requested
    if (useMock === 'true' || useMock === true) {
      // Create mock NFT
      const newMockNFT = {
        id: (mockNFTs.length + 1).toString(),
        name,
        description,
        image,
        price: parseFloat(price) || 0,
        currency,
        collection: collection || 'Uncategorized',
        owner: req.user.userId,
        creator: req.user.userId,
        tokenId: tokenId || (Date.now().toString()),
        contractAddress: contractAddress || '0x1234567890123456789012345678901234567890',
        blockchain,
        rarity: 'common',
        attributes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to mock data
      mockNFTs.push(newMockNFT);

      console.log(`Mock NFT created successfully: ${newMockNFT.id}`);

      return res.status(201).json({
        success: true,
        data: newMockNFT,
        message: 'NFT created successfully',
        source: 'mock'
      });
    }

    // Create real NFT in database and interact with blockchain
    const newNFT = new NFT({
      name,
      description,
      image,
      price: parseFloat(price) || 0,
      currency,
      collection: collection || 'Uncategorized',
      owner: req.user.userId,
      creator: req.user.userId,
      tokenId: tokenId || null, // Will be set after minting
      contractAddress: contractAddress || null, // Will be set after minting
      blockchain,
      rarity: 'common',
      attributes,
      status: tokenId && contractAddress ? 'minted' : 'draft',
    });

    // If tokenId and contractAddress are provided, verify on blockchain
    if (tokenId && contractAddress && user.walletAddress) {
      const isOwner = await web3Service.verifyNFTOwnership(
        user.walletAddress,
        tokenId,
        contractAddress,
        1 // Default to Ethereum mainnet
      );
      
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'You do not own this NFT on the blockchain',
        });
      }
    }

    await newNFT.save();
    console.log(`NFT created successfully in database: ${newNFT._id}`);

    res.status(201).json({
      success: true,
      data: newNFT,
      message: 'NFT created successfully',
      source: 'blockchain'
    });
  } catch (error) {
    console.error('Create NFT error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create NFT',
      message: error.message,
    });
  }
});

// @route   PUT /api/nfts/:id
// @desc    Update NFT
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`PUT /api/nfts/${id} - Request received`);

    const nftIndex = mockNFTs.findIndex(nft => nft.id === id);

    if (nftIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found',
      });
    }

    const nft = mockNFTs[nftIndex];

    // Check if user owns the NFT
    if (nft.owner !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this NFT',
      });
    }

    // Update NFT
    const updatedNFT = {
      ...nft,
      ...req.body,
      id, // Ensure ID doesn't change
      owner: nft.owner, // Ensure owner doesn't change through this endpoint
      creator: nft.creator, // Ensure creator doesn't change
      updatedAt: new Date(),
    };

    mockNFTs[nftIndex] = updatedNFT;

    console.log(`NFT updated successfully: ${id}`);

    res.json({
      success: true,
      data: updatedNFT,
      message: 'NFT updated successfully',
    });
  } catch (error) {
    console.error('Update NFT error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update NFT',
      message: error.message,
    });
  }
});

// @route   DELETE /api/nfts/:id
// @desc    Delete NFT
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`DELETE /api/nfts/${id} - Request received`);

    const nftIndex = mockNFTs.findIndex(nft => nft.id === id);

    if (nftIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found',
      });
    }

    const nft = mockNFTs[nftIndex];

    // Check if user owns the NFT
    if (nft.owner !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this NFT',
      });
    }

    // Remove NFT from mock data
    mockNFTs.splice(nftIndex, 1);

    console.log(`NFT deleted successfully: ${id}`);

    res.json({
      success: true,
      message: 'NFT deleted successfully',
    });
  } catch (error) {
    console.error('Delete NFT error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete NFT',
      message: error.message,
    });
  }
});

// @route   GET /api/nfts/verify/:tokenId/:contractAddress
// @desc    Verify NFT ownership on blockchain
// @access  Private
router.get('/verify/:tokenId/:contractAddress', authenticateToken, async (req, res) => {
  try {
    const { tokenId, contractAddress } = req.params;
    const { networkId = 1 } = req.query;
    
    // Get user's wallet address
    const user = await User.findById(req.user.id);
    if (!user || !user.walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'User has no connected wallet',
      });
    }
    
    // Verify ownership on blockchain
    const isOwner = await web3Service.verifyNFTOwnership(
      user.walletAddress,
      tokenId,
      contractAddress,
      parseInt(networkId)
    );
    
    res.json({
      success: true,
      data: {
        isOwner,
        tokenId,
        contractAddress,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error) {
    console.error('NFT verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
    });
  }
});

// @route   POST /api/nfts/sync
// @desc    Sync NFT from blockchain to database
// @access  Private
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { tokenId, contractAddress, networkId = 1 } = req.body;
    
    if (!tokenId || !contractAddress) {
      return res.status(400).json({
        success: false,
        error: 'Token ID and contract address are required',
      });
    }
    
    // Sync NFT from blockchain
    const nft = await web3Service.syncNFTFromBlockchain(
      tokenId,
      contractAddress,
      parseInt(networkId)
    );
    
    if (!nft) {
      return res.status(404).json({
        success: false,
        error: 'Failed to sync NFT from blockchain',
      });
    }
    
    res.json({
      success: true,
      data: { nft },
    });
  } catch (error) {
    console.error('NFT sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed: ' + error.message,
    });
  }
});

module.exports = router;