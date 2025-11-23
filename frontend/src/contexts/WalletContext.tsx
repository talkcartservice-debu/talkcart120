import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';
import { syncSettings } from '@/services/settingsSync';
import { User } from '@/types';

// Extend the User type to include wallet settings
interface WalletUser extends User {
  settings?: User['settings'] & {
    wallet?: any;
  };
}

interface WalletContextType {
  walletAddress: string | null;
  walletBalance: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  updateWalletSettings: (settings: any) => Promise<void>;
  walletSettings: any;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: React.ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [walletSettings, setWalletSettings] = useState<any>({});
  const { user, updateUser } = useAuth();

  // Initialize wallet from user data
  useEffect(() => {
    if (user?.walletAddress) {
      setWalletAddress(user.walletAddress);
    }
    
    // Safely access wallet settings from user object
    if (user?.settings && 'wallet' in user.settings && user.settings.wallet) {
      setWalletSettings(user.settings.wallet);
    }
  }, [user]);

  const connectWallet = async () => {
    try {
      // In a real implementation, this would connect to a wallet provider
      // For now, we'll just simulate a connection
      const mockAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      setWalletAddress(mockAddress);
      
      // Update user data
      if (user) {
        const updatedUser: Partial<WalletUser> = { 
          ...user, 
          walletAddress: mockAddress 
        };
        updateUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnectWallet = async () => {
    try {
      setWalletAddress(null);
      setWalletBalance(null);
      
      // Update user data
      if (user) {
        const updatedUser: Partial<WalletUser> = { 
          ...user, 
          walletAddress: undefined 
        };
        updateUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const updateWalletSettings = async (settings: any) => {
    try {
      // Update local state
      setWalletSettings((prev: any) => ({ ...prev, ...settings }));
      
      // Sync with backend
      await syncSettings.wallet(settings);
      
      // Update user data if needed
      if (user) {
        const currentSettings = user.settings || {};
        const updatedUser: Partial<WalletUser> = { 
          ...user, 
          settings: {
            ...currentSettings,
            wallet: {
              ...(currentSettings as any)?.wallet || {},
              ...settings
            }
          }
        };
        updateUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to update wallet settings:', error);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        walletBalance,
        connectWallet,
        disconnectWallet,
        updateWalletSettings,
        walletSettings
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};