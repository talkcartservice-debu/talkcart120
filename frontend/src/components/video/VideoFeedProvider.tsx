import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VideoFeedSettings {
  enabled: boolean;
  threshold: number;
  pauseOnScroll: boolean;
  muteByDefault: boolean;
  maxConcurrentVideos: number;
  preloadStrategy: 'none' | 'metadata' | 'auto';
  viewTrackingThreshold: number;
  autoplayOnlyOnWifi: boolean;
  respectReducedMotion: boolean;
}

interface VideoFeedContextType {
  settings: VideoFeedSettings;
  updateSettings: (newSettings: Partial<VideoFeedSettings>) => void;
  onVideoView?: (videoId: string, viewTime: number) => void;
  showControls: boolean;
  showStats: boolean;
}

const VideoFeedContext = createContext<VideoFeedContextType | undefined>(undefined);



interface VideoFeedProviderProps {
  children: ReactNode;
  initialSettings: VideoFeedSettings;
  onVideoView?: (videoId: string, viewTime: number) => void;
  showControls?: boolean;
  showStats?: boolean;
}

export const VideoFeedProvider: React.FC<VideoFeedProviderProps> = ({
  children,
  initialSettings,
  onVideoView,
  showControls = true,
  showStats = false,
}) => {
  const [settings, setSettings] = useState<VideoFeedSettings>(initialSettings);

  const updateSettings = (newSettings: Partial<VideoFeedSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const value: VideoFeedContextType = {
    settings,
    updateSettings,
    onVideoView,
    showControls,
    showStats,
  };

  return (
    <VideoFeedContext.Provider value={value}>
      {children}
    </VideoFeedContext.Provider>
  );
};