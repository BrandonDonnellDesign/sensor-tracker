const CACHE_NAME = 'cgm-tracker-v1';
const STATIC_CACHE = 'cgm-static-v1';
const DYNAMIC_CACHE = 'cgm-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/sensors',
  '/dashboard/analytics',
  '/manifest.json',
  // Add critical CSS and JS files
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/webpack.js',
  // Fonts
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// API routes to cache
const API_CACHE_PATTERNS = [
  /^\/api\/sensors/,
  /^\/api\/analytics/,
  /^\/api\/user/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets', error);
      })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
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
        // Take control of all pages
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
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    handleFetch(request)
  );
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Static assets - Cache First
    if (STATIC_ASSETS.some(asset => url.pathname.includes(asset)) || 
        url.pathname.includes('/_next/static/')) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // Strategy 2: API calls - Network First with cache fallback
    if (url.pathname.startsWith('/api/') || 
        API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await networkFirst(request, DYNAMIC_CACHE);
    }
    
    // Strategy 3: Pages - Stale While Revalidate
    if (url.pathname.startsWith('/dashboard')) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE);
    }
    
    // Strategy 4: Everything else - Network First
    return await networkFirst(request, DYNAMIC_CACHE);
    
  } catch (error) {
    console.error('Service Worker: Fetch failed', error);
    
    // Return offline fallback for pages
    if (request.destination === 'document') {
      return await getOfflineFallback();
    }
    
    // Return cached version if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return network error
    return new Response('Network error', { 
      status: 408, 
      statusText: 'Network timeout' 
    });
  }
}

// Cache strategies
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const networkResponsePromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);
  
  return cachedResponse || await networkResponsePromise;
}

async function getOfflineFallback() {
  const cache = await caches.open(STATIC_CACHE);
  const fallback = await cache.match('/dashboard');
  
  if (fallback) {
    return fallback;
  }
  
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>CGM Tracker - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            margin: 0;
            background: #f8fafc;
            color: #334155;
          }
          .offline-container {
            text-align: center;
            padding: 2rem;
            max-width: 400px;
          }
          .offline-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 { margin: 0 0 1rem 0; }
          p { margin: 0 0 2rem 0; color: #64748b; }
          button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
          }
          button:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="offline-icon">📱</div>
          <h1>You're Offline</h1>
          <p>CGM Tracker is available offline with limited functionality. Your data will sync when you're back online.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'sync-sensors') {
    event.waitUntil(syncOfflineSensors());
  }
});

async function syncOfflineSensors() {
  try {
    // Get offline sensor data from IndexedDB
    const offlineData = await getOfflineData();
    
    if (offlineData.length > 0) {
      // Sync with server
      for (const sensorData of offlineData) {
        await fetch('/api/sensors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sensorData)
        });
      }
      
      // Clear offline data after successful sync
      await clearOfflineData();
      
      // Notify user of successful sync
      self.registration.showNotification('CGM Tracker', {
        body: `${offlineData.length} sensor(s) synced successfully`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png'
      });
    }
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
  }
}

// Placeholder functions for IndexedDB operations
async function getOfflineData() {
  // TODO: Implement IndexedDB operations
  return [];
}

async function clearOfflineData() {
  // TODO: Implement IndexedDB operations
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});