import { useCustomTheme } from '@/contexts/ThemeContext';

export const useTheme = () => {
  return useCustomTheme();
};

export default useTheme;