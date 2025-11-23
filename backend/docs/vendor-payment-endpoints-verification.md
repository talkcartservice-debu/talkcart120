# Vendor Payment Settings - Endpoint Verification

## Overview
This document verifies that all vendor payment settings endpoints are properly configured and working.

## Fixed Issues

### Route Ordering Issue
**Problem:** Express was matching `/vendors/me/payment-preferences` as `/vendors/:vendorId/payment-preferences` with `vendorId = "me"`, causing "Invalid vendor ID" errors.

**Solution:** Reordered routes so specific routes (`/vendors/me/*`) come BEFORE parameterized routes (`/vendors/:vendorId/*`).

### Routes Fixed:
1. **Payment Preferences Routes** (lines 1685-1809)
   - `/vendors/me/payment-preferences` (GET) - now comes BEFORE parameterized route
   - `/vendors/:vendorId/payment-preferences` (GET) - now comes AFTER specific route

2. **Store Routes** (lines 1969-2111)
   - `/vendors/me/store` (GET) - now comes BEFORE parameterized route
   - `/vendors/:vendorId/store` (GET) - now comes AFTER specific route

## Endpoints

### 1. Get My Payment Preferences (Private)
**Endpoint:** `GET /api/marketplace/vendors/me/payment-preferences`  
**Access:** Private - Vendor only (requires authentication)  
**Authentication:** Bearer token required

**Response (Success - No Preferences):**
```json
{
  "success": true,
  "data": {
    "mobileMoney": { "enabled": false },
    "bankAccount": { "enabled": false },
    "paypal": { "enabled": false },
    "cryptoWallet": { "enabled": false },
    "defaultPaymentMethod": "mobileMoney",
    "withdrawalPreferences": {
      "minimumAmount": 10,
      "frequency": "weekly"
    }
  }
}
```

**Response (Success - With Preferences):**
```json
{
  "success": true,
  "data": {
    "mobileMoney": {
      "enabled": true,
      "provider": "MTN",
      "phoneNumber": "+233123456789",
      "country": "Ghana"
    },
    "bankAccount": {
      "enabled": false
    },
    "paypal": {
      "enabled": false
    },
    "cryptoWallet": {
      "enabled": false
    },
    "defaultPaymentMethod": "mobileMoney",
    "withdrawalPreferences": {
      "minimumAmount": 50,
      "frequency": "weekly"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Vendor ID is required
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

---

### 2. Update My Payment Preferences (Private)
**Endpoint:** `PUT /api/marketplace/vendors/me/payment-preferences`  
**Access:** Private - Vendor only (requires authentication)  
**Authentication:** Bearer token required

**Request Body:**
```json
{
  "mobileMoney": {
    "enabled": true,
    "provider": "MTN",
    "phoneNumber": "+233123456789",
    "country": "Ghana"
  },
  "bankAccount": {
    "enabled": false
  },
  "paypal": {
    "enabled": false
  },
  "cryptoWallet": {
    "enabled": false
  },
  "defaultPaymentMethod": "mobileMoney",
  "withdrawalPreferences": {
    "minimumAmount": 50,
    "frequency": "weekly"
  }
}
```

**Validation Rules:**
1. At least one payment method must be enabled
2. Default payment method must be enabled
3. Mobile Money (if enabled):
   - `provider` is required
   - `phoneNumber` is required
   - `country` is required
4. Bank Account (if enabled):
   - `accountHolderName` is required
   - `accountNumber` is required
   - `bankName` is required
   - `country` is required
5. PayPal (if enabled):
   - `email` is required
6. Crypto Wallet (if enabled):
   - `walletAddress` is required
   - `network` is required
7. Withdrawal Preferences:
   - `minimumAmount` must be a number > 0
   - `frequency` must be one of: 'daily', 'weekly', 'monthly', 'manual'

**Response (Success):**
```json
{
  "success": true,
  "data": { /* updated preferences */ },
  "message": "Payment preferences updated successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors (see validation rules above)
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

---

### 3. Get Vendor Payment Preferences (Public)
**Endpoint:** `GET /api/marketplace/vendors/:vendorId/payment-preferences`  
**Access:** Public (no authentication required)  
**Parameters:** `vendorId` - MongoDB ObjectId of the vendor

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "mobileMoney": {
      "enabled": true,
      "provider": "MTN",
      "country": "Ghana"
    },
    "bankAccount": {
      "enabled": false
    },
    "paypal": {
      "enabled": false
    },
    "cryptoWallet": {
      "enabled": false
    },
    "defaultPaymentMethod": "mobileMoney"
  }
}
```

**Note:** This endpoint only returns enabled payment methods and public information. Sensitive data like phone numbers, account numbers, etc. are not included.

**Error Responses:**
- `400 Bad Request` - Invalid vendor ID (not a valid MongoDB ObjectId)
- `500 Internal Server Error` - Server error

---

### 4. Get My Payout History (Private)
**Endpoint:** `GET /api/marketplace/vendors/me/payout-history`  
**Access:** Private - Vendor only (requires authentication)  
**Authentication:** Bearer token required

**Query Parameters:**
- `limit` (optional) - Number of records to return (1-100, default: 50)
- `status` (optional) - Filter by status ('pending', 'processing', 'completed', 'failed')

**Example:** `GET /api/marketplace/vendors/me/payout-history?limit=20&status=completed`

**Response (Success):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "orderId": "507f1f77bcf86cd799439012",
      "amount": 45.50,
      "currency": "USD",
      "method": "mobileMoney",
      "status": "completed",
      "transactionId": "TXN123456",
      "processedAt": "2025-10-20T10:30:00.000Z",
      "details": {
        "provider": "MTN",
        "phoneNumber": "+233***6789"
      }
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Invalid limit parameter or Vendor ID is required
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

---

## Frontend Integration

### API Methods (frontend/src/lib/api.ts)

```typescript
// Get my payment preferences
api.marketplace.getMyPaymentPreferences()

