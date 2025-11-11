/**
 * Sensor Expiration Alert System
 * Handles automated detection and notification of sensor expiration events
 */

import { createAdminClient } from '@/lib/supabase-admin';
import { notificationService } from './notification-service';
import { getSensorExpirationInfo } from '@/utils/sensor-expiration';

export interface SensorExpirationAlert {
  sensorId: string;
  userId: string;
  alertType: 'sensor_expiry_warning' | 'sensor_expired' | 'sensor_grace_period';
  daysLeft: number;
  expirationDate: Date;
  sensorModel: string;
  serialNumber?: string;
  graceTimeLeft?: string; // For grace period countdown
}

export class SensorExpirationAlertService {
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
   * Check all active sensors and generate expiration alerts
   * Server-side only method
   */
  async checkAndGenerateAlerts(): Promise<{
    success: boolean;
    alertsGenerated: number;
    sensorsChecked: number;
    errors: string[];
  }> {
    if (!this.adminClient) {
      return {
        success: false,
        alertsGenerated: 0,
        sensorsChecked: 0,
        errors: ['Admin client not available - this method requires server-side execution']
      };
    }

    const errors: string[] = [];
    let alertsGenerated = 0;
    let sensorsChecked = 0;

    try {
      // Get all active sensors with their model information
      const { data: sensors, error: sensorsError } = await (this.adminClient as any)
        .from('sensors')
        .select(`
          id,
          user_id,
          date_added,
          serial_number,
          sensor_models (
            id,
            manufacturer,
            model_name,
            duration_days
          )
        `)
        .eq('is_deleted', false)
        .is('archived_at', null)
        .order('date_added', { ascending: true });

      if (sensorsError) {
        errors.push(`Failed to fetch sensors: ${sensorsError.message}`);
        return { success: false, alertsGenerated: 0, sensorsChecked: 0, errors };
      }

      if (!sensors || sensors.length === 0) {
        return { success: true, alertsGenerated: 0, sensorsChecked: 0, errors: [] };
      }

      sensorsChecked = sensors.length;

      // Process each sensor for expiration alerts
      for (const sensor of sensors) {
        try {
          const alerts = await this.processSensorForAlerts(sensor);
          alertsGenerated += alerts.length;
        } catch (error) {
          errors.push(`Error processing sensor ${sensor.id}: ${(error as Error).message}`);
        }
      }

      return {
        success: errors.length === 0,
        alertsGenerated,
        sensorsChecked,
        errors
      };

    } catch (error) {
      errors.push(`Unexpected error: ${(error as Error).message}`);
      return { success: false, alertsGenerated: 0, sensorsChecked: 0, errors };
    }
  }

