// Service Worker for CGM Sensor Tracker
const CACHE_NAME = 'cgm-tracker-v1';
const STATIC_CACHE = 'cgm-static-v1';
const DYNAMIC_CACHE = 'cgm-dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/dashboard',
  '/dashboard/sensors',
  '/dashboard/inventory',
  '/dashboard/glucose-data',
  '/manifest.json',
  '/offline.html',
  // Add your CSS and JS files here
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/sensors/,
  /^\/api\/inventory/,
  /^\/api\/glucose/,
  /^\/api\/dexcom/,
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static files and pages
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    // Cache successful responses for offline access
    if (networkResponse.ok && shouldCacheApiRequest(url.pathname)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for API request');
    
    // Fallback to cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical API endpoints
    if (url.pathname.includes('/api/sensors/') || url.pathname.includes('/api/inventory/')) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'This data is not available offline',
          offline: true
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first for static files
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Both cache and network failed');
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    throw error;
  }
}

// Check if API request should be cached
function shouldCacheApiRequest(pathname) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Background sync for offline insulin logging
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'insulin-log-sync') {
    event.waitUntil(syncInsulinLogs());
  }
});

// Sync offline insulin logs when connection is restored
async function syncInsulinLogs() {
  try {
    // Get offline logs from IndexedDB
    const offlineLogs = await getOfflineInsulinLogs();
    
    for (const log of offlineLogs) {
      try {
        const response = await fetch('/api/insulin/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log.data)
        });
        
        if (response.ok) {
          // Remove successfully synced log
          await removeOfflineInsulinLog(log.id);
          console.log('Service Worker: Synced offline insulin log', log.id);
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync insulin log', log.id, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'Time to check your CGM sensor',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    tag: 'sensor-reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'check-sensor',
        title: 'Check Sensor',
        icon: '/icons/icon-96x96.svg'
      },
      {
        action: 'add-sensor',
        title: 'Add Sensor',
        icon: '/icons/icon-96x96.svg'
      }
    ],
    data: {
      url: '/dashboard/sensors'
    }
  };
  
  if (event.data) {
    const payload = event.data.json();
    options.body = payload.body || options.body;
    options.data = { ...options.data, ...payload.data };
  }
  
  event.waitUntil(
    self.registration.showNotification('CGM Tracker', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.action);
  
  event.notification.close();
  
  const urlToOpen = event.action === 'add-sensor' 
    ? '/dashboard/sensors?action=add'
    : event.notification.data?.url || '/dashboard/sensors';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('/dashboard') && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Placeholder functions for IndexedDB operations
// These would need to be implemented with actual IndexedDB code
async function getOfflineInsulinLogs() {
  // Implementation would use IndexedDB to get offline logs
  return [];
}

async function removeOfflineInsulinLog(id) {
  // Implementation would use IndexedDB to remove synced log
  console.log('Removing offline log:', id);
}