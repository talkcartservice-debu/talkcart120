const { ethers } = require('ethers');
const web3Service = require('./web3Service');
const { LiquidityPool, LendingPool, YieldFarm, UserDefiPosition, DefiTransaction } = require('../models/DeFi');

class DefiService {
  constructor() {
    this.providers = {};
    this.contracts = {};
  }

  // Initialize providers for different networks
  initializeProviders() {
    this.providers[1] = web3Service.getProvider(1); // Ethereum mainnet
    this.providers[137] = web3Service.getProvider(137); // Polygon
    this.providers[56] = web3Service.getProvider(56); // BSC
  }

  // Get provider for specific network
  getProvider(networkId = 1) {
    if (!this.providers[networkId]) {
      this.initializeProviders();
    }
    return this.providers[networkId];
  }

  // ERC-20 ABI for token interactions
  getERC20ABI() {
    return [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function allowance(address owner, address spender) view returns (uint256)'
    ];
  }

  // Generic staking contract ABI
  getStakingABI() {
    return [
      'function stake(uint256 amount) external',
      'function unstake(uint256 amount) external',
      'function getReward() external',
      'function balanceOf(address account) view returns (uint256)',
      'function earned(address account) view returns (uint256)',
      'function totalSupply() view returns (uint256)',
      'function rewardRate() view returns (uint256)'
    ];
  }

  // Get user's token balance
  async getTokenBalance(walletAddress, tokenAddress, networkId = 1) {
    try {
      const provider = this.getProvider(networkId);
      const contract = new ethers.Contract(tokenAddress, this.getERC20ABI(), provider);
      
      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      const symbol = await contract.symbol();
      
      return {
        balance: ethers.formatUnits(balance, decimals),
        decimals,
        symbol,
        raw: balance.toString()
      };
    } catch (error) {
      console.error('Error getting token balance:', error);
      return { balance: '0', decimals: 18, symbol: 'UNKNOWN', raw: '0' };
    }
  }

  // Get staking pool information
  async getStakingPoolInfo(contractAddress, networkId = 1) {
    try {
      const provider = this.getProvider(networkId);
      const contract = new ethers.Contract(contractAddress, this.getStakingABI(), provider);
      
      const totalSupply = await contract.totalSupply();
      const rewardRate = await contract.rewardRate();
      
      return {
        totalStaked: ethers.formatEther(totalSupply),
        rewardRate: ethers.formatEther(rewardRate),
        apy: this.calculateAPY(rewardRate, totalSupply)
      };
    } catch (error) {
      console.error('Error getting staking pool info:', error);
      return { totalStaked: '0', rewardRate: '0', apy: 0 };
    }
  }

  // Get user's staking position
  async getUserStakingPosition(walletAddress, contractAddress, networkId = 1) {
    try {
      const provider = this.getProvider(networkId);
      const contract = new ethers.Contract(contractAddress, this.getStakingABI(), provider);
      
      const stakedBalance = await contract.balanceOf(walletAddress);
      const earnedRewards = await contract.earned(walletAddress);
      
      return {
        staked: ethers.formatEther(stakedBalance),
        earned: ethers.formatEther(earnedRewards),
        stakedRaw: stakedBalance.toString(),
        earnedRaw: earnedRewards.toString()
      };
    } catch (error) {
      console.error('Error getting user staking position:', error);
      return { staked: '0', earned: '0', stakedRaw: '0', earnedRaw: '0' };
    }
  }

  // Calculate APY from reward rate and total supply
  calculateAPY(rewardRate, totalSupply) {
    try {
      if (totalSupply.toString() === '0') return 0;
      
      const yearlyRewards = parseFloat(ethers.formatEther(rewardRate)) * 365 * 24 * 3600;
      const totalStaked = parseFloat(ethers.formatEther(totalSupply));
      
      return (yearlyRewards / totalStaked) * 100;
    } catch (error) {
      console.error('Error calculating APY:', error);
      return 0;
    }
  }

