const ethers = require('ethers');
const axios = require('axios');
const web3Service = require('./web3Service');

// Token contracts and their details
const TOKEN_CONTRACTS = {
  ethereum: {
    USDC: {
      address: '0xA0b86a33E6441e6e80D0c4C96C5C8C8C8C8C8C8C',
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin'
    },
    USDT: {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      symbol: 'USDT',
      name: 'Tether USD'
    },
    TALK: {
      address: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4', // Mock Vetora token
      decimals: 18,
      symbol: 'TALK',
      name: 'Vetora Token'
    }
  }
};

// Price API endpoints
const PRICE_API = {
  coingecko: 'https://api.coingecko.com/api/v3',
  etherscan: 'https://api.etherscan.io/api'
};

// ERC20 ABI for token interactions
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

/**
 * Get wallet portfolio including ETH and token balances
 */
const getWalletPortfolio = async (walletAddress) => {
  try {
    const provider = web3Service.getProvider(1); // Ethereum mainnet
    
    // Get ETH balance
    const ethBalance = await provider.getBalance(walletAddress);
    const ethBalanceFormatted = parseFloat(ethers.formatEther(ethBalance));
    
    // Get current ETH price
    const ethPrice = await getTokenPrice('ethereum');
    const ethValue = ethBalanceFormatted * ethPrice;
    
    // Get token balances
    const tokens = await getTokenBalances(walletAddress);
    
    // Calculate total portfolio value
    const totalValue = ethValue + tokens.reduce((sum, token) => sum + token.usdValue, 0);
    
    // Get 24h change for ETH
    const ethPriceData = await getTokenPriceData('ethereum');
    const ethChange24h = ethPriceData.price_change_percentage_24h || 0;
    
    return {
      totalBalance: {
        eth: ethBalanceFormatted,
        usd: totalValue
      },
      ethBalance: {
        amount: ethBalanceFormatted,
        usdValue: ethValue,
        price: ethPrice,
        change24h: ethChange24h
      },
      tokens,
      totalValue,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting wallet portfolio:', error);
    // Return mock data for development
    return getMockPortfolio();
  }
};

/**
 * Get token balances for a wallet
 */
const getTokenBalances = async (walletAddress) => {
  try {
    const provider = web3Service.getProvider(1);
    const tokens = [];
    
    for (const [symbol, tokenInfo] of Object.entries(TOKEN_CONTRACTS.ethereum)) {
      try {
        const contract = new ethers.Contract(tokenInfo.address, ERC20_ABI, provider);
        const balance = await contract.balanceOf(walletAddress);
        const balanceFormatted = parseFloat(ethers.formatUnits(balance, tokenInfo.decimals));
        
        if (balanceFormatted > 0) {
          // Get token price
          const price = await getTokenPrice(symbol.toLowerCase());
          const usdValue = balanceFormatted * price;
          
          // Get 24h change
          const priceData = await getTokenPriceData(symbol.toLowerCase());
          const change24h = priceData.price_change_percentage_24h || 0;
          
          tokens.push({
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            address: tokenInfo.address,
            balance: balanceFormatted,
            decimals: tokenInfo.decimals,
            price,
            usdValue,
            change24h,
            logo: getTokenLogo(symbol)
          });
        }
      } catch (error) {
        console.error(`Error getting balance for ${symbol}:`, error);
      }
    }
    
    return tokens;
  } catch (error) {
    console.error('Error getting token balances:', error);
    return getMockTokens();
  }
};

/**
 * Get transaction history for a wallet
 */
const getTransactionHistory = async (walletAddress, options = {}) => {
  try {
    const { page = 1, limit = 20, type } = options;
    
    // This would typically call Etherscan API or similar service
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      return getMockTransactions();
    }
    
    const response = await axios.get(`${PRICE_API.etherscan}`, {
      params: {
        module: 'account',
        action: 'txlist',
        address: walletAddress,
        startblock: 0,
        endblock: 99999999,
        page,
        offset: limit,
        sort: 'desc',
        apikey: apiKey
      }
    });
    
    if (response.data.status !== '1') {
      throw new Error('Failed to fetch transactions from Etherscan');
    }
    
    const transactions = response.data.result.map(tx => ({
      hash: tx.hash,
      type: tx.from.toLowerCase() === walletAddress.toLowerCase() ? 'send' : 'receive',
      amount: parseFloat(ethers.formatEther(tx.value)),
      token: 'ETH',
      from: tx.from,
      to: tx.to,
      timestamp: new Date(parseInt(tx.timeStamp) * 1000),
      status: tx.txreceipt_status === '1' ? 'confirmed' : 'failed',
      gasUsed: parseInt(tx.gasUsed),
      gasPrice: parseFloat(ethers.formatUnits(tx.gasPrice, 'gwei')),
      blockNumber: parseInt(tx.blockNumber)
    }));
    
    // Filter by type if specified
    const filteredTransactions = type ? 
      transactions.filter(tx => tx.type === type) : 
      transactions;
    
    return {
      transactions: filteredTransactions,
      pagination: {
        page,
        limit,
        total: filteredTransactions.length,
        hasMore: filteredTransactions.length === limit
      }
    };
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return getMockTransactions();
  }
};

