import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface FreestyleDevice {
  deviceId: string;
  deviceType: string;
  serialNumber: string;
  lastUpload: string;
  status: string;
}

interface FreestyleGlucoseData {
  timestamp: string;
  value: number;
  trend: string;
  quality: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Freestyle tokens
    const { data: tokenData, error: tokenError } = await (supabase as any)
      .from('freestyle_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'No active Freestyle Libre connection found' }, { status: 404 });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.token_expires_at);
    
    if (now >= expiresAt) {
      // Try to refresh the token
      const refreshResult = await refreshFreestyleToken(tokenData.refresh_token_encrypted, user.id, supabase);
      if (!refreshResult.success) {
        return NextResponse.json({ error: 'Token expired and refresh failed' }, { status: 401 });
      }
      tokenData.access_token_encrypted = refreshResult.access_token;
    }

    // Sync devices and recent data
    const syncResults = {
      devices: [] as FreestyleDevice[],
      sensors: [] as any[],
      glucoseData: [] as FreestyleGlucoseData[],
      errors: [] as string[]
    };

    try {
      const apiBaseUrl = process.env.FREESTYLE_API_BASE_URL || 'https://api-eu.libreview.io';
      
      // Get devices/sensors
      const devicesResponse = await fetch(`${apiBaseUrl}/llu/connections`, {
        headers: {
          'Authorization': `${tokenData.token_type} ${tokenData.access_token_encrypted}`,
          'Content-Type': 'application/json',
        },
      });

      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        const devices: FreestyleDevice[] = devicesData.data || [];
        syncResults.devices = devices;

        // Create sensor records from devices
        for (const device of devices) {
          if (device.serialNumber) {
            // Check if sensor already exists
            const { data: existingSensor } = await supabase
              .from('sensors')
              .select('id')
              .eq('user_id', user.id)
              .eq('serial_number', device.serialNumber)
              .single();

            if (!existingSensor) {
              // Create new sensor record
              const { data: newSensor, error: sensorError } = await supabase
                .from('sensors')
                .insert({
                  user_id: user.id,
                  serial_number: device.serialNumber,
                  sensor_type: 'freestyle_libre',
                  date_added: new Date(device.lastUpload).toISOString(),
                  notes: `Auto-imported from Freestyle Libre - ${device.deviceType}`,
                })
                .select()
                .single();

              if (sensorError) {
                syncResults.errors.push(`Failed to create sensor for ${device.serialNumber}: ${sensorError.message}`);
              } else {
                syncResults.sensors.push(newSensor);
              }
            }
          }
        }
      } else {
        syncResults.errors.push(`Failed to fetch devices: ${devicesResponse.status}`);
      }

      // Get recent glucose data (last 24 hours)
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();
      
      const glucoseResponse = await fetch(
        `${apiBaseUrl}/llu/connections/glucose?start=${startTime}&end=${endTime}`,
        {
          headers: {
            'Authorization': `${tokenData.token_type} ${tokenData.access_token_encrypted}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (glucoseResponse.ok) {
        const glucoseData = await glucoseResponse.json();
        syncResults.glucoseData = glucoseData.data || [];
      } else {
        syncResults.errors.push(`Failed to fetch glucose data: ${glucoseResponse.status}`);
      }

    } catch (apiError) {
      syncResults.errors.push(`API call failed: ${apiError}`);
    }

    // Update sync settings
    await (supabase as any)
      .from('freestyle_sync_settings')
      .update({ last_successful_sync: new Date().toISOString() })
      .eq('user_id', user.id);

    // Log sync result
    await (supabase as any)
      .from('freestyle_sync_log')
      .insert({
        user_id: user.id,
        status: syncResults.errors.length > 0 ? 'partial_success' : 'success',
        operation: `Synced ${syncResults.devices.length} devices, ${syncResults.sensors.length} new sensors, ${syncResults.glucoseData.length} glucose readings`,
        sync_type: 'manual_sync',
        records_processed: syncResults.sensors.length,
        api_calls_made: 2, // devices + glucose
      });

    return NextResponse.json({
      success: true,
      data: syncResults,
      message: `Sync completed. ${syncResults.sensors.length} new sensors imported.`
    });

  } catch (error) {
    console.error('Freestyle sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

async function refreshFreestyleToken(refreshToken: string, userId: string, supabase: any) {
  try {
    const apiBaseUrl = process.env.FREESTYLE_API_BASE_URL || 'https://api-eu.libreview.io';
    const response = await fetch(`${apiBaseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.FREESTYLE_CLIENT_ID!,
        client_secret: process.env.FREESTYLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      return { success: false };
    }

    const tokenData = await response.json();

    // Update tokens in database
    await (supabase as any)
      .from('freestyle_tokens')
      .update({
        access_token_encrypted: tokenData.access_token,
        refresh_token_encrypted: tokenData.refresh_token || refreshToken,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      })
      .eq('user_id', userId);

    return { success: true, access_token: tokenData.access_token };
  } catch (error) {
    console.error('Freestyle token refresh failed:', error);
    return { success: false };
  }
}