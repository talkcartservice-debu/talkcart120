import { useContext } from 'react';
import { ThemeContext, useCustomTheme } from '@/contexts/ThemeContext';

export const useThemeToggle = () => {
  const context = useCustomTheme();
  
  const toggleTheme = () => {
    // Toggle between light, dark, and system
    if (context.themeMode === 'light') {
      context.setThemeMode('dark');
    } else if (context.themeMode === 'dark') {
      context.setThemeMode('system');
    } else {
      context.setThemeMode('light');
    }
  };
  
  return {
    theme: context.actualTheme,
    toggleTheme,
    isDarkMode: context.actualTheme === 'dark',
    themeMode: context.themeMode,
  };
};

export default useThemeToggle;