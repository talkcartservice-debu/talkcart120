# AdminExtraApi Service Documentation

## Overview
AdminExtraApi is a comprehensive service that provides additional administrative functionality for the TalkCart super admin panel. It includes APIs for managing payouts, payments, disputes, users, and media files.

## Architecture

### Core Components
1. **AdminExtraApi** - Main service object containing all administrative API methods
2. **Payouts Management** - Vendor payout tracking and management
3. **Payments Management** - Payment transaction handling
4. **Disputes Management** - Customer dispute resolution
5. **User Management** - Extended user administration
6. **Media Management** - Platform media file management

### Key Features
- **Payout Processing** - Track and manage vendor payouts
- **Payment Analytics** - Analyze payment transactions
- **Dispute Resolution** - Handle customer disputes
- **User Administration** - Extended user management capabilities
- **Media Analytics** - Monitor platform media usage
- **Export Functionality** - Export data to CSV format
- **Cursor-based Pagination** - Efficient data pagination

## API Methods

### Payouts Management

#### getPayouts(query: Record<string, any>)
Fetches payouts with filtering options.

**Parameters:**
- `query` - Filter parameters (status, vendorId, date range, etc.)

**Returns:** Promise resolving to payouts data

```typescript
const payouts = await AdminExtraApi.getPayouts({ 
  status: 'pending', 
  limit: 20 
});
```

#### getPayoutsCursor(query: Record<string, any>, options: { limit?: number; after?: string; before?: string })
Fetches payouts with cursor-based pagination.

**Parameters:**
- `query` - Filter parameters
- `options` - Pagination options
  - `limit` - Number of items to fetch
  - `after` - Cursor for next page
  - `before` - Cursor for previous page

```typescript
const payouts = await AdminExtraApi.getPayoutsCursor(
  { status: 'completed' },
  { limit: 50, after: 'cursor123' }
);
```

#### getPayoutDetails(id: string)
Fetches detailed information for a specific payout.

**Parameters:**
- `id` - Payout ID

```typescript
const payout = await AdminExtraApi.getPayoutDetails('payout123');
```

#### createPayout(data: { amount: number; currency: string; destination?: string; description?: string; metadata?: Record<string, any> })
Creates a new payout.

**Parameters:**
- `data` - Payout creation data

```typescript
const newPayout = await AdminExtraApi.createPayout({
  amount: 1000,
  currency: 'USD',
  destination: 'bank_account_123',
  description: 'Monthly vendor payout'
});
```

#### cancelPayout(id: string)
Cancels a pending payout.

**Parameters:**
- `id` - Payout ID

```typescript
await AdminExtraApi.cancelPayout('payout123');
```

#### getPayoutsAnalytics(timeRange: string)
Fetches payout analytics for a time range.

**Parameters:**
- `timeRange` - Time range (default: '30d')

```typescript
const analytics = await AdminExtraApi.getPayoutsAnalytics('90d');
```

#### getDetailedPayoutsAnalytics(timeRange: string)
Fetches detailed payout analytics.

**Parameters:**
- `timeRange` - Time range (default: '90d')

```typescript
const detailedAnalytics = await AdminExtraApi.getDetailedPayoutsAnalytics('30d');
```

#### getPayoutsSummary()
Fetches payout summary statistics.

```typescript
const summary = await AdminExtraApi.getPayoutsSummary();
```

#### payoutsExportUrl(query: Record<string, any>)
Generates a URL for exporting payouts data to CSV.

**Parameters:**
- `query` - Filter parameters

```typescript
const exportUrl = AdminExtraApi.payoutsExportUrl({ 
  status: 'completed',
  startDate: '2023-01-01'
});
```

### Payments Management

#### getPayments(query: Record<string, any>)
Fetches payment transactions with filtering.

**Parameters:**
- `query` - Filter parameters

```typescript
const payments = await AdminExtraApi.getPayments({ 
  status: 'succeeded',
  limit: 50
});
```

