import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface PresenceData {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

interface PresenceContextType {
  userPresence: Map<string, PresenceData>;
  isUserOnline: (userId: string) => boolean;
  getUserLastSeen: (userId: string) => Date | null;
  getUserStatus: (userId: string) => string;
  canShowUserLastSeen: (userId: string) => boolean;
  updateUserPresence: (userId: string, data: Partial<PresenceData>) => void;
  setUserStatus: (status: 'online' | 'away' | 'busy' | 'offline') => void;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const usePresence = () => {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
};

// Safe hook that doesn't throw error if used outside provider
export const useSafePresence = () => {
  return useContext(PresenceContext);
};

interface PresenceProviderProps {
  children: ReactNode;
}

export const PresenceProvider: React.FC<PresenceProviderProps> = ({ children }) => {
  const [userPresence, setUserPresence] = useState<Map<string, PresenceData>>(new Map());
  const { user, isAuthenticated } = useAuth();

  // Mock presence data for demo
  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize with some mock presence data
      const mockPresence = new Map<string, PresenceData>();
      
      // Add current user
      mockPresence.set(user.id, {
        userId: user.id,
        isOnline: true,
        lastSeen: new Date(),
        status: 'online'
      });

      // Add some mock users
      const mockUsers = [
        { id: 'user1', isOnline: true, lastSeen: new Date() },
        { id: 'user2', isOnline: false, lastSeen: new Date(Date.now() - 300000) }, // 5 min ago
        { id: 'user3', isOnline: false, lastSeen: new Date(Date.now() - 3600000) }, // 1 hour ago
      ];

      mockUsers.forEach(mockUser => {
        mockPresence.set(mockUser.id, {
          userId: mockUser.id,
          isOnline: mockUser.isOnline,
          lastSeen: mockUser.lastSeen,
          status: mockUser.isOnline ? 'online' : 'offline'
        });
      });

      setUserPresence(mockPresence);
    }
  }, [isAuthenticated, user]);

  const isUserOnline = (userId: string): boolean => {
    const presence = userPresence.get(userId);
    if (!presence) return false;
    
    // Consider user online if last seen within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return presence.isOnline || presence.lastSeen > fiveMinutesAgo;
  };

  const getUserLastSeen = (userId: string): Date | null => {
    const presence = userPresence.get(userId);
    return presence?.lastSeen || null;
  };

  const getUserStatus = (userId: string): string => {
    const presence = userPresence.get(userId);
    return presence?.status || 'offline';
  };

  const canShowUserLastSeen = (userId: string): boolean => {
    // In a real app, this would check the user's privacy settings
    // For demo purposes, always return true
    return true;
  };

  const updateUserPresence = (userId: string, data: Partial<PresenceData>) => {
    setUserPresence(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(userId) || {
        userId,
        isOnline: false,
        lastSeen: new Date(),
        status: 'offline'
      };
      
      newMap.set(userId, { ...existing, ...data });
      return newMap;
    });
  };

  const setUserStatus = (status: 'online' | 'away' | 'busy' | 'offline') => {
    if (user) {
      updateUserPresence(user.id, {
        status,
        isOnline: status !== 'offline',
        lastSeen: new Date()
      });
    }
  };

  const contextValue: PresenceContextType = {
    userPresence,
    isUserOnline,
    getUserLastSeen,
    getUserStatus,
    canShowUserLastSeen,
    updateUserPresence,
    setUserStatus,
  };

  return (
    <PresenceContext.Provider value={contextValue}>
      {children}
    </PresenceContext.Provider>
  );
};