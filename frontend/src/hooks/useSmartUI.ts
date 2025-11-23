import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

export interface SmartUIState {
  // Adaptive quality
  videoQuality: 'auto' | 'high' | 'medium' | 'low';
  adaptiveQuality: boolean;
  
  // Smart notifications
  notificationsEnabled: boolean;
  quietMode: boolean;
  
  // Context-aware interactions
  showAdvancedControls: boolean;
  compactMode: boolean;
  
  // Performance optimizations
  reducedMotion: boolean;
  lowPowerMode: boolean;
  
  // User preferences
  autoHideUI: boolean;
  preferredLayout: 'default' | 'theater' | 'fullscreen';
}

export interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | undefined;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  hasHover: boolean;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

export function useSmartUI() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  // Device detection
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice: false,
    hasHover: false,
    screenSize: 'md',
    orientation: 'landscape',
    pixelRatio: 1,
  });

  // Network information
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    effectiveType: undefined,
    downlink: 0,
    rtt: 0,
    saveData: false,
  });

  // Smart UI state
  const [smartUIState, setSmartUIState] = useState<SmartUIState>({
    videoQuality: 'auto',
    adaptiveQuality: true,
    notificationsEnabled: true,
    quietMode: false,
    showAdvancedControls: false,
    compactMode: false,
    reducedMotion: false,
    lowPowerMode: false,
    autoHideUI: true,
    preferredLayout: 'default',
  });

  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 60,
    memoryUsage: 0,
    cpuUsage: 0,
    batteryLevel: 1,
    isCharging: true,
  });

  const lastInteractionRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout>();

  // Update device info
  useEffect(() => {
    const updateDeviceInfo = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const hasHover = window.matchMedia('(hover: hover)').matches;
      
      let screenSize: DeviceInfo['screenSize'] = 'md';
      if (theme.breakpoints.values.xs && window.innerWidth < theme.breakpoints.values.sm) screenSize = 'xs';
      else if (window.innerWidth < theme.breakpoints.values.md) screenSize = 'sm';
      else if (window.innerWidth < theme.breakpoints.values.lg) screenSize = 'md';
      else if (window.innerWidth < theme.breakpoints.values.xl) screenSize = 'lg';
      else screenSize = 'xl';

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice: hasTouch,
        hasHover,
        screenSize,
        orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
        pixelRatio: window.devicePixelRatio || 1,
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, [theme, isMobile, isTablet, isDesktop]);

  // Monitor network conditions
  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false,
        });
      }
    };

    updateNetworkInfo();
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
    
    // Explicitly return undefined for the case when connection is not available
    return undefined;
  }, []);

  // Monitor performance
  useEffect(() => {
    const updatePerformanceMetrics = () => {
      // Battery API
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          setPerformanceMetrics(prev => ({
            ...prev,
            batteryLevel: battery.level,
            isCharging: battery.charging,
          }));
        });
      }

      // Memory API
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setPerformanceMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
        }));
      }
    };

    updatePerformanceMetrics();
    const interval = setInterval(updatePerformanceMetrics, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Adaptive quality based on network and device
  useEffect(() => {
    if (!smartUIState.adaptiveQuality) return;

    let recommendedQuality: SmartUIState['videoQuality'] = 'auto';

    // Network-based quality adjustment
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      recommendedQuality = 'low';
    } else if (networkInfo.effectiveType === '3g' || networkInfo.saveData) {
      recommendedQuality = 'medium';
    } else if (networkInfo.effectiveType === '4g' && networkInfo.downlink > 5) {
      recommendedQuality = 'high';
    }

    // Device-based quality adjustment
    if (deviceInfo.isMobile && performanceMetrics.batteryLevel < 0.2) {
      recommendedQuality = 'low';
    }

    // Memory pressure adjustment
    if (performanceMetrics.memoryUsage > 0.8) {
      recommendedQuality = recommendedQuality === 'high' ? 'medium' : 'low';
    }

    setSmartUIState(prev => ({
      ...prev,
      videoQuality: recommendedQuality,
      lowPowerMode: performanceMetrics.batteryLevel < 0.15 && !performanceMetrics.isCharging,
    }));
  }, [networkInfo, deviceInfo, performanceMetrics, smartUIState.adaptiveQuality]);

  // Auto-hide UI based on inactivity
  useEffect(() => {
    if (!smartUIState.autoHideUI) return;

    const resetInactivityTimer = () => {
      lastInteractionRef.current = Date.now();
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        setSmartUIState(prev => ({
          ...prev,
          compactMode: true,
        }));
      }, 3000); // Hide after 3 seconds of inactivity
    };

    const handleUserActivity = () => {
      setSmartUIState(prev => ({
        ...prev,
        compactMode: false,
      }));
      resetInactivityTimer();
    };

    // Listen for user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [smartUIState.autoHideUI]);

  // Smart notification management
  const shouldShowNotification = useCallback((type: 'chat' | 'follow' | 'gift' | 'system') => {
    if (!smartUIState.notificationsEnabled) return false;
    if (smartUIState.quietMode && type !== 'system') return false;
    
    // Don't show notifications if user is actively interacting
    const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
    if (timeSinceLastInteraction < 5000 && type === 'chat') return false;

    return true;
  }, [smartUIState.notificationsEnabled, smartUIState.quietMode]);

  // Context-aware feature suggestions
  const getSmartSuggestions = useCallback(() => {
    const suggestions: string[] = [];

    if (deviceInfo.isMobile && deviceInfo.orientation === 'landscape') {
      suggestions.push('Consider rotating to portrait for better chat experience');
    }

    if (networkInfo.saveData) {
      suggestions.push('Data saver mode detected - video quality automatically reduced');
    }

    if (performanceMetrics.batteryLevel < 0.2 && !performanceMetrics.isCharging) {
      suggestions.push('Low battery detected - enabling power saving mode');
    }

    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      suggestions.push('Slow connection detected - consider audio-only mode');
    }

    return suggestions;
  }, [deviceInfo, networkInfo, performanceMetrics]);

  // Update smart UI settings
  const updateSmartUIState = useCallback((updates: Partial<SmartUIState>) => {
    setSmartUIState(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    // State
    smartUIState,
    deviceInfo,
    networkInfo,
    performanceMetrics,
    
    // Computed values
    shouldUseCompactLayout: smartUIState.compactMode || deviceInfo.isMobile,
    shouldReduceAnimations: smartUIState.reducedMotion || smartUIState.lowPowerMode,
    shouldShowAdvancedControls: smartUIState.showAdvancedControls && !deviceInfo.isMobile,
    
    // Functions
    shouldShowNotification,
    getSmartSuggestions,
    updateSmartUIState,
    
    // Convenience flags
    isLowPowerMode: smartUIState.lowPowerMode,
    isSlowConnection: networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g',
    isDataSaverMode: networkInfo.saveData,
    isBatteryLow: performanceMetrics.batteryLevel < 0.2,
  };
}
