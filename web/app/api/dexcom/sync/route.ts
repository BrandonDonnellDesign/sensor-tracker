import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { ApiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  logger.debug('Dexcom sync API called');
  
  // Ensure we return JSON even on early errors
  try {
    // Check required environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      logger.error('Missing Supabase environment variables');
      return ApiErrors.internalError('Server configuration error');
    }

    const supabase = await createClient();
    
    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.error('Auth error in Dexcom sync API:', authError);
      return ApiErrors.unauthorized();
    }

    const body = await request.json();
    const { userId, backfillHours } = body;
    
    logger.debug('Dexcom sync request', { userId, backfillHours });

    // Verify the user is syncing their own data
    if (userId !== user.id) {
      return ApiErrors.forbidden();
    }

    // Get user's Dexcom token
    const { data: token, error: tokenError } = await supabase
      .from('dexcom_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    logger.debugSafe('Token status:', {
      hasToken: !!token,
      isActive: token?.is_active,
      expiresAt: token?.token_expires_at
    });

    if (tokenError || !token) {
      logger.debug('No token found for user');
      return NextResponse.json({
        success: false,
        error: 'No Dexcom token found. Please connect your Dexcom account first.'
      }, { status: 404 });
    }

    // Activate token if it's not active
    if (!token.is_active) {
      logger.debug('Activating inactive token');
      const { error: activateError } = await supabase
        .from('dexcom_tokens')
        .update({ is_active: true })
        .eq('id', token.id);
      
      if (!activateError) {
        token.is_active = true;
        logger.debug('Token activated successfully');
      }
    }

    // Check if token is expired
    const expiresAt = new Date(token.token_expires_at);
    const now = new Date();
    const hoursUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    logger.debug('Token expiration check:', {
      expiresAt: expiresAt.toISOString(),
      now: now.toISOString(),
      hoursUntilExpiration
    });

    if (hoursUntilExpiration <= 0) {
      logger.debug('Token expired, attempting refresh');
      
      // Try to refresh the token directly
      try {
        logger.debug('Attempting direct token refresh');
        
        // Decrypt refresh token
        const refreshToken = atob(token.refresh_token_encrypted);
        const dexcomClientId = process.env.DEXCOM_CLIENT_ID;
        const dexcomClientSecret = process.env.DEXCOM_CLIENT_SECRET;
        
        if (!dexcomClientId || !dexcomClientSecret) {
          logger.error('Dexcom credentials missing');
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
          logger.info('Token refresh successful');
          
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
            logger.info('Token updated successfully', { newExpiry: expiresAt.toISOString() });
          } else {
            logger.error('Failed to update token in database', updateError);
          }
        } else {
          const errorText = await tokenRefreshResponse.text();
          logger.error('Dexcom token refresh failed', { status: tokenRefreshResponse.status, error: errorText });
          return NextResponse.json({
            success: false,
            error: 'Dexcom token has expired and refresh failed. Please reconnect your Dexcom account.',
            expired: true
          }, { status: 401 });
        }
      } catch (refreshError) {
        logger.error('Token refresh error', refreshError);
        return NextResponse.json({
          success: false,
          error: 'Dexcom token has expired and refresh failed. Please reconnect your Dexcom account.',
          expired: true
        }, { status: 401 });
      }
    }

    // Implement sync logic directly (bypass Edge Function)
    logger.debug('Starting direct sync implementation');
    
    // Decrypt access token (simple base64 for demo)
    const accessToken = atob(token.access_token_encrypted);
    const apiBaseUrl = process.env.DEXCOM_API_BASE_URL || 'https://api.dexcom.com/v3';
    
    logger.debug('Using Dexcom API', { apiBaseUrl });
    
    // Determine start date based on last sync or backfill parameter
    const endDate = new Date();
    let startDate: Date;
    
    if (backfillHours && typeof backfillHours === 'number' && backfillHours > 0) {
      // Back-sync for specified hours
      startDate = new Date(Date.now() - backfillHours * 60 * 60 * 1000);
      logger.debug(`Back-syncing last ${backfillHours} hours`, { startDate: startDate.toISOString() });
    } else if (token.last_sync_at) {
      // Fetch from last sync time
      startDate = new Date(token.last_sync_at);
      logger.debug('Syncing from last sync time', { startDate: startDate.toISOString() });
    } else {
      // First sync - fetch last 24 hours
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      logger.debug('First sync - fetching last 24 hours');
    }

    // Format dates for Dexcom API
    const startDateStr = startDate.toISOString().split('.')[0];
    const endDateStr = endDate.toISOString().split('.')[0];
    
    logger.debug('Fetching glucose readings', { from: startDateStr, to: endDateStr });
    
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

      logger.debug('Dexcom API response', { status: egvsResponse.status });
      
      if (egvsResponse.ok) {
        const egvsData = await egvsResponse.json();
        logger.debug('Dexcom API response received');

        // Handle both array and object responses
        let egvs = [];
        if (Array.isArray(egvsData)) {
          egvs = egvsData;
        } else if (egvsData.egvs && Array.isArray(egvsData.egvs)) {
          egvs = egvsData.egvs;
        } else if (egvsData.records && Array.isArray(egvsData.records)) {
          egvs = egvsData.records;
        }

        logger.debug('Processing glucose readings', { count: egvs.length });

        for (const egv of egvs) {
          try {
            // Handle different possible value formats
            let glucoseValue = egv.value;
            if (typeof egv.value === 'object' && egv.value !== null) {
              glucoseValue = egv.value['mg/dL'] || egv.value.mgdl || egv.value.value;
            }

            // First check if reading already exists
            const { data: existingReading } = await supabase
              .from('glucose_readings')
              .select('id')
              .eq('record_id', egv.recordId || egv.record_id || egv.id)
              .single();

            if (existingReading) {
              logger.debug('Skipping duplicate reading', { recordId: egv.recordId });
              continue;
            }

            // Insert new glucose reading
            const { error: insertError } = await supabase.from('glucose_readings')
              .insert({
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

            if (insertError) {
              logger.error('Insert error for reading', { recordId: egv.recordId, error: insertError.message, code: insertError.code });
            } else {
              glucoseReadings++;
              logger.debug('Inserted reading', { recordId: egv.recordId, time: egv.displayTime, value: glucoseValue });
            }
          } catch (error) {
            // Unexpected error
            logger.error('Unexpected error inserting reading', { recordId: egv.recordId, error });
          }
        }
      } else {
        const errorText = await egvsResponse.text();
        logger.error('Dexcom API error', { status: egvsResponse.status, error: errorText });
        
        return NextResponse.json({
          success: false,
          error: `Dexcom API error: ${egvsResponse.status}`,
          details: errorText.substring(0, 200)
        }, { status: 502 });
      }
    } catch (apiError) {
      logger.error('Error calling Dexcom API', apiError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to Dexcom API',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 502 });
    }

    logger.info('Sync completed successfully', { readingsCount: glucoseReadings });

    // Update last sync time in token
    const syncTime = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('dexcom_tokens')
      .update({ 
        last_sync_at: syncTime,
        updated_at: syncTime
      })
      .eq('id', token.id);

    if (updateError) {
      logger.error('Failed to update last sync time', updateError);
    } else {
      logger.debug('Updated last sync time', { syncTime });
    }

    // Return successful result
    return NextResponse.json({
      success: true,
      message: 'Glucose data synced successfully',
      glucose_readings: glucoseReadings,
      last_sync: syncTime
    });

  } catch (error) {
    logger.error('Sync API error', error);
    
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