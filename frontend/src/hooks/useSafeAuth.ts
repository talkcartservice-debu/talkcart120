import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContextDefinition';

// Safe auth hook that doesn't throw if used outside AuthProvider
export const useSafeAuth = () => {
  try {
    const context = useContext(AuthContext);
    
    if (!context) {
      // Return default values instead of throwing
      // Only log warning in development mode to avoid console spam in production
      if (process.env.NODE_ENV === 'development') {
        console.warn('useSafeAuth: AuthContext not found, returning default values');
      }
      return {
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        login: async () => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('useSafeAuth: login called outside AuthProvider');
          }
          return false;
        },
        register: async () => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('useSafeAuth: register called outside AuthProvider');
          }
          return false;
        },
        loginWithWallet: async () => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('useSafeAuth: loginWithWallet called outside AuthProvider');
          }
          return false;
        },
        updateProfile: async () => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('useSafeAuth: updateProfile called outside AuthProvider');
          }
          return false;
        },
        refreshUser: async () => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('useSafeAuth: refreshUser called outside AuthProvider');
          }
        },
        logout: async () => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('useSafeAuth: logout called outside AuthProvider');
          }
        },
        updateUser: () => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('useSafeAuth: updateUser called outside AuthProvider');
          }
        },
      };
    }
    
    return context;
  } catch (error) {
    console.error('useSafeAuth: Error accessing AuthContext:', error);
    // Return safe defaults if there's any error
    return {
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      login: async () => false,
      register: async () => false,
      loginWithWallet: async () => false,
      updateProfile: async () => false,
      refreshUser: async () => {},
      logout: async () => {},
      updateUser: () => {},
    };
  }
};