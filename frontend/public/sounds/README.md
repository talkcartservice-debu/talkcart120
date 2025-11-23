# Ringtone Files

This directory should contain ringtone files for the application's audio notifications.

## Current Files

- `ringtone.wav` - WAV format ringtone (recommended) - **GENERATED**
- `ringtone.mp3` - MP3 format ringtone (fallback) - **GENERATED**

## Creating Ringtone Files

### Method 1: Using the Browser Console

1. Open your browser's developer console (F12)
2. Copy and paste the contents of `create-ringtone.js` into the console
3. Run the following commands:

```javascript
// Generate WAV file
const buffer = generateRingtone();
const wavData = bufferToWav(buffer);
const blob = new Blob([wavData], { type: 'audio/wav' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'ringtone.wav';
a.click();
```

### Method 2: Using Online Tools

1. Visit a website like https://audio.online-convert.com/convert-to-wav
2. Upload an audio file or record a new one
3. Convert to WAV format
4. Download and place in this directory as `ringtone.wav`

### Method 3: Using Audio Editing Software

1. Use software like Audacity (free) to create a simple ringtone
2. Export as WAV format
3. Save as `ringtone.wav` in this directory

## Fallback Mechanism

If the ringtone files are not found or cannot be loaded, the application will automatically generate a simple ringtone using the Web Audio API. This ensures that audio notifications will always work, even if the external files are missing.

## Troubleshooting

If you're still getting "Failed to load any ringtone" errors:

1. Check that the files exist in this directory
2. Verify the files are valid audio files (not corrupted)
3. Check browser console for specific error messages
4. Ensure your browser supports the audio formats
5. Test with different browsers if needed

The application has multiple fallbacks built-in, so even if the external files fail, it should still work using the programmatic audio generation.