// @ts-nocheck
/***
 * Supabase Edge Function for Dexcom Data Sync
 * Handles automated synchronization of sensor data and glucose readings from Dexcom API
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    let userId;
    try {
      const body = await req.json();
      userId = body.userId;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if this is a service role request (from cron/background job)
    const authHeader = req.headers.get('Authorization') || '';
    const isServiceRole = authHeader.includes(
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Create Supabase client with service role for background operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // If not service role, validate the user JWT
    if (!isServiceRole) {
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate that the requesting user matches the userId
      if (userId !== user.id) {
        return new Response(
          JSON.stringify({
            error: 'Forbidden: Cannot sync data for another user',
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const targetUserId = userId;

    // Get user's active Dexcom token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('dexcom_tokens')
      .select(
        'access_token_encrypted, refresh_token_encrypted, token_expires_at, scope'
      )
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'No active Dexcom token found. Please reconnect your Dexcom account.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if token is expired
    const tokenExpiresAt = new Date(tokenData.token_expires_at);
    const now = new Date();
    if (tokenExpiresAt <= now) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Dexcom token has expired. Please reconnect your account.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Decrypt access token (simple base64 for demo - use proper decryption in production)
    const accessToken = atob(tokenData.access_token_encrypted);

    // Get sync settings
    const { data: syncSettings } = await supabaseClient
      .from('dexcom_sync_settings')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (!syncSettings?.sync_sensor_data) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Sensor data sync is disabled in settings',
          syncResults: {
            sensorsProcessed: 0,
            devicesProcessed: 0,
            glucoseReadings: 0,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let syncResults = {
      sensorsProcessed: 0,
      devicesProcessed: 0,
      glucoseReadings: 0,
      errors: [],
      newSensors: 0,
      updatedSensors: 0,
    };

    // ========================================================================
    // SYNC GLUCOSE READINGS (EGVs)
    // ========================================================================
    try {
      // Get the last sync time (default to 24 hours ago)
      const { data: lastReading } = await supabaseClient
        .from('glucose_readings')
        .select('system_time')
        .eq('user_id', targetUserId)
        .order('system_time', { ascending: false })
        .limit(1)
        .single();

      const startDate = lastReading?.system_time
        ? new Date(lastReading.system_time)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      // Fetch glucose readings from Dexcom API
      const egvsResponse = await fetch(
        `${Deno.env.get(
          'DEXCOM_API_BASE_URL'
        )}/users/self/egvs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (egvsResponse.ok) {
        const egvsData = await egvsResponse.json();

        if (egvsData.egvs && Array.isArray(egvsData.egvs)) {
          for (const egv of egvsData.egvs) {
            try {
              // Insert glucose reading (ON CONFLICT DO NOTHING handled by unique constraint on record_id)
              await supabaseClient.from('glucose_readings').insert({
                user_id: targetUserId,
                record_id: egv.recordId,
                transmitter_id: egv.transmitterId || 'unknown',
                transmitter_generation: egv.transmitterGeneration,
                value: egv.value?.['mg/dL'] || egv.value,
                unit: 'mg/dL',
                trend: egv.trend,
                trend_rate: egv.trendRate,
                rate_unit: egv.rateUnit || 'mg/dL/min',
                system_time: egv.systemTime,
                display_time: egv.displayTime,
                display_device: egv.displayDevice,
                display_app: egv.displayApp,
                transmitter_ticks: egv.transmitterTicks,
                source: 'dexcom_api',
              });

              syncResults.glucoseReadings++;
            } catch (error) {
              // Likely a duplicate (record_id conflict), skip
              if (!error.message?.includes('duplicate')) {
                syncResults.errors.push(
                  `Error inserting glucose reading: ${error.message}`
                );
              }
            }
          }
        }
      } else {
        syncResults.errors.push(
          `Failed to fetch glucose readings: ${egvsResponse.status}`
        );
      }
    } catch (error) {
      syncResults.errors.push(`Glucose sync error: ${error.message}`);
    }

    // ========================================================================
    // SYNC DEVICE/SENSOR DATA
    // ========================================================================
    if (syncSettings.sync_device_status) {
      try {
        const devicesResponse = await fetch(
          `${Deno.env.get('DEXCOM_API_BASE_URL')}/users/self/devices`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (devicesResponse.ok) {
          const devices = await devicesResponse.json();
          syncResults.devicesProcessed = devices.length;

          // Process each device
          for (const device of devices) {
            // Get sensor sessions for this device
            const sessionsResponse = await fetch(
              `${Deno.env.get(
                'DEXCOM_API_BASE_URL'
              )}/users/self/dataRange?startDate=${getDateDaysAgo(
                30
              )}&endDate=${getCurrentDate()}`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (sessionsResponse.ok) {
              const sessionData = await sessionsResponse.json();

              // Process sensor sessions if available
              if (sessionData.sessions) {
                for (const session of sessionData.sessions) {
                  await processSensorSession(
                    session,
                    device,
                    targetUserId,
                    supabaseClient,
                    syncResults
                  );
                }
              }
            }
          }
        } else {
          syncResults.errors.push(
            `Failed to fetch devices: ${devicesResponse.status}`
          );
        }
      } catch (error) {
        syncResults.errors.push(`Device sync error: ${error.message}`);
      }
    }

    // ========================================================================
    // BACKFILL CGM READINGS FOR RECENT MEALS/INSULIN
    // ========================================================================
    try {
      await supabaseClient.rpc('backfill_cgm_readings', {
        p_user_id: targetUserId,
        p_lookback_hours: 2,
      });
    } catch (error) {
      // Function might not exist yet, ignore
      console.log('Backfill function not available:', error.message);
    }

    // Update sync log
    await supabaseClient.from('dexcom_sync_log').insert({
      user_id: targetUserId,
      sync_type: 'manual',
      operation: 'full_sync',
      status: syncResults.errors.length > 0 ? 'partial' : 'success',
      records_processed:
        syncResults.sensorsProcessed + syncResults.glucoseReadings,
      error_message:
        syncResults.errors.length > 0 ? syncResults.errors.join('; ') : null,
      api_calls_made: syncResults.devicesProcessed + 2, // Rough estimate
    });

    // Update last sync time
    await supabaseClient
      .from('dexcom_tokens')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', targetUserId)
      .eq('is_active', true);

    await supabaseClient
      .from('dexcom_sync_settings')
      .update({
        last_successful_sync: new Date().toISOString(),
        last_sync_error:
          syncResults.errors.length > 0 ? syncResults.errors.join('; ') : null,
      })
      .eq('user_id', targetUserId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed successfully',
        syncResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Dexcom sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error during sync',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function processSensorSession(
  session,
  _device,
  userId,
  supabaseClient,
  syncResults
) {
  try {
    // Check if sensor already exists
    const { data: existingSensor } = await supabaseClient
      .from('sensors')
      .select('id, serial_number')
      .eq('user_id', userId)
      .eq('serial_number', session.transmitterId)
      .eq('is_deleted', false)
      .single();

    if (existingSensor) {
      // Update existing sensor if needed
      const { error: updateError } = await supabaseClient
        .from('sensors')
        .update({
          updated_at: new Date().toISOString(),
          notes: existingSensor.notes
            ? `${
                existingSensor.notes
              }\n\nLast synced with Dexcom API: ${new Date().toLocaleString()}`
            : `Synced with Dexcom API: ${new Date().toLocaleString()}`,
        })
        .eq('id', existingSensor.id);

      if (!updateError) {
        syncResults.updatedSensors++;
      }
    } else {
      // Get default sensor model for Dexcom
      const { data: sensorModel } = await supabaseClient
        .from('sensor_models')
        .select('id')
        .eq('manufacturer', 'Dexcom')
        .limit(1)
        .single();

      // Create new sensor
      const { error: insertError } = await supabaseClient
        .from('sensors')
        .insert({
          user_id: userId,
          serial_number: session.transmitterId,
          date_added: session.sessionStartTime,
          sensor_model_id: sensorModel?.id || null,
          location: 'Auto-detected',
          is_problematic: false,
          dexcom_sensor_id: session.sessionId,
          dexcom_device_serial: session.transmitterId,
          auto_detected: true,
          notes: `Auto-synced from Dexcom API. Session ID: ${
            session.sessionId
          }. Detected on: ${new Date().toLocaleString()}`,
        });

      if (!insertError) {
        syncResults.newSensors++;
      }
    }

    syncResults.sensorsProcessed++;
  } catch (error) {
    syncResults.errors.push(
      `Error processing sensor ${session.transmitterId}: ${error.message}`
    );
  }
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}