/**
 * Validate a transaction before sending
 */
const validateTransaction = async (txData) => {
  try {
    const { from, to, amount, token } = txData;
    
    // Validate addresses
    if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
      return { valid: false, error: 'Invalid wallet address' };
    }
    
    // Check if sending to self
    if (from.toLowerCase() === to.toLowerCase()) {
      return { valid: false, error: 'Cannot send to the same address' };
    }
    
    // Get wallet balance
    const portfolio = await getWalletPortfolio(from);
    
    if (token === 'ETH') {
      if (amount > portfolio.ethBalance.amount) {
        return { valid: false, error: 'Insufficient ETH balance' };
      }
    } else {
      const tokenBalance = portfolio.tokens.find(t => t.symbol === token);
      if (!tokenBalance || amount > tokenBalance.balance) {
        return { valid: false, error: `Insufficient ${token} balance` };
      }
    }
    
    // Estimate gas
    const gasEstimate = await estimateGas(txData);
    
    return {
      valid: true,
      gasEstimate,
      suggestedGasPrice: gasEstimate.gasPrice
    };
  } catch (error) {
    console.error('Error validating transaction:', error);
    return { valid: false, error: 'Transaction validation failed' };
  }
};

/**
 * Estimate gas for a transaction
 */
const estimateGas = async (txData) => {
  try {
    const provider = web3Service.getProvider(1);
    const { from, to, amount, token } = txData;
    
    let gasEstimate;
    let gasPrice = await provider.getGasPrice();
    
    if (token === 'ETH') {
      // ETH transfer
      gasEstimate = await provider.estimateGas({
        from,
        to,
        value: ethers.parseEther(amount.toString())
      });
    } else {
      // Token transfer
      const tokenInfo = TOKEN_CONTRACTS.ethereum[token];
      if (!tokenInfo) {
        throw new Error('Unsupported token');
      }
      
      const contract = new ethers.Contract(tokenInfo.address, ERC20_ABI, provider);
      const amountWei = ethers.parseUnits(amount.toString(), tokenInfo.decimals);
      
      gasEstimate = await contract.estimateGas.transfer(to, amountWei);
    }
    
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasLimitNumber = Number(gasEstimate);
    const totalGasCost = parseFloat(ethers.formatEther(gasPrice * gasEstimate));
    
    return {
      gasLimit: gasLimitNumber,
      gasPrice: gasPriceGwei,
      totalCost: totalGasCost,
      totalCostUsd: totalGasCost * (await getTokenPrice('ethereum'))
    };
  } catch (error) {
    console.error('Error estimating gas:', error);
    // Return default estimates
    return {
      gasLimit: token === 'ETH' ? 21000 : 65000,
      gasPrice: 20,
      totalCost: token === 'ETH' ? 0.0004 : 0.0013,
      totalCostUsd: 0.80
    };
  }
};

/**
 * Create a transaction (mock implementation)
 */
const createTransaction = async (txData) => {
  // In a real implementation, this would require the user's private key or signature
  // For now, we'll return a mock transaction hash
  const mockHash = '0x' + Math.random().toString(16).substr(2, 64);
  
  return {
    hash: mockHash,
    gasUsed: txData.gasPrice || 21000,
    gasPrice: txData.gasPrice || 20,
    status: 'pending'
  };
};

