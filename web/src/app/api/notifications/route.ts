
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { getSensorExpirationInfo } from '@dexcom-tracker/shared/utils/sensorExpiration';


export async function POST(request: NextRequest) {
  try {
    let supabase = await createClient();
    let user = null;
    
    // Try to get user from session/cookies first
    const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
    
    if (!authError && cookieUser) {
      user = cookieUser;
    } else {
      // If no user from cookies, try Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Create a new client with the token
        const tokenSupabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          }
        );
        
        const { data: { user: tokenUser }, error: tokenError } = await tokenSupabase.auth.getUser();
        if (!tokenError && tokenUser) {
          user = tokenUser;
          supabase = tokenSupabase;
        }
      }
    }
    
    if (!user) {
      console.error('Authentication failed - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { action, notificationId } = await request.json();
    switch (action) {
      case 'delete': {
        if (!notificationId) {
          return NextResponse.json({ error: 'Notification ID required for delete' }, { status: 400 });
        }
        
        // For now, use direct update to set dismissed_at (after migration is applied)
        // First check if dismissed_at column exists
        const { data: tableInfo } = await (supabase as any)
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'notifications')
          .eq('column_name', 'dismissed_at')
          .single();
        
        if (tableInfo) {
          // Use dismiss functionality if column exists
          const { error: dismissError } = await (supabase as any)
            .from('notifications')
            .update({ 
              dismissed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('user_id', user.id);
            
          if (dismissError) {
            console.error('Error dismissing notification:', dismissError);
            return NextResponse.json({ error: 'Failed to dismiss notification' }, { status: 500 });
          }
        } else {
          // Fallback to delete if column doesn't exist yet
          const { error: deleteError } = await (supabase as any)
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', user.id);
            
          if (deleteError) {
            console.error('Error deleting notification:', deleteError);
            return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
          }
        }
        
        return NextResponse.json({ success: true });
      }
      
      case 'clear-all': {
        // For now, use direct update to set dismissed_at (after migration is applied)
        // First check if dismissed_at column exists
        const { data: tableInfo } = await (supabase as any)
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'notifications')
          .eq('column_name', 'dismissed_at')
          .single();
        
        if (tableInfo) {
          // Use dismiss functionality if column exists
          const { error: dismissError } = await (supabase as any)
            .from('notifications')
            .update({ 
              dismissed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .is('dismissed_at', null);
            
          if (dismissError) {
            console.error('Error dismissing all notifications:', dismissError);
            return NextResponse.json({ error: 'Failed to dismiss notifications' }, { status: 500 });
          }
        } else {
          // Fallback to delete if column doesn't exist yet
          const { error: clearError } = await (supabase as any)
            .from('notifications')
            .delete()
            .eq('user_id', user.id);
            
          if (clearError) {
            console.error('Error clearing all notifications:', clearError);
            return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
          }
        }
        
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Generate notifications based on sensor data with user preferences
 */
async function generateSensorNotifications(supabase: any, userId: string): Promise<void> {
  try {
    // Get user's notification preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('warning_days_before, critical_days_before, notifications_enabled, push_notifications_enabled, in_app_notifications_enabled')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile for notifications:', profileError);
      // Continue with defaults if profile not found
    }

    // Use user settings or defaults
    const warningDays = profile?.warning_days_before || 3;
    const criticalDays = profile?.critical_days_before || 1;
    const notificationsEnabled = profile?.notifications_enabled ?? true;

    // Skip notifications if user has disabled them
    if (!notificationsEnabled) {
      console.log(`Notifications disabled for user ${userId}, skipping...`);
      return;
    }

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
        // Check if we already have an active (non-dismissed) expired notification for this sensor
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('sensor_id', sensor.id)
          .eq('type', 'sensor_expired')
          .is('dismissed_at', null)
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
      // Check if sensor is in critical period (within critical_days_before)
      else if (expirationInfo.daysLeft <= criticalDays && expirationInfo.daysLeft >= 0) {
        // Check if we already have a critical notification for this sensor
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('sensor_id', sensor.id)
          .eq('type', 'sensor_critical')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24 hours
          .limit(1);

        if (!existingNotification || existingNotification.length === 0) {
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              sensor_id: sensor.id,
              title: 'Sensor expires very soon!',
              message: `URGENT: Your sensor (SN: ${sensor.serial_number}) will expire in ${expirationInfo.daysLeft} day${expirationInfo.daysLeft !== 1 ? 's' : ''}. Replace it now!`,
              type: 'sensor_critical',
            });
        }
      }
      // Check if sensor is in warning period (within warning_days_before but not critical)
      else if (expirationInfo.daysLeft <= warningDays && expirationInfo.daysLeft > criticalDays) {
        // Check if we already have a warning notification for this sensor
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