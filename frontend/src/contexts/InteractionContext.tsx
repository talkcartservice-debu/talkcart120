import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncSettings } from '@/services/settingsSync';
import { useSafeAuth } from '@/hooks/useSafeAuth';

export type NotificationFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly' | 'never';
export type SoundVolume = 'muted' | 'low' | 'medium' | 'high';
export type AutoPlayMode = 'always' | 'wifi-only' | 'never';

export interface NotificationSettings {
  // Channels
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
  
  // Types
  mentions: boolean;
  follows: boolean;
  likes: boolean;
  comments: boolean;
  shares: boolean;
  directMessages: boolean;
  groupMessages: boolean;
  
  // Platform-specific
  social: boolean;
  marketplace: boolean;
  dao: boolean;
  wallet: boolean;
  security: boolean;
  
  // Frequency
  frequency: NotificationFrequency;
  quietHours: boolean;
  quietStart: string; // HH:MM format
  quietEnd: string; // HH:MM format
}

export interface MediaSettings {
  autoPlayVideos: AutoPlayMode;
  autoPlayGifs: boolean;
  autoLoadImages: boolean;
  highQualityUploads: boolean;
  compressImages: boolean;
  showImagePreviews: boolean;
  enableVideoControls: boolean;
}

export interface SoundSettings {
  masterVolume: SoundVolume;
  notificationSounds: boolean;
  messageSounds: boolean;
  uiSounds: boolean;
  keyboardSounds: boolean;
  customSoundPack: string;
}

export interface KeyboardSettings {
  shortcutsEnabled: boolean;
  customShortcuts: Record<string, string>;
  vimMode: boolean;
  quickActions: boolean;
}

export interface UISettings {
  compactMode: boolean;
  showAvatars: boolean;
  showTimestamps: boolean;
  showReadReceipts: boolean;
  showTypingIndicators: boolean;
  showOnlineStatus: boolean;
  animatedEmojis: boolean;
  stickyHeader: boolean;
  infiniteScroll: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
}

export interface InteractionSettings {
  notifications: NotificationSettings;
  media: MediaSettings;
  sound: SoundSettings;
  keyboard: KeyboardSettings;
  ui: UISettings;
}

interface InteractionContextType {
  interactionSettings: InteractionSettings;
  updateNotificationSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void;
  updateMediaSetting: <K extends keyof MediaSettings>(
    key: K,
    value: MediaSettings[K]
  ) => void;
  updateSoundSetting: <K extends keyof SoundSettings>(
    key: K,
    value: SoundSettings[K]
  ) => void;
  updateKeyboardSetting: <K extends keyof KeyboardSettings>(
    key: K,
    value: KeyboardSettings[K]
  ) => void;
  updateUISetting: <K extends keyof UISettings>(
    key: K,
    value: UISettings[K]
  ) => void;
  updateMultipleSettings: (settings: Partial<InteractionSettings>) => void;
  resetToDefaults: () => void;
  exportInteractionSettings: () => InteractionSettings;
  importInteractionSettings: (settings: Partial<InteractionSettings>) => void;
}

const InteractionContext = createContext<InteractionContextType | undefined>(undefined);

export const useInteraction = () => {
  const context = useContext(InteractionContext);
  if (context === undefined) {
    throw new Error('useInteraction must be used within an InteractionProvider');
  }
  return context;
};

interface InteractionProviderProps {
  children: React.ReactNode;
}

const INTERACTION_STORAGE_KEY = 'vetora-interaction-settings';

// Default interaction settings
const defaultInteractionSettings: InteractionSettings = {
  notifications: {
    // Channels
    email: true,
    push: true,
    inApp: true,
    sms: false,
    
    // Types
    mentions: true,
    follows: true,
    likes: false,
    comments: true,
    shares: false,
    directMessages: true,
    groupMessages: true,
    
    // Platform-specific
    social: true,
    marketplace: false,
    dao: true,
    wallet: true,
    security: true,
    
    // Frequency
    frequency: 'immediate',
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00',
  },
  media: {
    autoPlayVideos: 'wifi-only',
    autoPlayGifs: true,
    autoLoadImages: true,
    highQualityUploads: false,
    compressImages: true,
    showImagePreviews: true,
    enableVideoControls: true,
  },
  sound: {
    masterVolume: 'medium',
    notificationSounds: true,
    messageSounds: true,
    uiSounds: false,
    keyboardSounds: false,
    customSoundPack: 'default',
  },
  keyboard: {
    shortcutsEnabled: true,
    customShortcuts: {},
    vimMode: false,
    quickActions: true,
  },
  ui: {
    compactMode: false,
    showAvatars: true,
    showTimestamps: true,
    showReadReceipts: true,
    showTypingIndicators: true,
    showOnlineStatus: true,
    animatedEmojis: true,
    stickyHeader: true,
    infiniteScroll: true,
    autoRefresh: true,
    refreshInterval: 30,
  },
};

