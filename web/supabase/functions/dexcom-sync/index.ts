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

    console.log(`Starting sync for user ${targetUserId}`);
    console.log(`Token expires at: ${tokenData.token_expires_at}`);
    console.log(`Token scope: ${tokenData.scope}`);
    console.log(`Access token length: ${accessToken.length}`);
    
    // Test token validity with a simple API call first
    const apiBaseUrl = Deno.env.get('DEXCOM_API_BASE_URL') || 'https://api.dexcom.com/v2';
    console.log(`Using Dexcom API base URL: ${apiBaseUrl}`);

    // Test token validity first
    try {
      console.log('Testing token validity...');
      const testResponse = await fetch(`${apiBaseUrl}/users/self`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`Token test response status: ${testResponse.status}`);
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error(`Token validation failed: ${testResponse.status} - ${errorText}`);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `Invalid or expired Dexcom token: ${testResponse.status}`,
            details: errorText.substring(0, 200)
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      const userInfo = await testResponse.json();
      console.log('Token validation successful, user info:', JSON.stringify(userInfo).substring(0, 200));
      
    } catch (tokenTestError) {
      console.error('Token test error:', tokenTestError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to validate Dexcom token',
          details: tokenTestError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
      const apiBaseUrl = Deno.env.get('DEXCOM_API_BASE_URL') || 'https://api.dexcom.com/v2';
      
      // Format dates properly for Dexcom API (they expect YYYY-MM-DDTHH:mm:ss format)
      const startDateStr = startDate.toISOString().split('.')[0]; // Remove milliseconds
      const endDateStr = endDate.toISOString().split('.')[0]; // Remove milliseconds
      
      console.log(`Fetching glucose readings from ${startDateStr} to ${endDateStr}`);
      
      const egvsResponse = await fetch(
        `${apiBaseUrl}/users/self/egvs?startDate=${startDateStr}&endDate=${endDateStr}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`Glucose API response status: ${egvsResponse.status}`);
      
      if (egvsResponse.ok) {
        const egvsData = await egvsResponse.json();
        console.log(`Glucose API response:`, JSON.stringify(egvsData).substring(0, 500));

        // Handle both array and object responses
        let egvs = [];
        if (Array.isArray(egvsData)) {
          egvs = egvsData;
        } else if (egvsData.egvs && Array.isArray(egvsData.egvs)) {
          egvs = egvsData.egvs;
        } else if (egvsData.records && Array.isArray(egvsData.records)) {
          egvs = egvsData.records;
        }

        console.log(`Processing ${egvs.length} glucose readings`);

        for (const egv of egvs) {
          try {
            // Handle different possible value formats
            let glucoseValue = egv.value;
            if (typeof egv.value === 'object' && egv.value !== null) {
              glucoseValue = egv.value['mg/dL'] || egv.value.mgdl || egv.value.value;
            }

            // Insert glucose reading (ON CONFLICT DO NOTHING handled by unique constraint on record_id)
            await supabaseClient.from('glucose_readings').insert({
              user_id: targetUserId,
              record_id: egv.recordId || egv.record_id || egv.id,
              transmitter_id: egv.transmitterId || egv.transmitter_id || 'unknown',
              transmitter_generation: egv.transmitterGeneration || egv.transmitter_generation,
              value: glucoseValue,
              unit: 'mg/dL',
              trend: egv.trend,
              trend_rate: egv.trendRate || egv.trend_rate,
              rate_unit: egv.rateUnit || egv.rate_unit || 'mg/dL/min',
              system_time: egv.systemTime || egv.system_time,
              display_time: egv.displayTime || egv.display_time,
              display_device: egv.displayDevice || egv.display_device,
              display_app: egv.displayApp || egv.display_app,
              transmitter_ticks: egv.transmitterTicks || egv.transmitter_ticks,
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
      } else {
        const errorText = await egvsResponse.text();
        console.error(`Glucose API error: ${egvsResponse.status} - ${errorText}`);
        syncResults.errors.push(
          `Failed to fetch glucose readings: ${egvsResponse.status} - ${errorText.substring(0, 200)}`
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
          `${apiBaseUrl}/users/self/devices`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(`Devices API response status: ${devicesResponse.status}`);

        if (devicesResponse.ok) {
          const devicesData = await devicesResponse.json();
          console.log(`Devices API response:`, JSON.stringify(devicesData).substring(0, 500));

          // Handle different possible response formats
          let devices = [];
          if (Array.isArray(devicesData)) {
            devices = devicesData;
          } else if (devicesData.devices && Array.isArray(devicesData.devices)) {
            devices = devicesData.devices;
          } else if (devicesData.records && Array.isArray(devicesData.records)) {
            devices = devicesData.records;
          } else {
            console.log('Unexpected devices response format:', typeof devicesData);
            syncResults.errors.push(`Unexpected devices response format: ${typeof devicesData}`);
          }

          console.log(`Processing ${devices.length} devices`);
          syncResults.devicesProcessed = devices.length;

          // Process each device
          for (const device of devices) {
            try {
              // Get sensor sessions for this device
              const startDateStr = getDateDaysAgo(30);
              const endDateStr = getCurrentDate();
              
              const sessionsResponse = await fetch(
                `${apiBaseUrl}/users/self/dataRange?startDate=${startDateStr}&endDate=${endDateStr}`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (sessionsResponse.ok) {
                const sessionData = await sessionsResponse.json();
                console.log(`Sessions API response:`, JSON.stringify(sessionData).substring(0, 300));

                // Process sensor sessions if available
                if (sessionData.sessions && Array.isArray(sessionData.sessions)) {
                  for (const session of sessionData.sessions) {
                    await processSensorSession(
                      session,
                      device,
                      targetUserId,
                      supabaseClient,
                      syncResults
                    );
                  }
                } else if (sessionData.records && Array.isArray(sessionData.records)) {
                  for (const session of sessionData.records) {
                    await processSensorSession(
                      session,
                      device,
                      targetUserId,
                      supabaseClient,
                      syncResults
                    );
                  }
                }
              } else {
                const sessionErrorText = await sessionsResponse.text();
                console.error(`Sessions API error: ${sessionsResponse.status} - ${sessionErrorText}`);
              }
            } catch (deviceError) {
              console.error(`Error processing device:`, deviceError);
              syncResults.errors.push(`Error processing device: ${deviceError.message}`);
            }
          }
        } else {
          const errorText = await devicesResponse.text();
          console.error(`Devices API error: ${devicesResponse.status} - ${errorText}`);
          syncResults.errors.push(
            `Failed to fetch devices: ${devicesResponse.status} - ${errorText.substring(0, 200)}`
          );
        }
      } catch (error) {
        console.error(`Device sync error:`, error);
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
