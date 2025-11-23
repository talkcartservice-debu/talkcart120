# Progressive Web App (PWA) Installation Guide

## Overview

TalkCart is a Progressive Web App that can be installed on mobile devices (Android and iOS) to provide a native app-like experience. This guide explains how to install and use the PWA functionality.

## Installation Instructions

### For Android Devices

1. Open TalkCart in Chrome, Firefox, or Samsung Internet browser
2. Look for the "Install App" button on the login page or marketplace page
3. Tap the "Install App" button
4. Confirm the installation when prompted
5. The app will be added to your home screen

### For iOS Devices (iPhone/iPad)

1. Open TalkCart in Safari browser
2. Tap the Share button (box with arrow) at the bottom of the screen
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right corner
5. The app icon will be added to your home screen

## Features

When installed as a PWA, TalkCart provides:

- Native app-like experience
- Offline functionality for chat messages
- Push notifications (when implemented)
- Fast loading times
- Home screen access

## Technical Implementation

The PWA functionality is implemented using:

1. **Web App Manifest** - Defines how the app appears when installed
2. **Service Worker** - Handles offline functionality and background tasks
3. **Install Prompt** - Custom button that triggers the browser's installation flow

## Files

- `public/manifest.json` - Main manifest file
- `public/site.webmanifest` - Alternative manifest file
- `public/service-worker.js` - Service worker implementation
- `src/hooks/usePWAInstall.ts` - Custom hook for PWA installation
- `src/components/common/PWAInstallButton.tsx` - Reusable install button component
- `src/utils/pwaUtils.ts` - Utility functions for service worker registration

## Usage

The PWA installation button is available on:

1. Login page (`/auth/login`)
2. Marketplace page (`/marketplace`)
3. Social feed page (`/social`)
4. Test page (`/pwa-test`)

## Troubleshooting

### Installation Button Not Visible

- The button only appears on devices that support PWA installation
- The button only appears when the app is not already installed
- Make sure you're using a supported browser (Chrome, Firefox, Safari)

### App Not Installing

- Ensure your device has enough storage space
- Check that your browser supports PWA installation
- Try clearing your browser cache and reloading the page

### Offline Functionality Issues

- Make sure the service worker is properly registered
- Check browser developer tools for service worker errors
- Ensure you've visited the app at least once while online

## Future Enhancements

Planned improvements to the PWA functionality:

1. Push notifications for messages and updates
2. Enhanced offline capabilities
3. Better integration with device features
4. Improved installation prompts