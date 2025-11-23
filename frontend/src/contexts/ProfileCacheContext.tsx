import React, { createContext, useContext, useMemo, useRef } from 'react';
import { ProfileUser } from '@/types';

// Simple in-memory cache for profile responses
// - Reduces flicker when navigating between profile routes
// - Not persisted across reloads; respects privacy by not storing sensitive fields long-term

interface ProfileCacheValue {
  getProfileFromCache: (username: string) => ProfileUser | undefined;
  setProfileInCache: (username: string, data: ProfileUser) => void;
}

const ProfileCacheContext = createContext<ProfileCacheValue | undefined>(undefined);

export const useProfileCache = () => {
  const ctx = useContext(ProfileCacheContext);
  if (!ctx) throw new Error('useProfileCache must be used within ProfileCacheProvider');
  return ctx;
};

export const ProfileCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Map username(lowercased) -> profile data
  const cacheRef = useRef<Map<string, ProfileUser>>(new Map());

  const value = useMemo<ProfileCacheValue>(() => ({
    getProfileFromCache: (username: string) => {
      if (!username) return undefined;
      return cacheRef.current.get(username.toLowerCase());
    },
    setProfileInCache: (username: string, data: ProfileUser) => {
      if (!username || !data) return;
      cacheRef.current.set(username.toLowerCase(), data);
    },
  }), []);

  return (
    <ProfileCacheContext.Provider value={value}>
      {children}
    </ProfileCacheContext.Provider>
  );
};