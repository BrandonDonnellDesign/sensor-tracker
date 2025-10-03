import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSensorExpirationInfo } from '@dexcom-tracker/shared/utils/sensorExpiration';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    if (action === 'generate') {
      // Generate notifications for the current user
      await generateSensorNotifications(supabase, user.id);

      return NextResponse.json({
        success: true,
        message: 'Notifications generated successfully'
      });
    } else if (action === 'cleanup') {
      // Clean up old notifications
      await cleanupOldNotifications(supabase);

      return NextResponse.json({
        success: true,
        message: 'Old notifications cleaned up successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "generate" or "cleanup"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate notifications based on sensor data
 */
async function generateSensorNotifications(supabase: any, userId: string): Promise<void> {
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
      const sensorModel: any = {
        id: 'fallback',
        manufacturer: (sensor as any).sensor_type === 'dexcom' ? 'Dexcom' : 'Abbott',
        modelName: (sensor as any).sensor_type === 'dexcom' ? 'G6' : 'FreeStyle Libre',
        durationDays: (sensor as any).sensor_type === 'dexcom' ? 11 : 14,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const expirationInfo = getSensorExpirationInfo(new Date(sensor.date_added), sensorModel);

      // Check if sensor is expired
      if (expirationInfo.isExpired) {
        // Check if we already have an expired notification for this sensor
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('sensor_id', sensor.id)
          .eq('type', 'sensor_expired')
          .limit(1);

        if (!existingNotification || existingNotification.length === 0) {
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              sensor_id: sensor.id,
              title: 'Sensor has expired',
              message: `Your sensor (SN: ${sensor.serial_number}) has expired. Please replace it immediately.`,
              type: 'sensor_expired',
            });
        }
      }
      // Check if sensor expires within 2 days
      else if (expirationInfo.isExpiringSoon) {
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
          await supabase
            .from('notifications')
            .insert({
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
          await supabase
            .from('notifications')
            .insert({
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
async function cleanupOldNotifications(supabase: any): Promise<void> {
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