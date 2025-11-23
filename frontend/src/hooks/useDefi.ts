import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import toast from 'react-hot-toast';

export interface LiquidityPool {
  id: string;
  name: string;
  protocol: string;
  apy: number;
  tvl: number;
  risk: 'Low' | 'Medium' | 'High';
  logo: string;
  contractAddress: string;
  networkId: number;
  tokens: Array<{
    symbol: string;
    address: string;
    decimals: number;
  }>;
  userStaked?: number;
  userEarned?: number;
}

export interface LendingPool {
  id: string;
  asset: string;
  supplyApy: number;
  borrowApy: number;
  collateralFactor: number;
  risk: 'Low' | 'Medium' | 'High';
  logo: string;
  contractAddress: string;
  networkId: number;
  totalSupplied: number;
  totalBorrowed: number;
  utilizationRate: number;
  supplied?: number;
  borrowed?: number;
}

export interface YieldFarm {
  id: string;
  name: string;
  apy: number;
  multiplier: string;
  totalStaked: number;
  risk: 'Low' | 'Medium' | 'High';
  logo: string;
  contractAddress: string;
  networkId: number;
  rewardToken: {
    symbol: string;
    address: string;
    decimals: number;
  };
  stakingToken: {
    symbol: string;
    address: string;
    decimals: number;
  };
  userStaked?: number;
  pendingRewards?: number;
}

export interface DefiTransaction {
  _id: string;
  type: 'stake' | 'unstake' | 'supply' | 'withdraw' | 'borrow' | 'repay' | 'harvest' | 'swap';
  protocol: string;
  poolId: string;
  amount: number;
  token: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: number;
  gasFee?: number;
  networkId: number;
  createdAt: string;
}

export interface DefiPortfolio {
  liquidityPositions: Array<{
    poolId: string;
    userStaked: number;
    userEarned: number;
    lastUpdated: string;
  }>;
  lendingPositions: Array<{
    poolId: string;
    supplied: number;
    borrowed: number;
    lastUpdated: string;
  }>;
  farmPositions: Array<{
    farmId: string;
    userStaked: number;
    pendingRewards: number;
    lastUpdated: string;
  }>;
  totalValueLocked: number;
  totalEarned: number;
}

export interface MarketData {
  totalValueLocked: number;
  totalUsers: number;
  totalRewardsDistributed: number;
  averageAPY: number;
}