#### getPaymentDetails(id: string)
Fetches detailed payment information.

**Parameters:**
- `id` - Payment ID

```typescript
const payment = await AdminExtraApi.getPaymentDetails('payment123');
```

#### cancelPayment(id: string)
Cancels a pending payment.

**Parameters:**
- `id` - Payment ID

```typescript
await AdminExtraApi.cancelPayment('payment123');
```

#### getPaymentsAnalytics(timeRange: string)
Fetches payment analytics.

**Parameters:**
- `timeRange` - Time range (default: '30d')

```typescript
const analytics = await AdminExtraApi.getPaymentsAnalytics('7d');
```

#### getDetailedPaymentsAnalytics(timeRange: string)
Fetches detailed payment analytics.

**Parameters:**
- `timeRange` - Time range (default: '90d')

```typescript
const detailedAnalytics = await AdminExtraApi.getDetailedPaymentsAnalytics('30d');
```

#### getPaymentsSummary()
Fetches payment summary statistics.

```typescript
const summary = await AdminExtraApi.getPaymentsSummary();
```

#### exportPaymentsUrl(query: Record<string, any>)
Generates a URL for exporting payments data to CSV.

**Parameters:**
- `query` - Filter parameters

```typescript
const exportUrl = AdminExtraApi.exportPaymentsUrl({ 
  status: 'failed',
  endDate: '2023-12-31'
});
```

#### createTestPaymentIntent(data: { amount: number; currency: string })
Creates a test payment intent for development.

**Parameters:**
- `data` - Payment intent data

```typescript
const testPayment = await AdminExtraApi.createTestPaymentIntent({
  amount: 5000,
  currency: 'USD'
});
```

### Disputes Management

#### getDisputes(query: Record<string, any>)
Fetches customer disputes with filtering.

**Parameters:**
- `query` - Filter parameters

```typescript
const disputes = await AdminExtraApi.getDisputes({ 
  status: 'open',
  limit: 25
});
```

#### getDisputesCursor(query: Record<string, any>, options: { limit?: number; after?: string; before?: string })
Fetches disputes with cursor-based pagination.

**Parameters:**
- `query` - Filter parameters
- `options` - Pagination options

```typescript
const disputes = await AdminExtraApi.getDisputesCursor(
  { status: 'won' },
  { limit: 30, after: 'cursor456' }
);
```

#### getDisputeDetails(id: string)
Fetches detailed dispute information.

**Parameters:**
- `id` - Dispute ID

```typescript
const dispute = await AdminExtraApi.getDisputeDetails('dispute123');
```

#### getDisputesAnalytics(timeRange: string)
Fetches dispute analytics.

**Parameters:**
- `timeRange` - Time range (default: '30d')

```typescript
const analytics = await AdminExtraApi.getDisputesAnalytics('14d');
```

#### getDetailedDisputesAnalytics(timeRange: string)
Fetches detailed dispute analytics.

**Parameters:**
- `timeRange` - Time range (default: '90d')

```typescript
const detailedAnalytics = await AdminExtraApi.getDetailedDisputesAnalytics('60d');
```

#### getDisputesSummary()
Fetches dispute summary statistics.

```typescript
const summary = await AdminExtraApi.getDisputesSummary();
```

#### submitDisputeEvidence(id: string, evidence: any)
Submits evidence for a dispute.

**Parameters:**
- `id` - Dispute ID
- `evidence` - Evidence data

```typescript
await AdminExtraApi.submitDisputeEvidence('dispute123', {
  productDescription: 'Original product description',
  customerCommunication: 'Email thread with customer',
  shippingProof: 'Tracking number and delivery confirmation'
});
```

#### addDisputeNote(id: string, note: string, priority: string)
Adds a note to a dispute.

**Parameters:**
- `id` - Dispute ID
- `note` - Note content
- `priority` - Note priority (default: 'medium')

```typescript
await AdminExtraApi.addDisputeNote('dispute123', 
  'Customer contacted and provided additional information', 
  'high'
);
```

