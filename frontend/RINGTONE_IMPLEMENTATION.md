# Ringtone Implementation Guide

## Overview
The ringtone functionality is fully implemented for both audio and video calls in the message page. The system provides a complete call alert experience with ringtone, vibration, and browser notifications.

## Architecture

### Components Involved

1. **NotificationService** (`src/services/notificationService.ts`)
   - Manages ringtone playback
   - Handles vibration patterns
   - Shows browser notifications
   - Provides `startIncomingCallAlert()` and `stopIncomingCallAlert()` methods

2. **useCall Hook** (`src/hooks/useCall.ts`)
   - Manages call state and lifecycle
   - Stops ringtone when accepting/declining calls
   - Stops ringtone when ending calls

3. **IncomingCallModal** (`src/components/calls/IncomingCallModal.tsx`)
   - Displays incoming call UI
   - Starts ringtone when call arrives
   - Stops ringtone when user accepts/declines

4. **MessagesPage** (`pages/messages.tsx`)
   - Integrates call components
   - Handles call accept/decline actions

## Ringtone Lifecycle

### When Call Arrives
1. `IncomingCallModal` receives the incoming call
2. `useEffect` triggers `notificationService.startIncomingCallAlert(call)`
3. Ringtone starts playing with:
   - Volume: 0.9 (90%)
   - Loop: enabled
   - Vibration: continuous pattern

### When User Accepts Call
1. User clicks accept button in `IncomingCallModal`
2. `handleAccept()` calls `notificationService.stopIncomingCallAlert()`
3. `useCall.acceptCall()` also calls `notificationService.stopIncomingCallAlert()`
4. Ringtone stops immediately
5. Call interface opens

### When User Declines Call
1. User clicks decline button in `IncomingCallModal`
2. `handleDecline()` calls `notificationService.stopIncomingCallAlert()`
3. `useCall.declineCall()` also calls `notificationService.stopIncomingCallAlert()`
4. Ringtone stops immediately
5. Modal closes

### When Call Ends
1. `useCall.endCall()` calls `notificationService.stopIncomingCallAlert()`
2. Ringtone stops
3. Call interface closes

## Ringtone Sources

The system tries to load ringtones in this order:
1. `/sounds/ringtone.wav` - WAV format
2. `/sounds/ringtone.mp3` - MP3 format
3. Programmatically generated audio - Web Audio API fallback

## Features

### Audio Support
- ✅ Plays for both audio and video calls
- ✅ Loops continuously until stopped
- ✅ Volume control (default 0.9)
- ✅ Fallback to generated audio if files unavailable

### Vibration Support
- ✅ Continuous vibration pattern
- ✅ Pattern: [400, 200, 400, 200, 400, 200, 400, 200, 400] ms
- ✅ Stops when call is accepted/declined
- ⚠️ Not supported on iOS Safari

### Browser Notifications
- ✅ Shows incoming call notification
- ✅ Displays caller name and avatar
- ✅ Supports notification actions
- ✅ Requires user permission

## Configuration

### Volume Levels
```typescript
// Default volume for incoming calls
startIncomingCallAlert(call) // volume: 0.9

// Custom volume
startRingtone({ volume: 0.5 })
```

### Vibration Patterns
```typescript
// Default pattern (continuous)
startVibration(undefined, true)

// Custom pattern (one-time)
startVibration([200, 100, 200, 100, 200])
```

## Testing

Run the ringtone tests:
```bash
npm test -- ringtone.test.ts
```

## Troubleshooting

### Ringtone Not Playing
1. Check browser console for errors
2. Verify `/sounds/ringtone.wav` or `/sounds/ringtone.mp3` exists
3. Check browser autoplay policy
4. Ensure user has interacted with page (autoplay requires user gesture)

### Ringtone Not Stopping
1. Verify `stopIncomingCallAlert()` is being called
2. Check browser console for errors
3. Ensure `notificationService` is properly imported

### Vibration Not Working
1. Check device supports vibration API
2. Verify browser has vibration permission
3. Note: iOS Safari does not support vibration API

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Audio   | ✅     | ✅      | ✅     | ✅   |
| Vibration | ✅   | ✅      | ❌     | ✅   |
| Notifications | ✅ | ✅    | ✅     | ✅   |

## Future Improvements

1. Add ringtone selection UI
2. Add volume control in settings
3. Add custom vibration patterns
4. Add ringtone preview in settings
5. Add do-not-disturb mode
6. Add call recording indicators

