const ethers = require('ethers');
const { DAO, Proposal } = require('../models');

// ABI for a basic DAO contract
const DAO_ABI = [
  // Basic DAO functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenAddress() view returns (address)',
  'function proposalCount() view returns (uint256)',
  'function memberCount() view returns (uint256)',
  'function treasuryValue() view returns (uint256)',
  'function getProposal(uint256 proposalId) view returns (tuple(address proposer, string title, string description, uint8 status, uint256 startTime, uint256 endTime, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes))',
  'function getSettings() view returns (tuple(uint256 minProposalStake, uint256 votingPeriod, uint256 quorumPercentage, uint256 executionDelay))',
  // Member functions
  'function isMember(address account) view returns (bool)',
  'function getVotingPower(address account) view returns (uint256)',
  // Proposal functions
  'function createProposal(string memory title, string memory description, bytes memory executionData) returns (uint256)',
  'function vote(uint256 proposalId, uint8 support)',
  'function executeProposal(uint256 proposalId)',
  // Events
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 startTime, uint256 endTime)',
  'event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight)',
  'event ProposalExecuted(uint256 indexed proposalId)',
  'event MemberAdded(address indexed member)',
  'event MemberRemoved(address indexed member)'
];

// Get provider for a specific network
const getProvider = (networkId) => {
  // Reuse the network configuration from web3Service
  const web3Service = require('./web3Service');
  return web3Service.getProvider(networkId);
};

// Get DAO contract instance
const getDAOContract = (contractAddress, networkId = 1) => {
  const provider = getProvider(networkId);
  return new ethers.Contract(contractAddress, DAO_ABI, provider);
};

// Verify DAO membership
const verifyDAOMembership = async (walletAddress, contractAddress, networkId = 1) => {
  try {
    const contract = getDAOContract(contractAddress, networkId);
    return await contract.isMember(walletAddress);
  } catch (error) {
    console.error('Error verifying DAO membership:', error);
    return false;
  }
};

// Get member voting power
const getMemberVotingPower = async (walletAddress, contractAddress, networkId = 1) => {
  try {
    const contract = getDAOContract(contractAddress, networkId);
    const votingPower = await contract.getVotingPower(walletAddress);
    return ethers.utils.formatUnits(votingPower, 0); // Convert to number
  } catch (error) {
    console.error('Error getting member voting power:', error);
    return '0';
  }
};

// Sync DAO data from blockchain
const syncDAOFromBlockchain = async (contractAddress, networkId = 1) => {
  try {
    const contract = getDAOContract(contractAddress, networkId);
    
    // Get basic DAO info
    const [name, symbol, tokenAddress, proposalCount, memberCount, treasuryValue, settings] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.tokenAddress(),
      contract.proposalCount(),
      contract.memberCount(),
      contract.treasuryValue(),
      contract.getSettings()
    ]);
    
    // Find or create DAO in database
    let dao = await DAO.findOne({ contractAddress });
    
    if (dao) {
      // Update existing DAO
      dao.name = name;
      dao.symbol = symbol;
      dao.tokenAddress = tokenAddress;
      dao.proposalCount = parseInt(proposalCount.toString());
      dao.memberCount = parseInt(memberCount.toString());
      dao.treasuryValue = ethers.utils.formatEther(treasuryValue);
      dao.settings = {
        minProposalStake: ethers.utils.formatEther(settings.minProposalStake),
        votingPeriod: parseInt(settings.votingPeriod.toString()),
        quorumPercentage: parseInt(settings.quorumPercentage.toString()),
        executionDelay: parseInt(settings.executionDelay.toString())
      };
      
      await dao.save();
    }
    
    return dao;
  } catch (error) {
    console.error('Error syncing DAO from blockchain:', error);
    return null;
  }
};

// Create proposal on blockchain
const createProposalOnBlockchain = async (daoId, title, description, executionData, privateKey, networkId = 1) => {
  try {
    // Get DAO from database
    const dao = await DAO.findById(daoId);
    if (!dao || !dao.contractAddress) {
      throw new Error('DAO not found or has no contract address');
    }
    
    // Create wallet with private key
    const provider = getProvider(networkId);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Get contract with signer
    const contract = new ethers.Contract(dao.contractAddress, DAO_ABI, wallet);
    
    // Create proposal on blockchain
    const tx = await contract.createProposal(title, description, executionData || '0x');
    const receipt = await tx.wait();
    
    // Get proposal ID from event
    const event = receipt.events.find(e => e.event === 'ProposalCreated');
    const proposalId = event.args.proposalId.toString();
    
    return {
      success: true,
      proposalId,
      transactionHash: receipt.transactionHash
    };
  } catch (error) {
    console.error('Error creating proposal on blockchain:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Vote on proposal on blockchain
const voteOnProposalOnBlockchain = async (proposalId, vote, privateKey, networkId = 1) => {
  try {
    // Get proposal from database
    const proposal = await Proposal.findById(proposalId).populate('daoId');
    if (!proposal || !proposal.daoId || !proposal.daoId.contractAddress) {
      throw new Error('Proposal not found or has no associated DAO contract');
    }
    
    // Map vote to blockchain format (0 = against, 1 = for, 2 = abstain)
    const voteValue = vote === 'for' ? 1 : vote === 'against' ? 0 : 2;
    
    // Create wallet with private key
    const provider = getProvider(networkId);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Get contract with signer
    const contract = new ethers.Contract(proposal.daoId.contractAddress, DAO_ABI, wallet);
    
    // Vote on blockchain
    const tx = await contract.vote(proposal.onChainId || 0, voteValue);
    const receipt = await tx.wait();
    
    return {
      success: true,
      transactionHash: receipt.transactionHash
    };
  } catch (error) {
    console.error('Error voting on blockchain:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  getDAOContract,
  verifyDAOMembership,
  getMemberVotingPower,
  syncDAOFromBlockchain,
  createProposalOnBlockchain,
  voteOnProposalOnBlockchain
};