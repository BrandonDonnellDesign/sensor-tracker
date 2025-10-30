import { createAdminClient } from '@/lib/supabase-admin';
// import { Database } from '@/lib/database.types';

type NotificationRow = any;
type NotificationInsert = any;
type NotificationTemplateRow = any;

export interface NotificationData {
  userId: string;
  sensorId?: string;
  type: string;
  title: string;
  message: string;
  templateId?: string;
  templateVariant?: string;
  variables?: Record<string, any>;
}

export class NotificationService {
  private adminClient = createAdminClient();
  private maxRetries = 3;
  private retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s

  async createNotification(data: NotificationData): Promise<string> {
    const notification: NotificationInsert = {
      user_id: data.userId,
      sensor_id: data.sensorId || null,
      type: data.type,
      title: data.title,
      message: data.message,
      status: 'pending',
      template_id: data.templateId || null,
      template_variant: data.templateVariant || null,
      retry_count: 0,
      delivery_status: 'pending'
    };

    const { data: result, error } = await (this.adminClient as any)
      .from('notifications')
      .insert(notification)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create notification: ${error.message}`);
    }

    // Queue for immediate sending
    await this.sendNotification(result.id);
    
    return result.id;
  }

  async createFromTemplate(
    templateId: string, 
    userId: string, 
    variables: Record<string, any> = {},
    sensorId?: string
  ): Promise<string> {
    // Get template with A/B testing
    const template = await this.selectTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Replace variables in template
    const title = this.replaceVariables(template.title_template, variables);
    const message = this.replaceVariables(template.message_template, variables);

    return this.createNotification({
      userId,
      ...(sensorId && { sensorId }),
      type: template.type,
      title,
      message,
      templateId: template.id,
      templateVariant: template.ab_test_group || undefined,
      variables
    });
  }

  private async selectTemplate(templateId: string): Promise<NotificationTemplateRow | null> {
    // Get all active variants for this template
    const { data: templates, error } = await (this.adminClient as any)
      .from('notification_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true);

    if (error || !templates || templates.length === 0) {
      return null;
    }

    // If only one template, return it
    if (templates.length === 1) {
      return templates[0];
    }

    // A/B testing: select based on weights
    const totalWeight = templates.reduce((sum: number, t: any) => sum + (t.ab_test_weight || 1), 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const template of templates) {
      currentWeight += template.ab_test_weight || 1;
      if (random <= currentWeight) {
        return template;
      }
    }

    return templates[0]; // Fallback
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  async sendNotification(notificationId: string): Promise<boolean> {
    try {
      // Get notification details
      const { data: notification, error } = await (this.adminClient as any)
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (error || !notification) {
        throw new Error('Notification not found');
      }

      // Update status to sending
      await (this.adminClient as any)
        .from('notifications')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      // Log delivery attempt
      await this.logDeliveryAttempt(notificationId, 'sent', 'push', null);

      // Here you would integrate with your push notification service
      // For now, we'll simulate success
      const success = await this.sendPushNotification(notification);

      if (success) {
        await (this.adminClient as any)
          .from('notifications')
          .update({ 
            delivery_status: 'delivered',
            updated_at: new Date().toISOString()
          })
          .eq('id', notificationId);

        await this.logDeliveryAttempt(notificationId, 'delivered', 'push', { success: true });
        return true;
      } else {
        throw new Error('Push notification failed');
      }

    } catch (error) {
      await this.handleNotificationFailure(notificationId, error as Error);
      return false;
    }
  }

  private async sendPushNotification(_notification: NotificationRow): Promise<boolean> {
    // This is where you'd integrate with your push notification service
    // For example: Firebase Cloud Messaging, Apple Push Notification Service, etc.
    
    // Simulate network call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate 95% success rate
    return Math.random() > 0.05;
  }

  private async handleNotificationFailure(notificationId: string, error: Error): Promise<void> {
    const { data: notification } = await (this.adminClient as any)
      .from('notifications')
      .select('retry_count')
      .eq('id', notificationId)
      .single();

    const retryCount = (notification?.retry_count || 0) + 1;

    await (this.adminClient as any)
      .from('notifications')
      .update({
        status: 'failed',
        delivery_status: 'failed',
        retry_count: retryCount,
        last_retry_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    await this.logDeliveryAttempt(notificationId, 'failed', 'push', null, error.message);

    // Schedule retry if under max retries
    if (retryCount <= this.maxRetries) {
      const delay = this.retryDelays[retryCount - 1] || this.retryDelays[this.retryDelays.length - 1];
      setTimeout(() => {
        this.retryNotification(notificationId);
      }, delay);
    }
  }

  private async retryNotification(notificationId: string): Promise<void> {
    // Reset status for retry
    await (this.adminClient as any)
      .from('notifications')
      .update({
        status: 'pending',
        delivery_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    // Attempt to send again
    await this.sendNotification(notificationId);
  }

  private async logDeliveryAttempt(
    notificationId: string,
    status: 'pending' | 'sent' | 'delivered' | 'failed',
    provider: string,
    response: any,
    errorMessage?: string
  ): Promise<void> {
    await (this.adminClient as any)
      .from('notification_delivery_log')
      .insert({
        notification_id: notificationId,
        status,
        provider,
        provider_response: response,
        error_message: errorMessage || null
      });
  }

  async getNotificationStats(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    deliveryRate: number;
  }> {
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data: notifications, error } = await (this.adminClient as any)
      .from('notifications')
      .select('status, delivery_status')
      .gte('created_at', since);

    if (error || !notifications) {
      return { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0, deliveryRate: 0 };
    }

    const stats = notifications.reduce((acc: any, n: any) => {
      acc.total++;
      if (n.status === 'sent') acc.sent++;
      if (n.status === 'failed') acc.failed++;
      if (n.status === 'pending') acc.pending++;
      if (n.delivery_status === 'delivered') acc.delivered++;
      return acc;
    }, { total: 0, sent: 0, delivered: 0, failed: 0, pending: 0 });

    const deliveryRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;

    return { ...stats, deliveryRate };
  }

  async retryFailedNotifications(): Promise<number> {
    const { data: failedNotifications, error } = await (this.adminClient as any)
      .from('notifications')
      .select('id, retry_count')
      .eq('status', 'failed')
      .lt('retry_count', this.maxRetries);

    if (error || !failedNotifications) {
      return 0;
    }

    let retriedCount = 0;
    for (const notification of failedNotifications) {
      await this.retryNotification(notification.id);
      retriedCount++;
    }

    return retriedCount;
  }
}

export const notificationService = new NotificationService();