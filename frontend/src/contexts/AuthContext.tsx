import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '@/lib/api';
import { User } from '@/types';
import { normalizeAuthError } from '@/lib/authErrors';

import { AuthContext, AuthContextType } from './AuthContextDefinition';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Add debugging
  useEffect(() => {
    console.log('AuthContext: User state changed:', { user, isAuthenticated, loading });
  }, [user, isAuthenticated, loading]);
  const router = useRouter();

  useEffect(() => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') {
      return;
    }

    // Check for existing auth token
    const token = localStorage.getItem('token');
    if (token) {
      // Validate the token with the backend and get user data
      // Only fetch user profile if router is ready to avoid blocking initial render
      if (router.isReady) {
        fetchUserProfile(token);
      }
    } else {
      setLoading(false);
    }

    // Listen for logout events (triggered by API client on 401 errors)
    const handleLogoutEvent = () => {
      setUser(null);
      setIsAuthenticated(false);
      // Redirect to login with an expired flag for UX messaging
      if (router.isReady) {
        router.push('/auth/login?expired=1');
      }
    };

    // Catch any unhandled SessionExpiredError and route to login gracefully
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event?.reason;
      const name = reason?.name;
      const message = String(reason?.message || reason || '').toLowerCase();
      if (name === 'SessionExpiredError' || message.includes('session expired')) {
        event.preventDefault?.();
        setUser(null);
        setIsAuthenticated(false);
        if (router.isReady) {
          router.push('/auth/login?expired=1');
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:logout', handleLogoutEvent);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:logout', handleLogoutEvent);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, [router.isReady]);

  // Fetch user profile from backend
  const fetchUserProfile = async (token: string, forceRefresh = false) => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      const response = await api.auth.getProfile();

      if (response.success && response.data) {
        // Persist user for future profile fetches
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('user', JSON.stringify(response.data)); } catch { }
        }
        setUser(response.data);
        setIsAuthenticated(true);
      } else {
        // Not authenticated (e.g., anonymous or invalid token)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      // If backend indicates auth required or invalid token, clear tokens
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('auth') || msg.includes('expired') || msg.includes('invalid') || msg.includes('unauthorized')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      }
      // For server errors, we should still maintain the current user state if we have one
      // unless it's clearly an authentication issue
      const isAuthError = msg.includes('auth') || msg.includes('expired') || msg.includes('invalid') || msg.includes('unauthorized') || error?.status === 401;
      if (isAuthError) {
        setIsAuthenticated(false);
        setUser(null);
      }
      // Handle "No result found" error specifically - this means user not found
      if (error?.status === 404 && msg.includes('no result found')) {
        setIsAuthenticated(false);
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      }
      // For other errors (like 500 server errors), we'll keep the current user state
      // and just log the error
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: { email: string; password: string; rememberMe?: boolean; }) => {
    setLoading(true);
    try {
      // Call the backend API for authentication
      const response = await api.auth.login(credentials);

      if (response && response.success) {
        const { accessToken, refreshToken, user } = response;

        if (typeof window !== 'undefined') {
          if (accessToken) localStorage.setItem('token', accessToken);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
          try { localStorage.setItem('user', JSON.stringify(user)); } catch { }
        }

        setUser(user);
        setIsAuthenticated(true);
        return true;
      }

      // Normalize backend error message to avoid leaking user enumeration hints
      const rawMessage = String(response?.message || response?.error || '').toLowerCase();
      const isInvalidCreds =
        rawMessage.includes('user not found') ||
        rawMessage.includes('username not found') ||
        rawMessage.includes('email not found') ||
        rawMessage.includes('no user') ||
        rawMessage.includes('incorrect') ||
        rawMessage.includes('invalid') ||
        rawMessage.includes('password') ||
        rawMessage.includes('check your username') ||
        rawMessage.includes('check your email') ||
        rawMessage.includes('sign up');

      // Log the normalized error for debugging but don't throw
      const errorMsg = normalizeAuthError(response?.message || response?.error || 'Invalid email or password');
      console.error('Login failed:', isInvalidCreds ? 'Invalid email or password' : errorMsg);
      return false;
    } catch (error: any) {
      console.error('Login error:', normalizeAuthError(error));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      // Call the backend API to invalidate the token
      await api.auth.logout();

    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if the API call fails
    } finally {
      // Always clear local storage and state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);

      // Redirect to login page
      if (router.isReady) {
        router.push('/auth/login');
      }
    }
  };

  const updateProfile = async (userData: Partial<User>): Promise<boolean> => {
    try {
      setLoading(true);

      // Call the backend API to update user profile
      const response: any = await api.auth.updateProfile(userData);

      // Normalize various backend shapes: { success, data } or { success, user }
      const updatedUser = response?.data ?? response?.user;
      if (response?.success && updatedUser) {
        setUser(updatedUser);
        // Persist user for future sessions
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('user', JSON.stringify(updatedUser)); } catch { }
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Update profile error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update user data locally (for immediate UI updates)
  const updateUser = (userData: Partial<User>) => {
    console.log('Updating user with data:', userData);
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      console.log('User updated to:', updatedUser);
      // Persist user for future sessions
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (error) {
          console.error('Failed to persist user data:', error);
        }
      }
    } else {
      console.log('No current user to update, creating new user object');
      const newUser = userData as User;
      setUser(newUser);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('user', JSON.stringify(newUser));
        } catch (error) {
          console.error('Failed to persist user data:', error);
        }
      }
    }
  };

  // Register a new user
  const register = async (userData: any) => {
    setLoading(true);
    try {
      const response = await api.auth.register(userData);

      if (response && response.success) {
        const { accessToken, refreshToken, user } = response;

        if (typeof window !== 'undefined') {
          if (accessToken) localStorage.setItem('token', accessToken);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
          try { localStorage.setItem('user', JSON.stringify(user)); } catch { }
        }

        setUser(user);
        setIsAuthenticated(true);
        if (router.isReady) {
          router.push('/social-new');
        }
        return true;
      }

      const message = normalizeAuthError(response?.message || response?.error || 'Registration failed');
      throw new Error(message);
    } catch (error: any) {
      console.error('Registration error:', error);

      // Provide more specific error messages
      let errorMessage = 'Registration failed';

      if (error?.message) {
        errorMessage = normalizeAuthError(error.message);

        // Handle network errors
        if (error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('timeout') ||
          error.message.toLowerCase().includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
        // Handle server errors
        else if (error.message.toLowerCase().includes('server error') ||
          error.message.toLowerCase().includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        }
      }

      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to set auth tokens and fetch user profile
  const setAuthTokens = (accessToken: string, refreshToken?: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    }

    // Fetch user profile with the new token only if router is ready
    if (router.isReady) {
      fetchUserProfile(accessToken);
    }
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    register,
    loading,
    updateProfile,
    updateUser,
    isLoading: loading,
    setAuthTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}