/**
 * Get DeFi positions for a wallet
 */
const getDeFiPositions = async (walletAddress) => {
  try {
    // This would integrate with DeFi protocols like Uniswap, Compound, Aave, etc.
    // For now, return mock data
    return {
      totalValue: 0,
      positions: [],
      protocols: []
    };
  } catch (error) {
    console.error('Error getting DeFi positions:', error);
    return { totalValue: 0, positions: [], protocols: [] };
  }
};

/**
 * Refresh wallet data from blockchain
 */
const refreshWalletData = async (walletAddress) => {
  try {
    // Force refresh of all cached data
    await getWalletPortfolio(walletAddress);
    await getTransactionHistory(walletAddress, { limit: 50 });
    
    return true;
  } catch (error) {
    console.error('Error refreshing wallet data:', error);
    return false;
  }
};

/**
 * Get token price from CoinGecko
 */
const getTokenPrice = async (tokenId) => {
  try {
    const response = await axios.get(`${PRICE_API.coingecko}/simple/price`, {
      params: {
        ids: tokenId,
        vs_currencies: 'usd'
      }
    });
    
    return response.data[tokenId]?.usd || 0;
  } catch (error) {
    console.error(`Error getting price for ${tokenId}:`, error);
    return getMockPrice(tokenId);
  }
};

/**
 * Get detailed token price data
 */
const getTokenPriceData = async (tokenId) => {
  try {
    const response = await axios.get(`${PRICE_API.coingecko}/coins/${tokenId}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      }
    });
    
    return response.data.market_data;
  } catch (error) {
    console.error(`Error getting price data for ${tokenId}:`, error);
    return { price_change_percentage_24h: 0 };
  }
};

/**
 * Get token logo
 */
const getTokenLogo = (symbol) => {
  const logos = {
    ETH: '⟠',
    USDC: '💵',
    USDT: '💰',
    TALK: '🗣️'
  };
  return logos[symbol] || '🪙';
};

/**
 * Mock data functions for development
 */
const getMockPortfolio = () => ({
  totalBalance: {
    eth: 2.45,
    usd: 4890.50
  },
  ethBalance: {
    amount: 2.45,
    usdValue: 4890.50,
    price: 1996.12,
    change24h: 5.2
  },
  tokens: getMockTokens(),
  totalValue: 6920.50,
  lastUpdated: new Date().toISOString()
});

const getMockTokens = () => [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86a33E6441e6e80D0c4C96C5C8C8C8C8C8C8C',
    balance: 1250.00,
    decimals: 6,
    price: 1.00,
    usdValue: 1250.00,
    change24h: 0.1,
    logo: '💵'
  },
  {
    symbol: 'TALK',
    name: 'Vetora Token',
    address: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
    balance: 15600,
    decimals: 18,
    price: 0.05,
    usdValue: 780.00,
    change24h: 12.5,
    logo: '🗣️'
  }
];

const getMockTransactions = () => ({
  transactions: [
    {
      hash: '0xabc123def456...',
      type: 'receive',
      amount: 0.1,
      token: 'ETH',
      from: '0x123...456',
      to: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'confirmed',
      gasUsed: 21000,
      gasPrice: 20,
      blockNumber: 18500000
    },
    {
      hash: '0xdef456ghi789...',
      type: 'send',
      amount: 500,
      token: 'USDC',
      from: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
      to: '0x789...012',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      status: 'confirmed',
      gasUsed: 65000,
      gasPrice: 25,
      blockNumber: 18499500
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    hasMore: false
  }
});

const getMockPrice = (tokenId) => {
  const prices = {
    ethereum: 1996.12,
    'usd-coin': 1.00,
    tether: 1.00,
    vetora: 0.05
  };
  return prices[tokenId] || 1.00;
};

module.exports = {
  getWalletPortfolio,
  getTokenBalances,
  getTransactionHistory,
  validateTransaction,
  estimateGas,
  createTransaction,
  getDeFiPositions,
  refreshWalletData,
  getTokenPrice,
  getTokenPriceData
};