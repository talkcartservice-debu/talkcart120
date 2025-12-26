// Utility functions for testing PWA functionality
import { registerServiceWorker } from './pwaUtils';

/**
 * Checks if the current browser supports PWA features
 */
export const checkPWACompatibility = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'caches' in window;
};

/**
 * Checks if the app is running as a PWA (installed)
 */
export const isPWAInstalled = (): boolean => {
  // Check various indicators that suggest the app is running as installed PWA
  return window.matchMedia('(display-mode: standalone)').matches || 
         // @ts-ignore - navigator.standalone is iOS-specific
         navigator.standalone === true ||
         document.referrer.includes('android-app://');
};

/**
 * Tests service worker registration
 */
export const testServiceWorker = async (): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported in this browser');
      return false;
    }

    // Check if service worker is already registered
    const registrations = await navigator.serviceWorker.getRegistrations();
    const swRegistration = registrations.find(reg => 
      reg.active?.scriptURL.includes('service-worker.js')
    );

    if (swRegistration) {
      console.log('Service Worker is registered and active');
      console.log('Service Worker state:', swRegistration.active?.state);
      return true;
    } else {
      console.log('Service Worker not found');
      return false;
    }
  } catch (error) {
    console.error('Error testing service worker:', error);
    return false;
  }
};

/**
 * Tests manifest file availability
 */
export const testManifest = async (): Promise<boolean> => {
  try {
    const manifestResponse = await fetch('/manifest.json');
    if (!manifestResponse.ok) {
      console.log('Manifest file not found or not accessible');
      return false;
    }

    const manifest = await manifestResponse.json();
    console.log('Manifest loaded successfully:', manifest);
    
    // Basic validation of manifest properties
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
    const hasRequiredFields = requiredFields.every(field => manifest[field]);
    
    if (!hasRequiredFields) {
      console.log('Manifest missing required fields:', requiredFields.filter(field => !manifest[field]));
      return false;
    }

    console.log('Manifest validation passed');
    return true;
  } catch (error) {
    console.error('Error testing manifest:', error);
    return false;
  }
};

/**
 * Tests cache functionality
 */
export const testCache = async (): Promise<boolean> => {
  try {
    if (!('caches' in window)) {
      console.log('Cache API not supported in this browser');
      return false;
    }

    // Try to open a test cache
    const cache = await caches.open('test-cache');
    await cache.put('/test-url', new Response('test'));
    
    const response = await cache.match('/test-url');
    const text = await response?.text();
    
    if (text === 'test') {
      console.log('Cache functionality working properly');
      // Clean up test cache entry
      await cache.delete('/test-url');
      return true;
    } else {
      console.log('Cache functionality not working as expected');
      return false;
    }
  } catch (error) {
    console.error('Error testing cache:', error);
    return false;
  }
};

/**
 * Runs all PWA tests
 */
export const runPWACompatibilityTests = async (): Promise<{
  pwaCompatible: boolean;
  isInstalled: boolean;
  serviceWorker: boolean;
  manifest: boolean;
  cache: boolean;
}> => {
  console.log('Starting PWA compatibility tests...');
  
  const pwaCompatible = checkPWACompatibility();
  const isInstalled = isPWAInstalled();
  const serviceWorker = await testServiceWorker();
  const manifest = await testManifest();
  const cache = await testCache();
  
  console.log('PWA Compatibility Tests Results:');
  console.log('- Browser PWA Compatible:', pwaCompatible);
  console.log('- App Installed as PWA:', isInstalled);
  console.log('- Service Worker Active:', serviceWorker);
  console.log('- Manifest Valid:', manifest);
  console.log('- Cache Functioning:', cache);
  
  return {
    pwaCompatible,
    isInstalled,
    serviceWorker,
    manifest,
    cache
  };
};

/**
 * Gets PWA installation prompt status
 */
export const getPWAInstallStatus = (): { canInstall: boolean; promptEvent?: Event } => {
  let deferredPrompt: Event | undefined;
  
  const beforeInstallHandler = (e: Event) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
  };
  
  // Check if install prompt is available
  window.addEventListener('beforeinstallprompt', beforeInstallHandler as any);
  
  // Remove the listener immediately since we just wanted to check if the event fires
  window.removeEventListener('beforeinstallprompt', beforeInstallHandler as any);
  
  // In a real implementation, this would be handled by the usePWAInstall hook
  // For testing, we'll return the current state
  return {
    canInstall: !!deferredPrompt,
    promptEvent: deferredPrompt
  };
};