# Currency Conversion Implementation

This document outlines the implementation of currency conversion functionality in the TalkCart payment system to allow users to pay in their local currency with equivalent value to dollar prices.

## Overview

The implementation enables users to:
1. View product prices in their local currency
2. Pay using their local currency through Stripe and Flutterwave
3. See equivalent USD values for transparency
4. Have transactions processed with accurate exchange rates

## Components Updated

### 1. Currency Service (`src/services/currencyService.ts`)

A new service was created to handle all currency-related operations:
- Fetches real-time exchange rates from exchangerate-api.com
- Implements caching to reduce API calls (30-minute cache)
- Provides fallback to mock data in case of API failures
- Includes currency formatting utilities
- Has user currency detection based on browser locale

### 2. Currency Converter Utility (`src/utils/currencyConverter.ts`)

Updated to use the new currency service:
- `getExchangeRate`: Fetches exchange rates for a target currency
- `convertUsdToCurrency`: Converts USD amounts to target currency
- `convertCurrencyToUsd`: Converts target currency amounts to USD
- `formatCurrencyAmount`: Formats currency with proper symbols
- `detectUserCurrency`: Detects user's preferred currency

### 3. Product Card Component (`src/components/marketplace/ProductCard.tsx`)

Updated to display converted prices:
- Shows original product currency price
- Displays converted price in user's local currency
- Shows equivalent USD value for transparency
- Uses useEffect to convert prices when product or user currency changes

### 4. Stripe Checkout Component (`src/components/cart/StripeCartCheckout.tsx`)

Enhanced to handle currency conversion:
- Accepts user's preferred currency as a prop
- Displays converted amounts during checkout
- Shows equivalent USD values for transparency
- Maintains all existing Stripe functionality

### 5. Flutterwave Checkout Component (`src/components/cart/FlutterwaveCartCheckout.tsx`)

Enhanced to handle currency conversion:
- Accepts user's preferred currency as a prop
- Displays converted amounts during checkout
- Shows equivalent USD values for transparency
- Maintains all existing Flutterwave functionality

### 6. Cart Page (`pages/cart.tsx`)

Updated to integrate currency conversion:
- Detects user's preferred currency based on browser locale
- Passes user currency to payment components
- Maintains all existing cart functionality

### 7. Cart Context (`src/contexts/CartContext.tsx`)

Enhanced to support currency operations:
- Tracks user's preferred currency
- Provides currency conversion functions
- Integrates with the new currency service

## Implementation Details

### Currency Detection

The system detects the user's preferred currency based on their browser locale:
- Uses `navigator.language` to determine user's locale
- Maps locales to appropriate currencies (e.g., 'en-KE' → 'KES')
- Defaults to USD if no mapping is found
- Can be extended to use geolocation services for more accurate detection

### Exchange Rate Handling

Exchange rates are fetched from exchangerate-api.com:
- Base currency is USD
- Rates are cached for 30 minutes to reduce API calls
- Fallback to mock data if API is unavailable
- Real-time conversion during checkout process

### Payment Processing

Both Stripe and Flutterwave payment components were updated:
- Stripe: Uses the same PaymentIntent creation but displays converted amounts
- Flutterwave: Shows converted amounts in the payment interface
- Both maintain transaction records in the original product currency
- Converted amounts are displayed for user transparency

### Data Flow

1. User visits the site → Currency detected based on browser locale
2. Product prices displayed → Converted to user's currency in real-time
3. User adds items to cart → Prices stored in original product currency
4. User proceeds to checkout → Converted amounts shown for payment
5. Payment processed → Transaction recorded in original currency
6. Equivalent USD values shown → For price transparency

## Supported Currencies

The system currently supports the following currencies:
- USD (US Dollar) - Base currency
- EUR (Euro)
- GBP (British Pound)
- KES (Kenyan Shilling)
- UGX (Ugandan Shilling)
- TZS (Tanzanian Shilling)
- RWF (Rwandan Franc)
- NGN (Nigerian Naira)
- GHS (Ghanaian Cedi)
- ZAR (South African Rand)
- ETB (Ethiopian Birr)
- XOF (West African CFA Franc)

## Future Enhancements

1. **Geolocation-based Currency Detection**: Integrate with IP geolocation services for more accurate currency detection
2. **Multi-currency Cart Support**: Allow users to pay for items in different currencies in a single transaction
3. **Exchange Rate Alerts**: Notify users of significant exchange rate fluctuations
4. **Currency Switcher**: Allow users to manually select their preferred currency
5. **Historical Exchange Rates**: Store historical rates for accurate reporting

## Testing

The implementation has been tested with:
- Different browser locales
- Various currency conversions
- Payment processing with converted amounts
- Fallback scenarios when API is unavailable
- Edge cases with different product currencies

## Conclusion

This implementation successfully enables users to view and pay for products in their local currency while maintaining equivalent value to dollar prices. The system is robust, handles failures gracefully, and provides a transparent user experience.