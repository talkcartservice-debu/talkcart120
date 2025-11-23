import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ProfileUser } from '@/types';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileContextValue {
  profile: ProfileUser | null;
  loading: boolean;
  error: string | null;
  loadProfile: (username?: string) => Promise<void>;
  updateProfile: (data: Partial<ProfileUser>) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser, updateProfile: updateAuthProfile } = useAuth();

  const loadProfile = useCallback(async (username?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let profileData;
      
      if (username) {
        // Load another user's profile
        const response: any = await api.users.getByUsername(username);
        profileData = response.data || response.user || response;
      } else if (currentUser) {
        // Load current user's profile
        const response: any = await api.users.getByUsername(currentUser.username);
        profileData = response.data || response.user || response;
      } else {
        throw new Error('No user specified and no current user');
      }
      
      setProfile(profileData);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.message || 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const updateProfile = useCallback(async (data: Partial<ProfileUser>): Promise<boolean> => {
    try {
      // Check if we're updating avatar - if so, use the auth endpoint directly
      if (data.avatar !== undefined) {
        // For avatar updates, use the auth API which properly handles avatars
        const response: any = await api.auth.updateProfile(data);
        const updatedUser = response?.data ?? response?.user;
        
        if (response?.success && updatedUser) {
          setProfile(updatedUser);
          
          // If we're updating the current user's profile, also update auth context
          if (currentUser && (!data.username || data.username === currentUser.username)) {
            // Update auth context as well
            window.dispatchEvent(new CustomEvent('user-profile-updated', { 
              detail: { user: updatedUser } 
            }));
          }
          return true;
        }
        return false;
      }
      
      // For non-avatar updates, use the existing flow
      const success = await updateAuthProfile(data);
      
      if (success && profile) {
        // Update local profile state
        setProfile(prev => prev ? { ...prev, ...data } : null);
        
        // If we're updating the current user's profile, also update auth context
        if (currentUser && (!data.username || data.username === currentUser.username)) {
          // Emit event for other components to update
          // Use the updated user data that should now be in the currentUser from AuthContext
          window.dispatchEvent(new CustomEvent('user-profile-updated', { 
            detail: { user: { ...currentUser, ...data } } 
          }));
        }
      }
      
      return success;
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.message || 'Failed to update profile');
      return false;
    }
  }, [profile, currentUser, updateAuthProfile]);

  const refreshProfile = useCallback(async () => {
    if (profile?.username) {
      await loadProfile(profile.username);
    } else if (currentUser?.username) {
      await loadProfile(currentUser.username);
    }
  }, [profile, currentUser, loadProfile]);

  // Load current user's profile on mount if available
  useEffect(() => {
    if (currentUser && !profile) {
      loadProfile(currentUser.username);
    }
  }, [currentUser, profile, loadProfile]);

  const value = {
    profile,
    loading,
    error,
    loadProfile,
    updateProfile,
    refreshProfile
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};