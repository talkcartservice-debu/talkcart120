# Ringtone Quick Reference Guide

## How It Works

### When Call Arrives
```
IncomingCallModal mounts
  → notificationService.startIncomingCallAlert(call)
    → Ringtone plays (loop: true, volume: 0.9)
    → Vibration starts (continuous)
    → Notification shows
```

### When User Accepts
```
User clicks Accept button
  → IncomingCallModal.handleAccept()
    → notificationService.stopIncomingCallAlert()
  → useCall.acceptCall()
    → notificationService.stopIncomingCallAlert() (redundant for safety)
    → Call interface opens
```

### When User Declines
```
User clicks Decline button
  → IncomingCallModal.handleDecline()
    → notificationService.stopIncomingCallAlert()
  → useCall.declineCall()
    → notificationService.stopIncomingCallAlert() (redundant for safety)
    → Modal closes
```

## Key Files

| File | Purpose |
|------|---------|
| `src/services/notificationService.ts` | Manages ringtone, vibration, notifications |
| `src/hooks/useCall.ts` | Call state management + ringtone control |
| `src/components/calls/IncomingCallModal.tsx` | Incoming call UI + ringtone start/stop |
| `pages/messages.tsx` | Message page integration |

## API Reference

### Start Ringtone
```typescript
import { notificationService } from '@/services/notificationService';

// Start with default options
await notificationService.startRingtone();

// Start with custom options
await notificationService.startRingtone({
  volume: 0.5,      // 0-1
  loop: true,       // true/false
  duration: 5000    // milliseconds
});
```

### Stop Ringtone
```typescript
notificationService.stopRingtone();
```

### Start Incoming Call Alert
```typescript
await notificationService.startIncomingCallAlert(call);
// Starts: ringtone + vibration + notification
```

### Stop Incoming Call Alert
```typescript
notificationService.stopIncomingCallAlert();
// Stops: ringtone + vibration + clears notification
```

## Configuration

### Ringtone Volume
- Default: 0.9 (90%)
- Range: 0-1
- Location: `notificationService.startIncomingCallAlert()`

### Vibration Pattern
- Default: [400, 200, 400, 200, 400, 200, 400, 200, 400]
- Units: milliseconds
- Location: `notificationService.vibrationPattern`

### Ringtone Sources
1. `/sounds/ringtone.wav`
2. `/sounds/ringtone.mp3`
3. Programmatically generated (fallback)

## Troubleshooting

### Ringtone Not Playing
```
1. Check browser console for errors
2. Verify /sounds/ringtone.wav exists
3. Check browser autoplay policy
4. Ensure user interacted with page
```

### Ringtone Not Stopping
```
1. Check notificationService.stopIncomingCallAlert() is called
2. Verify no errors in console
3. Check browser developer tools
```

### Vibration Not Working
```
1. Check device supports vibration API
2. Verify browser has permission
3. Note: iOS Safari doesn't support vibration
```

## Testing

### Run Unit Tests
```bash
npm test -- ringtone.test.ts
```

### Manual Test Checklist
- [ ] Audio call - ringtone plays
- [ ] Audio call - ringtone stops on accept
- [ ] Audio call - ringtone stops on decline
- [ ] Video call - ringtone plays
- [ ] Video call - ringtone stops on accept
- [ ] Video call - ringtone stops on decline

## Browser Support

| Browser | Audio | Vibration | Notifications |
|---------|-------|-----------|---------------|
| Chrome  | ✅    | ✅        | ✅            |
| Firefox | ✅    | ✅        | ✅            |
| Safari  | ✅    | ❌        | ✅            |
| Edge    | ✅    | ✅        | ✅            |

## Common Issues & Solutions

### Issue: Ringtone plays but doesn't loop
**Solution**: Check `loop: true` is set in startRingtone options

### Issue: Ringtone volume too low
**Solution**: Increase volume in startIncomingCallAlert (default 0.9)

### Issue: Vibration not working on mobile
**Solution**: Check device supports vibration API (not iOS Safari)

### Issue: Multiple ringtones playing
**Solution**: Ensure stopIncomingCallAlert() is called before starting new call

## Performance Tips

1. **Preload Ringtone**: Set `preload: 'auto'` in audio element
2. **Use Efficient Format**: WAV is smaller than MP3 for short sounds
3. **Limit Vibration**: Use reasonable pattern duration
4. **Clean Up**: Always call stopIncomingCallAlert() on unmount

## Security Notes

- Ringtone files should be served over HTTPS
- Notification permissions require user consent
- Vibration API requires user interaction
- Audio autoplay requires user gesture

## Future Enhancements

- [ ] Ringtone selection UI
- [ ] Volume control in settings
- [ ] Custom vibration patterns
- [ ] Ringtone preview
- [ ] Do-not-disturb mode
- [ ] Different ringtones per contact

## Related Documentation

- Full Implementation: `RINGTONE_IMPLEMENTATION.md`
- Fixes Summary: `RINGTONE_FIXES_SUMMARY.md`
- Testing Checklist: `RINGTONE_CHECKLIST.md`
- Completion Report: `../RINGTONE_COMPLETION_REPORT.md`

