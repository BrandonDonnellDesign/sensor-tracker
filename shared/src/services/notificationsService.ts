import { getSensorExpirationInfo, getSensorModelFromSerial } from '../utils/sensorExpiration';

export interface Notification {
  id: string;
  user_id: string;
  sensor_id?: string;
  title: string;
  message: string;
  type: 'sensor_expiring' | 'sensor_expired' | 'sensor_issue' | 'maintenance_reminder';
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationData {
  user_id: string;
  sensor_id?: string;
  title: string;
  message: string;
  type: 'sensor_expiring' | 'sensor_expired' | 'sensor_issue' | 'maintenance_reminder';
}

export interface SupabaseClient {
  from: (table: string) => any;
}

/**
 * Simple sensor expiration calculation for notifications
 * Assumes 14-day sensor duration (common for CGM sensors)
 */
function getSimpleSensorExpirationInfo(dateAdded: string): { daysLeft: number; isExpired: boolean; isExpiringSoon: boolean } {
  const addedDate = new Date(dateAdded);
  const expirationDate = new Date(addedDate);
  expirationDate.setDate(expirationDate.getDate() + 14); // Assume 14 days

  const now = new Date();
  const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    daysLeft: Math.max(0, daysLeft),
    isExpired: daysLeft < 0,
    isExpiringSoon: daysLeft <= 2 && daysLeft >= 0,
  };
}

/**
 * Create a new notification
 */
export async function createNotification(supabase: SupabaseClient, data: CreateNotificationData): Promise<Notification | null> {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }

  return notification;
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(supabase: SupabaseClient, userId: string): Promise<Notification[]> {
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return notifications || [];
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(supabase: SupabaseClient, notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }

  return true;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }

  return true;
}

/**
 * Generate notifications based on sensor data
 * This should be called periodically (e.g., daily) to check for expiring/expired sensors
 */
export async function generateSensorNotifications(supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    // Get all active sensors for the user
    const { data: sensors, error: sensorsError } = await supabase
      .from('sensors')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false);

    if (sensorsError) {
      console.error('Error fetching sensors for notifications:', sensorsError);
      return;
    }

    if (!sensors || sensors.length === 0) {
      return;
    }

    // Check each sensor for expiration notifications
    for (const sensor of sensors) {
      const expirationInfo = getSimpleSensorExpirationInfo(sensor.date_added);

      // Check if sensor is expired
      if (expirationInfo.daysLeft < 0) {
        // Check if we already have an expired notification for this sensor
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('sensor_id', sensor.id)
          .eq('type', 'sensor_expired')
          .limit(1);

        if (!existingNotification || existingNotification.length === 0) {
          await createNotification(supabase, {
            user_id: userId,
            sensor_id: sensor.id,
            title: 'Sensor has expired',
            message: `Your sensor (SN: ${sensor.serial_number}) has expired. Please replace it immediately.`,
            type: 'sensor_expired',
          });
        }
      }
      // Check if sensor expires within 2 days
      else if (expirationInfo.daysLeft <= 2) {
        // Check if we already have an expiring notification for this sensor
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('sensor_id', sensor.id)
          .eq('type', 'sensor_expiring')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24 hours
          .limit(1);

        if (!existingNotification || existingNotification.length === 0) {
          await createNotification(supabase, {
            user_id: userId,
            sensor_id: sensor.id,
            title: 'Sensor expires soon',
            message: `Your sensor (SN: ${sensor.serial_number}) will expire in ${expirationInfo.daysLeft} day${expirationInfo.daysLeft !== 1 ? 's' : ''}. Please plan to replace it.`,
            type: 'sensor_expiring',
          });
        }
      }

      // Check for problematic sensors
      if (sensor.is_problematic && sensor.issue_notes) {
        // Check if we already have an issue notification for this sensor
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('sensor_id', sensor.id)
          .eq('type', 'sensor_issue')
          .limit(1);

        if (!existingNotification || existingNotification.length === 0) {
          await createNotification(supabase, {
            user_id: userId,
            sensor_id: sensor.id,
            title: 'Sensor issue detected',
            message: `Issue with sensor (SN: ${sensor.serial_number}): ${sensor.issue_notes}`,
            type: 'sensor_issue',
          });
        }
      }
    }
  } catch (error) {
    console.error('Error generating sensor notifications:', error);
  }
}

/**
 * Clean up old read notifications (older than 30 days)
 */
export async function cleanupOldNotifications(supabase: SupabaseClient): Promise<void> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('read', true)
      .lt('created_at', thirtyDaysAgo);

    if (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  } catch (error) {
    console.error('Error in cleanupOldNotifications:', error);
  }
}