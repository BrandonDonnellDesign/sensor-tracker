/**
 * Notification Service
 * Handles creation, delivery, and management of user notifications
 */

import { createAdminClient } from '@/lib/supabase-admin';
import { replaceTemplateVariables } from './sensor-expiration-templates';

export interface CreateNotificationParams {
  userId: string;
  sensorId?: string;
  type: string;
  title: string;
  message: string;
  variables?: Record<string, string>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  scheduledFor?: Date;
}

export interface NotificationTemplate {
  id: string;
  type: string;
  name: string;
  title_template: string;
  message_template: string;
  is_active: boolean;
  ab_test_group?: string;
  ab_test_weight?: number;
}

export class NotificationService {
  private adminClient: any = null;

  constructor() {
    // Only create admin client on server side
    if (typeof window === 'undefined') {
      try {
        this.adminClient = createAdminClient();
      } catch (error) {
        console.warn('Admin client not available:', error);
      }
    }
  }

  /**
   * Create a notification using templates
   */
  async createNotification(params: CreateNotificationParams): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    if (!this.adminClient) {
      return { success: false, error: 'Admin client not available - server-side only' };
    }

    try {
      // Get template for this notification type
      const template = await this.getTemplate(params.type);
      
      let title = params.title;
      let message = params.message;

      // Use template if available and variables provided
      if (template && params.variables) {
        title = replaceTemplateVariables(template.title_template, params.variables);
        message = replaceTemplateVariables(template.message_template, params.variables);
      }

      // Create notification record
      const { data: notification, error: insertError } = await this.adminClient
        .from('notifications')
        .insert({
          user_id: params.userId,
          sensor_id: params.sensorId,
          type: params.type,
          title,
          message,
          priority: params.priority || 'medium',
          scheduled_for: params.scheduledFor?.toISOString(),
          template_id: template?.id,
          variables: params.variables,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating notification:', insertError);
        return { success: false, error: insertError.message };
      }

      // TODO: Integrate with push notification service, email service, etc.
      await this.deliverNotification(notification.id, {
        title,
        message,
        userId: params.userId,
        type: params.type,
        priority: params.priority || 'medium'
      });

      return { success: true, notificationId: notification.id };

    } catch (error) {
      console.error('Error in createNotification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get notification template for a specific type
   */
  private async getTemplate(type: string): Promise<NotificationTemplate | null> {
    if (!this.adminClient) {
      return null;
    }

    try {
      // Get all active templates for this type
      const { data: templates, error } = await this.adminClient
        .from('notification_templates')
        .select('*')
        .eq('type', type)
        .eq('is_active', true);

      if (error || !templates || templates.length === 0) {
        return null;
      }

      // Use A/B testing logic to select template
      if (templates.length === 1) {
        return templates[0];
      }

      // Weighted random selection
      const totalWeight = templates.reduce((sum: number, template: any) => 
        sum + (template.ab_test_weight || 1), 0
      );
      const random = Math.random() * totalWeight;

      let currentWeight = 0;
      for (const template of templates) {
        currentWeight += template.ab_test_weight || 1;
        if (random <= currentWeight) {
          return template;
        }
      }

      return templates[0]; // Fallback

    } catch (error) {
      console.error('Error getting template:', error);
      return null;
    }
  }

  /**
   * Deliver notification through various channels
   */
  private async deliverNotification(notificationId: string, notification: {
    title: string;
    message: string;
    userId: string;
    type: string;
    priority: string;
  }): Promise<void> {
    try {
      // Update notification as delivered
      await this.adminClient
        .from('notifications')
        .update({
          delivered_at: new Date().toISOString(),
          delivery_status: 'delivered',
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      // TODO: Implement actual delivery channels
      // - Push notifications (web push, mobile)
      // - Email notifications
      // - SMS notifications
      // - In-app notifications

      console.log(`Notification delivered: ${notification.title} to user ${notification.userId}`);

    } catch (error) {
      console.error('Error delivering notification:', error);
      
      // Mark as failed
      await this.adminClient
        .from('notifications')
        .update({
          delivery_status: 'failed',
          delivery_error: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    types?: string[];
  } = {}): Promise<any[]> {
    if (!this.adminClient) {
      return [];
    }

    try {
      let query = this.adminClient
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.unreadOnly) {
        query = query.is('read_at', null);
      }

      if (options.types && options.types.length > 0) {
        query = query.in('type', options.types);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data: notifications, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return notifications || [];

    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    if (!this.adminClient) {
      return false;
    }

    try {
      const { error } = await this.adminClient
        .from('notifications')
        .update({
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      return !error;

    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId: string, timeRange: '24h' | '7d' | '30d' = '7d'): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    deliveryRate: number;
  }> {
    if (!this.adminClient) {
      return { total: 0, unread: 0, byType: {}, deliveryRate: 0 };
    }

    try {
      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data: notifications, error } = await this.adminClient
        .from('notifications')
        .select('type, read_at, delivery_status')
        .eq('user_id', userId)
        .gte('created_at', since);

      if (error || !notifications) {
        return { total: 0, unread: 0, byType: {}, deliveryRate: 0 };
      }

      const total = notifications.length;
      const unread = notifications.filter((n: any) => !n.read_at).length;
      const delivered = notifications.filter((n: any) => n.delivery_status === 'delivered').length;
      
      const byType: Record<string, number> = {};
      notifications.forEach((notification: any) => {
        byType[notification.type] = (byType[notification.type] || 0) + 1;
      });

      const deliveryRate = total > 0 ? (delivered / total) * 100 : 100;

      return { total, unread, byType, deliveryRate };

    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, unread: 0, byType: {}, deliveryRate: 0 };
    }
  }
}

export const notificationService = new NotificationService();