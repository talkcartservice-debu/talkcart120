// Service Worker for Vetora PWA
const CACHE_NAME = 'vetora-v1.0.0';
const urlsToCache = [
  '/',
  '/manifest.json',
];

// Install event - cache static assets (non-critical)
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  // Skip waiting to activate the new service worker immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // Cache only critical files; icons can fail without breaking the app
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err);
              return Promise.resolve();
            })
          )
        );
      })
      .catch((error) => {
        console.error('Service Worker: Cache open failed:', error);
        // Don't fail installation if caching fails
        return Promise.resolve();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests and dynamic content (don't cache)
  const url = event.request.url;
  if (url.includes('/api/') || 
      url.includes('/socket.io') ||
      url.includes('_next/data')) {
    return; // Let these requests go directly to network
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || !networkResponse.ok) {
              return networkResponse;
            }
            
            // Only cache successful responses for documents
            if (event.request.destination === 'document' && networkResponse.status === 200) {
              // Clone and cache the response
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache).catch(err => {
                    console.warn('Failed to cache response:', err);
                  });
                })
                .catch(err => {
                  console.warn('Failed to open cache:', err);
                });
            }

            return networkResponse;
          })
          .catch((err) => {
            console.warn('Fetch failed, returning cached or error response:', err);
            
            // If network fails and it's a document request, try to return homepage from cache
            if (event.request.destination === 'document') {
              return caches.match('/').catch(err => {
                console.warn('Failed to get cached homepage:', err);
                // Return a minimal HTML response so the page can load
                return new Response('<!DOCTYPE html><html><body><h1>Loading...</h1></body></html>', {
                  status: 200,
                  headers: { 'Content-Type': 'text/html' }
                });
              });
            }
            
            // For other resources, return a generic error response
            return new Response('Resource unavailable', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
      .catch((error) => {
        console.error('Service Worker: Request handling failed:', error);
        
        // Return a minimal response to prevent crashes
        return new Response('Service unavailable', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Activate event - clean up old caches and claim all clients
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Claim all clients immediately so new service worker takes effect
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName).catch(err => {
                console.warn('Failed to delete cache:', err);
                return Promise.resolve();
              });
            }
            return Promise.resolve();
          })
        );
      }).catch(err => {
        console.warn('Service Worker: Cache cleanup failed:', err);
        return Promise.resolve();
      })
    ])
  );
});

// Handle background sync for offline messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Vetora', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Background sync function
async function syncMessages() {
  // This would sync any queued messages when back online
  console.log('Service Worker: Syncing messages...');
  try {
    const response = await fetch('/api/sync-offline-messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ /* queued messages data */ })
    });
    return response.json();
  } catch (error) {
    console.error('Service Worker: Sync failed:', error);
  }
}