// Update my payment preferences
api.marketplace.updateMyPaymentPreferences(preferencesData)

// Get vendor payment preferences (public)
api.marketplace.getVendorPaymentPreferences(vendorId)

// Get my payout history
api.marketplace.getMyPayoutHistory({ limit: 20, status: 'completed' })
```

### Usage in Component (frontend/pages/marketplace/vendor-payment-settings.tsx)

```typescript
// Fetch payment preferences
const response = await api.marketplace.getMyPaymentPreferences();

// Update payment preferences
const response = await api.marketplace.updateMyPaymentPreferences(preferences);

// Fetch payout history
const response = await api.marketplace.getMyPayoutHistory({ limit: 20 });
```

---

## Testing

### Manual Testing Steps

1. **Start the backend server:**
   ```bash
   cd backend
   node server.js
   ```

2. **Test GET /vendors/me/payment-preferences:**
   - Navigate to vendor payment settings page
   - Should load default preferences if none exist
   - Should not show "Invalid vendor ID" error

3. **Test PUT /vendors/me/payment-preferences:**
   - Fill in payment method details
   - Click Save
   - Should update successfully

4. **Test GET /vendors/me/payout-history:**
   - Should load payout history (empty array if none)
   - Should not show 500 error

### Verification Checklist

- [x] Routes are in correct order (specific before parameterized)
- [x] GET /vendors/me/payment-preferences returns 200 with valid token
- [x] GET /vendors/me/payment-preferences returns 401 without token
- [x] PUT /vendors/me/payment-preferences validates input correctly
- [x] GET /vendors/:vendorId/payment-preferences works for public access
- [x] GET /vendors/me/payout-history returns data with valid token
- [x] Frontend API methods are correctly configured
- [x] No "Invalid vendor ID" errors when accessing /vendors/me/* routes

---

## Backend Server Restart Required

**Important:** After making route changes, the backend server MUST be restarted for the changes to take effect.

```bash
# Kill existing process
taskkill //F //PID <process_id>

# Start backend
cd backend
node server.js
```

---

## Status: ✅ VERIFIED

All vendor payment settings endpoints are now properly configured and working correctly.

