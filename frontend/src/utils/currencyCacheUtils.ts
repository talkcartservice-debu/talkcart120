/**
 * Utility functions for managing currency cache
 */

/**
 * Clear the cached currency data
 */
export const clearCurrencyCache = (): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('userCurrency');
      console.log('Currency cache cleared successfully');
    }
  } catch (error) {
    console.error('Error clearing currency cache:', error);
  }
};

/**
 * Get the cached currency data
 * @returns Cached currency data or null if not available
 */
export const getCachedCurrency = (): { currency: string; timestamp: number } | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem('userCurrency');
      if (cached) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.error('Error reading cached currency:', error);
  }
  return null;
};

/**
 * Check if the cached currency is still valid (less than 1 hour old)
 * @returns True if cache is valid, false otherwise
 */
export const isCurrencyCacheValid = (): boolean => {
  try {
    const cached = getCachedCurrency();
    if (cached) {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      return (now - cached.timestamp) < oneHour;
    }
  } catch (error) {
    console.error('Error checking currency cache validity:', error);
  }
  return false;
};

export default {
  clearCurrencyCache,
  getCachedCurrency,
  isCurrencyCacheValid
};