  // Estimate gas for staking transaction
  async estimateStakeGas(walletAddress, contractAddress, amount, networkId = 1) {
    try {
      const provider = this.getProvider(networkId);
      const contract = new ethers.Contract(contractAddress, this.getStakingABI(), provider);
      
      const amountWei = ethers.parseEther(amount.toString());
      const gasEstimate = await contract.stake.estimateGas(amountWei, { from: walletAddress });
      
      return {
        gasLimit: gasEstimate.toString(),
        gasPrice: await provider.getFeeData()
      };
    } catch (error) {
      console.error('Error estimating stake gas:', error);
      return { gasLimit: '200000', gasPrice: { gasPrice: ethers.parseUnits('20', 'gwei') } };
    }
  }

  // Get current DeFi market data (mock implementation - replace with real API calls)
  async getMarketData() {
    // In production, this would fetch from DeFiPulse, CoinGecko, or other APIs
    return {
      totalValueLocked: 45000000,
      totalUsers: 12500,
      totalRewardsDistributed: 2500000,
      averageAPY: 15.8
    };
  }

  // Update user positions from blockchain
  async updateUserPositions(userId, walletAddress) {
    try {
      const userPosition = await UserDefiPosition.findOne({ userId, walletAddress }) || 
                          new UserDefiPosition({ userId, walletAddress });

      // Get all active pools
      const liquidityPools = await LiquidityPool.find({ isActive: true });
      const lendingPools = await LendingPool.find({ isActive: true });
      const yieldFarms = await YieldFarm.find({ isActive: true });

      let totalValueLocked = 0;
      let totalEarned = 0;

      // Update liquidity positions
      for (const pool of liquidityPools) {
        const position = await this.getUserStakingPosition(
          walletAddress, 
          pool.contractAddress, 
          pool.networkId
        );
        
        const existingPosition = userPosition.liquidityPositions.find(p => p.poolId === pool.id);
        if (existingPosition) {
          existingPosition.userStaked = parseFloat(position.staked);
          existingPosition.userEarned = parseFloat(position.earned);
          existingPosition.lastUpdated = new Date();
        } else {
          userPosition.liquidityPositions.push({
            poolId: pool.id,
            userStaked: parseFloat(position.staked),
            userEarned: parseFloat(position.earned),
            lastUpdated: new Date()
          });
        }

        totalValueLocked += parseFloat(position.staked);
        totalEarned += parseFloat(position.earned);
      }

      // Update yield farm positions
      for (const farm of yieldFarms) {
        const position = await this.getUserStakingPosition(
          walletAddress, 
          farm.contractAddress, 
          farm.networkId
        );
        
        const existingPosition = userPosition.farmPositions.find(p => p.farmId === farm.id);
        if (existingPosition) {
          existingPosition.userStaked = parseFloat(position.staked);
          existingPosition.pendingRewards = parseFloat(position.earned);
          existingPosition.lastUpdated = new Date();
        } else {
          userPosition.farmPositions.push({
            farmId: farm.id,
            userStaked: parseFloat(position.staked),
            pendingRewards: parseFloat(position.earned),
            lastUpdated: new Date()
          });
        }

        totalValueLocked += parseFloat(position.staked);
        totalEarned += parseFloat(position.earned);
      }

      // Update totals
      userPosition.totalValueLocked = totalValueLocked;
      userPosition.totalEarned = totalEarned;
      userPosition.updatedAt = new Date();

      await userPosition.save();
      return userPosition;

    } catch (error) {
      console.error('Error updating user positions:', error);
      throw error;
    }
  }

  // Record DeFi transaction
  async recordTransaction(userId, walletAddress, transactionData) {
    try {
      const transaction = new DefiTransaction({
        userId,
        walletAddress,
        ...transactionData,
        createdAt: new Date()
      });

      await transaction.save();
      return transaction;
    } catch (error) {
      console.error('Error recording DeFi transaction:', error);
      throw error;
    }
  }

  // Get user's DeFi transaction history
  async getUserTransactions(userId, limit = 50) {
    try {
      return await DefiTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }
}

module.exports = new DefiService();