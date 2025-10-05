import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DexcomAPIClient } from '@/lib/dexcom-api';

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId } = body;

    if (action === 'checkConnection') {
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      // Check if user has valid tokens in database
      const { data: tokenData, error } = await supabase
        .from('dexcom_tokens')
        .select('token_expires_at, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !tokenData) {
        return NextResponse.json({
          connected: false,
          message: 'No active Dexcom tokens found'
        });
      }

      const isExpired = new Date(tokenData.token_expires_at) <= new Date();
      
      return NextResponse.json({
        connected: !isExpired,
        tokenExpiry: tokenData.token_expires_at,
        isExpired
      });
    }

    if (action === 'triggerSync') {
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      console.log('Starting real Dexcom sync for user:', userId);

      // Get user's encrypted tokens
      const { data: tokenData, error: tokenError } = await supabase
        .from('dexcom_tokens')
        .select('access_token_encrypted, refresh_token_encrypted, token_expires_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenData) {
        return NextResponse.json({
          error: 'No valid Dexcom tokens found. Please reconnect your Dexcom account.',
          needsReauth: true
        }, { status: 401 });
      }

      // Check if token is expired
      const isExpired = new Date(tokenData.token_expires_at) <= new Date();
      if (isExpired) {
        return NextResponse.json({
          error: 'Dexcom tokens have expired. Please reconnect your account.',
          needsReauth: true
        }, { status: 401 });
      }

      // Decrypt access token (simple base64 for now - in production use proper encryption)
      const accessToken = atob(tokenData.access_token_encrypted);

      // Initialize Dexcom API client
      const dexcomClient = new DexcomAPIClient(false); // sandbox mode

      const syncResults = {
        sensorsFound: 0,
        sensorsCreated: 0,
        sensorsUpdated: 0,
        devicesFound: 0,
        errors: [] as string[]
      };

      try {
        // Get user's Dexcom devices (transmitters)
        console.log('Fetching Dexcom devices...');
        const devices = await dexcomClient.getDevices(accessToken);
        syncResults.devicesFound = devices.length;

        console.log(`Found ${devices.length} Dexcom devices`);

        // Get current sensor session
        console.log('Fetching current sensor...');
        const currentSensor = await dexcomClient.getCurrentSensor(accessToken);

        if (currentSensor) {
          syncResults.sensorsFound = 1;
          console.log('Found active sensor:', currentSensor);

          // Check if sensor already exists in database
          const { data: existingSensor } = await supabase
            .from('sensors')
            .select('id')
            .eq('dexcom_sensor_id', currentSensor.sessionId)
            .single();

          if (existingSensor) {
            // Update existing sensor
            const { error: updateError } = await supabase
              .from('sensors')
              .update({
                dexcom_activation_time: currentSensor.sessionStartTime,
                dexcom_expiry_time: currentSensor.sessionStopTime,
                dexcom_device_serial: currentSensor.transmitterGeneration,
                dexcom_last_reading_time: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existingSensor.id);

            if (updateError) {
              syncResults.errors.push(`Failed to update sensor: ${updateError.message}`);
            } else {
              syncResults.sensorsUpdated = 1;
            }
          } else {
            // Get the Dexcom G7 sensor model ID
            const { data: sensorModel } = await supabase
              .from('sensor_models')
              .select('id')
              .eq('manufacturer', 'Dexcom')
              .eq('model_name', 'G7')
              .single();

            if (!sensorModel) {
              syncResults.errors.push('Dexcom G7 sensor model not found in database');
              return NextResponse.json({
                error: 'Sensor model configuration error',
                results: syncResults
              }, { status: 500 });
            }

            // Create new sensor
            const { error: insertError } = await supabase
              .from('sensors')
              .insert({
                user_id: userId,
                serial_number: currentSensor.sessionId, // Use sessionId as unique identifier
                lot_number: `DEXCOM-${currentSensor.sessionId.substring(0, 8)}`,
                date_added: currentSensor.sessionStartTime ? new Date(currentSensor.sessionStartTime).toISOString() : new Date().toISOString(),
                sensor_model_id: sensorModel.id,
                dexcom_sensor_id: currentSensor.sessionId,
                dexcom_activation_time: currentSensor.sessionStartTime,
                dexcom_expiry_time: currentSensor.sessionStopTime,
                dexcom_device_serial: currentSensor.transmitterGeneration,
                dexcom_last_reading_time: new Date().toISOString(),
                auto_detected: true,
                sync_enabled: true
              });

            if (insertError) {
              syncResults.errors.push(`Failed to create sensor: ${insertError.message}`);
            } else {
              syncResults.sensorsCreated = 1;
            }
          }
        } else {
          console.log('No active sensor found');
        }

        // Update sync settings
        await supabase
          .from('dexcom_sync_settings')
          .upsert({
            user_id: userId,
            last_successful_sync: new Date().toISOString(),
            last_sync_error: null
          });

        // Log sync operation
        await supabase
          .from('dexcom_sync_log')
          .insert({
            user_id: userId,
            sync_type: 'manual',
            operation: 'sensor_sync',
            status: syncResults.errors.length > 0 ? 'partial' : 'success',
            records_processed: syncResults.sensorsFound,
            error_message: syncResults.errors.length > 0 ? syncResults.errors.join('; ') : null,
            api_calls_made: 2, // devices + current sensor
            sync_duration_ms: Date.now() % 1000 // placeholder
          });

        return NextResponse.json({
          success: true,
          message: 'Dexcom sync completed successfully',
          results: syncResults,
          timestamp: new Date().toISOString()
        });

      } catch (apiError) {
        console.error('Dexcom API error:', apiError);
        
        // Log failed sync
        await supabase
          .from('dexcom_sync_log')
          .insert({
            user_id: userId,
            sync_type: 'manual',
            operation: 'sensor_sync',
            status: 'error',
            error_message: apiError instanceof Error ? apiError.message : 'Unknown API error',
            api_calls_made: 0
          });

        return NextResponse.json({
          error: 'Failed to sync with Dexcom API',
          details: apiError instanceof Error ? apiError.message : 'Unknown error',
          results: syncResults
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Dexcom sync API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}