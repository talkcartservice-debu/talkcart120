import { useState, useCallback, useEffect } from 'react';

interface UseMediaMuteProps {
  initialMuted?: boolean;
  globalMuteSetting?: boolean;
  userInteracted?: boolean;
}

interface UseMediaMuteReturn {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
}

/**
 * Custom hook for managing media mute state across the platform
 * Provides consistent mute/unmute functionality for all media components
 */
export const useMediaMute = ({
  initialMuted = false,
  globalMuteSetting = false,
  userInteracted = false
}: UseMediaMuteProps = {}): UseMediaMuteReturn => {
  const [isMuted, setIsMuted] = useState(initialMuted);

  // Apply global mute settings when user hasn't interacted yet
  useEffect(() => {
    if (!userInteracted && globalMuteSetting !== isMuted) {
      setIsMuted(globalMuteSetting);
    }
  }, [globalMuteSetting, userInteracted, isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
  }, []);

  return {
    isMuted,
    toggleMute,
    setMuted
  };
};