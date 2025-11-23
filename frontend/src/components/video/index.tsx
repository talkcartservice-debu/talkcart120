import React, { createContext, useContext, ReactNode } from 'react';

interface VideoFeedSettings {
  enabled: boolean;
  threshold: number;
  pauseOnScroll: boolean;
  muteByDefault: boolean;
  maxConcurrentVideos: number;
  preloadStrategy: string;
  viewTrackingThreshold: number;
  autoplayOnlyOnWifi: boolean;
  respectReducedMotion: boolean;
}

interface VideoFeedProviderProps {
  children: ReactNode;
  initialSettings: VideoFeedSettings;
  onVideoView?: (videoId: string, viewTime: number) => void;
  showControls?: boolean;
  showStats?: boolean;
}

const VideoFeedContext = createContext<VideoFeedSettings | undefined>(undefined);

export const VideoFeedProvider: React.FC<VideoFeedProviderProps> = ({
  children,
  initialSettings,
  onVideoView,
  showControls,
  showStats,
}) => {
  return (
    <VideoFeedContext.Provider value={initialSettings}>
      {children}
    </VideoFeedContext.Provider>
  );
};

export const useVideoFeed = () => {
  const context = useContext(VideoFeedContext);
  if (context === undefined) {
    throw new Error('useVideoFeed must be used within a VideoFeedProvider');
  }
  return context;
};