const useDefi = () => {
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const { connected, account } = useWeb3();
  
  const [liquidityPools, setLiquidityPools] = useState<LiquidityPool[]>([]);
  const [lendingPools, setLendingPools] = useState<LendingPool[]>([]);
  const [yieldFarms, setYieldFarms] = useState<YieldFarm[]>([]);
  const [portfolio, setPortfolio] = useState<DefiPortfolio | null>(null);
  const [transactions, setTransactions] = useState<DefiTransaction[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all DeFi pools
  const fetchPools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/defi/pools');
      const data = await response.json();

      if (data.success) {
        setLiquidityPools(data.data.liquidityPools || []);
        setLendingPools(data.data.lendingPools || []);
        setYieldFarms(data.data.yieldFarms || []);
        setMarketData(data.data.marketData || null);
      } else {
        throw new Error(data.error || 'Failed to fetch pools');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pools';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user's DeFi portfolio
  const fetchPortfolio = useCallback(async () => {
    if (!user || !token || !connected) return;

    try {
      setPortfolioLoading(true);
      setError(null);

      const response = await fetch('/api/defi/portfolio', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setPortfolio(data.data.portfolio || null);
        setTransactions(data.data.transactions || []);
        
        // Merge user positions with pool data
        if (data.data.portfolio) {
          updatePoolsWithUserData(data.data.portfolio);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch portfolio');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch portfolio';
      setError(errorMessage);
      console.error('Portfolio fetch error:', err);
    } finally {
      setPortfolioLoading(false);
    }
  }, [user, token, connected]);

  // Update pools with user position data
  const updatePoolsWithUserData = (portfolioData: DefiPortfolio) => {
    // Update liquidity pools
    setLiquidityPools(prev => prev.map(pool => {
      const position = portfolioData.liquidityPositions.find(p => p.poolId === pool.id);
      return position ? {
        ...pool,
        userStaked: position.userStaked,
        userEarned: position.userEarned
      } : pool;
    }));

    // Update lending pools
    setLendingPools(prev => prev.map(pool => {
      const position = portfolioData.lendingPositions.find(p => p.poolId === pool.id);
      return position ? {
        ...pool,
        supplied: position.supplied,
        borrowed: position.borrowed
      } : pool;
    }));

    // Update yield farms
    setYieldFarms(prev => prev.map(farm => {
      const position = portfolioData.farmPositions.find(p => p.farmId === farm.id);
      return position ? {
        ...farm,
        userStaked: position.userStaked,
        pendingRewards: position.pendingRewards
      } : farm;
    }));
  };

  // Stake tokens in a pool
  const stake = useCallback(async (poolId: string, amount: number, poolType: 'liquidity' | 'farm') => {
    if (!user || !token || !connected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    try {
      const response = await fetch('/api/defi/stake', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ poolId, amount, poolType }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Ready to stake! Please confirm the transaction in your wallet.');
        return true;
      } else {
        throw new Error(data.error || 'Failed to prepare stake transaction');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stake';
      toast.error(errorMessage);
      return false;
    }
  }, [user, token, connected]);

  // Unstake tokens from a pool
  const unstake = useCallback(async (poolId: string, amount: number, poolType: 'liquidity' | 'farm') => {
    if (!user || !token || !connected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    try {
      const response = await fetch('/api/defi/unstake', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ poolId, amount, poolType }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Ready to unstake! Please confirm the transaction in your wallet.');
        return true;
      } else {
        throw new Error(data.error || 'Failed to prepare unstake transaction');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unstake';
      toast.error(errorMessage);
      return false;
    }
  }, [user, token, connected]);

  // Harvest rewards
  const harvest = useCallback(async (poolId: string, poolType: 'liquidity' | 'farm') => {
    if (!user || !token || !connected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    try {
      const response = await fetch('/api/defi/harvest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ poolId, poolType }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Ready to harvest! Please confirm the transaction in your wallet.');
        return true;
      } else {
        throw new Error(data.error || 'Failed to prepare harvest transaction');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to harvest';
      toast.error(errorMessage);
      return false;
    }
  }, [user, token, connected]);

  // Supply tokens to lending pool
  const supply = useCallback(async (poolId: string, amount: number) => {
    if (!user || !token || !connected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    try {
      const response = await fetch('/api/defi/supply', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ poolId, amount }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Ready to supply! Please confirm the transaction in your wallet.');
        return true;
      } else {
        throw new Error(data.error || 'Failed to prepare supply transaction');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to supply';
      toast.error(errorMessage);
      return false;
    }
  }, [user, token, connected]);

  // Record completed transaction
  const recordTransaction = useCallback(async (transactionData: {
    txHash: string;
    type: string;
    protocol: string;
    poolId: string;
    amount: number;
    token: string;
    networkId?: number;
  }) => {
    if (!user || !token) return false;

    try {
      const response = await fetch('/api/defi/transaction/record', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh portfolio after recording transaction
        setTimeout(() => {
          fetchPortfolio();
        }, 2000);
        return true;
      } else {
        throw new Error(data.error || 'Failed to record transaction');
      }
    } catch (err) {
      console.error('Failed to record transaction:', err);
      return false;
    }
  }, [user, token, fetchPortfolio]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchPools(),
      fetchPortfolio()
    ]);
  }, [fetchPools, fetchPortfolio]);

  // Initialize data on mount
  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  // Fetch portfolio when user connects wallet
  useEffect(() => {
    if (user && token && connected) {
      fetchPortfolio();
    }
  }, [user, token, connected, fetchPortfolio]);

  return {
    // Data
    liquidityPools,
    lendingPools,
    yieldFarms,
    portfolio,
    transactions,
    marketData,
    
    // State
    loading,
    portfolioLoading,
    error,
    
    // Actions
    stake,
    unstake,
    harvest,
    supply,
    recordTransaction,
    refreshData,
    fetchPools,
    fetchPortfolio,
    
    // Computed
    hasPositions: portfolio && (
      portfolio.liquidityPositions.length > 0 ||
      portfolio.lendingPositions.length > 0 ||
      portfolio.farmPositions.length > 0
    ),
    totalValueLocked: portfolio?.totalValueLocked || 0,
    totalEarned: portfolio?.totalEarned || 0,
  };
};

export default useDefi;