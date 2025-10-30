/**
 * Browser Push Notification Service
 * Handles web push notifications for sensor alerts
 */

export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');

      // Check for existing subscription
      this.subscription = this.registration ? await this.registration.pushManager.getSubscription() : null;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Request permission and subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    if (typeof window === 'undefined' || typeof Notification === 'undefined' || !this.registration) {

      return null;
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {

        return null;
      }

      // Subscribe to push notifications
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {

        return null;
      }

      this.subscription = this.registration ? await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new (window.Uint8Array)(this.urlBase64ToUint8Array(vapidPublicKey)),
      }) : null;

      if (this.subscription) {
        // Save subscription to backend
        await this.saveSubscription(this.subscription);
      }
      return this.subscription;

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) {
      return true;
    }

    try {
      if (typeof window !== 'undefined' && this.subscription) {
        await this.subscription.unsubscribe();
      }
      await this.removeSubscription();
      this.subscription = null;
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Check if user is subscribed
   */
  isSubscribed(): boolean {
    return this.subscription !== null;
  }

  /**
   * Show local notification (fallback)
   */
  async showLocalNotification(data: PushNotificationData): Promise<void> {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {

      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/icon-192x192.png',
        badge: data.badge || '/icon-192x192.png',
        ...(data.tag && { tag: data.tag }),
        data: data.data,
      });
    }
  }

  /**
   * Save subscription to backend
   */
  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push-notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      throw error;
    }
  }

  /**
   * Remove subscription from backend
   */
  private async removeSubscription(): Promise<void> {
    try {
      await fetch('/api/push-notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error removing subscription:', error);
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  // Change return type to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();