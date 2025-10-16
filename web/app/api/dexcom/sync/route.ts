import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

interface DexcomDevice {
  transmitterGeneration: string;
  transmitterId: string;
  displayDevice: string;
  lastUploadDate: string;
  alertScheduleList: any[];
}

interface DexcomEGV {
  systemTime: string;
  displayTime: string;
  value: number;
  realtimeValue: number;
  smoothedValue: number;
  status: string;
  trend: string;
  trendRate: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Dexcom tokens
    const { data: tokenData, error: tokenError } = await (supabase as any)
      .from('dexcom_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'No active Dexcom connection found' }, { status: 404 });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.token_expires_at);
    
    if (now >= expiresAt) {
      // Try to refresh the token
      const refreshResult = await refreshDexcomToken(tokenData.refresh_token_encrypted, user.id, supabase);
      if (!refreshResult.success) {
        return NextResponse.json({ error: 'Token expired and refresh failed' }, { status: 401 });
      }
      tokenData.access_token_encrypted = refreshResult.access_token;
    }

    // Sync devices and recent data
    const syncResults = {
      devices: [] as DexcomDevice[],
      sensors: [] as any[],
      egvs: [] as DexcomEGV[],
      errors: [] as string[]
    };

    try {
      const apiBaseUrl = process.env.DEXCOM_API_BASE_URL || 'https://api.dexcom.com/v2';
      
      // Get devices
      const devicesResponse = await fetch(`${apiBaseUrl}/users/self/devices`, {
        headers: {
          'Authorization': `${tokenData.token_type} ${tokenData.access_token_encrypted}`,
        },
      });

      if (devicesResponse.ok) {
        const devices: DexcomDevice[] = await devicesResponse.json();
        syncResults.devices = devices;

        // Create sensor records from devices
        for (const device of devices) {
          if (device.transmitterId) {
            // Check if sensor already exists
            const { data: existingSensor } = await supabase
              .from('sensors')
              .select('id')
              .eq('user_id', user.id)
              .eq('serial_number', device.transmitterId)
              .single();

            if (!existingSensor) {
              // Create new sensor record
              const { data: newSensor, error: sensorError } = await supabase
                .from('sensors')
                .insert({
                  user_id: user.id,
                  serial_number: device.transmitterId,
                  sensor_type: 'dexcom',
                  date_added: new Date(device.lastUploadDate).toISOString(),
                  notes: `Auto-imported from Dexcom API - ${device.displayDevice}`,
                })
                .select()
                .single();

              if (sensorError) {
                syncResults.errors.push(`Failed to create sensor for ${device.transmitterId}: ${sensorError.message}`);
              } else {
                syncResults.sensors.push(newSensor);
              }
            }
          }
        }
      } else {
        syncResults.errors.push(`Failed to fetch devices: ${devicesResponse.status}`);
      }

      // Get recent EGV data (last 24 hours)
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endTime = new Date().toISOString();
      
      const egvResponse = await fetch(
        `${apiBaseUrl}/users/self/egvs?startDate=${startTime}&endDate=${endTime}`,
        {
          headers: {
            'Authorization': `${tokenData.token_type} ${tokenData.access_token_encrypted}`,
          },
        }
      );

      if (egvResponse.ok) {
        const egvs: DexcomEGV[] = await egvResponse.json();
        syncResults.egvs = egvs;
      } else {
        syncResults.errors.push(`Failed to fetch EGV data: ${egvResponse.status}`);
      }

    } catch (apiError) {
      syncResults.errors.push(`API call failed: ${apiError}`);
    }

    // Update sync settings
    await (supabase as any)
      .from('dexcom_sync_settings')
      .update({ last_successful_sync: new Date().toISOString() })
      .eq('user_id', user.id);

    // Log sync result
    await (supabase as any)
      .from('dexcom_sync_log')
      .insert({
        user_id: user.id,
        status: syncResults.errors.length > 0 ? 'partial_success' : 'success',
        operation: `Synced ${syncResults.devices.length} devices, ${syncResults.sensors.length} new sensors, ${syncResults.egvs.length} EGV readings`,
        sync_type: 'manual_sync',
        records_processed: syncResults.sensors.length,
        api_calls_made: 2, // devices + egvs
      });

    return NextResponse.json({
      success: true,
      data: syncResults,
      message: `Sync completed. ${syncResults.sensors.length} new sensors imported.`
    });

  } catch (error) {
    console.error('Dexcom sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

async function refreshDexcomToken(refreshToken: string, userId: string, supabase: any) {
  try {
    const apiBaseUrl = process.env.DEXCOM_API_BASE_URL || 'https://api.dexcom.com/v2';
    const response = await fetch(`${apiBaseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DEXCOM_CLIENT_ID!,
        client_secret: process.env.DEXCOM_CLIENT_SECRET!,
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
      .from('dexcom_tokens')
      .update({
        access_token_encrypted: tokenData.access_token,
        refresh_token_encrypted: tokenData.refresh_token || refreshToken,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      })
      .eq('user_id', userId);

    return { success: true, access_token: tokenData.access_token };
  } catch (error) {
    console.error('Token refresh failed:', error);
    return { success: false };
  }
}