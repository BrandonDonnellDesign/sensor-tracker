// @ts-nocheck
/**
 * Supabase Edge Function for Dexcom Data Sync
 * Handles automated synchronization of sensor data from Dexcom API
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Create Supabase client
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    console.log('Starting hourly notification generation...');
    // Get all active sensors and their users
    const { data: sensors, error: sensorsError } = await supabase.from('sensors').select('user_id').eq('is_deleted', false).is('archived_at', null);
    if (sensorsError) {
      console.error('Error fetching sensors:', sensorsError);
      throw sensorsError;
    }
    if (!sensors || sensors.length === 0) {
      console.log('No active sensors found');
      return new Response(JSON.stringify({
        message: 'No active sensors found',
        count: 0
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get unique user IDs
    const userIds = [
      ...new Set(sensors.map((s)=>s.user_id))
    ];
    console.log(`Found ${userIds.length} users with active sensors`);
    // Check for existing recent notifications to avoid spam
    const { data: recentNotifications, error: notificationsError } = await supabase.from('notifications').select('user_id').eq('type', 'maintenance_reminder').gte('created_at', new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString());
    if (notificationsError) {
      console.error('Error checking recent notifications:', notificationsError);
      throw notificationsError;
    }
    // Filter out users who already received a recent notification
    const recentUserIds = new Set(recentNotifications?.map((n)=>n.user_id) || []);
    const usersToNotify = userIds.filter((userId)=>!recentUserIds.has(userId));
    if (usersToNotify.length === 0) {
      console.log('All users already have recent notifications');
      return new Response(JSON.stringify({
        message: 'All users already notified recently',
        count: 0
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Create notifications for eligible users
    const notifications = usersToNotify.slice(0, 50).map((userId)=>({
        user_id: userId,
        title: 'Sensor Check Reminder',
        message: 'Time to check your sensors for any issues or upcoming expirations.',
        type: 'maintenance_reminder',
        created_at: new Date().toISOString()
      }));
    const { data: createdNotifications, error: insertError } = await supabase.from('notifications').insert(notifications).select();
    if (insertError) {
      console.error('Error creating notifications:', insertError);
      throw insertError;
    }
    console.log(`Successfully created ${createdNotifications?.length || 0} notifications`);
    return new Response(JSON.stringify({
      message: 'Notifications generated successfully',
      count: createdNotifications?.length || 0,
      users_checked: userIds.length,
      users_notified: usersToNotify.length
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in notification function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
