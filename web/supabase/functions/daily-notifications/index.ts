// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('Processing daily notification check...')
    
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }

    console.log(`Found ${users.users.length} users to check`)
    
    let totalNotificationsCreated = 0
    
    // Check each user's sensors
    for (const user of users.users) {
      console.log(`Checking sensors for user: ${user.id}`)
      
      // Get user's profile settings for notification timing
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('warning_days_before, critical_days_before, notifications_enabled, push_notifications_enabled, in_app_notifications_enabled')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error(`Error fetching profile for user ${user.id}:`, profileError)
        // Use default settings if profile not found
      }

      // Use user settings or defaults
      const warningDays = profile?.warning_days_before || 3
      const criticalDays = profile?.critical_days_before || 1
      const notificationsEnabled = profile?.notifications_enabled ?? true

      // Skip notifications if user has disabled them
      if (!notificationsEnabled) {
        console.log(`Notifications disabled for user ${user.id}, skipping...`)
        continue
      }

      console.log(`Using notification settings for user ${user.id}: warning=${warningDays} days, critical=${criticalDays} days`)
      
      // Get user's active sensors with their model information
      const { data: sensors, error: sensorsError } = await supabase
        .from('sensors')
        .select(`
          *,
          sensor_models (
            manufacturer,
            model_name,
            duration_days
          )
        `)
        .eq('user_id', user.id)
        .eq('is_deleted', false)

      if (sensorsError) {
        console.error(`Error fetching sensors for user ${user.id}:`, sensorsError)
        continue
      }

      if (!sensors || sensors.length === 0) {
        console.log(`No sensors found for user ${user.id}`)
        continue
      }

      console.log(`Found ${sensors.length} sensors for user ${user.id}`)

      // Check each sensor for notifications
      for (const sensor of sensors) {
        const addedDate = new Date(sensor.date_added)
        const now = new Date()
        
        // Get sensor duration from the sensor model
        let durationDays = 10 // Default fallback
        if (sensor.sensor_models && sensor.sensor_models.duration_days) {
          durationDays = sensor.sensor_models.duration_days
        }
        
        const expirationDate = new Date(addedDate)
        expirationDate.setDate(expirationDate.getDate() + durationDays)
        
        const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const isExpired = daysLeft < 0
        const isExpiringSoon = daysLeft <= warningDays && daysLeft >= 0
        const isCritical = daysLeft <= criticalDays && daysLeft >= 0

        console.log(`Sensor ${sensor.serial_number}: ${daysLeft} days left, expired: ${isExpired}, expiring soon: ${isExpiringSoon}, critical: ${isCritical}`)

        // Check for expired sensors
        if (isExpired) {
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('sensor_id', sensor.id)
            .eq('type', 'sensor_expired')
            .limit(1)

          if (!existingNotification || existingNotification.length === 0) {
            const { error: insertError } = await supabase
              .from('notifications')
              .insert({
                user_id: user.id,
                sensor_id: sensor.id,
                title: 'Sensor has expired',
                message: `Your sensor (SN: ${sensor.serial_number}) has expired. Please replace it immediately.`,
                type: 'sensor_expired',
              })

            if (!insertError) {
              totalNotificationsCreated++
              console.log(`Created expired notification for sensor ${sensor.serial_number}`)
            } else {
              console.error('Error creating expired notification:', insertError)
            }
          }
        }
        // Check for critical expiring sensors (within critical_days_before)
        else if (isCritical) {
          // Check for recent notifications (within last 24 hours)
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
          
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('sensor_id', sensor.id)
            .eq('type', 'sensor_critical')
            .gte('created_at', oneDayAgo)
            .limit(1)

          if (!existingNotification || existingNotification.length === 0) {
            const { error: insertError } = await supabase
              .from('notifications')
              .insert({
                user_id: user.id,
                sensor_id: sensor.id,
                title: 'Sensor expires very soon!',
                message: `URGENT: Your sensor (SN: ${sensor.serial_number}) will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Replace it now!`,
                type: 'sensor_critical',
              })

            if (!insertError) {
              totalNotificationsCreated++
              console.log(`Created critical notification for sensor ${sensor.serial_number}`)
            } else {
              console.error('Error creating critical notification:', insertError)
            }
          }
        }
        // Check for warning expiring sensors (within warning_days_before but not critical)
        else if (isExpiringSoon && !isCritical) {
          // Check for recent notifications (within last 24 hours)
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
          
          const { error: insertError } = await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              sensor_id: sensor.id,
              title: 'Sensor expires soon',
              message: `Your sensor (SN: ${sensor.serial_number}) will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please plan to replace it.`,
              type: 'sensor_expiring',
            })

          if (!insertError) {
            totalNotificationsCreated++
            console.log(`Created warning notification for sensor ${sensor.serial_number}`)
          } else {
            console.error('Error creating warning notification:', insertError)
          }
        }

        // Check for problematic sensors
        if (sensor.is_problematic && sensor.issue_notes) {
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('sensor_id', sensor.id)
            .eq('type', 'sensor_issue')
            .limit(1)

          if (!existingNotification || existingNotification.length === 0) {
            const { error: insertError } = await supabase
              .from('notifications')
              .insert({
                user_id: user.id,
                sensor_id: sensor.id,
                title: 'Sensor issue detected',
                message: `Issue with sensor (SN: ${sensor.serial_number}): ${sensor.issue_notes}`,
                type: 'sensor_issue',
              })

            if (!insertError) {
              totalNotificationsCreated++
              console.log(`Created issue notification for sensor ${sensor.serial_number}`)
            } else {
              console.error('Error creating issue notification:', insertError)
            }
          }
        }
      }
    }

    // Clean up old read notifications (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { error: cleanupError } = await supabase
      .from('notifications')
      .delete()
      .eq('read', true)
      .lt('created_at', thirtyDaysAgo)

    if (cleanupError) {
      console.error('Error cleaning up old notifications:', cleanupError)
    } else {
      console.log('Cleaned up old read notifications')
    }

    console.log(`Daily notification check completed. Created ${totalNotificationsCreated} new notifications.`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily notification check completed. Created ${totalNotificationsCreated} new notifications.`,
        notificationsCreated: totalNotificationsCreated,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in daily notifications function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})