// TalkCart Service Worker for Offline Support
const CACHE_NAME = 'talkcart-chat-v1';
const OFFLINE_URL = '/offline.html';
const CHAT_API_ENDPOINTS = [
  '/api/chatbot/conversations',
  '/api/chatbot/messages',
  '/api/chatbot/search'
];

// IndexedDB for local message storage
const DB_NAME = 'TalkCartChatDB';
const DB_VERSION = 1;
const STORE_NAME = 'messages';

let db;

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('conversationId', 'conversationId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

// Save message to IndexedDB
async function saveMessageToDB(message) {
  if (!db) await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add({
      ...message,
      timestamp: Date.now(),
      status: 'pending'
    });
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get pending messages from IndexedDB
async function getPendingMessages() {
  if (!db) await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Update message status in IndexedDB
async function updateMessageStatus(id, status) {
  if (!db) await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = () => {
      const message = request.result;
      if (message) {
        message.status = status;
        const updateRequest = store.put(message);
        updateRequest.onsuccess = () => resolve(updateRequest.result);
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        reject(new Error('Message not found'));
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Delete message from IndexedDB
async function deleteMessageFromDB(id) {
  if (!db) await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache only the offline page to avoid issues with other resources
        return cache.add(OFFLINE_URL);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('Error during installation:', error);
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for chat-related endpoints
  if (event.request.method === 'GET' && 
      CHAT_API_ENDPOINTS.some(endpoint => event.request.url.includes(endpoint))) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Return cached response if available
          if (response) {
            return response;
          }
          
          // Try to fetch from network
          return fetch(event.request)
            .then((response) => {
              // Cache successful responses
              if (response.status === 200) {
                const responseToCache = response.clone();
                // Only cache responses that can be consumed
                if (responseToCache.ok && responseToCache.status === 200) {
                  caches.open(CACHE_NAME)
                    .then((cache) => {
                      cache.put(event.request, responseToCache);
                    })
                    .catch((error) => {
                      console.error('Failed to cache response:', error);
                    });
                }
              }
              return response;
            })
            .catch(() => {
              // Return offline page for HTML requests
              if (event.request.headers.get('accept').includes('text/html')) {
                return caches.match(OFFLINE_URL);
              }
              // Return error response for API requests
              return new Response(JSON.stringify({ 
                success: false, 
                error: 'You are currently offline. Please check your connection.' 
              }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
  }
  
  // Handle POST requests for sending messages
  if (event.request.method === 'POST' && 
      event.request.url.includes('/api/chatbot/conversations')) {
    event.respondWith(
      handleSendMessage(event.request)
    );
  }
});

// Handle sending messages when offline
async function handleSendMessage(request) {
  try {
    // Try to send message immediately
    const response = await fetch(request);
    
    if (response.ok) {
      return response;
    }
    
    // If failed, queue for later
    throw new Error('Network error');
  } catch (error) {
    // Queue message for later sending
    const requestData = await request.json();
    
    try {
      const messageId = await saveMessageToDB({
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: requestData,
        timestamp: Date.now()
      });
      
      // Notify clients about offline status
      notifyClients('offline-message-queued', { messageId });
      
      // Return success response to avoid error in UI
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Message queued for sending when online',
        queued: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (dbError) {
      console.error('Failed to queue message:', dbError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to queue message' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

// Sync queued messages when online
async function syncQueuedMessages() {
  try {
    const pendingMessages = await getPendingMessages();
    
    if (pendingMessages.length === 0) {
      return;
    }
    
    notifyClients('sync-started', { count: pendingMessages.length });
    
    for (const message of pendingMessages) {
      try {
        const response = await fetch(message.url, {
          method: message.method,
          headers: message.headers,
          body: JSON.stringify(message.body)
        });
        
        if (response.ok) {
          // Mark as sent
          await updateMessageStatus(message.id, 'sent');
          notifyClients('message-sent', { messageId: message.id });
        } else {
          // Keep as pending
          notifyClients('message-failed', { messageId: message.id });
        }
      } catch (error) {
        // Keep as pending
        notifyClients('message-failed', { messageId: message.id });
      }
    }
    
    notifyClients('sync-completed', { count: pendingMessages.length });
  } catch (error) {
    console.error('Failed to sync queued messages:', error);
  }
}

// Notify clients about events
function notifyClients(type, data) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type, ...data });
    });
  });
}

// Listen for online/offline events
self.addEventListener('online', () => {
  console.log('Service Worker: Browser is online');
  notifyClients('online-status', { isOnline: true });
  syncQueuedMessages();
});

self.addEventListener('offline', () => {
  console.log('Service Worker: Browser is offline');
  notifyClients('online-status', { isOnline: false });
});

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'sync-messages') {
    syncQueuedMessages();
  }
});