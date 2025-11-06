import { createClient } from '@/lib/supabase-client';
import { SmartNotification } from '@/lib/notifications/smart-notifications';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DeliveryMethod = 'websocket-only' | 'database-persistent' | 'hybrid';

interface NotificationConfig {
  priority: NotificationPriority;
  deliveryMethod: DeliveryMethod;
  persistInDb: boolean;
  requireAck: boolean; // Require user acknowledgment
  retryOnFailure: boolean;
  expiresIn?: number; // milliseconds
}

const NOTIFICATION_CONFIGS: Record<string, NotificationConfig> = {
  // Critical medical alerts - always persist
  'insulin-stacking': {
    priority: 'urgent',
    deliveryMethod: 'database-persistent',
    persistInDb: true,
    requireAck: true,
    retryOnFailure: true
  },
  'high-iob-low-glucose': {
    priority: 'urgent',
    deliveryMethod: 'database-persistent',
    persistInDb: true,
    requireAck: true,
    retryOnFailure: true
  },
  'low-glucose': {
    priority: 'urgent',
    deliveryMethod: 'database-persistent',
    persistInDb: true,
    requireAck: true,
    retryOnFailure: true
  },
  
  // Important but not life-threatening - hybrid
  'rising-glucose-no-food': {
    priority: 'high',
    deliveryMethod: 'hybrid',
    persistInDb: true,
    requireAck: false,
    retryOnFailure: true,
    expiresIn: 2 * 60 * 60 * 1000 // 2 hours
  },
  'prolonged-high-glucose': {
    priority: 'high',
    deliveryMethod: 'hybrid',
    persistInDb: true,
    requireAck: false,
    retryOnFailure: true,
    expiresIn: 4 * 60 * 60 * 1000 // 4 hours
  },
  
  // Informational - WebSocket only
  'dawn-phenomenon': {
    priority: 'medium',
    deliveryMethod: 'websocket-only',
    persistInDb: false,
    requireAck: false,
    retryOnFailure: false,
    expiresIn: 4 * 60 * 60 * 1000 // 4 hours
  },
  'sensor-reminder': {
    priority: 'medium',
    deliveryMethod: 'websocket-only',
    persistInDb: false,
    requireAck: false,
    retryOnFailure: false,
    expiresIn: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  // Tips and achievements - WebSocket only
  'achievement-unlocked': {
    priority: 'low',
    deliveryMethod: 'websocket-only',
    persistInDb: false,
    requireAck: false,
    retryOnFailure: false,
    expiresIn: 60 * 60 * 1000 // 1 hour
  },
  'tip-of-the-day': {
    priority: 'low',
    deliveryMethod: 'websocket-only',
    persistInDb: false,
    requireAck: false,
    retryOnFailure: false,
    expiresIn: 24 * 60 * 60 * 1000 // 24 hours
  }
};

export class HybridNotificationSystem {
  private supabase = createClient();
  private inMemoryNotifications = new Map<string, SmartNotification[]>();
  
  async sendNotification(
    userId: string, 
    notification: SmartNotification,
    notificationType: string
  ): Promise<boolean> {
    const config = NOTIFICATION_CONFIGS[notificationType] || NOTIFICATION_CONFIGS['tip-of-the-day'];
    
    try {
      // 1. Determine delivery method
      switch (config.deliveryMethod) {
        case 'database-persistent':
          return await this.sendPersistentNotification(userId, notification, config);
          
        case 'websocket-only':
          return await this.sendWebSocketOnlyNotification(userId, notification, config);
          
        case 'hybrid':
          return await this.sendHybridNotification(userId, notification, config);
          
        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
      
      // Fallback: always persist critical notifications
      if (config.priority === 'urgent') {
        return await this.sendPersistentNotification(userId, notification, config);
      }
      
      return false;
    }
  }
  
  private async sendPersistentNotification(
    userId: string, 
    notification: SmartNotification,
    config: NotificationConfig
  ): Promise<boolean> {
    // Store in database first
    const { error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: 'smart_alert',
        status: 'pending',
        delivery_status: 'pending',
        metadata: {
          priority: config.priority,
          confidence: notification.confidence,
          smart_notification_id: notification.id,
          requires_ack: config.requireAck,
          expires_at: config.expiresIn ? 
            new Date(Date.now() + config.expiresIn).toISOString() : null
        }
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to persist notification:', error);
      return false;
    }
    
    // Then send via WebSocket (Supabase Realtime will handle this automatically)
    // The database insert will trigger the realtime subscription
    
    return true;
  }
  
  private async sendWebSocketOnlyNotification(
    userId: string, 
    notification: SmartNotification,
    config: NotificationConfig
  ): Promise<boolean> {
    // Store in memory for current session
    const userNotifications = this.inMemoryNotifications.get(userId) || [];
    const notificationWithExpiry = {
      ...notification,
      ...(config.expiresIn && { 
        expiresAt: new Date(Date.now() + config.expiresIn) 
      })
    };
    userNotifications.push(notificationWithExpiry);
    this.inMemoryNotifications.set(userId, userNotifications);
    
    // Send directly via custom WebSocket or Supabase channel
    return await this.sendDirectWebSocket(userId, notification, config);
  }
  
  private async sendHybridNotification(
    userId: string, 
    notification: SmartNotification,
    config: NotificationConfig
  ): Promise<boolean> {
    // Try WebSocket first for speed
    const webSocketSuccess = await this.sendDirectWebSocket(userId, notification, config);
    
    if (webSocketSuccess) {
      // If WebSocket succeeds, optionally persist for audit trail
      if (config.persistInDb) {
        // Async persist (don't wait for it)
        (async () => {
          try {
            await this.supabase
              .from('notifications')
              .insert({
                user_id: userId,
                title: notification.title,
                message: notification.message,
                type: 'smart_alert',
                status: 'delivered',
                delivery_status: 'delivered',
                metadata: {
                  priority: config.priority,
                  delivery_method: 'websocket',
                  delivered_at: new Date().toISOString()
                }
              });
            console.log('✅ Notification persisted for audit');
          } catch (err) {
            console.warn('⚠️ Failed to persist notification:', err);
          }
        })();
      }
      return true;
    } else {
      // Fallback to database method
      return await this.sendPersistentNotification(userId, notification, config);
    }
  }
  
  private async sendDirectWebSocket(
    userId: string, 
    notification: SmartNotification,
    config: NotificationConfig
  ): Promise<boolean> {
    try {
      // Use Supabase Realtime for direct WebSocket delivery
      const channel = this.supabase.channel(`user-${userId}`);
      
      const success = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000); // 5 second timeout
        
        channel
          .send({
            type: 'broadcast',
            event: 'notification',
            payload: {
              ...notification,
              priority: config.priority,
              requiresAck: config.requireAck,
              deliveryMethod: 'websocket-direct'
            }
          })
          .then(() => {
            clearTimeout(timeout);
            resolve(true);
          })
          .catch(() => {
            clearTimeout(timeout);
            resolve(false);
          });
      });
      
      return success;
    } catch (error) {
      console.error('WebSocket delivery failed:', error);
      return false;
    }
  }
  
  // Clean up expired in-memory notifications
  cleanupExpiredNotifications(): void {
    const now = new Date();
    
    for (const [userId, notifications] of this.inMemoryNotifications.entries()) {
      const validNotifications = notifications.filter(n => 
        !n.expiresAt || n.expiresAt > now
      );
      
      if (validNotifications.length !== notifications.length) {
        this.inMemoryNotifications.set(userId, validNotifications);
      }
    }
  }
  
  // Get notifications for user (combines database + memory)
  async getUserNotifications(userId: string): Promise<SmartNotification[]> {
    // Get persistent notifications from database
    const { data: dbNotifications } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Get in-memory notifications
    const memoryNotifications = this.inMemoryNotifications.get(userId) || [];
    
    // Combine and deduplicate
    const allNotifications = [
      ...(dbNotifications || []).map(n => {
        const metadata = (n as any).metadata || {};
        const notification: SmartNotification = {
          id: n.id,
          title: n.title,
          message: n.message,
          type: (n.type as any) || 'alert',
          priority: metadata.priority || 'medium',
          createdAt: new Date(n.created_at || new Date().toISOString()),
          actionable: !!metadata.action_url,
          dismissible: true,
          conditions: { triggers: [], frequency: 'once' as const },
          ...(metadata.action_url && {
            action: {
              label: 'View Details',
              url: metadata.action_url
            }
          }),
          ...(metadata.confidence && { confidence: metadata.confidence })
        };
        return notification;
      }),
      ...memoryNotifications
    ];
    
    return allNotifications;
  }
}

// Singleton instance
export const hybridNotificationSystem = new HybridNotificationSystem();

// Cleanup job (run every 5 minutes)
setInterval(() => {
  hybridNotificationSystem.cleanupExpiredNotifications();
}, 5 * 60 * 1000);