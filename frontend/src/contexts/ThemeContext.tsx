import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncSettings } from '@/services/settingsSync';
import { useSafeAuth } from '@/hooks/useSafeAuth';

export type ThemeMode = 'light' | 'dark' | 'system';
type ActualTheme = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
  themeMode: ThemeMode;
  actualTheme: ActualTheme;
  fontSize: FontSize;
  reducedMotion: boolean;
  highContrast: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [actualTheme, setActualTheme] = useState<ActualTheme>('light');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Safely get auth context - it might not be available during initial render
  const { isAuthenticated, user } = useSafeAuth();

  // Get system theme preference
  const getSystemTheme = (): ActualTheme => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Initialize theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Set initial theme based on system preference or saved preference
      const savedThemeMode = localStorage.getItem('themeMode');
      const initialThemeMode = (savedThemeMode && ['light', 'dark', 'system'].includes(savedThemeMode)) 
        ? savedThemeMode as ThemeMode 
        : 'system';
      
      setThemeMode(initialThemeMode);
      
      const initialActualTheme = initialThemeMode === 'system' 
        ? getSystemTheme() 
        : initialThemeMode as ActualTheme;
      
      setActualTheme(initialActualTheme);
      
      // Apply theme class to body
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(initialActualTheme);
      
      // Set data attributes for other theme features
      document.body.setAttribute('data-font-size', 'medium');
      document.body.setAttribute('data-reduced-motion', 'false');
      document.body.setAttribute('data-high-contrast', 'false');
    }
  }, []);

  // Update actual theme based on mode
  useEffect(() => {
    let newActualTheme: ActualTheme;
    if (themeMode === 'system') {
      newActualTheme = getSystemTheme();
    } else {
      newActualTheme = themeMode as ActualTheme;
    }
    
    setActualTheme(newActualTheme);
  }, [themeMode]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        if (themeMode === 'system') {
          const newTheme = getSystemTheme();
          setActualTheme(newTheme);
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Explicitly return undefined for the case when window is undefined
    return undefined;
  }, [themeMode]);

  // Apply theme to document body
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(actualTheme);
      
      // Update data attributes
      document.body.setAttribute('data-font-size', fontSize);
      document.body.setAttribute('data-reduced-motion', reducedMotion.toString());
      document.body.setAttribute('data-high-contrast', highContrast.toString());
      
      // Apply accessibility attributes for screen readers
      document.body.setAttribute('data-accessibility-reduced-motion', reducedMotion.toString());
      document.body.setAttribute('data-accessibility-high-contrast', highContrast.toString());
    }
  }, [actualTheme, fontSize, reducedMotion, highContrast]);

  // Load saved preferences
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // First, try to load from localStorage for immediate UI update
        const savedThemeMode = localStorage.getItem('themeMode');
        if (savedThemeMode && ['light', 'dark', 'system'].includes(savedThemeMode)) {
          setThemeMode(savedThemeMode as ThemeMode);
        }

        const savedFontSize = localStorage.getItem('fontSize');
        if (savedFontSize && ['small', 'medium', 'large'].includes(savedFontSize)) {
          setFontSize(savedFontSize as FontSize);
        }

        const savedReducedMotion = localStorage.getItem('reducedMotion');
        if (savedReducedMotion) {
          setReducedMotion(savedReducedMotion === 'true');
        }

        const savedHighContrast = localStorage.getItem('highContrast');
        if (savedHighContrast) {
          setHighContrast(savedHighContrast === 'true');
        }

        // If authenticated, load from backend and sync
        if (isAuthenticated && user) {
          try {
            const backendSettings = await syncSettings.load();
            if (backendSettings?.theme) {
              const themeSettings = backendSettings.theme;
              
              if (themeSettings.theme && ['light', 'dark', 'system'].includes(themeSettings.theme)) {
                setThemeMode(themeSettings.theme as ThemeMode);
              }
              
              if (themeSettings.fontSize && ['small', 'medium', 'large'].includes(themeSettings.fontSize)) {
                setFontSize(themeSettings.fontSize as FontSize);
              }
              
              if (typeof themeSettings.reducedMotion === 'boolean') {
                setReducedMotion(themeSettings.reducedMotion);
              }
              
              if (typeof themeSettings.highContrast === 'boolean') {
                setHighContrast(themeSettings.highContrast);
              }

              // Update localStorage with backend data
              localStorage.setItem('themeMode', themeSettings.theme || 'system');
              localStorage.setItem('fontSize', themeSettings.fontSize || 'medium');
              localStorage.setItem('reducedMotion', String(themeSettings.reducedMotion || false));
              localStorage.setItem('highContrast', String(themeSettings.highContrast || false));
            }
          } catch (backendError: any) {
            // Silently handle backend connection errors during development
            if (backendError?.code !== 'ECONNREFUSED') {
              console.warn('Failed to sync theme settings:', backendError?.message);
            }
          }
        }
      } catch (error: any) {
        // Only log non-connection errors
        if (error?.code !== 'ECONNREFUSED') {
          console.warn('Failed to load theme preferences:', error?.message);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, [isAuthenticated, user]);

  // Save preferences
  const handleSetThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem('themeMode', mode);
      
      // Sync with backend if authenticated
      if (isAuthenticated && user && isLoaded) {
        syncSettings.theme({ theme: mode });
      }
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  const handleSetFontSize = (size: FontSize) => {
    setFontSize(size);
    try {
      localStorage.setItem('fontSize', size);
      
      // Sync with backend if authenticated
      if (isAuthenticated && user && isLoaded) {
        syncSettings.theme({ fontSize: size });
      }
    } catch (error) {
      console.warn('Failed to save font size preference:', error);
    }
  };

  const handleSetReducedMotion = (enabled: boolean) => {
    setReducedMotion(enabled);
    try {
      localStorage.setItem('reducedMotion', enabled.toString());
      
      // Sync with backend if authenticated
      if (isAuthenticated && user && isLoaded) {
        syncSettings.theme({ reducedMotion: enabled });
      }
    } catch (error) {
      console.warn('Failed to save reduced motion preference:', error);
    }
  };

  const handleSetHighContrast = (enabled: boolean) => {
    setHighContrast(enabled);
    try {
      localStorage.setItem('highContrast', enabled.toString());
      
      // Sync with backend if authenticated
      if (isAuthenticated && user && isLoaded) {
        syncSettings.theme({ highContrast: enabled });
      }
    } catch (error) {
      console.warn('Failed to save high contrast preference:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        actualTheme,
        fontSize,
        reducedMotion,
        highContrast,
        setThemeMode: handleSetThemeMode,
        setFontSize: handleSetFontSize,
        setReducedMotion: handleSetReducedMotion,
        setHighContrast: handleSetHighContrast,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useCustomTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useCustomTheme must be used within a ThemeProvider');
  }
  return context;
};