# NotificationService Documentation

## Overview
NotificationService is a comprehensive service that manages all notification functionality for the TalkCart application, including browser notifications, ringtone playback, and device vibration for incoming calls and other alerts.

## Architecture

### Core Components
1. **NotificationService** - Singleton class managing all notification functionality
2. **notificationService** - Exported instance of NotificationService
3. **Call Interface** - Data structure representing call information
4. **NotificationOptions** - Configuration options for browser notifications
5. **RingtoneOptions** - Configuration options for ringtone playback

### Key Features
- **Browser Notifications** - Rich notifications with actions and data
- **Ringtone System** - Audio alerts with fallback mechanisms
- **Vibration Support** - Haptic feedback for mobile devices
- **Permission Management** - Comprehensive permission handling
- **Cross-browser Support** - Graceful degradation for unsupported features
- **Resource Management** - Efficient audio and notification resource handling

## API

### NotificationService Class

#### Methods

##### getInstance()
Returns the singleton instance of NotificationService.

```typescript
const service = NotificationService.getInstance();
```

##### showIncomingCallNotification(call: Call)
Shows a browser notification for an incoming call.

**Parameters:**
- `call` - Call object containing call details

**Returns:** Promise resolving to Notification object or null

```typescript
const notification = await service.showIncomingCallNotification(call);
```

##### startRingtone(options?: RingtoneOptions)
Starts playing the ringtone.

**Parameters:**
- `options` - Optional ringtone configuration
  - `volume` - Volume level (0-1)
  - `loop` - Whether to loop the ringtone
  - `duration` - Duration in milliseconds

```typescript
await service.startRingtone({ volume: 0.8, loop: true });
```

##### stopRingtone()
Stops the currently playing ringtone.

```typescript
service.stopRingtone();
```

##### startVibration(pattern?: number[], continuous?: boolean)
Starts device vibration.

**Parameters:**
- `pattern` - Vibration pattern array (milliseconds)
- `continuous` - Whether to vibrate continuously

```typescript
// Single vibration pattern
service.startVibration([200, 100, 200]);

// Continuous vibration
service.startVibration([400, 200, 400], true);
```

##### stopVibration()
Stops device vibration.

```typescript
service.stopVibration();
```

##### startIncomingCallAlert(call: Call)
Starts all alert mechanisms for an incoming call.

**Parameters:**
- `call` - Call object containing call details

```typescript
await service.startIncomingCallAlert(call);
```

##### stopIncomingCallAlert()
Stops all alert mechanisms.

```typescript
service.stopIncomingCallAlert();
```

##### requestPermissions()
Requests necessary permissions for notifications and audio.

**Returns:** Promise resolving to permission status object

```typescript
const permissions = await service.requestPermissions();
```

##### isSupported()
Checks feature support for notifications, vibration, and audio.

**Returns:** Object with support status for each feature

```typescript
const support = service.isSupported();
// { notifications: true, vibration: true, audio: true }
```

##### getPermissionStatus()
Gets current permission status.

**Returns:** Object with current permission status

```typescript
const status = service.getPermissionStatus();
// { notification: 'granted', audio: true }
```

## Usage

### Basic Implementation
```typescript
import { notificationService } from '@/services/notificationService';
import { Call } from '@/services/callService';

// Start incoming call alert
const call: Call = {
  id: 'call123',
  callId: 'call123',
  conversationId: 'conv456',
  initiator: {
    id: 'user789',
    displayName: 'John Doe',
    avatar: '/avatar.jpg'
  },
  participants: [],
  type: 'video',
  status: 'ringing',
  startedAt: new Date()
};

await notificationService.startIncomingCallAlert(call);

// Stop all alerts
notificationService.stopIncomingCallAlert();
```

### Manual Notification Control
```typescript
// Show notification only
const notification = await notificationService.showIncomingCallNotification(call);

// Play ringtone only
await notificationService.startRingtone({ volume: 0.9, loop: true, duration: 30000 });

// Vibrate only
notificationService.startVibration([200, 100, 200, 100, 200], true);
```

### Permission Handling
```typescript
// Check feature support
const support = notificationService.isSupported();
if (!support.notifications) {
  console.log('Notifications not supported');
}

// Check permission status
const status = notificationService.getPermissionStatus();
if (status.notification !== 'granted') {
  // Request permissions
  const results = await notificationService.requestPermissions();
  if (results.notification !== 'granted') {
    console.log('Notification permission denied');
  }
}
```

## Configuration Options

### Ringtone Configuration
The service tries multiple audio sources in order:
1. `/sounds/ringtone.wav`
2. `/sounds/ringtone.mp3`
3. Programmatically generated audio (fallback)

### Vibration Patterns
Default pattern: `[400, 200, 400, 200, 400, 200, 400, 200, 400]`
- Numbers represent milliseconds
- Odd positions = vibrate, even positions = pause

### Notification Settings
- `requireInteraction: true` - Keeps notification visible
- `tag: 'call-{callId}'` - Prevents duplicate notifications
- Actions: Accept/Decline buttons (where supported)

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

## Performance Features

### Resource Management
- Lazy loading of audio resources
- Efficient permission caching
- Proper cleanup of audio resources
- Event listener cleanup to prevent memory leaks

### Memory Management
- Singleton pattern for single instance
- Automatic cleanup of notifications
- Resource disposal on service destruction

## Security Considerations

- Notifications require user permission
- Audio autoplay requires user interaction
- No sensitive information in notification content
- Proper cleanup of audio resources
- Event listener cleanup to prevent memory leaks

## Testing

### Unit Tests
- Test notification creation
- Test ringtone playback
- Test vibration patterns
- Test permission handling

### Integration Tests
- Test with real browser APIs
- Test cross-browser compatibility
- Test feature degradation
- Test error scenarios

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

## Future Enhancements

### Planned Features
- **Custom Ringtone Upload**: Allow users to upload custom ringtones
- **Multiple Ringtone Options**: Different ringtones for different contacts
- **Volume Controls**: User-adjustable volume settings
- **Do Not Disturb Integration**: Respect system DND settings
- **Call Scheduling Notifications**: Scheduled call reminders
- **Integration with System Settings**: Native notification settings