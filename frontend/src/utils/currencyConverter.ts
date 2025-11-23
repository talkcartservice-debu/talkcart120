import CurrencyService from '@/services/currencyService';
import { getUserCurrency } from '@/utils/userCurrencyDetector';

// Create an instance of the currency service
const currencyService = CurrencyService;

/**
 * Get exchange rate for a currency
 * @param targetCurrency The currency to convert to
 * @returns Exchange rate from USD to target currency
 */
export const getExchangeRate = async (targetCurrency: string): Promise<number> => {
  try {
    const rates = await currencyService.fetchExchangeRates('USD');
    const rate = rates[targetCurrency.toUpperCase()];
    
    if (rate) {
      return rate;
    }
    
    console.warn(`Exchange rate not found for ${targetCurrency}, using 1`);
    return 1;
  } catch (error: any) {
    console.error('Error fetching exchange rate:', error.message || error);
    throw error;
  }
};

/**
 * Convert amount from USD to target currency
 * @param usdAmount Amount in USD
 * @param targetCurrency Target currency code
 * @returns Amount in target currency
 */
export const convertUsdToCurrency = async (usdAmount: number, targetCurrency: string): Promise<number> => {
  try {
    console.log('Converting USD to currency:', { usdAmount, targetCurrency });
    const result = await currencyService.convertCurrency(usdAmount, 'USD', targetCurrency);
    console.log('Conversion result:', { usdAmount, targetCurrency, result });
    return result;
  } catch (error: any) {
    console.error('Error converting USD to currency:', error.message || error);
    // Return original amount if conversion fails
    return usdAmount;
  }
};

/**
 * Convert amount from target currency to USD
 * @param targetAmount Amount in target currency
 * @param targetCurrency Target currency code
 * @returns Amount in USD
 */
export const convertCurrencyToUsd = async (targetAmount: number, targetCurrency: string): Promise<number> => {
  try {
    console.log('Converting currency to USD:', { targetAmount, targetCurrency });
    const result = await currencyService.convertCurrency(targetAmount, targetCurrency, 'USD');
    console.log('Conversion result:', { targetAmount, targetCurrency, result });
    return result;
  } catch (error: any) {
    console.error('Error converting currency to USD:', error.message || error);
    // Return original amount if conversion fails
    return targetAmount;
  }
};

/**
 * Format currency amount with proper symbol and formatting
 * @param amount Amount to format
 * @param currency Currency code
 * @returns Formatted currency string
 */
export const formatCurrencyAmount = (amount: number, currency: string): string => {
  try {
    console.log('Formatting currency amount in converter:', { amount, currency });
    const result = currencyService.formatCurrencyAmount(amount, currency);
    console.log('Formatted result:', result);
    return result;
  } catch (error: any) {
    console.error('Error formatting currency amount:', error.message || error);
    // Fallback to simple formatting
    const fallback = `${amount.toFixed(2)} ${currency.toUpperCase()}`;
    console.log('Using fallback formatting:', fallback);
    return fallback;
  }
};

/**
 * Detect user's preferred currency based on their locale
 * @returns Detected currency code
 */
export const detectUserCurrency = (): string => {
  try {
    return currencyService.detectUserCurrency();
  } catch (error: any) {
    console.error('Error detecting user currency:', error.message || error);
    return 'USD';
  }
};

/**
 * Fetch user's location-based currency with improved error handling
 * @returns Currency code based on user's location
 */
export const fetchLocationBasedCurrency = async (): Promise<string> => {
  try {
    const currency = await currencyService.fetchLocationBasedCurrency();
    // Validate currency before returning
    if (currency && typeof currency === 'string' && currency.length === 3) {
      return currency.toUpperCase();
    }
    return 'USD'; // Fallback if invalid currency
  } catch (error: any) {
    console.error('Error fetching location-based currency:', error.message || error);
    return 'USD'; // Fallback on error
  }
};

export default {
  getExchangeRate,
  convertUsdToCurrency,
  convertCurrencyToUsd,
  formatCurrencyAmount,
  detectUserCurrency,
  fetchLocationBasedCurrency,
  getUserCurrency
};