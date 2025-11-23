# UserDashboard Component Documentation

## Overview
UserDashboard is a React component that provides comprehensive analytics and metrics for user management in the TalkCart super admin panel. It displays key user statistics and trends to help administrators monitor platform user engagement.

## Component Structure

### Main Features
- **User Analytics**: Displays total, active, and suspended user counts
- **Vendor Metrics**: Shows vendor user statistics
- **Growth Tracking**: Recent signup tracking
- **Visual Indicators**: Color-coded metrics for quick assessment
- **Refresh Functionality**: Manual data refresh capability

### UI Components
- **Metric Cards**: Individual cards for each key metric
- **Progress Indicators**: Visual representation of user engagement
- **Refresh Button**: Manual refresh control
- **Responsive Grid**: Adapts to different screen sizes

## Props

### UserDashboardProps
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `timeRange` | `string` | No | Time range for analytics (default: '30d') |
| `onRefresh` | `() => void` | No | Callback function when data is refreshed |

## Data Structure

### UserSummary Interface
```typescript
interface UserSummary {
  total_users: number;
  active_users: number;
  suspended_users: number;
  vendor_users: number;
  recent_signups: number;
}
```

### User Interface
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  role: 'user' | 'vendor' | 'admin';
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
}
```

## API Integration

### AdminApi Methods Used
- `AdminApi.listUsers()` - Fetches users with different filters

### Data Fetching
The component fetches data from multiple API endpoints simultaneously:
```typescript
const [allUsersRes, activeUsersRes, suspendedUsersRes, vendorUsersRes] = await Promise.all([
  AdminApi.listUsers({}),
  AdminApi.listUsers({ status: 'active' }),
  AdminApi.listUsers({ status: 'suspended' }),
  AdminApi.listUsers({ role: 'vendor' })
]);
```

## Usage Examples

### Basic Usage
```tsx
import UserDashboard from '@/components/UserDashboard';

const AdminDashboard = () => {
  return (
    <div>
      <UserDashboard />
    </div>
  );
};
```

### With Custom Time Range
```tsx
import UserDashboard from '@/components/UserDashboard';

const AdminDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');

  return (
    <div>
      <TimeRangeSelector 
        value={timeRange} 
        onChange={setTimeRange} 
      />
      <UserDashboard timeRange={timeRange} />
    </div>
  );
};
```

### With Refresh Callback
```tsx
import UserDashboard from '@/components/UserDashboard';

const AdminDashboard = () => {
  const handleRefresh = () => {
    console.log('User dashboard data refreshed');
    // Additional refresh logic
  };

  return (
    <div>
      <UserDashboard onRefresh={handleRefresh} />
    </div>
  );
};
```

## Metrics Displayed

### 1. Total Users
- **Icon**: PeopleIcon
- **Color**: Primary (blue)
- **Description**: Total number of registered users
- **Additional Info**: Recent signups in the last 24 hours

### 2. Active Users
- **Icon**: VerifiedIcon
- **Color**: Success (green)
- **Description**: Number of currently active users
- **Additional Info**: Percentage of total users

### 3. Vendors
- **Icon**: PersonAddIcon
- **Color**: Warning (orange)
- **Description**: Number of registered vendor accounts
- **Additional Info**: Percentage of total users

### 4. Suspended Users
- **Icon**: BlockIcon
- **Color**: Error (red)
- **Description**: Number of suspended user accounts
- **Additional Info**: Percentage of total users

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
<UserDashboard 
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
<UserDashboard timeRange="7d" />  // Last 7 days
<UserDashboard timeRange="30d" /> // Last 30 days (default)
<UserDashboard timeRange="90d" /> // Last 90 days
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
    Failed to load user data. Please try again.
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
- **User Segmentation**: Filter metrics by user segments