#### disputesExportUrl(query: Record<string, any>)
Generates a URL for exporting disputes data to CSV.

**Parameters:**
- `query` - Filter parameters

```typescript
const exportUrl = AdminExtraApi.disputesExportUrl({ 
  status: 'lost',
  resolution: 'refunded'
});
```

### User Management

#### listUsers(query: Record<string, any>)
Lists users with extended filtering options.

**Parameters:**
- `query` - Filter parameters

```typescript
const users = await AdminExtraApi.listUsers({ 
  role: 'vendor',
  kycStatus: 'approved',
  limit: 100
});
```

#### suspendUser(id: string)
Suspends a user account.

**Parameters:**
- `id` - User ID

```typescript
await AdminExtraApi.suspendUser('user123');
```

#### unsuspendUser(id: string)
Reactivates a suspended user account.

**Parameters:**
- `id` - User ID

```typescript
await AdminExtraApi.unsuspendUser('user123');
```

#### setKyc(id: string, status: 'approved'|'rejected'|'pending'|'none')
Sets KYC status for a user.

**Parameters:**
- `id` - User ID
- `status` - KYC status

```typescript
await AdminExtraApi.setKyc('user123', 'approved');
```

#### userSales(id: string, query?: Record<string, any>)
Fetches sales data for a specific user.

**Parameters:**
- `id` - User ID
- `query` - Filter parameters

```typescript
const sales = await AdminExtraApi.userSales('user123', { 
  startDate: '2023-01-01',
  endDate: '2023-12-31'
});
```

#### userFees(id: string, query?: Record<string, any>)
Fetches fee data for a specific user.

**Parameters:**
- `id` - User ID
- `query` - Filter parameters

```typescript
const fees = await AdminExtraApi.userFees('user123', { 
  year: 2023,
  month: 12
});
```

### Media Management

#### getMediaFiles(query: Record<string, any>)
Fetches media files with filtering.

**Parameters:**
- `query` - Filter parameters

```typescript
const mediaFiles = await AdminExtraApi.getMediaFiles({ 
  type: 'image',
  limit: 50
});
```

#### getMediaAnalytics(timeRange: string)
Fetches media analytics.

**Parameters:**
- `timeRange` - Time range (default: '30d')

```typescript
const analytics = await AdminExtraApi.getMediaAnalytics('7d');
```

#### getDetailedMediaAnalytics(timeRange: string)
Fetches detailed media analytics.

**Parameters:**
- `timeRange` - Time range (default: '90d')

```typescript
const detailedAnalytics = await AdminExtraApi.getDetailedMediaAnalytics('30d');
```

#### getMediaSummary()
Fetches media summary statistics.

```typescript
const summary = await AdminExtraApi.getMediaSummary();
```

## Usage Examples

### Basic Implementation
```typescript
import { AdminExtraApi } from '@/services/adminExtra';

// Fetch recent payouts
const payouts = await AdminExtraApi.getPayouts({ 
  status: 'pending',
  limit: 20
});

// Create a new payout
const newPayout = await AdminExtraApi.createPayout({
  amount: 2500,
  currency: 'USD',
  destination: 'stripe_account_123',
  description: 'December vendor payout'
});

// Fetch payment analytics
const analytics = await AdminExtraApi.getPaymentsAnalytics('30d');
```

### Advanced Filtering
```typescript
// Complex payout query
const complexPayouts = await AdminExtraApi.getPayouts({
  status: 'completed',
  vendorId: 'vendor123',
  startDate: '2023-01-01',
  endDate: '2023-12-31',
  minAmount: 1000,
  maxAmount: 10000,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  limit: 100
});
```

### Pagination
```typescript
// Cursor-based pagination for large datasets
const firstPage = await AdminExtraApi.getDisputesCursor(
  { status: 'open' },
  { limit: 50 }
);

// Get next page using cursor
const nextPage = await AdminExtraApi.getDisputesCursor(
  { status: 'open' },
  { limit: 50, after: firstPage.cursor.after }
);
```

