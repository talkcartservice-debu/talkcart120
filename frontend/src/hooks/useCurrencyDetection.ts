import { useState, useEffect } from 'react';
import { fetchLocationBasedCurrency } from '@/utils/currencyConverter';

/**
 * Hook to detect user's preferred currency based on their location
 * @returns Object containing the detected currency and loading state
 */
export const useCurrencyDetection = () => {
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        setLoading(true);
        const detectedCurrency = await fetchLocationBasedCurrency();
        setCurrency(detectedCurrency);
      } catch (err) {
        setError('Failed to detect currency');
        // Fallback to USD
        setCurrency('USD');
      } finally {
        setLoading(false);
      }
    };

    detectCurrency();
  }, []);

  return { currency, loading, error };
};

export default useCurrencyDetection;