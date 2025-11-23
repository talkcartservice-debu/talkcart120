const ethers = require('ethers');
const NFT = require('../models/NFT');

// ABI for a basic ERC721 NFT contract
const ERC721_ABI = [
  // Basic ERC721 functions
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function approve(address to, uint256 tokenId)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  // Mint function (may vary by contract)
  'function mint(address to, uint256 tokenId, string memory tokenURI) returns (bool)',
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)'
];

// Supported networks
const NETWORKS = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETH_MAINNET_RPC || 'https://mainnet.infura.io/v3/your-infura-key',
    chainId: 1,
    explorer: 'https://etherscan.io',
  },
  5: {
    name: 'Goerli Testnet',
    rpcUrl: process.env.ETH_GOERLI_RPC || 'https://goerli.infura.io/v3/your-infura-key',
    chainId: 5,
    explorer: 'https://goerli.etherscan.io',
  },
  137: {
    name: 'Polygon Mainnet',
    rpcUrl: process.env.POLYGON_MAINNET_RPC || 'https://polygon-rpc.com',
    chainId: 137,
    explorer: 'https://polygonscan.com',
  },
  80001: {
    name: 'Mumbai Testnet',
    rpcUrl: process.env.POLYGON_MUMBAI_RPC || 'https://rpc-mumbai.maticvigil.com',
    chainId: 80001,
    explorer: 'https://mumbai.polygonscan.com',
  },
};

// Get provider for a specific network
const getProvider = (networkId) => {
  const network = NETWORKS[networkId];
  if (!network) {
    throw new Error(`Unsupported network ID: ${networkId}`);
  }
  
  return new ethers.JsonRpcProvider(network.rpcUrl);
};

// Get contract instance
const getContract = (contractAddress, networkId) => {
  const provider = getProvider(networkId);
  return new ethers.Contract(contractAddress, ERC721_ABI, provider);
};

// Verify NFT ownership
const verifyNFTOwnership = async (walletAddress, tokenId, contractAddress, networkId = 1) => {
  try {
    const contract = getContract(contractAddress, networkId);
    const owner = await contract.ownerOf(tokenId);
    return owner.toLowerCase() === walletAddress.toLowerCase();
  } catch (error) {
    console.error('Error verifying NFT ownership:', error);
    return false;
  }
};

// Get NFT metadata from blockchain
const getNFTMetadata = async (tokenId, contractAddress, networkId = 1) => {
  try {
    const contract = getContract(contractAddress, networkId);
    const tokenURI = await contract.tokenURI(tokenId);
    
    // If tokenURI is IPFS URI, convert to HTTP URL
    let metadataUrl = tokenURI;
    if (tokenURI.startsWith('ipfs://')) {
      metadataUrl = `https://ipfs.io/ipfs/${tokenURI.replace('ipfs://', '')}`;
    }
    
    // Fetch metadata
    const response = await fetch(metadataUrl);
    const metadata = await response.json();
    
    return metadata;
  } catch (error) {
    console.error('Error getting NFT metadata:', error);
    return null;
  }
};

// Sync NFT data from blockchain to database
const syncNFTFromBlockchain = async (tokenId, contractAddress, networkId = 1) => {
  try {
    // Get owner from blockchain
    const contract = getContract(contractAddress, networkId);
    const owner = await contract.ownerOf(tokenId);
    
    // Get metadata
    const metadata = await getNFTMetadata(tokenId, contractAddress, networkId);
    if (!metadata) {
      throw new Error('Failed to fetch NFT metadata');
    }
    
    // Find user by wallet address
    const User = require('../models/User');
    const ownerUser = await User.findByWallet(owner);
    if (!ownerUser) {
      throw new Error('Owner not found in database');
    }
    
    // Update or create NFT in database
    const nft = await NFT.findOne({ tokenId, contractAddress });
    
    if (nft) {
      // Update existing NFT
      nft.owner = ownerUser._id;
      nft.name = metadata.name || nft.name;
      nft.description = metadata.description || nft.description;
      nft.image = metadata.image || nft.image;
      nft.attributes = metadata.attributes || nft.attributes;
      nft.status = 'minted';
      
      await nft.save();
      return nft;
    } else {
      // Create new NFT
      const networkInfo = NETWORKS[networkId];
      const blockchain = networkInfo.name.toLowerCase().includes('polygon') ? 'polygon' : 
                        networkInfo.name.toLowerCase().includes('binance') ? 'binance' : 'ethereum';
      
      const newNFT = new NFT({
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        price: 0, // Default price
        currency: 'ETH',
        collection: metadata.collection || 'Unknown Collection',
        owner: ownerUser._id,
        creator: ownerUser._id, // Assuming owner is creator
        tokenId,
        contractAddress,
        blockchain,
        attributes: metadata.attributes || [],
        status: 'minted',
      });
      
      await newNFT.save();
      return newNFT;
    }
  } catch (error) {
    console.error('Error syncing NFT from blockchain:', error);
    return null;
  }
};

module.exports = {
  getProvider,
  getContract,
  verifyNFTOwnership,
  getNFTMetadata,
  syncNFTFromBlockchain,
  NETWORKS,
};