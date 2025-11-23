// Simple test file to verify currency conversion functionality
import { convertUsdToCurrency, formatCurrencyAmount } from './currencyConverter';
import { getUserCurrency } from './userCurrencyDetector';

async function testCurrencyConversion() {
  try {
    console.log('Testing currency conversion...');
    
    // Test user currency detection
    const userCurrency = await getUserCurrency();
    console.log('Detected user currency:', userCurrency);
    
    // Test USD to EUR conversion
    const eurAmount = await convertUsdToCurrency(100, 'EUR');
    console.log(`100 USD = ${eurAmount} EUR`);
    console.log(`Formatted: ${formatCurrencyAmount(eurAmount, 'EUR')}`);
    
    // Test USD to KES conversion
    const kesAmount = await convertUsdToCurrency(100, 'KES');
    console.log(`100 USD = ${kesAmount} KES`);
    console.log(`Formatted: ${formatCurrencyAmount(kesAmount, 'KES')}`);
    
    // Test USD to UGX conversion
    const ugxAmount = await convertUsdToCurrency(100, 'UGX');
    console.log(`100 USD = ${ugxAmount} UGX`);
    console.log(`Formatted: ${formatCurrencyAmount(ugxAmount, 'UGX')}`);
    
    // Test currency formatting
    console.log('Testing currency formatting...');
    console.log(`Formatted USD: ${formatCurrencyAmount(100, 'USD')}`);
    console.log(`Formatted EUR: ${formatCurrencyAmount(85, 'EUR')}`);
    console.log(`Formatted KES: ${formatCurrencyAmount(11000, 'KES')}`);
    console.log(`Formatted UGX: ${formatCurrencyAmount(370000, 'UGX')}`);
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testCurrencyConversion();

export default testCurrencyConversion;