### Export Data
```typescript
// Generate export URL for payments
const exportUrl = AdminExtraApi.exportPaymentsUrl({
  status: 'failed',
  startDate: '2023-01-01',
  endDate: '2023-12-31'
});

// Download the CSV file
window.open(exportUrl, '_blank');
```

## Error Handling

### API Error Responses
The service handles various error scenarios:

```typescript
try {
  const payouts = await AdminExtraApi.getPayouts({ status: 'invalid' });
} catch (error) {
  if (error.status === 400) {
    console.error('Invalid request parameters');
  } else if (error.status === 401) {
    console.error('Authentication required');
  } else if (error.status === 403) {
    console.error('Insufficient permissions');
  } else if (error.status === 404) {
    console.error('Resource not found');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

### Network Error Handling
```typescript
const handleNetworkError = (error) => {
  if (error.message.includes('Failed to fetch')) {
    // Network connectivity issue
    showNotification('Network error. Please check your connection.');
  } else if (error.message.includes('timeout')) {
    // Request timeout
    showNotification('Request timed out. Please try again.');
  }
};
```

## Performance Features

### Efficient Data Fetching
- **Parallel Requests**: Multiple API calls can be executed simultaneously
- **Pagination**: Cursor-based pagination for large datasets
- **Caching**: Response caching for frequently accessed data
- **Batch Operations**: Bulk operations for better performance

### Memory Management
- **Resource Cleanup**: Proper cleanup of async operations
- **Response Parsing**: Efficient JSON parsing
- **Connection Pooling**: Reuse of HTTP connections

## Security Considerations

### Authentication
All API calls are automatically authenticated through the fetchWithAuth wrapper:

```typescript
// Authentication is handled automatically
const payouts = await AdminExtraApi.getPayouts({ limit: 20 });
```

### Data Validation
- **Input Validation**: Client-side validation of request parameters
- **Response Validation**: Validation of API responses
- **Error Sanitization**: Proper error message handling

## Testing

### Unit Tests
- Test individual API methods
- Test parameter validation
- Test error handling scenarios
- Test response parsing

### Integration Tests
- Test with real API endpoints
- Test authentication flows
- Test pagination functionality
- Test export URL generation

## Best Practices

### 1. Error Handling
```typescript
try {
  const data = await AdminExtraApi.getPayments({ limit: 50 });
  setData(data);
} catch (error) {
  handleError(error);
  showNotification('Failed to load payment data');
}
```

### 2. Pagination
```typescript
// Implement proper pagination
const loadMore = async (cursor) => {
  const moreData = await AdminExtraApi.getPaymentsCursor(
    { status: 'succeeded' },
    { limit: 50, after: cursor }
  );
  appendData(moreData);
};
```

### 3. Data Filtering
```typescript
// Use specific filters to reduce data transfer
const filteredData = await AdminExtraApi.getDisputes({
  status: 'open',
  priority: 'high',
  limit: 25
});
```

## Troubleshooting

### Common Issues

#### Authentication Failures
1. Check authentication tokens
2. Verify user permissions
3. Check API endpoint configuration
4. Verify network connectivity

#### Data Not Loading
1. Check API response in browser console
2. Verify filter parameters
3. Check pagination parameters
4. Verify API endpoint availability

#### Performance Issues
1. Check for excessive API calls
2. Verify pagination implementation
3. Check for large response sizes
4. Verify network connectivity

## Future Enhancements

### Planned Features
- **Webhook Management**: Configure and manage webhooks
- **Audit Logging**: Comprehensive audit trail functionality
- **Role Management**: Advanced role-based access control
- **Custom Reports**: Create and schedule custom reports
- **API Rate Limiting**: Enhanced rate limiting controls
- **Data Import**: Import data from external sources
- **Advanced Analytics**: Machine learning-based analytics
- **Multi-tenancy**: Support for multiple organizations