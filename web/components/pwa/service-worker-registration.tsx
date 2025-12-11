'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Only register service worker in production
      if (process.env.NODE_ENV === 'production') {
        registerServiceWorker();
      } else {
        // In development, unregister any existing service workers to prevent caching issues
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
            console.log('Service Worker: Unregistered in development mode');
          }
        });
      }
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker: Registered successfully', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update notification
              showUpdateNotification();
            }
          });
        }
      });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      // Register for background sync
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        console.log('Service Worker: Background sync supported');
      }

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
          requestNotificationPermission();
        }, 5000); // Wait 5 seconds before asking
      }

    } catch (error) {
      console.error('Service Worker: Registration failed', error);
    }
  };

  const showUpdateNotification = () => {
    // Create a custom notification for app updates
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
    notification.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">Update Available</p>
          <p class="text-sm opacity-90">A new version of CGM Tracker is ready.</p>
        </div>
        <button onclick="window.location.reload()" class="ml-4 bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded text-sm transition-colors">
          Update
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('Service Worker: Notification permission granted');

        // Show welcome notification
        new Notification('CGM Tracker', {
          body: 'Notifications enabled! You\'ll get reminders for sensor replacements.',
          icon: '/icons/icon-192x192.svg',
          badge: '/icons/icon-72x72.svg'
        });
      } else {
        console.log('Service Worker: Notification permission denied');
      }
    } catch (error) {
      console.error('Service Worker: Notification permission request failed', error);
    }
  };

  return null; // This component doesn't render anything
}

// Utility functions for offline functionality
export const offlineUtils = {
  // Check if user is online
  isOnline: () => navigator.onLine,

  // Store data for offline sync
  storeOfflineData: async (key: string, data: any) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offline-data') || '{}');
      offlineData[key] = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem('offline-data', JSON.stringify(offlineData));

      // Register for background sync when online
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-sensors');
      }
    } catch (error) {
      console.error('Offline storage failed:', error);
    }
  },

  // Get offline data
  getOfflineData: (key?: string) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offline-data') || '{}');
      return key ? offlineData[key] : offlineData;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return key ? null : {};
    }
  },

  // Clear offline data
  clearOfflineData: (key?: string) => {
    try {
      if (key) {
        const offlineData = JSON.parse(localStorage.getItem('offline-data') || '{}');
        delete offlineData[key];
        localStorage.setItem('offline-data', JSON.stringify(offlineData));
      } else {
        localStorage.removeItem('offline-data');
      }
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  },

  // Show offline indicator
  showOfflineIndicator: () => {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 text-sm z-50';
    indicator.textContent = '📱 You\'re offline - Changes will sync when reconnected';

    if (!document.getElementById('offline-indicator')) {
      document.body.appendChild(indicator);
    }
  },

  // Hide offline indicator
  hideOfflineIndicator: () => {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
};

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('App: Back online');
    offlineUtils.hideOfflineIndicator();
  });

  window.addEventListener('offline', () => {
    console.log('App: Gone offline');
    offlineUtils.showOfflineIndicator();
  });
}