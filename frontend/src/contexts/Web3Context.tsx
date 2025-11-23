import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import {
  Web3State,
  connectWallet,
  getProvider,
  getNetworkName,
  signMessage,
  getBalance,
  isSupportedChain,
  switchNetwork,
} from '@/lib/web3';
import { useAuth } from './AuthContext';

interface Web3ContextType extends Web3State {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  signAuthMessage: (message: string) => Promise<{ signature: string; address: string } | null>;
  getAccountBalance: () => Promise<string>;
  switchChain: (chainId: number) => Promise<boolean>;
  isConnecting: boolean;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [state, setState] = useState<Web3State>({
    provider: null,
    account: null,
    chainId: null,
    connected: false,
    networkName: null,
  });

  // Initialize provider from window.ethereum if available
  useEffect(() => {
    const provider = getProvider();
    if (provider) {
      setState(prev => ({ ...prev, provider }));
      
      // Listen for account changes
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          disconnect();
        } else {
          setState(prev => ({
            ...prev,
            account: accounts[0] || null,
            connected: true,
          }));
        }
      };
      
      // Listen for chain changes
      const handleChainChanged = (chainIdHex: string) => {
        const chainId = parseInt(chainIdHex, 16);
        setState(prev => ({
          ...prev,
          chainId,
          networkName: getNetworkName(chainId),
        }));
        
        // Notify user of network change
        toast.success(`Network changed to ${getNetworkName(chainId)}`);
      };
      
      // Subscribe to events
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);
      
      // Check if already connected
      provider.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            provider.request({ method: 'eth_chainId' })
              .then((chainIdHex: string) => {
                const chainId = parseInt(chainIdHex, 16);
                setState(prev => ({
                  ...prev,
                  account: accounts[0] || null,
                  chainId,
                  connected: true,
                  networkName: getNetworkName(chainId),
                }));
              })
              .catch(console.error);
          }
        })
        .catch(console.error);
      
      // Cleanup
      return () => {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
      };
    }
    // Explicitly return undefined for the case when provider is not available
    return undefined;
  }, []);

  // Connect wallet
  const connect = async (): Promise<boolean> => {
    try {
      setIsConnecting(true);
      const result = await connectWallet();
      
      if (!result) {
        toast.error('Failed to connect wallet');
        return false;
      }
      
      const { address, chainId } = result;
      
      setState(prev => ({
        ...prev,
        account: address || null,
        chainId,
        connected: true,
        networkName: getNetworkName(chainId),
      }));
      
      toast.success('Wallet connected successfully');
      return true;
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      
      // Handle specific wallet errors with user-friendly messages
      let errorMessage = 'Failed to connect wallet';
      
      if (error.message.includes('No Ethereum wallet detected')) {
        errorMessage = 'No wallet detected. Please install MetaMask or another Web3 wallet to make crypto payments.';
      } else if (error.message.includes('connection was rejected')) {
        errorMessage = 'Wallet connection rejected. Please approve the connection in your wallet.';
      } else if (error.message.includes('already pending')) {
        errorMessage = 'Connection request pending. Please check your wallet extension.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    setState(prev => ({
      ...prev,
      account: null,
      connected: false,
    }));
    toast.success('Wallet disconnected');
  };

  // Sign message for authentication
  const signAuthMessage = async (message: string) => {
    try {
      if (!state.account) {
        throw new Error('No account connected');
      }
      return await signMessage(message);
    } catch (error) {
      console.error('Error signing message:', error);
      toast.error('Failed to sign message');
      return null;
    }
  };

  // Get account balance
  const getAccountBalance = async (): Promise<string> => {
    if (!state.account) return '0';
    return await getBalance(state.account);
  };

  // Switch blockchain network
  const switchChain = async (chainId: number): Promise<boolean> => {
    try {
      if (!isSupportedChain(chainId)) {
        toast.error('Unsupported network');
        return false;
      }
      
      const success = await switchNetwork(chainId);
      
      if (success) {
        setState(prev => ({
          ...prev,
          chainId,
          networkName: getNetworkName(chainId),
        }));
        toast.success(`Switched to ${getNetworkName(chainId)}`);
      } else {
        toast.error('Failed to switch network');
      }
      
      return success;
    } catch (error) {
      console.error('Error switching chain:', error);
      toast.error('Failed to switch network');
      return false;
    }
  };

  return (
    <Web3Context.Provider
      value={{
        ...state,
        connect,
        disconnect,
        signAuthMessage,
        getAccountBalance,
        switchChain,
        isConnecting,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = (): Web3ContextType => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};