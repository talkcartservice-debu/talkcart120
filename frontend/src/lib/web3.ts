import { ethers, toUtf8Bytes, hexlify } from 'ethers';

// Types
export interface Web3Provider {
  isMetaMask?: boolean;
  isWalletConnect?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  selectedAddress?: string;
  chainId?: string;
}

export interface Web3State {
  provider: Web3Provider | null;
  account: string | null;
  chainId: number | null;
  connected: boolean;
  networkName: string | null;
}

// Constants
export const SUPPORTED_CHAINS = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  137: 'Polygon Mainnet',
  80001: 'Mumbai Testnet',
};

// Get provider from window.ethereum
export const getProvider = (): Web3Provider | null => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return window.ethereum as Web3Provider;
  }
  return null;
};

// Connect to wallet
export const connectWallet = async (): Promise<{ address: string; chainId: number } | null> => {
  try {
    const provider = getProvider();
    
    if (!provider) {
      // Provide more helpful error message with guidance
      const errorMessage = 'No Ethereum wallet detected. Please install MetaMask, Trust Wallet, or another Web3 wallet extension to make crypto payments.';
      throw new Error(errorMessage);
    }
    
    // Request account access
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const address = accounts[0];
    
    if (!address) {
      throw new Error('No wallet account found. Please connect your wallet and try again.');
    }
    
    // Get chain ID
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    
    return { address, chainId };
  } catch (error: any) {
    console.error('Error connecting to wallet:', error);
    
    // Handle specific error cases
    if (error.code === 4001) {
      throw new Error('Wallet connection was rejected. Please approve the connection to continue.');
    }
    
    if (error.code === -32002) {
      throw new Error('Wallet connection request is already pending. Please check your wallet extension.');
    }
    
    // Re-throw with original message for other errors
    throw error;
  }
};

// Sign message with wallet
export const signMessage = async (message: string): Promise<{ signature: string; address: string } | null> => {
  try {
    const provider = getProvider();
    
    if (!provider) {
      throw new Error('No Ethereum provider found');
    }
    
    const accounts = await provider.request({ method: 'eth_accounts' });
    const address = accounts[0];
    
    if (!address) {
      throw new Error('No account connected');
    }
    
    // Create the message to sign
    const msgParams = toUtf8Bytes(message);
    const msgHex = hexlify(msgParams);
    
    // Sign the message
    const signature = await provider.request({
      method: 'personal_sign',
      params: [msgHex, address],
    });
    
    return { signature, address };
  } catch (error) {
    console.error('Error signing message:', error);
    return null;
  }
};

// Get network name from chain ID
export const getNetworkName = (chainId: number): string => {
  return SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS] || 'Unknown Network';
};

// Check if chain is supported
export const isSupportedChain = (chainId: number): boolean => {
  return chainId in SUPPORTED_CHAINS;
};

// Switch network
export const switchNetwork = async (chainId: number): Promise<boolean> => {
  try {
    const provider = getProvider();
    
    if (!provider) {
      throw new Error('No Ethereum provider found');
    }
    
    const chainIdHex = `0x${chainId.toString(16)}`;
    
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        // Add the network
        // This would require additional chain metadata
        return false;
      }
      throw switchError;
    }
  } catch (error) {
    console.error('Error switching network:', error);
    return false;
  }
};

// Get ETH balance
export const getBalance = async (address: string): Promise<string> => {
  try {
    const provider = getProvider();
    
    if (!provider) {
      throw new Error('No Ethereum provider found');
    }
    
    const ethersProvider = new ethers.BrowserProvider(provider);
    const balanceWei = await ethersProvider.getBalance(address);
    const balanceEth = ethers.formatEther(balanceWei);
    
    return balanceEth;
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
};