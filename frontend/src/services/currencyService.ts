import axios from 'axios';

// Exchange rate API service
class CurrencyService {
  private static instance: CurrencyService;
  private exchangeRates: Record<string, number> = {};
  private lastUpdated: number = 0;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache

  private constructor() {}

  public static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  /**
   * Fetch exchange rates from a real API
   * @param baseCurrency Base currency (default: USD)
   * @returns Exchange rates object
   */
  async fetchExchangeRates(baseCurrency: string = 'USD'): Promise<Record<string, number>> {
    const now = Date.now();
    
    // Return cached rates if they're still valid
    if (this.exchangeRates[baseCurrency] && (now - this.lastUpdated) < this.CACHE_DURATION) {
      console.log('Using cached exchange rates for', baseCurrency);
      return this.exchangeRates;
    }

    try {
      console.log('Fetching exchange rates from API for base currency:', baseCurrency);
      // Using exchangerate-api.com (free tier available)
      const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`, {
        timeout: 5000 // 5 second timeout
      });
      
      if (response.data && response.data.rates) {
        this.exchangeRates = response.data.rates;
        this.lastUpdated = now;
        console.log('Successfully fetched exchange rates:', this.exchangeRates);
        return this.exchangeRates;
      } else {
        throw new Error('Invalid response from exchange rate API');
      }
    } catch (error: any) {
      console.error('Error fetching exchange rates:', error.message || error);
      
      // Fallback to mock data in case of API failure
      const MOCK_EXCHANGE_RATES: Record<string, number> = {
        'USD': 1,
        'EUR': 0.85,
        'GBP': 0.75,
        'KES': 110,
        'UGX': 3700,
        'TZS': 2300,
        'RWF': 1050,
        'NGN': 410,
        'GHS': 6.5,
        'ZAR': 15.5,
        'ETB': 45,
        'XOF': 600,
      };
      
      console.log('Using mock exchange rates as fallback');
      this.exchangeRates = MOCK_EXCHANGE_RATES;
      this.lastUpdated = now;
      return this.exchangeRates;
    }
  }

  /**
   * Convert amount from one currency to another
   * @param amount Amount to convert
   * @param fromCurrency Source currency
   * @param toCurrency Target currency
   * @returns Converted amount
   */
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    console.log('Converting currency in service:', { amount, fromCurrency, toCurrency });
    
    // If currencies are the same, no conversion needed
    if (fromCurrency === toCurrency) {
      console.log('Currencies are the same, returning original amount');
      return amount;
    }

    try {
      // Fetch exchange rates with USD as base
      const rates = await this.fetchExchangeRates('USD');
      console.log('Fetched exchange rates:', rates);
      
      // Convert to USD first if needed
      let amountInUsd = amount;
      if (fromCurrency !== 'USD') {
        const fromRate = rates[fromCurrency.toUpperCase()];
        console.log('From rate:', { fromCurrency, fromRate });
        if (!fromRate) {
          console.warn(`Exchange rate not found for ${fromCurrency}, returning original amount`);
          return amount;
        }
        amountInUsd = amount / fromRate;
        console.log('Amount in USD:', amountInUsd);
      }
      
      // Convert from USD to target currency
      if (toCurrency === 'USD') {
        console.log('Converting to USD, result:', amountInUsd);
        return amountInUsd;
      }
      
      const toRate = rates[toCurrency.toUpperCase()];
      console.log('To rate:', { toCurrency, toRate });
      if (!toRate) {
        console.warn(`Exchange rate not found for ${toCurrency}, returning original amount`);
        return amount;
      }
      
      const result = amountInUsd * toRate;
      console.log('Final conversion result:', { amount, fromCurrency, toCurrency, result });
      return result;
    } catch (error) {
      console.error('Error converting currency:', error);
      // Return original amount if conversion fails
      return amount;
    }
  }

  /**
   * Format currency amount with proper symbol and formatting
   * @param amount Amount to format
   * @param currency Currency code
   * @returns Formatted currency string
   */
  formatCurrencyAmount(amount: number, currency: string): string {
    console.log('Formatting currency amount:', { amount, currency });
    try {
      // Currency symbols mapping
      const currencySymbols: Record<string, string> = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'KES': 'KSh',
        'UGX': 'USh',
        'TZS': 'TSh',
        'RWF': 'RF',
        'NGN': '₦',
        'GHS': 'GH₵',
        'ZAR': 'R',
        'ETB': 'Br',
        'XOF': 'CFA',
      };

      const symbol = currencySymbols[currency.toUpperCase()] || currency;
      console.log('Currency symbol:', symbol);
      
      // For most currencies, show 2 decimal places
      // For some currencies with smaller denominations, show more precision
      const precisionCurrencies = ['UGX', 'TZS', 'RWF', 'XOF'];
      const decimals = precisionCurrencies.includes(currency.toUpperCase()) ? 0 : 2;
      
      // Format with commas for thousands
      const formattedAmount = amount.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      
      console.log('Formatted amount:', formattedAmount);
      
      // Place symbol appropriately based on currency
      const symbolFirstCurrencies = ['USD', 'EUR', 'GBP', 'NGN', 'GHS', 'ZAR'];
      let result: string;
      if (symbolFirstCurrencies.includes(currency.toUpperCase())) {
        result = `${symbol}${formattedAmount}`;
      } else {
        result = `${formattedAmount} ${symbol}`;
      }
      
      console.log('Final formatted result:', result);
      return result;
    } catch (error: any) {
      console.error('Error formatting currency amount:', error.message || error);
      // Fallback to simple formatting
      return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
    }
  }

  /**
   * Detect user's preferred currency based on their locale
   * @returns Detected currency code
   */
  detectUserCurrency(): string {
    try {
      console.log('Detecting user currency by locale...');
      // This is a simplified example - in a real app, you would use a geolocation service
      // or browser APIs to detect the user's location and map it to a currency
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
        'fr-SN': 'XOF',
        'fr-BF': 'XOF',
        'fr-ML': 'XOF',
      };
      
      const currency = currencyMap[userLocale] || 'USD';
      console.log('Locale-based currency:', currency);
      return currency.toUpperCase(); // Make sure it's uppercase
    } catch (error) {
      console.error('Error detecting user currency:', error);
      return 'USD';
    }
  }

  /**
   * Fetch user's location-based currency using IP geolocation with improved error handling
   * @returns Currency code based on user's location
   */
  async fetchLocationBasedCurrency(): Promise<string> {
    try {
      console.log('Fetching location-based currency...');
      
      // Check cache first to avoid hitting rate limits
      const cachedCurrency = this.getCachedCurrency();
      if (cachedCurrency) {
        console.log('Using cached currency:', cachedCurrency);
        return cachedCurrency;
      }
      
      // Try ipapi.co first (re-enabled with better error handling)
      try {
        console.log('Trying ipapi.co service...');
        const result = await this.fetchFromIpApiService();
        if (result) {
          // Cache the result for 1 hour to avoid rate limits
          this.cacheCurrency(result);
          return result;
        }
      } catch (error) {
        console.error('Failed to fetch from ipapi.co:', error);
      }
      
      // Try alternative services if ipapi.co fails
      try {
        console.log('Trying alternative geolocation services...');
        const result = await this.fetchFromAlternativeServices();
        if (result) {
          // Cache the result for 1 hour to avoid rate limits
          this.cacheCurrency(result);
          return result;
        }
      } catch (error) {
        console.error('Failed to fetch from alternative services:', error);
      }
      
      console.log('All geolocation services failed, falling back to locale detection');
      // Fallback to locale-based detection
      const localeCurrency = this.detectUserCurrency();
      // Cache the locale-based result as well
      this.cacheCurrency(localeCurrency);
      return localeCurrency;
    } catch (error: any) {
      console.error('Error fetching location-based currency:', error.message || error);
      // Fallback to locale-based detection
      const localeCurrency = this.detectUserCurrency();
      // Cache the locale-based result as well
      this.cacheCurrency(localeCurrency);
      return localeCurrency;
    }
  }

  /**
   * Get cached currency if available and not expired
   * @returns Currency code or null if not available or expired
   */
  private getCachedCurrency(): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem('userCurrency');
        if (cached) {
          const { currency, timestamp } = JSON.parse(cached);
          const now = Date.now();
          const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
          
          // Check if cache is less than 1 hour old
          if (now - timestamp < oneHour) {
            console.log('Found valid cached currency:', currency);
            return currency;
          } else {
            console.log('Cached currency expired, removing cache');
            localStorage.removeItem('userCurrency');
          }
        }
      }
    } catch (error) {
      console.error('Error reading cached currency:', error);
      // Clear invalid cache
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem('userCurrency');
        }
      } catch (e) {
        // Ignore errors when clearing cache
      }
    }
    return null;
  }

  /**
   * Cache currency with timestamp
   * @param currency Currency code to cache
   */
  private cacheCurrency(currency: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cacheData = {
          currency: currency,
          timestamp: Date.now()
        };
        localStorage.setItem('userCurrency', JSON.stringify(cacheData));
        console.log('Cached currency:', currency);
      }
    } catch (error) {
      console.error('Error caching currency:', error);
    }
  }

  /**
   * Fetch from ipapi.co service with better error handling
   * @returns Currency code or null if failed
   */
  private async fetchFromIpApiService(): Promise<string | null> {
    // Re-enabling ipapi.co with better timeout handling
    try {
      console.log('Making request to ipapi.co...');
      
      // Use a reasonable timeout to prevent hanging
      const response = await axios.get('https://ipapi.co/json/', {
        timeout: 2000, // 2 second timeout
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('Received response from ipapi.co:', response.status, response.statusText);
      
      // Check for rate limiting (429 status)
      if (response.status === 429) {
        console.warn('Rate limit exceeded for ipapi.co, falling back to locale detection');
        return null;
      }
      
      // Check for service unavailable (503 status)
      if (response.status === 503) {
        console.warn('Service unavailable for ipapi.co, falling back to locale detection');
        return null;
      }
      
      // Log response data structure for debugging
      console.log('Response data structure:', Object.keys(response.data || {}));
      
      // Validate response
      if (response && response.data && response.data.currency) {
        const currency = response.data.currency;
        console.log('Currency from ipapi.co:', currency);
        // Validate that currency is a string and reasonable length
        if (typeof currency === 'string' && currency.length === 3) {
          const result = currency.toUpperCase();
          console.log('Validated currency from ipapi.co:', result);
          return result;
        } else {
          console.warn('Invalid currency format from ipapi.co:', currency);
        }
      } else {
        console.warn('No currency data in response from ipapi.co');
        console.log('Full response data:', response.data);
      }
      
      return null;
    } catch (error: any) {
      // More detailed error logging
      if (error.code === 'ECONNABORTED') {
        console.error('Request to ipapi.co timed out - service may be slow or down');
      } else if (error.code === 'ENOTFOUND') {
        console.error('DNS lookup failed for ipapi.co - service may be blocked or down');
      } else if (error.response) {
        console.error('ipapi.co responded with error:', error.response.status, error.response.statusText);
        console.log('Error response data:', error.response.data);
        
        // Check for rate limiting (429 status)
        if (error.response.status === 429) {
          console.warn('Rate limit exceeded for ipapi.co, falling back to locale detection');
          return null;
        }
        
        // Check for service unavailable (503 status)
        if (error.response.status === 503) {
          console.warn('Service unavailable for ipapi.co, falling back to locale detection');
          return null;
        }
      } else if (error.request) {
        console.error('No response received from ipapi.co:', error.message);
        console.log('Request details:', error.request);
        // Check if this is a network security issue
        if (error.message && (error.message.includes('ERR_FAILED') || error.message.includes('network error'))) {
          console.error('Network request failed - ipapi.co may be blocked by browser security policies or network issues');
        }
      } else {
        console.error('Error setting up request to ipapi.co:', error.message);
      }
      
      // Return null to trigger fallback mechanism
      return null;
    }
  }

  /**
   * Fetch from alternative services
   * @returns Currency code or null if failed
   */
  private async fetchFromAlternativeServices(): Promise<string | null> {
    // Try ipapi.com as an alternative service (different from ipapi.co)
    try {
      console.log('Trying ip-api.com service...');
      const response = await axios.get('http://ip-api.com/json/', {
        timeout: 3000, // Increased timeout to 3 seconds
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (response && response.data && response.data.countryCode) {
        const countryCode = response.data.countryCode;
        console.log('Country code from ip-api.com:', countryCode);
        // Map country code to currency (simple mapping)
        const currencyMap: Record<string, string> = {
          'KE': 'KES',
          'UG': 'UGX',
          'TZ': 'TZS',
          'RW': 'RWF',  // Rwanda mapping
          'NG': 'NGN',
          'GH': 'GHS',
          'ZA': 'ZAR',
          'ET': 'ETB',
          'SN': 'XOF',
          'BF': 'XOF',
          'ML': 'XOF',
          'US': 'USD',
          'GB': 'GBP',
          'DE': 'EUR',
          'FR': 'EUR',
          'IT': 'EUR',
          'ES': 'EUR',
          'CA': 'CAD',
          'AU': 'AUD',
          'JP': 'JPY',
          'CN': 'CNY',
          'IN': 'INR',
        };
        
        const currency = currencyMap[countryCode];
        if (currency) {
          console.log('Mapped currency from country code:', currency);
          return currency;
        } else {
          console.log('No currency mapping found for country code:', countryCode);
        }
      } else {
        console.log('No country code in response from ip-api.com');
        console.log('Response data:', response?.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch from ip-api.com:', error.message || error);
      // Don't return null here, continue to try other methods
    }
    
    // Try a direct currency detection service
    try {
      console.log('Trying currency detection via locale...');
      // This is a more direct approach that might work better
      const localeCurrency = this.detectUserCurrency();
      if (localeCurrency) {
        console.log('Locale-based currency detected:', localeCurrency);
        return localeCurrency;
      }
    } catch (error) {
      console.error('Failed to detect currency via locale:', error);
    }
    
    console.log('No working alternative services found');
    return null;
  }
}

export default CurrencyService.getInstance();