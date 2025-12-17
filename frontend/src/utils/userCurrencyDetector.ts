/**
 * Utility functions for detecting user's currency based on their location
 */
import CurrencyService from '@/services/currencyService';

/**
 * Detect user's currency based on their IP location with multiple fallbacks
 * @returns Promise that resolves to the detected currency code
 */
export const detectCurrencyByLocation = async (): Promise<string> => {
  try {
    console.log('Detecting currency by location...');
    // Use the currency service which has better error handling
    const currency = await CurrencyService.fetchLocationBasedCurrency();
    console.log('Currency service returned:', currency);
    // Validate that we got a reasonable currency code
    if (currency && typeof currency === 'string' && currency.length === 3) {
      const result = currency.toUpperCase();
      console.log('Validated currency:', result);
      return result;
    }
    console.log('Invalid currency from service, falling back to locale detection');
    // If currency service returns invalid data, fall back to locale detection
    return detectCurrencyByLocale();
  } catch (error: any) {
    console.error('Error detecting currency by location:', error.message || error);
    // Fallback to locale-based detection
    return detectCurrencyByLocale();
  }
};

/**
 * Detect user's currency based on their browser locale
 * @returns Detected currency code
 */
export const detectCurrencyByLocale = (): string => {
  try {
    console.log('Detecting currency by locale...');
    const userLocale = navigator.language || 'en-US';
    console.log('User locale:', userLocale);
    const currencyMap: Record<string, string> = {
      'en-KE': 'KES',
      'en-UG': 'UGX',
      'en-TZ': 'TZS',
      'en-RW': 'RWF',
      'en-NG': 'NGN',
      'en-GH': 'GHS',
      'en-ZA': 'ZAR',
      'en-ET': 'ETB',
      'fr-RW': 'RWF',
      'fr-SN': 'XOF',
      'fr-BF': 'XOF',
      'fr-ML': 'XOF',
    };
    
    const currency = currencyMap[userLocale] || 'USD';
    console.log('Locale-based currency:', currency);
    return currency.toUpperCase();
  } catch (error: any) {
    console.error('Error detecting currency by locale:', error.message || error);
    return 'USD';
  }
};

/**
 * Get user's currency with preference for location-based detection
 * @returns Promise that resolves to the detected currency code
 */
export const getUserCurrency = async (): Promise<string> => {
  try {
    console.log('Getting user currency...');
    const currency = await detectCurrencyByLocation();
    console.log('Detected currency:', currency);
    // Ultimate validation
    if (currency && typeof currency === 'string' && currency.length === 3) {
      const result = currency.toUpperCase();
      console.log('Final user currency:', result);
      return result;
    }
    console.log('Invalid currency detected, using USD as fallback');
    return 'USD'; // Ultimate fallback
  } catch (error: any) {
    console.error('Error in getUserCurrency:', error.message || error);
    // Ultimate fallback
    console.log('Error occurred, using USD as fallback');
    return 'USD';
  }
};

// Add a cache-busting function for development
if (typeof window !== 'undefined') {
  (window as any).clearCurrencyCache = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('userCurrency');
        console.log('Currency cache cleared');
      }
    } catch (error) {
      console.error('Error clearing currency cache:', error);
    }
  };
  
  console.log('To clear currency cache, run: clearCurrencyCache() in browser console');
}

const userCurrencyDetector = {
  detectCurrencyByLocation,
  detectCurrencyByLocale,
  getUserCurrency
};

export default userCurrencyDetector;