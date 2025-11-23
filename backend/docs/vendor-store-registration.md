# Vendor Store Registration System

This document describes the implementation of the vendor store registration system for the TalkCart marketplace.

## Overview

The vendor store registration system allows vendors to create and manage their own store profiles with detailed information beyond what's available in their basic user profile. This includes store branding, policies, contact information, and social media links.

## New Components

### Backend

1. **VendorStore Model** (`backend/models/VendorStore.js`)
   - Stores detailed vendor store information
   - Includes fields for store branding, policies, contact info, and social links
   - References the User model via vendorId

2. **API Endpoints** (`backend/routes/marketplace.js`)
   - `GET /api/marketplace/vendors/me/store` - Get current vendor's store
   - `POST /api/marketplace/vendors/me/store` - Create vendor store
   - `PUT /api/marketplace/vendors/me/store` - Update vendor store
   - `DELETE /api/marketplace/vendors/me/store` - Delete vendor store
   - `GET /api/marketplace/vendors/:vendorId/store` - Get public vendor store info

### Frontend

1. **Vendor Store Registration Page** (`frontend/pages/marketplace/vendor-store-registration.tsx`)
   - Form for vendors to register or update their store information
   - Includes fields for all store details
   - Validation for required fields

2. **Public Vendor Store Page** (`frontend/pages/marketplace/vendor/store/[id].tsx`)
   - Public-facing page to view vendor store information
   - Displays store branding, policies, and contact info
   - Links to vendor's products

3. **Vendor Profile Page** (`frontend/pages/marketplace/vendor/[id].tsx`)
   - Updated vendor profile page with link to store
   - Basic vendor information with link to detailed store page

4. **Updated Pages**
   - Vendor Dashboard - Added link to store registration
   - Vendor Payment Settings - Added link to store management

## API Endpoints

### Get My Store
```
GET /api/marketplace/vendors/me/store
```
Returns the current vendor's store information.

### Create Store
```
POST /api/marketplace/vendors/me/store
```
Creates a new vendor store. Requires authentication.

**Request Body:**
```json
{
  "storeName": "My Awesome Store",
  "storeDescription": "Description of my store",
  "contactEmail": "contact@store.com",
  "contactPhone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "ST",
    "country": "Country",
    "zipCode": "12345"
  },
  "socialLinks": {
    "facebook": "https://facebook.com/mystore",
    "twitter": "https://twitter.com/mystore",
    "instagram": "https://instagram.com/mystore",
    "linkedin": "https://linkedin.com/mystore",
    "website": "https://mystore.com"
  },
  "storePolicy": "Store policies",
  "returnPolicy": "Return policies",
  "shippingPolicy": "Shipping policies"
}
```

### Update Store
```
PUT /api/marketplace/vendors/me/store
```
Updates the current vendor's store information.

### Delete Store
```
DELETE /api/marketplace/vendors/me/store
```
Deletes the current vendor's store.

### Get Vendor Store (Public)
```
GET /api/marketplace/vendors/:vendorId/store
```
Returns public information about a vendor's store.

## Frontend Integration

### API Service
Updated `frontend/src/lib/api.ts` with new vendor store methods:
- `getMyVendorStore()`
- `createVendorStore(storeData)`
- `updateMyVendorStore(storeData)`
- `deleteMyVendorStore()`
- `getVendorStore(vendorId)`

### UI Components
1. **Vendor Store Registration Form**
   - Comprehensive form with validation
   - Sections for store info, address, social links, and policies
   - Save/cancel functionality

2. **Public Store Display**
   - Banner and logo display
   - Store information sections
   - Social media links
   - Policy information

## Database Schema

### VendorStore Model
```javascript
{
  vendorId: ObjectId (ref: User, unique),
  storeName: String (required),
  storeDescription: String,
  storeLogo: String,
  storeBanner: String,
  contactEmail: String,
  contactPhone: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String,
    website: String
  },
  storePolicy: String,
  returnPolicy: String,
  shippingPolicy: String,
  isVerified: Boolean (default: false),
  verificationStatus: String (enum: pending, approved, rejected),
  verificationDocuments: [String],
  isActive: Boolean (default: true),
  rating: Number (default: 0),
  reviewCount: Number (default: 0),
  followerCount: Number (default: 0)
}
```

## Implementation Notes

1. **Authentication**: All store management endpoints require authentication
2. **Authorization**: Vendors can only manage their own stores
3. **Validation**: Required fields are validated on creation/update
4. **Uniqueness**: Each vendor can only have one store
5. **Public Access**: Store information is publicly accessible via vendor ID

## Future Enhancements

1. Store verification process
2. Store analytics and reporting
3. Store customization options
4. Store rating and review system
5. Store following functionality