export const InteractionProvider: React.FC<InteractionProviderProps> = ({ children }) => {
  const [interactionSettings, setInteractionSettings] = useState<InteractionSettings>(defaultInteractionSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Safely get auth context - it might not be available during initial render
  const { isAuthenticated, user } = useSafeAuth();

  // Load interaction settings from backend and localStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (typeof window === 'undefined') return;

      try {
        // First, try to load from localStorage for immediate UI update
        const savedSettings = localStorage.getItem(INTERACTION_STORAGE_KEY);
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setInteractionSettings(prev => ({
            ...prev,
            ...parsed,
            notifications: { ...prev.notifications, ...parsed.notifications },
            media: { ...prev.media, ...parsed.media },
            sound: { ...prev.sound, ...parsed.sound },
            keyboard: { ...prev.keyboard, ...parsed.keyboard },
            ui: { ...prev.ui, ...parsed.ui },
          }));
        }

        // If authenticated, load from backend and sync
        if (isAuthenticated && user) {
          try {
            const backendSettings = await syncSettings.load();

            // Only merge if we actually got settings from backend
            if (backendSettings) {
              // Merge backend settings
              let mergedSettings = { ...defaultInteractionSettings };

              if (backendSettings?.interaction) {
                mergedSettings = {
                  ...mergedSettings,
                  ...backendSettings.interaction,
                  notifications: { ...mergedSettings.notifications, ...backendSettings.interaction.notifications },
                  media: { ...mergedSettings.media, ...backendSettings.interaction.media },
                  sound: { ...mergedSettings.sound, ...backendSettings.interaction.sound },
                  keyboard: { ...mergedSettings.keyboard, ...backendSettings.interaction.keyboard },
                  ui: { ...mergedSettings.ui, ...backendSettings.interaction.ui },
                };
              }

              // Also merge standalone notifications if they exist
              if (backendSettings?.notifications) {
                mergedSettings.notifications = { ...mergedSettings.notifications, ...backendSettings.notifications };
              }

              setInteractionSettings(mergedSettings);

              // Update localStorage with backend data
              localStorage.setItem(INTERACTION_STORAGE_KEY, JSON.stringify(mergedSettings));
            }
          } catch (backendError: any) {
            // Silently handle backend connection errors during development
            if (backendError?.code !== 'ECONNREFUSED') {
              console.warn('Failed to sync interaction settings:', backendError?.message);
            }
          }
        }
      } catch (error: any) {
        // Only log non-connection errors
        if (error?.code !== 'ECONNREFUSED') {
          console.warn('Failed to load interaction settings:', error?.message);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, [isAuthenticated, user]);

  // Save interaction settings to localStorage and sync with backend whenever they change
  useEffect(() => {
    if (!isLoaded) return; // Don't sync during initial load

    if (typeof window !== 'undefined') {
      localStorage.setItem(INTERACTION_STORAGE_KEY, JSON.stringify(interactionSettings));

      // Sync with backend if authenticated
      if (isAuthenticated && user) {
        syncSettings.interaction(interactionSettings, { retryOnFailure: false });
      }
    }
  }, [interactionSettings, isLoaded, isAuthenticated, user]);

  const updateNotificationSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setInteractionSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  const updateMediaSetting = <K extends keyof MediaSettings>(
    key: K,
    value: MediaSettings[K]
  ) => {
    setInteractionSettings(prev => ({
      ...prev,
      media: {
        ...prev.media,
        [key]: value,
      },
    }));
  };

  const updateSoundSetting = <K extends keyof SoundSettings>(
    key: K,
    value: SoundSettings[K]
  ) => {
    setInteractionSettings(prev => ({
      ...prev,
      sound: {
        ...prev.sound,
        [key]: value,
      },
    }));
  };

  const updateKeyboardSetting = <K extends keyof KeyboardSettings>(
    key: K,
    value: KeyboardSettings[K]
  ) => {
    setInteractionSettings(prev => ({
      ...prev,
      keyboard: {
        ...prev.keyboard,
        [key]: value,
      },
    }));
  };

  const updateUISetting = <K extends keyof UISettings>(
    key: K,
    value: UISettings[K]
  ) => {
    setInteractionSettings(prev => ({
      ...prev,
      ui: {
        ...prev.ui,
        [key]: value,
      },
    }));
  };

  const updateMultipleSettings = (settings: Partial<InteractionSettings>) => {
    setInteractionSettings(prev => ({
      ...prev,
      ...settings,
    }));
  };

  const resetToDefaults = () => {
    setInteractionSettings(defaultInteractionSettings);
  };

  const exportInteractionSettings = () => {
    return { ...interactionSettings };
  };

  const importInteractionSettings = (settings: Partial<InteractionSettings>) => {
    setInteractionSettings(prev => ({
      ...prev,
      ...settings,
    }));
  };

  const contextValue: InteractionContextType = {
    interactionSettings,
    updateNotificationSetting,
    updateMediaSetting,
    updateSoundSetting,
    updateKeyboardSetting,
    updateUISetting,
    updateMultipleSettings,
    resetToDefaults,
    exportInteractionSettings,
    importInteractionSettings,
  };

  return (
    <InteractionContext.Provider value={contextValue}>
      {children}
    </InteractionContext.Provider>
  );
};