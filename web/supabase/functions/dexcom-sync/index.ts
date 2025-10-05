/**
 * Supabase Edge Function for Dexcom Data Sync
 * Handles automated synchronization of sensor data from Dexcom API
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const requestBody = await req.json()
    const { action, userId } = requestBody

    // For checkConnection, we can work with just userId without requiring auth
    if (action === 'checkConnection') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId required for checkConnection' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return await checkConnection(userId, supabaseClient)
    }

    // For other actions, require authentication
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (action) {
      case 'syncSensorData':
        return await syncSensorData(userId || user.id, supabaseClient)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Dexcom sync error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getValidAccessToken(userId: string, supabaseClient: any): Promise<string | null> {
  // Get user's tokens
  const { data: tokenData, error } = await supabaseClient
    .from('dexcom_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (error || !tokenData) {
    return null
  }

  // Check if token is still valid
  const expiresAt = new Date(tokenData.token_expires_at)
  if (expiresAt > new Date()) {
    // Decrypt and return access token (simple base64 for demo)
    return atob(tokenData.access_token_encrypted)
  }

  // Token expired, try to refresh
  try {
    const refreshToken = atob(tokenData.refresh_token_encrypted)
    const tokenResponse = await fetch(`${Deno.env.get('DEXCOM_BASE_URL')}/v2/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('DEXCOM_CLIENT_ID')!,
        client_secret: Deno.env.get('DEXCOM_CLIENT_SECRET')!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenResponse.ok) {
      // Refresh failed, mark tokens as inactive
      await supabaseClient
        .from('dexcom_tokens')
        .update({ is_active: false })
        .eq('user_id', userId)
      return null
    }

    const tokens = await tokenResponse.json()
    
    // Update tokens in database
    const encryptedAccessToken = btoa(tokens.access_token)
    const encryptedRefreshToken = btoa(tokens.refresh_token)
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    await supabaseClient
      .from('dexcom_tokens')
      .update({
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_active', true)

    return tokens.access_token
  } catch (refreshError) {
    console.error('Token refresh failed:', refreshError)
    return null
  }
}

async function makeAuthenticatedDexcomRequest(endpoint: string, accessToken: string) {
  const response = await fetch(`${Deno.env.get('DEXCOM_BASE_URL')}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Dexcom API request failed: ${response.status} ${await response.text()}`)
  }

  return response.json()
}

async function syncSensorData(userId: string, supabaseClient: any) {
  const syncStartTime = Date.now()
  let apiCallsCount = 0

  try {
    // Get valid access token
    const accessToken = await getValidAccessToken(userId, supabaseClient)
    if (!accessToken) {
      throw new Error('No valid Dexcom access token available')
    }

    // Get user's sync settings
    const { data: syncSettings } = await supabaseClient
      .from('dexcom_sync_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!syncSettings?.auto_sync_enabled) {
      return new Response(
        JSON.stringify({ message: 'Auto sync is disabled for this user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current sensor data from Dexcom
    const deviceData = await makeAuthenticatedDexcomRequest('/v3/users/self/devices', accessToken)
    apiCallsCount++

    // Get sensor sessions for the last 30 days
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = new Date().toISOString()
    
    const sensorData = await makeAuthenticatedDexcomRequest(
      `/v3/users/self/dataRange?startDate=${startDate}&endDate=${endDate}`,
      accessToken
    )
    apiCallsCount++

    let syncedSensors = 0
    let newSensors = 0

    // Process each sensor session
    for (const sensor of sensorData) {
      // Check if sensor already exists
      const { data: existingSensor } = await supabaseClient
        .from('sensors')
        .select('id, dexcom_sensor_id')
        .eq('user_id', userId)
        .eq('dexcom_sensor_id', sensor.sessionId)
        .single()

      if (existingSensor) {
        // Update existing sensor with latest data
        await supabaseClient
          .from('sensors')
          .update({
            dexcom_activation_time: sensor.sessionStartTime,
            dexcom_expiry_time: sensor.sessionStopTime,
            dexcom_last_reading_time: sensor.lastReadingTime,
            sync_enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSensor.id)
        
        syncedSensors++
      } else if (sensor.sessionStartTime && sensor.status !== 'warmup') {
        // Create new sensor record
        const activationDate = new Date(sensor.sessionStartTime)
        
        // Determine sensor type based on transmitter generation
        let sensorType = 'dexcom'
        if (sensor.transmitterGeneration) {
          sensorType = sensor.transmitterGeneration.toLowerCase().includes('g7') ? 'dexcom' : 'dexcom'
        }

        await supabaseClient
          .from('sensors')
          .insert({
            user_id: userId,
            serial_number: sensor.sessionId, // Use session ID as serial for now
            lot_number: null, // Dexcom API doesn't provide lot number
            date_added: activationDate.toISOString(),
            sensor_type: sensorType,
            dexcom_sensor_id: sensor.sessionId,
            dexcom_activation_time: sensor.sessionStartTime,
            dexcom_expiry_time: sensor.sessionStopTime,
            auto_detected: true,
            sync_enabled: true,
            created_at: new Date().toISOString(),
          })
        
        newSensors++
      }
    }

    // Update sync settings
    await supabaseClient
      .from('dexcom_sync_settings')
      .update({
        last_successful_sync: new Date().toISOString(),
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    // Log sync operation
    await supabaseClient
      .from('dexcom_sync_log')
      .insert({
        user_id: userId,
        sync_type: 'scheduled',
        operation: 'sensor_sync',
        status: 'success',
        records_processed: syncedSensors + newSensors,
        api_calls_made: apiCallsCount,
        sync_duration_ms: Date.now() - syncStartTime,
      })

    return new Response(
      JSON.stringify({
        success: true,
        syncedSensors,
        newSensors,
        apiCallsCount,
        duration: Date.now() - syncStartTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sensor sync failed:', error)

    // Log sync error
    await supabaseClient
      .from('dexcom_sync_settings')
      .update({
        last_sync_error: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    await supabaseClient
      .from('dexcom_sync_log')
      .insert({
        user_id: userId,
        sync_type: 'scheduled',
        operation: 'sensor_sync',
        status: 'error',
        error_message: error.message,
        api_calls_made: apiCallsCount,
        sync_duration_ms: Date.now() - syncStartTime,
      })

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function checkConnection(userId: string, supabaseClient: any) {
  try {
    console.log('Checking connection for user:', userId)
    
    const { data: tokenData, error } = await supabaseClient
      .from('dexcom_tokens')
      .select('token_expires_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    console.log('Token query result:', { data: tokenData, error })

    if (error) {
      console.error('Database error:', error)
      
      // Check if it's a missing table error
      if (error.code === 'PGRST204' || error.code === '42P01') {
        return new Response(
          JSON.stringify({ 
            connected: false, 
            error: 'Dexcom integration tables not found. Database migration may not be deployed.',
            needsMigration: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // No tokens found
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ 
            connected: false, 
            message: 'No Dexcom connection found' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      throw error
    }

    const isConnected = tokenData && new Date(tokenData.token_expires_at) > new Date()

    return new Response(
      JSON.stringify({ 
        connected: !!isConnected,
        lastSync: tokenData?.last_sync_at || null,
        tokenExpiry: tokenData?.token_expires_at || null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error checking connection:', error)
    return new Response(
      JSON.stringify({ 
        connected: false,
        error: 'Failed to check connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
