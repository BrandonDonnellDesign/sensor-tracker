import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  console.log('🔄 Dexcom sync API called');
  console.log('🔄 Request method:', request.method);
  console.log('🔄 Request headers:', Object.fromEntries(request.headers.entries()));
  
  // Ensure we return JSON even on early errors
  try {
    // Check required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('🔄 Missing Supabase environment variables');
      return NextResponse.json({
        success: false,
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      }, { status: 500 });
    }

    const supabase = await createClient();
    
    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error in Dexcom sync API:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Please log in to sync Dexcom data'
      }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;
    
    console.log('🔄 Request body:', { userId });

    // Verify the user is syncing their own data
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's Dexcom token
    const { data: token, error: tokenError } = await supabase
      .from('dexcom_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    console.log('🔍 Token found:', {
      hasToken: !!token,
      isActive: token?.is_active,
      expiresAt: token?.token_expires_at
    });

    if (tokenError || !token) {
      console.log('🔄 No token found - returning 404');
      return NextResponse.json({
        success: false,
        error: 'No Dexcom token found. Please connect your Dexcom account first.'
      }, { status: 404 });
    }

    // Activate token if it's not active
    if (!token.is_active) {
      console.log('🔄 Activating inactive token');
      const { error: activateError } = await supabase
        .from('dexcom_tokens')
        .update({ is_active: true })
        .eq('id', token.id);
      
      if (!activateError) {
        token.is_active = true;
        console.log('🔄 Token activated successfully');
      }
    }

    // Check if token is expired
    const expiresAt = new Date(token.token_expires_at);
    const now = new Date();
    const hoursUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    console.log('🔄 Token expiration check:', {
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString(),
      hoursUntilExpiration
    });

    if (hoursUntilExpiration <= 0) {
      console.log('🔄 Token expired, attempting refresh...');
      
      // Try to refresh the token directly
      try {
        console.log('🔄 Attempting direct token refresh...');
        
        // Decrypt refresh token
        const refreshToken = atob(token.refresh_token_encrypted);
        const dexcomClientId = process.env.DEXCOM_CLIENT_ID;
        const dexcomClientSecret = process.env.DEXCOM_CLIENT_SECRET;
        
        if (!dexcomClientId || !dexcomClientSecret) {
          console.log('🔄 Dexcom credentials missing');
          return NextResponse.json({
            success: false,
            error: 'Dexcom configuration missing. Please reconnect your Dexcom account.',
            expired: true
          }, { status: 401 });
        }

        // Call Dexcom token refresh API
        const tokenRefreshResponse = await fetch('https://api.dexcom.com/v2/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: dexcomClientId,
            client_secret: dexcomClientSecret,
          }),
        });

        if (tokenRefreshResponse.ok) {
          const tokenData = await tokenRefreshResponse.json();
          console.log('🔄 Token refresh successful');
          
          // Update token in database
          const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
          
          const { error: updateError } = await supabase
            .from('dexcom_tokens')
            .update({
              access_token_encrypted: btoa(tokenData.access_token),
              refresh_token_encrypted: btoa(tokenData.refresh_token),
              token_expires_at: expiresAt.toISOString(),
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', token.id);

          if (!updateError) {
            // Update our local token object
            token.access_token_encrypted = btoa(tokenData.access_token);
            token.token_expires_at = expiresAt.toISOString();
            token.is_active = true;
            console.log('🔄 Token updated successfully, new expiry:', expiresAt.toISOString());
          } else {
            console.error('🔄 Failed to update token in database:', updateError);
          }
        } else {
          const errorText = await tokenRefreshResponse.text();
          console.log('🔄 Dexcom token refresh failed:', tokenRefreshResponse.status, errorText);
          return NextResponse.json({
            success: false,
            error: 'Dexcom token has expired and refresh failed. Please reconnect your Dexcom account.',
            expired: true
          }, { status: 401 });
        }
      } catch (refreshError) {
        console.error('🔄 Token refresh error:', refreshError);
        return NextResponse.json({
          success: false,
          error: 'Dexcom token has expired and refresh failed. Please reconnect your Dexcom account.',
          expired: true
        }, { status: 401 });
      }
    }

    // Implement sync logic directly (bypass Edge Function)
    console.log('🔄 Starting direct sync implementation');
    
    // Decrypt access token (simple base64 for demo)
    const accessToken = atob(token.access_token_encrypted);
    const apiBaseUrl = process.env.DEXCOM_API_BASE_URL || 'https://api.dexcom.com/v3';
    
    console.log('🔄 Using Dexcom API:', apiBaseUrl);
    
    // Get the last sync time (default to 24 hours ago)
    const { data: lastReading } = await supabase
      .from('glucose_readings')
      .select('system_time')
      .eq('user_id', userId)
      .order('system_time', { ascending: false })
      .limit(1)
      .single();

    const startDate = lastReading?.system_time
      ? new Date(lastReading.system_time)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = new Date();

    // Format dates for Dexcom API
    const startDateStr = startDate.toISOString().split('.')[0];
    const endDateStr = endDate.toISOString().split('.')[0];
    
    console.log('🔄 Fetching glucose readings from', startDateStr, 'to', endDateStr);
    
    let glucoseReadings = 0;
    
    try {
      // Fetch glucose readings from Dexcom API
      const egvsResponse = await fetch(
        `${apiBaseUrl}/users/self/egvs?startDate=${startDateStr}&endDate=${endDateStr}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('🔄 Dexcom API response status:', egvsResponse.status);
      
      if (egvsResponse.ok) {
        const egvsData = await egvsResponse.json();
        console.log('🔄 Dexcom API response data:', JSON.stringify(egvsData).substring(0, 500));

        // Handle both array and object responses
        let egvs = [];
        if (Array.isArray(egvsData)) {
          egvs = egvsData;
        } else if (egvsData.egvs && Array.isArray(egvsData.egvs)) {
          egvs = egvsData.egvs;
        } else if (egvsData.records && Array.isArray(egvsData.records)) {
          egvs = egvsData.records;
        }

        console.log('🔄 Processing', egvs.length, 'glucose readings');

        for (const egv of egvs) {
          try {
            // Handle different possible value formats
            let glucoseValue = egv.value;
            if (typeof egv.value === 'object' && egv.value !== null) {
              glucoseValue = egv.value['mg/dL'] || egv.value.mgdl || egv.value.value;
            }

            // Insert glucose reading (ON CONFLICT DO NOTHING handled by unique constraint)
            const { error: insertError } = await supabase.from('glucose_readings').insert({
              user_id: userId,
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

            if (!insertError) {
              glucoseReadings++;
            }
          } catch (error) {
            // Likely a duplicate (record_id conflict), skip
            console.log('🔄 Skipping duplicate reading:', egv.recordId || egv.record_id);
          }
        }
      } else {
        const errorText = await egvsResponse.text();
        console.error('🔄 Dexcom API error:', egvsResponse.status, errorText);
        
        return NextResponse.json({
          success: false,
          error: `Dexcom API error: ${egvsResponse.status}`,
          details: errorText.substring(0, 200)
        }, { status: 502 });
      }
    } catch (apiError) {
      console.error('🔄 Error calling Dexcom API:', apiError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Dexcom API',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 502 });
    }

    console.log('🔄 Sync completed successfully:', glucoseReadings, 'readings');

    // Return successful result
    return NextResponse.json({
      success: true,
      message: 'Glucose data synced successfully',
      glucose_readings: glucoseReadings,
      last_sync: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔄 Sync API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

// Also handle GET requests to prevent HTML responses
export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed',
    details: 'This endpoint only accepts POST requests'
  }, { 
    status: 405,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}