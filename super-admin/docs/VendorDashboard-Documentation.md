# VendorDashboard Component Documentation

## Overview
VendorDashboard is a React component that provides comprehensive analytics and metrics for vendor management in the TalkCart super admin panel. It displays key vendor statistics and trends to help administrators monitor vendor performance and platform engagement.

## Component Structure

### Main Features
- **Vendor Analytics**: Displays total, active, and suspended vendor counts
- **KYC Metrics**: Shows KYC approval statistics
- **Growth Tracking**: Recent vendor signup tracking
- **Performance Indicators**: Color-coded metrics for quick assessment
- **Refresh Functionality**: Manual data refresh capability

### UI Components
- **Metric Cards**: Individual cards for each key metric
- **Progress Indicators**: Visual representation of vendor engagement
- **Refresh Button**: Manual refresh control
- **Responsive Grid**: Adapts to different screen sizes

## Props

### VendorDashboardProps
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `timeRange` | `string` | No | Time range for analytics (default: '30d') |
| `onRefresh` | `() => void` | No | Callback function when data is refreshed |

## Data Structure

### VendorSummary Interface
```typescript
interface VendorSummary {
  total_vendors: number;
  active_vendors: number;
  kyc_approved: number;
  recent_signups: number;
  suspended_vendors: number;
}
```

### Vendor Interface
```typescript
interface Vendor {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  role: 'vendor';
  status: 'active' | 'suspended' | 'pending';
  kycStatus: 'pending' | 'approved' | 'rejected';
  storeName?: string;
  createdAt: string;
  updatedAt: string;
}
```

## API Integration

### AdminApi Methods Used
- `AdminApi.listUsers()` - Fetches vendors with different filters

### Data Fetching
The component fetches data from multiple API endpoints simultaneously:
```typescript
const [allVendorsRes, activeVendorsRes, suspendedVendorsRes, kycApprovedRes] = await Promise.all([
  AdminApi.listUsers({ role: 'vendor' }),
  AdminApi.listUsers({ role: 'vendor', status: 'active' }),
  AdminApi.listUsers({ role: 'vendor', status: 'suspended' }),
  AdminApi.listUsers({ role: 'vendor', kycStatus: 'approved' })
]);
```

## Usage Examples

### Basic Usage
```tsx
import VendorDashboard from '@/components/VendorDashboard';

const AdminDashboard = () => {
  return (
    <div>
      <VendorDashboard />
    </div>
  );
};
```

### With Custom Time Range
```tsx
import VendorDashboard from '@/components/VendorDashboard';

const AdminDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');

  return (
    <div>
      <TimeRangeSelector 
        value={timeRange} 
        onChange={setTimeRange} 
      />
      <VendorDashboard timeRange={timeRange} />
    </div>
  );
};
```

### With Refresh Callback
```tsx
import VendorDashboard from '@/components/VendorDashboard';

const AdminDashboard = () => {
  const handleRefresh = () => {
    console.log('Vendor dashboard data refreshed');
    // Additional refresh logic
  };

  return (
    <div>
      <VendorDashboard onRefresh={handleRefresh} />
    </div>
  );
};
```

## Metrics Displayed

### 1. Total Vendors
- **Icon**: PeopleIcon
- **Color**: Primary (blue)
- **Description**: Total number of registered vendor accounts
- **Additional Info**: Recent signups in the last 24 hours

### 2. Active Vendors
- **Icon**: CheckCircleIcon
- **Color**: Success (green)
- **Description**: Number of currently active vendor accounts
- **Additional Info**: Percentage of total vendors

### 3. KYC Approved
- **Icon**: VerifiedIcon
- **Color**: Success (green)
- **Description**: Number of vendors with approved KYC status
- **Additional Info**: Percentage of total vendors

### 4. Suspended Vendors
- **Icon**: BlockIcon
- **Color**: Error (red)
- **Description**: Number of suspended vendor accounts
- **Additional Info**: Percentage of total vendors

## Styling and Layout

### Responsive Design
- **Mobile**: Single column layout
- **Tablet**: Two column layout
- **Desktop**: Four column layout
- **Spacing**: Consistent padding and margins

