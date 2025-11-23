import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { syncSettings } from '@/services/settingsSync';
import { useSafeAuth } from '@/hooks/useSafeAuth';

export type ProfileVisibility = 'public' | 'followers' | 'private';
export type ActivityVisibility = 'public' | 'followers' | 'private';
export type DataSharingLevel = 'minimal' | 'standard' | 'enhanced';

export interface PrivacySettings {
  // Profile Privacy
  profileVisibility: ProfileVisibility;
  activityVisibility: ActivityVisibility;
  profilePublic: boolean;
  showWallet: boolean;
  showActivity: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  
  // Communication Privacy
  allowTagging: boolean;
  allowDirectMessages: boolean;
  allowGroupInvites: boolean;
  allowMentions: boolean;
  messageRequestsFromFollowers: boolean;
  
  // Data Privacy
  dataSharing: DataSharingLevel;
  analyticsOptOut: boolean;
  personalizedAds: boolean;
  locationTracking: boolean;
  activityTracking: boolean;
  
  // Search & Discovery
  searchableByEmail: boolean;
  searchableByPhone: boolean;
  suggestToContacts: boolean;
  showInDirectory: boolean;
  
  // Content Privacy
  downloadableContent: boolean;
  contentIndexing: boolean;
  shareAnalytics: boolean;
}

interface PrivacyContextType {
  privacySettings: PrivacySettings;
  updatePrivacySetting: <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => void;
  updateMultiplePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  resetToDefaults: () => void;
  exportPrivacySettings: () => PrivacySettings;
  importPrivacySettings: (settings: Partial<PrivacySettings>) => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};

interface PrivacyProviderProps {
  children: ReactNode;
}

const PRIVACY_STORAGE_KEY = 'talkcart-privacy-settings';

// Default privacy settings (privacy-first approach)
const defaultPrivacySettings: PrivacySettings = {
  // Profile Privacy
  profileVisibility: 'followers',
  activityVisibility: 'followers',
  profilePublic: false,
  showWallet: false,
  showActivity: false,
  showOnlineStatus: false,
  showLastSeen: false,
  
  // Communication Privacy
  allowTagging: true,
  allowDirectMessages: true,
  allowGroupInvites: true,
  allowMentions: true,
  messageRequestsFromFollowers: true,
  
  // Data Privacy
  dataSharing: 'minimal',
  analyticsOptOut: false,
  personalizedAds: false,
  locationTracking: false,
  activityTracking: false,
  
  // Search & Discovery
  searchableByEmail: false,
  searchableByPhone: false,
  suggestToContacts: false,
  showInDirectory: false,
  
  // Content Privacy
  downloadableContent: false,
  contentIndexing: false,
  shareAnalytics: false,
};

export const PrivacyProvider: React.FC<PrivacyProviderProps> = ({ children }) => {
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(defaultPrivacySettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Safely get auth context - it might not be available during initial render
  const { isAuthenticated, user } = useSafeAuth();

  // Load privacy settings from backend and localStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (typeof window === 'undefined') return;

      try {
        // First, try to load from localStorage for immediate UI update
        const savedSettings = localStorage.getItem(PRIVACY_STORAGE_KEY);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setPrivacySettings(prev => ({ ...prev, ...parsed }));
        }

        // If authenticated, load from backend and sync
        if (isAuthenticated && user) {
          try {
            const backendSettings = await syncSettings.load();
            if (backendSettings?.privacy) {
              const mergedSettings = { ...defaultPrivacySettings, ...backendSettings.privacy };
              setPrivacySettings(mergedSettings);

              // Update localStorage with backend data
              localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(mergedSettings));
            }
          } catch (backendError: any) {
            // Silently handle backend connection errors during development
            if (backendError?.code !== 'ECONNREFUSED') {
              console.warn('Failed to sync privacy settings:', backendError?.message);
            }
          }
        }
      } catch (error: any) {
        // Only log non-connection errors
        if (error?.code !== 'ECONNREFUSED') {
          console.warn('Failed to load privacy settings:', error?.message);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, [isAuthenticated, user]);

  // Save privacy settings to localStorage and sync with backend whenever they change
  useEffect(() => {
    if (!isLoaded) return; // Don't sync during initial load

    if (typeof window !== 'undefined') {
      localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(privacySettings));

      // Sync with backend if authenticated
      if (isAuthenticated && user) {
        syncSettings.privacy(privacySettings, { retryOnFailure: false });
      }
    }
  }, [privacySettings, isLoaded, isAuthenticated, user]);

  const updatePrivacySetting = <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateMultiplePrivacySettings = (settings: Partial<PrivacySettings>) => {
    setPrivacySettings(prev => ({
      ...prev,
      ...settings,
    }));
  };

  const resetToDefaults = () => {
    setPrivacySettings(defaultPrivacySettings);
  };

  const exportPrivacySettings = () => {
    return { ...privacySettings };
  };

  const importPrivacySettings = (settings: Partial<PrivacySettings>) => {
    setPrivacySettings(prev => ({
      ...prev,
      ...settings,
    }));
  };

  const contextValue: PrivacyContextType = {
    privacySettings,
    updatePrivacySetting,
    updateMultiplePrivacySettings,
    resetToDefaults,
    exportPrivacySettings,
    importPrivacySettings,
  };

  return (
    <PrivacyContext.Provider value={contextValue}>
      {children}
    </PrivacyContext.Provider>
  );
};
