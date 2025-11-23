import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  value: number;
  change24h: number;
  icon?: string;
}

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  token: string;
  timestamp: string;
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  from?: string;
  to?: string;
}

interface NFT {
  id: string;
  name: string;
  image: string;
  collection: string;
  value?: number;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  estimatedFee: string;
  estimatedTime: string;
}

interface UseWalletReturn {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  portfolio: TokenBalance[];
  transactions: Transaction[];
  nfts: NFT[];
  loading: boolean;
  error: string | null;
  hasWallet: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToCorrectNetwork: () => Promise<void>;
  estimateGas: (to: string, amount: string, token?: string) => Promise<GasEstimate>;
  sendTransaction: (to: string, amount: string, token?: string) => Promise<string>;
}

const EXPECTED_CHAIN_ID = 1; // Ethereum mainnet

export const useWallet = (): UseWalletReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [portfolio, setPortfolio] = useState<TokenBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCorrectNetwork = chainId === EXPECTED_CHAIN_ID;
  const hasWallet = typeof window !== 'undefined' && !!window.ethereum;

  // Check if wallet is already connected
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          await getBalance(accounts[0]);
          await getChainId();
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const connect = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          await getBalance(accounts[0]);
          await getChainId();
          toast.success('Wallet connected successfully!');
        }
      } catch (error: any) {
        if (error.code === 4001) {
          toast.error('Please connect to MetaMask.');
        } else {
          toast.error('Failed to connect wallet');
        }
        console.error('Error connecting wallet:', error);
      }
    } else {
      toast.error('Please install MetaMask!');
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress(null);
    setBalance(null);
    setChainId(null);
    toast.success('Wallet disconnected');
  };

  const getBalance = async (address: string) => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest'],
        });
        // Convert from wei to ETH
        const balanceInEth = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
        setBalance(balanceInEth);
      } catch (error) {
        console.error('Error getting balance:', error);
      }
    }
  };

  const getChainId = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(chainId, 16));
      } catch (error) {
        console.error('Error getting chain ID:', error);
      }
    }
  };

  const switchToCorrectNetwork = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
        });
        toast.success('Network switched successfully!');
      } catch (error: any) {
        if (error.code === 4902) {
          toast.error('Please add this network to your wallet first.');
        } else {
          toast.error('Failed to switch network');
        }
        console.error('Error switching network:', error);
      }
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAddress(accounts[0] || null);
          if (accounts[0]) {
            getBalance(accounts[0]);
          }
        }
      };

      const handleChainChanged = (chainId: string) => {
        setChainId(parseInt(chainId, 16));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
    // Return a no-op cleanup function for all code paths
    return () => {};
  }, []);

  const estimateGas = async (to: string, amount: string, token?: string): Promise<GasEstimate> => {
    // Mock implementation - in real app, this would call the blockchain
    return {
      gasLimit: '21000',
      gasPrice: '20',
      estimatedFee: '0.0004',
      estimatedTime: '2-5 minutes'
    };
  };

  const sendTransaction = async (to: string, amount: string, token?: string): Promise<string> => {
    // Mock implementation - in real app, this would send the transaction
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('0x1234567890abcdef1234567890abcdef12345678');
      }, 2000);
    });
  };

  return {
    isConnected,
    address,
    balance,
    chainId,
    isCorrectNetwork,
    portfolio,
    transactions,
    nfts,
    loading,
    error,
    hasWallet,
    connect,
    disconnect,
    switchToCorrectNetwork,
    estimateGas,
    sendTransaction,
  };
};

export default useWallet;