### Color Scheme
- **Primary**: Blue (#1976d2) - Main metrics
- **Success**: Green (#4caf50) - Positive metrics
- **Warning**: Orange (#ff9800) - Caution metrics
- **Error**: Red (#f44336) - Negative metrics
- **Background**: Light gray (#f5f5f5) - Card backgrounds

### Typography
- **Headers**: Bold, larger font size
- **Metrics**: Large, prominent numbers
- **Labels**: Smaller, muted text
- **Captions**: Tiny, supplementary information

## Performance Features

### Data Fetching
- **Parallel Requests**: Multiple API calls executed simultaneously
- **Error Handling**: Graceful degradation on API failures
- **Loading States**: Progress indicators during data fetch
- **Caching**: Component-level data persistence

### Memory Management
- **Cleanup**: Proper cleanup of async operations
- **State Management**: Efficient React state updates
- **Event Handlers**: Properly managed event listeners

## Error Handling

### API Errors
- **Network Failures**: Display error messages
- **Server Errors**: Show appropriate error states
- **Data Validation**: Handle missing or malformed data

### UI Errors
- **Loading Failures**: Show error states
- **Rendering Errors**: Graceful component degradation
- **User Feedback**: Clear error messaging

## Testing

### Unit Tests
- Test data fetching logic
- Test component rendering with different data states
- Test error handling scenarios
- Test prop validation

### Integration Tests
- Test with real API responses
- Test refresh functionality
- Test responsive layout changes
- Test accessibility features

## Accessibility

### Keyboard Navigation
- **Focus Management**: Proper focus order
- **Keyboard Shortcuts**: Enter/space for interactive elements
- **Skip Links**: Navigation shortcuts

### Screen Reader Support
- **ARIA Labels**: Descriptive labels for screen readers
- **Live Regions**: Dynamic content announcements
- **Semantic HTML**: Proper element usage

### Visual Accessibility
- **Contrast**: Sufficient color contrast ratios
- **Text Size**: Readable font sizes
- **Focus Indicators**: Visible focus states

## Customization

### Styling Overrides
The component uses Material-UI's sx prop for styling, which can be customized:

```tsx
// Custom styling example
<VendorDashboard 
  sx={{
    '& .MuiCard-root': {
      backgroundColor: '#f0f0f0'
    }
  }}
/>
```

### Data Customization
The time range can be customized to show different analytics periods:

```tsx
// Different time ranges
<VendorDashboard timeRange="7d" />  // Last 7 days
<VendorDashboard timeRange="30d" /> // Last 30 days (default)
<VendorDashboard timeRange="90d" /> // Last 90 days
```

## Best Practices

### 1. Data Refresh
```tsx
// Implement proper refresh handling
const handleRefresh = useCallback(() => {
  // Analytics tracking
  // Additional refresh logic
}, []);
```

### 2. Error Handling
```tsx
// Handle errors gracefully
{error && (
  <Alert severity="error">
    Failed to load vendor data. Please try again.
  </Alert>
)}
```

### 3. Loading States
```tsx
// Show loading indicators
{loading && <LinearProgress />}
```

## Troubleshooting

### Common Issues

#### Data Not Loading
1. Check API connectivity
2. Verify authentication tokens
3. Check browser console for errors
4. Verify AdminApi configuration

#### Styling Issues
1. Check Material-UI theme configuration
2. Verify CSS imports
3. Check for conflicting styles
4. Verify responsive breakpoints

#### Performance Problems
1. Check for excessive API calls
2. Verify data fetching optimization
3. Check for memory leaks
4. Verify component re-rendering

## Future Enhancements

### Planned Features
- **Custom Metrics**: Allow administrators to define custom metrics
- **Export Functionality**: Export dashboard data to CSV
- **Comparison Views**: Compare metrics across time periods
- **Alert System**: Configure alerts for metric thresholds
- **Detailed Analytics**: Drill-down capabilities for each metric
- **Vendor Segmentation**: Filter metrics by vendor segments
- **Revenue Tracking**: Track vendor sales performance
- **Performance Rankings**: Rank vendors by performance metrics