import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { ApiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if this is a cron request (service role) or user request
    const authHeader = request.headers.get('authorization');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isCronRequest = authHeader === `Bearer ${serviceRoleKey}`;

    let userId: string;
    let forceRefresh = false;

    // Parse body once to avoid issues with multiple reads
    const requestBody = await request.json();

    if (isCronRequest) {
      // Cron request - get userId from body
      userId = requestBody.userId;

      if (!userId) {
        return NextResponse.json({
          success: false,
          error: 'userId required for cron requests'
        }, { status: 400 });
      }

      logger.info('Token refresh requested by cron', { userId });
    } else {
      // User request - get user from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        logger.error('Auth error in Dexcom refresh token API:', authError);
        return ApiErrors.unauthorized();
      }

      userId = user.id;
      forceRefresh = requestBody.force || false;

      logger.info('Token refresh requested by user', { userId, force: forceRefresh });
    }

    // Get user's active Dexcom token
    const { data: token, error: tokenError } = await supabase
      .from('dexcom_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !token) {
      return NextResponse.json({
        success: false,
        error: 'No active Dexcom token found'
      }, { status: 404 });
    }

    // Check if refresh is needed (for user requests)
    if (!isCronRequest && !forceRefresh) {
      const expiresAt = new Date(token.token_expires_at);
      const now = new Date();
      const hoursUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilExpiration > 1.5) {
        return NextResponse.json({
          success: false,
          error: 'Token does not need refresh yet',
          hoursUntilExpiration
        });
      }

      if (hoursUntilExpiration <= 0) {
        return NextResponse.json({
          success: false,
          error: 'Token has already expired. Please reconnect your Dexcom account.',
          expired: true
        });
      }
    }

    // Refresh token directly via Dexcom API
    logger.info('Refreshing Dexcom token', { userId });

    const refreshToken = atob(token.refresh_token_encrypted);
    const dexcomClientId = process.env.DEXCOM_CLIENT_ID;
    const dexcomClientSecret = process.env.DEXCOM_CLIENT_SECRET;

    if (!dexcomClientId || !dexcomClientSecret) {
      logger.error('Dexcom credentials missing');
      return NextResponse.json({
        success: false,
        error: 'Dexcom configuration missing'
      }, { status: 500 });
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

    if (!tokenRefreshResponse.ok) {
      const errorText = await tokenRefreshResponse.text();
      logger.error('Dexcom token refresh failed', {
        status: tokenRefreshResponse.status,
        error: errorText,
        userId
      });

      // Log the refresh attempt
      await supabase
        .from('dexcom_sync_log')
        .insert({
          user_id: userId,
          sync_type: 'token_refresh',
          status: 'error',
          message: `Token refresh failed: ${errorText}`,
          created_at: new Date().toISOString()
        });

      return NextResponse.json({
        success: false,
        error: 'Dexcom token refresh failed. Please reconnect your Dexcom account.',
        details: errorText
      }, { status: tokenRefreshResponse.status });
    }

    const tokenData = await tokenRefreshResponse.json();
    logger.info('Token refresh successful', { userId });

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

    if (updateError) {
      logger.error('Failed to update token in database', { error: updateError, userId });
      return NextResponse.json({
        success: false,
        error: 'Failed to save refreshed token'
      }, { status: 500 });
    }

    // Log successful refresh
    await supabase
      .from('dexcom_sync_log')
      .insert({
        user_id: userId,
        sync_type: 'token_refresh',
        status: 'success',
        message: 'Token refreshed successfully',
        created_at: new Date().toISOString()
      });

    logger.info('Token updated successfully', { userId, newExpiry: expiresAt.toISOString() });

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      expires_at: expiresAt.toISOString(),
      new_expiry: expiresAt.toISOString()
    });

  } catch (error) {
    logger.error('Error refreshing Dexcom token:', error);
    return ApiErrors.internalError(
      error instanceof Error ? error.message : 'Failed to refresh token'
    );
  }
}