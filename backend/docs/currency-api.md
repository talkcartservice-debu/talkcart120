# Currency Conversion API

## Overview

The Currency Conversion API provides exchange rates, currency conversion, and formatting services for the TalkCart platform. This API centralizes currency handling to ensure consistency across all platform components.

## Base URL

```
http://localhost:8000/api/currency
```

## Endpoints

### Get Exchange Rates

```
GET /api/currency/rates
```

Get exchange rates for currencies relative to a base currency.

**Query Parameters:**
- `base` (optional, string): Base currency code (default: USD)

**Response:**
```json
{
  "success": true,
  "data": {
    "base": "USD",
    "rates": {
      "USD": 1,
      "EUR": 0.85,
      "GBP": 0.75,
      "KES": 110,
      "UGX": 3700,
      // ... more currencies
    },
    "timestamp": "2023-01-01T00:00:00.000Z"
  }
}
```

### Convert Currency

```
GET /api/currency/convert
```

Convert an amount from one currency to another.

**Query Parameters:**
- `amount` (required, number): Amount to convert
- `from` (required, string): Source currency code
- `to` (required, string): Target currency code

**Response:**
```json
{
  "success": true,
  "data": {
    "original": {
      "amount": 100,
      "currency": "USD"
    },
    "converted": {
      "amount": 85,
      "currency": "EUR"
    },
    "rate": 0.85
  }
}
```

### Get Currency Symbols

```
GET /api/currency/symbols
```

Get currency symbols mapping.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbols": {
      "USD": "$",
      "EUR": "€",
      "GBP": "£",
      "KES": "KSh",
      // ... more symbols
    }
  }
}
```

### Format Currency

```
GET /api/currency/format
```

Format a currency amount with proper symbols and localization.

**Query Parameters:**
- `amount` (required, number): Amount to format
- `currency` (required, string): Currency code

**Response:**
```json
{
  "success": true,
  "data": {
    "amount": 1234.56,
    "currency": "USD",
    "formatted": "$1,234.56"
  }
}
```

## Supported Currencies

The API supports a wide range of currencies including:

### Major World Currencies
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- CHF (Swiss Franc)
- CNY (Chinese Yuan)

### African Currencies
- KES (Kenyan Shilling)
- UGX (Ugandan Shilling)
- TZS (Tanzanian Shilling)
- RWF (Rwandan Franc)
- NGN (Nigerian Naira)
- GHS (Ghanaian Cedi)
- ZAR (South African Rand)
- ETB (Ethiopian Birr)
- XOF (West African CFA Franc)

### Cryptocurrencies
- ETH (Ethereum)
- BTC (Bitcoin)
- USDC (USD Coin)
- USDT (Tether)

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Caching

Exchange rates are cached for 30 minutes to reduce external API calls and improve performance.

## Usage Examples

### JavaScript/Fetch
```javascript
// Get exchange rates
fetch('http://localhost:8000/api/currency/rates?base=USD')
  .then(response => response.json())
  .then(data => console.log(data));

// Convert currency
fetch('http://localhost:8000/api/currency/convert?amount=100&from=USD&to=EUR')
  .then(response => response.json())
  .then(data => console.log(data.converted.amount));
```

### Mobile App Integration
The mobile app uses the currency service to:
1. Fetch location-based currency for users
2. Convert product prices to user's preferred currency
3. Format currency amounts for display

## Testing

To test the currency API:

```bash
npm run test-currency-api
```

This script verifies:
1. Exchange rates endpoint functionality
2. Currency conversion accuracy
3. Currency symbols retrieval
4. Currency formatting