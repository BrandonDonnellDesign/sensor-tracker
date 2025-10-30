// @ts-nocheck
/**
 * Supabase Edge Function for Hourly Notifications
 * Handles automated notification generation for sensor expiry warnings
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get sensors with their model info to calculate expiry dates
    const { data: sensors, error: sensorsError } = await supabase
      .from('sensors')
      .select(
        `
        user_id, 
        serial_number, 
        date_added,
        sensor_models!sensor_model_id(duration_days)
      `
      )
      .eq('is_deleted', false)
      .is('archived_at', null);

    if (sensorsError) {
      console.error('Error fetching sensors:', sensorsError);
      throw sensorsError;
    }
    if (!sensors || sensors.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No active sensors found',
          count: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Filter sensors that are expiring within 3 days
    const now = new Date();
    const sensorsExpiringSoon = sensors.filter((sensor: any) => {
      const durationDays = sensor.sensor_models?.duration_days || 14; // Default to 14 days
      const expiryDate = new Date(sensor.date_added);
      expiryDate.setDate(expiryDate.getDate() + durationDays);

      const daysLeft = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysLeft <= 3 && daysLeft >= 0; // Expiring within 3 days but not expired
    });

    if (sensorsExpiringSoon.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No sensors expiring soon found',
          count: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get unique user IDs from sensors expiring soon
    const userIds = [
      ...new Set(sensorsExpiringSoon.map((s: any) => s.user_id)),
    ];
    
    // Check for existing recent notifications to avoid spam
    const { data: recentNotifications, error: notificationsError } =
      await supabase
        .from('notifications')
        .select('user_id')
        .eq('type', 'sensor_expiry_warning')
        .gte(
          'created_at',
          new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
        );
    if (notificationsError) {
      console.error('Error checking recent notifications:', notificationsError);
      throw notificationsError;
    }
    // Filter out users who already received a recent notification
    const recentUserIds = new Set(
      recentNotifications?.map((n) => n.user_id) || []
    );
    const usersToNotify = userIds.filter(
      (userId) => !recentUserIds.has(userId)
    );
    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'All users already notified recently',
          count: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Get notification template for sensor expiry warning
    const { data: template, error: templateError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('type', 'sensor_expiry_warning')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (templateError) {
      console.error('Error fetching notification template:', templateError);
      // Fallback to default template if none found
    }

    // Get user profiles for template variables
    const { data: userProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', usersToNotify);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
    }

    // Create notifications for eligible users with sensor details
    const notifications = usersToNotify.slice(0, 50).map((userId) => {
      // Find sensors expiring soon for this user
      const userSensors = sensorsExpiringSoon.filter(
        (s: any) => s.user_id === userId
      );
      const sensorInfo = userSensors.map((s: any) => {
        const durationDays = s.sensor_models?.duration_days || 14;
        const expiryDate = new Date(s.date_added);
        expiryDate.setDate(expiryDate.getDate() + durationDays);
        const daysLeft = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { serial: s.serial_number, daysLeft };
      });

      // Get user name for template
      const userProfile = userProfiles?.find((p: any) => p.id === userId);
      const userName =
        userProfile?.full_name || userProfile?.username || 'there';

      // Use template variables if available
      let title = template?.title_template || 'Sensor expiring soon!';
      let message =
        template?.message_template ||
        'Your sensor will expire soon. Please replace it to continue monitoring.';

      // Replace template variables
      if (sensorInfo.length > 0) {
        const firstSensor = sensorInfo[0];
        title = title.replace('{{userName}}', userName);
        title = title.replace(
          '{{sensorSerial}}',
          firstSensor.serial || 'Unknown'
        );
        title = title.replace('{{daysLeft}}', firstSensor.daysLeft.toString());
        message = message.replace('{{userName}}', userName);
        message = message.replace(
          '{{sensorSerial}}',
          firstSensor.serial || 'Unknown'
        );
        message = message.replace(
          '{{daysLeft}}',
          firstSensor.daysLeft.toString()
        );
      }

      return {
        user_id: userId,
        title,
        message,
        type: 'sensor_expiry_warning',
        status: 'sent',
        delivery_status: 'delivered',
        template_id: template?.id || null,
        template_variant: template?.ab_test_group || null,
        created_at: new Date().toISOString(),
      };
    });
    const { data: createdNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();
    if (insertError) {
      console.error('Error creating notifications:', insertError);
      throw insertError;
    }
    
    return new Response(
      JSON.stringify({
        message: 'Sensor expiry notifications generated successfully',
        count: createdNotifications?.length || 0,
        sensors_expiring: sensorsExpiringSoon.length,
        users_checked: userIds.length,
        users_notified: usersToNotify.length,
        template_used: template?.name || 'Default template',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in notification function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
