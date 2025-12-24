import React, { createContext, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '@/lib/api';

interface AdTrackingContextType {
  trackAdImpression: (adId: string) => Promise<void>;
  trackAdClick: (adId: string) => Promise<void>;
  trackProductPostView: (productPostId: string) => Promise<void>;
  trackProductPostInteraction: (productPostId: string, interactionType: string) => Promise<void>;
}

const AdTrackingContext = createContext<AdTrackingContextType | undefined>(undefined);

interface AdTrackingProviderProps {
  children: ReactNode;
}

export const AdTrackingProvider: React.FC<AdTrackingProviderProps> = ({ children }) => {
  const { user } = useAuth();

  const trackAdImpression = useCallback(async (adId: string) => {
    if (!user) return; // Only track for authenticated users
    
    try {
      await api.ads.recordAdImpression(adId);
    } catch (error) {
      console.error('Failed to track ad impression:', error);
    }
  }, [user]);

  const trackAdClick = useCallback(async (adId: string) => {
    if (!user) return; // Only track for authenticated users
    
    try {
      await api.ads.recordAdClick(adId);
    } catch (error) {
      console.error('Failed to track ad click:', error);
    }
  }, [user]);

  const trackProductPostView = useCallback(async (productPostId: string) => {
    if (!user) return; // Only track for authenticated users
    
    try {
      await api.ads.recordProductPostView(productPostId);
    } catch (error) {
      console.error('Failed to track product post view:', error);
    }
  }, [user]);

  const trackProductPostInteraction = useCallback(async (productPostId: string, interactionType: string) => {
    if (!user) return; // Only track for authenticated users
    
    try {
      await api.ads.recordProductPostInteraction(productPostId, interactionType);
    } catch (error) {
      console.error('Failed to track product post interaction:', error);
    }
  }, [user]);

  // Track page visibility changes to handle ad viewability
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Could implement logic to handle visibility changes for tracking
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  return (
    <AdTrackingContext.Provider
      value={{
        trackAdImpression,
        trackAdClick,
        trackProductPostView,
        trackProductPostInteraction,
      }}
    >
      {children}
    </AdTrackingContext.Provider>
  );
};

export const useAdTracking = (): AdTrackingContextType => {
  const context = useContext(AdTrackingContext);
  if (context === undefined) {
    throw new Error('useAdTracking must be used within an AdTrackingProvider');
  }
  return context;
};