  /**
   * Process a single sensor for expiration alerts
   */
  private async processSensorForAlerts(sensor: any): Promise<SensorExpirationAlert[]> {
    const alerts: SensorExpirationAlert[] = [];

    // Get sensor model info
    const sensorModel = sensor.sensor_models || this.getDefaultSensorModel();
    if (!sensorModel) {
      throw new Error(`No sensor model found for sensor ${sensor.id}`);
    }

    // Calculate expiration info
    const expirationInfo = getSensorExpirationInfo(sensor.date_added, {
      id: sensorModel.id,
      manufacturer: sensorModel.manufacturer,
      modelName: sensorModel.model_name,
      duration_days: sensorModel.duration_days,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Skip expired sensor alerts if user has added a replacement sensor
    if (expirationInfo.isExpired) {
      const hasReplacement = await this.hasReplacementSensor(sensor.user_id, sensor.date_added, expirationInfo.expirationDate);
      if (hasReplacement) {
        // User has already replaced this sensor, no need to send expired alerts
        return alerts;
      }
    }

    // Determine which alerts to generate
    const alertsToGenerate = this.determineAlertsNeeded(expirationInfo.daysLeft, expirationInfo.expirationDate, sensorModel);

    for (const alertType of alertsToGenerate) {
      // Check if we've already sent this alert type for this sensor
      const alreadySent = await this.hasAlertBeenSent(sensor.id, alertType);
      if (alreadySent) {
        continue;
      }

      // Generate the alert
      const alert: SensorExpirationAlert = {
        sensorId: sensor.id,
        userId: sensor.user_id,
        alertType,
        daysLeft: expirationInfo.daysLeft,
        expirationDate: expirationInfo.expirationDate,
        sensorModel: `${sensorModel.manufacturer} ${sensorModel.model_name}`,
        serialNumber: sensor.serial_number
      };

      // Add grace period countdown for grace period alerts
      if (alertType === 'sensor_grace_period') {
        const now = new Date();
        const hoursExpired = (now.getTime() - expirationInfo.expirationDate.getTime()) / (1000 * 60 * 60);
        const graceHoursLeft = Math.max(0, 12 - hoursExpired);
        const graceMinutesLeft = Math.max(0, (graceHoursLeft % 1) * 60);
        
        if (graceHoursLeft >= 1) {
          const hours = Math.floor(graceHoursLeft);
          const minutes = Math.floor(graceMinutesLeft);
          alert.graceTimeLeft = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        } else {
          const minutes = Math.floor(graceMinutesLeft);
          alert.graceTimeLeft = `${minutes}m`;
        }
      }

      await this.sendExpirationAlert(alert);
      alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Determine which alert types are needed based on days left and grace period
   */
  private determineAlertsNeeded(daysLeft: number, expirationDate: Date, sensorModel: any): Array<'sensor_expiry_warning' | 'sensor_expired' | 'sensor_grace_period'> {
    const alerts: Array<'sensor_expiry_warning' | 'sensor_expired' | 'sensor_grace_period'> = [];

    if (daysLeft === 3 || daysLeft === 1 || daysLeft === 0) {
      alerts.push('sensor_expiry_warning');
    }
    
    if (daysLeft < 0) {
      // Check if this is a Dexcom sensor with grace period
      const isDexcom = sensorModel.manufacturer?.toLowerCase().includes('dexcom') || 
                       sensorModel.model_name?.toLowerCase().includes('g6') ||
                       sensorModel.model_name?.toLowerCase().includes('g7');
      
      if (isDexcom) {
        const now = new Date();
        const hoursExpired = Math.abs((now.getTime() - expirationDate.getTime()) / (1000 * 60 * 60));
        
        if (hoursExpired < 12) {
          // Still in 12-hour grace period
          alerts.push('sensor_grace_period');
        } else {
          // Grace period expired
          alerts.push('sensor_expired');
        }
      } else {
        // Non-Dexcom sensors don't have grace period
        alerts.push('sensor_expired');
      }
    }

    return alerts;
  }

  /**
   * Check if user has added a replacement sensor around the time this sensor expired
   */
  private async hasReplacementSensor(userId: string, originalSensorDate: string, expirationDate: Date): Promise<boolean> {
    if (!this.adminClient) {
      return false; // If we can't check, assume no replacement
    }

    try {
      // Look for sensors added within 3 days before or after the expiration date
      const searchStart = new Date(expirationDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const searchEnd = new Date(expirationDate.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      const { data: replacementSensors, error } = await (this.adminClient as any)
        .from('sensors')
        .select('id, date_added')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .is('archived_at', null)
        .gte('date_added', searchStart.toISOString())
        .lte('date_added', searchEnd.toISOString())
        .neq('date_added', originalSensorDate); // Exclude the original sensor

      if (error) {
        console.error('Error checking for replacement sensors:', error);
        return false;
      }

      // If we found any sensors added around the expiration time, assume it's a replacement
      return replacementSensors && replacementSensors.length > 0;
    } catch (error) {
      console.error('Error in hasReplacementSensor:', error);
      return false;
    }
  }

  /**
   * Check if an alert has already been sent for this sensor and alert type
   */
  private async hasAlertBeenSent(sensorId: string, alertType: string): Promise<boolean> {
    if (!this.adminClient) {
      return false; // If we can't check, err on the side of sending
    }

    // Check for notifications sent in the last 24 hours for this sensor and alert type
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existingNotifications, error } = await (this.adminClient as any)
      .from('notifications')
      .select('id')
      .eq('sensor_id', sensorId)
      .eq('type', alertType)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1);

    if (error) {
      console.error('Error checking existing notifications:', error);
      return false; // If we can't check, err on the side of sending
    }

    return existingNotifications && existingNotifications.length > 0;
  }

  /**
   * Send an expiration alert notification
   */
  private async sendExpirationAlert(alert: SensorExpirationAlert): Promise<void> {
    const templateVariables = {
      sensorModel: alert.sensorModel,
      serialNumber: alert.serialNumber || 'Unknown',
      daysLeft: alert.daysLeft.toString(),
      expirationDate: alert.expirationDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      expirationTime: alert.expirationDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      graceTimeLeft: alert.graceTimeLeft || '0m'
    };

    // Create notification using the template system
    try {
      await notificationService.createNotification({
        userId: alert.userId,
        sensorId: alert.sensorId,
        type: `sensor_expiry_${alert.alertType}`,
        title: this.getAlertTitle(alert),
        message: this.getAlertMessage(alert),
        variables: templateVariables
      });
    } catch (error) {
      console.error(`Failed to send ${alert.alertType} alert for sensor ${alert.sensorId}:`, error);
      throw error;
    }
  }

  /**
   * Get alert title based on alert type and days left
   */
  private getAlertTitle(alert: SensorExpirationAlert): string {
    if (alert.alertType === 'sensor_expired') {
      return `Sensor replacement needed`;
    }
    
    if (alert.alertType === 'sensor_grace_period') {
      return `Sensor has expired - ${alert.graceTimeLeft || '0m'} remaining`;
    }
    
    // sensor_expiry_warning
    if (alert.daysLeft === 3) {
      return `Sensor expires in 3 days`;
    } else if (alert.daysLeft === 1) {
      return `Sensor expires tomorrow`;
    } else if (alert.daysLeft === 0) {
      return `Sensor expires today`;
    } else {
      return `Sensor expires soon`;
    }
  }

  /**
   * Get alert message based on alert type and days left
   */
  private getAlertMessage(alert: SensorExpirationAlert): string {
    const sensorInfo = alert.serialNumber 
      ? `${alert.sensorModel} (${alert.serialNumber})`
      : alert.sensorModel;

    if (alert.alertType === 'sensor_expired') {
      const daysExpired = Math.abs(alert.daysLeft);
      return `Your ${sensorInfo} expired ${daysExpired} day${daysExpired === 1 ? '' : 's'} ago. Replace it immediately to resume glucose monitoring.`;
    }
    
    if (alert.alertType === 'sensor_grace_period') {
      return `Your ${sensorInfo} has expired. Change your sensor as soon as possible. You are now in the 12-hour grace period with ${alert.graceTimeLeft || '0 minutes'} remaining.`;
    }
    
    // sensor_expiry_warning
    if (alert.daysLeft === 3) {
      return `Your ${sensorInfo} will expire in 3 days on ${alert.expirationDate.toLocaleDateString()}. Make sure you have a replacement ready.`;
    } else if (alert.daysLeft === 1) {
      return `Your ${sensorInfo} expires tomorrow (${alert.expirationDate.toLocaleDateString()}). Make sure you have a replacement ready.`;
    } else if (alert.daysLeft === 0) {
      return `Your ${sensorInfo} expires today at ${alert.expirationDate.toLocaleTimeString()}. Replace it as soon as possible to maintain continuous monitoring.`;
    } else {
      return `Your ${sensorInfo} will expire soon. Please check your sensor status.`;
    }
  }

  /**
   * Get default sensor model (fallback)
   */
  private getDefaultSensorModel() {
    // Return a generic fallback model when database model is not available
    return {
      id: 'fallback',
      manufacturer: 'Generic',
      model_name: 'CGM Sensor',
      duration_days: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get sensors expiring within a specific timeframe
   * Server-side only method
   */
  async getSensorsExpiringWithin(days: number): Promise<any[]> {
    if (!this.adminClient) {
      console.warn('Admin client not available for getSensorsExpiringWithin');
      return [];
    }

    const { data: sensors, error } = await (this.adminClient as any)
      .from('sensors')
      .select(`
        id,
        user_id,
        date_added,
        serial_number,
        sensor_models (
          id,
          manufacturer,
          model_name,
          duration_days
        )
      `)
      .eq('is_deleted', false)
      .is('archived_at', null);

    if (error || !sensors) {
      return [];
    }

    const now = new Date();
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return sensors.filter((sensor: any) => {
      const sensorModel = sensor.sensor_models || this.getDefaultSensorModel();
      if (!sensorModel) return false;

      const expirationInfo = getSensorExpirationInfo(sensor.date_added, {
        id: sensorModel.id,
        manufacturer: sensorModel.manufacturer,
        modelName: sensorModel.model_name,
        duration_days: sensorModel.duration_days,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return expirationInfo.expirationDate <= targetDate && !expirationInfo.isExpired;
    });
  }

  /**
   * Get notification statistics for sensor expiration alerts
   * Server-side only method
   */
  async getAlertStats(timeRange: '24h' | '7d' | '30d' = '7d'): Promise<{
    totalAlerts: number;
    alertsByType: Record<string, number>;
    deliveryRate: number;
  }> {
    if (!this.adminClient) {
      console.warn('Admin client not available for getAlertStats');
      return { totalAlerts: 0, alertsByType: {}, deliveryRate: 0 };
    }

    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data: notifications, error } = await (this.adminClient as any)
      .from('notifications')
      .select('type, created_at')
      .in('type', ['sensor_expiry_warning', 'sensor_expired', 'sensor_grace_period'])
      .gte('created_at', since);

    if (error || !notifications) {
      return { totalAlerts: 0, alertsByType: {}, deliveryRate: 0 };
    }

    const alertsByType: Record<string, number> = {};

    notifications.forEach((notification: any) => {
      alertsByType[notification.type] = (alertsByType[notification.type] || 0) + 1;
    });

    // Simplified delivery rate - assume all notifications were delivered
    const deliveryRate = 100;

    return {
      totalAlerts: notifications.length,
      alertsByType,
      deliveryRate
    };
  }
}

export const sensorExpirationAlertService = new SensorExpirationAlertService();