# Social Page Trending Products Fix

## Issue Description
The trending products sidebar on the social page was displaying mock/random data instead of real trending products from the backend. This was happening because the component was using the wrong API endpoint.

## Root Cause Analysis
Upon investigation, I found that there were two different components:

1. **Social Page Component**: `src/components/social/new/TrendingProducts.tsx`
   - Used `api.marketplace.getRandomProducts()` endpoint
   - Returned random products, not actual trending ones
   - Displayed in the social page sidebar

2. **Marketplace Component**: `src/components/marketplace/MarketplaceSidebar.tsx`
   - Used `api.marketplace.getTrendingProducts()` endpoint
   - Returned actual trending products based on views, sales, and ratings
   - Displayed in the marketplace page sidebar

## Solution Implemented
Modified the social page's `TrendingProducts` component to use the correct API endpoint:

**Before:**
```typescript
const response: any = await api.marketplace.getRandomProducts(4);
```

**After:**
```typescript
const response: any = await api.marketplace.getTrendingProducts(4);
```

Also updated the warning message to reflect the correct function name.

## Impact
- The social page's trending products sidebar now displays real trending data from the backend
- Maintains all existing UI functionality (2x2 grid layout, auto-refresh every 45 seconds, etc.)
- No breaking changes to the component interface
- Consistent behavior with the marketplace page's trending products sidebar

## Verification
The fix was verified by:
1. Confirming the API endpoint change in the source code
2. Testing that the `getTrendingProducts` endpoint returns real data
3. Ensuring the component structure and functionality remain intact

## Files Modified
- `src/components/social/new/TrendingProducts.tsx` - Changed API endpoint from `getRandomProducts` to `getTrendingProducts`

## Result
The social page now correctly displays trending products based on actual user engagement metrics (views, sales, ratings) instead of random products, providing a more relevant and engaging user experience.