import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { smartNotificationEngine } from '@/lib/notifications/smart-notifications';
import { EnhancedNotificationService } from '@/lib/services/enhanced-notification-service';

// Use service role key for cron jobs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting automated notification generation...');
    
    // Get all users who have notifications enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, notifications_enabled, notification_preferences')
      .eq('notifications_enabled', true);

    if (usersError) {
      throw usersError;
    }

    let totalNotifications = 0;
    let processedUsers = 0;

    for (const user of users || []) {
      try {
        // Use enhanced notification service for predictive alerts and pattern recognition
        const enhancedNotifications = await EnhancedNotificationService.processUserNotifications(user.id);
        totalNotifications += enhancedNotifications.length;

        // Also run legacy smart notifications for compatibility
        // Get user's sensors
        const { data: sensors } = await supabase
          .from('sensors')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_deleted', false);

        // Get user's insulin data
        const { data: insulinDoses } = await supabase
          .from('all_insulin_delivery')
          .select('*')
          .eq('user_id', user.id)
          .gte('taken_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('taken_at', { ascending: false });

        // Get user's glucose readings
        const { data: glucoseReadings } = await supabase
          .from('glucose_readings')
          .select('*')
          .eq('user_id', user.id)
          .gte('system_time', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
          .order('system_time', { ascending: false })
          .limit(20);

        // Get user's recent food logs
        const { data: foodLogs } = await supabase
          .from('food_logs')
          .select('id, logged_at, total_carbs_g')
          .eq('user_id', user.id)
          .gte('logged_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
          .order('logged_at', { ascending: false });

        // Generate smart notifications (legacy system)
        const notifications = smartNotificationEngine.generateNotifications({
          sensors: sensors || [],
          userStats: null,
          currentTime: new Date(),
          insulinDoses: (insulinDoses || []).map(dose => ({
            id: dose.id,
            amount: dose.units,
            type: dose.insulin_type || 'rapid',
            timestamp: new Date(dose.taken_at),
            duration: getDurationByType(dose.insulin_type || 'rapid')
          })),
          currentGlucose: glucoseReadings?.[0]?.value,
          glucoseReadings: (glucoseReadings || []).map(reading => ({
            id: reading.id,
            value: reading.value,
            timestamp: new Date(reading.system_time),
            trend: reading.trend
          })),
          foodLogs: foodLogs || []
        });

        // Store high-priority legacy notifications
        const urgentNotifications = notifications.filter(n => 
          n.priority === 'urgent' || n.priority === 'high'
        );

        for (const notification of urgentNotifications) {
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'smart_alert')
            .eq('title', notification.title)
            .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase
              .from('notifications')
              .insert({
                user_id: user.id,
                title: notification.title,
                message: notification.message,
                type: 'smart_alert',
                status: 'pending',
                delivery_status: 'pending',
                metadata: {
                  priority: notification.priority,
                  confidence: notification.confidence,
                  smart_notification_id: notification.id
                }
              });
            
            totalNotifications++;
          }
        }

        processedUsers++;
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
      }
    }

    console.log(`✅ Processed ${processedUsers} users, generated ${totalNotifications} notifications`);

    return NextResponse.json({
      success: true,
      processedUsers,
      totalNotifications,
      timestamp: new Date().toISOString(),
      features: [
        'glucose_predictions',
        'pattern_recognition',
        'enhanced_iob_calculations',
        'predictive_alerts',
        'legacy_smart_notifications'
      ]
    });

  } catch (error) {
    console.error('❌ Cron notification generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate notifications' },
      { status: 500 }
    );
  }
}

// Helper function for insulin duration
function getDurationByType(type: string): number {
  switch (type?.toLowerCase()) {
    case 'rapid':
    case 'fast':
      return 4;
    case 'regular':
      return 8;
    case 'intermediate':
      return 12;
    case 'long':
      return 24;
    default:
      return 4;
  }
}