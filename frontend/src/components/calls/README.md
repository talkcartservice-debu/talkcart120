# Call Notification System

This directory contains a comprehensive call notification system that provides users with multiple alert mechanisms when receiving incoming calls.

## Features

### 🔔 Browser Notifications
- Shows persistent notifications even when the app is in the background
- Includes caller information and call type (audio/video)
- Interactive notifications with accept/decline actions
- Automatic notification clearing when call ends

### 🔊 Ringtone System
- Plays custom ringtone for incoming calls
- Supports both external audio files and programmatically generated tones
- Fallback system: tries external files first, then generates audio
- Configurable volume and loop settings
- Automatic audio permission handling

### 📳 Vibration Support
- Vibrates mobile devices for incoming calls
- Customizable vibration patterns
- Graceful fallback for devices without vibration support

### 🎛️ Permission Management
- Comprehensive permission request system
- User-friendly permission dialog
- Real-time permission status checking
- Support detection for all features

## Components

### Core Components

#### `NotificationService`
- **Location**: `src/services/notificationService.ts`
- **Purpose**: Singleton service managing all notification functionality
- **Key Methods**:
  - `startIncomingCallAlert(call)` - Starts all alert mechanisms
  - `stopIncomingCallAlert()` - Stops all alerts
  - `requestPermissions()` - Requests necessary permissions
  - `isSupported()` - Checks feature support

#### `CallManager`
- **Location**: `src/components/calls/CallManager.tsx`
- **Purpose**: Main call management component
- **Features**:
  - Integrates with notification service
  - Shows permission dialog on first use
  - Manages call state and UI

#### `IncomingCallModal`
- **Location**: `src/components/calls/IncomingCallModal.tsx`
- **Purpose**: Modal for incoming call UI
- **Features**:
  - Automatically starts notifications/ringtone/vibration
  - Handles notification action events
  - Stops alerts when call is answered/declined

#### `CallPermissionsDialog`
- **Location**: `src/components/calls/CallPermissionsDialog.tsx`
- **Purpose**: User-friendly permission request interface
- **Features**:
  - Shows permission status for all features
  - Explains why permissions are needed
  - Handles permission requests gracefully

### Testing Components

#### `CallNotificationTest`
- **Location**: `src/components/calls/CallNotificationTest.tsx`
- **Purpose**: Comprehensive testing interface
- **Features**:
  - Test individual components (ringtone, vibration, notifications)
  - Test full incoming call simulation
  - Permission status display
  - Feature support detection

#### Test Page
- **Location**: `src/pages/test/call-notifications.tsx`
- **Purpose**: Dedicated page for testing call notifications
- **Access**: Navigate to `/test/call-notifications`

## Usage

### Basic Integration

```tsx
import CallManager from '@/components/calls/CallManager';

function MessagesPage() {
  return (
    <div>
      {/* Your existing UI */}
      
      {/* Add CallManager for call functionality */}
      {selectedConversation && (
        <CallManager conversationId={selectedConversation.id} />
      )}
    </div>
  );
}
```

### Manual Notification Control

```tsx
import { notificationService } from '@/services/notificationService';

// Start full alert for incoming call
await notificationService.startIncomingCallAlert(call);

// Stop all alerts
notificationService.stopIncomingCallAlert();

// Test individual components
await notificationService.startRingtone({ duration: 3000 });
notificationService.startVibration([200, 100, 200]);
await notificationService.showIncomingCallNotification(call);
```

### Permission Handling

```tsx
// Check permissions
const permissions = notificationService.getPermissionStatus();
const support = notificationService.isSupported();

// Request permissions
const results = await notificationService.requestPermissions();
```

## Browser Support

### Notifications
- ✅ Chrome/Edge 22+
- ✅ Firefox 22+
- ✅ Safari 7+
- ✅ Mobile browsers (with user interaction)

### Audio
- ✅ All modern browsers
- ⚠️ Requires user interaction for autoplay
- ✅ Fallback to generated audio if files fail

### Vibration
- ✅ Chrome/Edge (mobile)
- ✅ Firefox (mobile)
- ❌ Safari (not supported)
- ✅ Android browsers
- ❌ iOS browsers (not supported)

## Configuration

### Ringtone Configuration
The system tries multiple audio sources in order:
1. `/sounds/ringtone.wav`
2. `/sounds/ringtone.mp3`
3. Programmatically generated audio

### Vibration Patterns
Default pattern: `[200, 100, 200, 100, 200, 100, 200]`
- Numbers represent milliseconds
- Odd positions = vibrate, even positions = pause

### Notification Settings
- `requireInteraction: true` - Keeps notification visible
- `tag: 'call-{callId}'` - Prevents duplicate notifications
- Actions: Accept/Decline buttons (where supported)

## Testing

### Automated Testing
Navigate to `/test/call-notifications` to access the test interface.

### Manual Testing Steps
1. **Permission Setup**:
   - Grant notification permissions
   - Allow audio autoplay
   - Test on mobile for vibration

2. **Individual Component Tests**:
   - Test ringtone (should hear audio)
   - Test vibration (mobile devices only)
   - Test notifications (should see browser notification)

3. **Full Integration Test**:
   - Test complete incoming call simulation
   - Verify all alerts work together
   - Test notification actions

### Mobile Testing
- Test on actual mobile devices for vibration
- Verify notifications work when app is backgrounded
- Test with device on silent/vibrate modes

## Troubleshooting

### Common Issues

#### No Ringtone Playing
- Check browser autoplay policies
- Ensure user has interacted with the page
- Verify audio permissions
- Check browser console for audio errors

#### No Notifications
- Check notification permissions
- Verify browser supports notifications
- Check if notifications are blocked system-wide
- Test in incognito mode

#### No Vibration
- Only works on mobile devices
- Not supported on iOS
- Check if device has vibration disabled
- Verify browser supports vibration API

### Debug Information
The notification service logs detailed information to the console:
- Permission status
- Feature support detection
- Audio loading success/failure
- Notification creation results

## Security Considerations

- Notifications require user permission
- Audio autoplay requires user interaction
- No sensitive information in notification content
- Proper cleanup of audio resources
- Event listener cleanup to prevent memory leaks

## Performance

- Lazy loading of audio resources
- Efficient permission caching
- Minimal DOM manipulation
- Proper cleanup on component unmount
- Debounced permission checks

## Future Enhancements

- Custom ringtone upload
- Multiple ringtone options
- Volume controls
- Do not disturb integration
- Call scheduling notifications
- Integration with system notification settings