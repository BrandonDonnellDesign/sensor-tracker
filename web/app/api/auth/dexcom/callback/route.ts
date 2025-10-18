import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { systemLogger } from '@/lib/system-logger';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');

  if (error) {
    console.error('Dexcom OAuth error:', error);
    await systemLogger.error('dexcom', `OAuth callback error: ${error}`);
    return NextResponse.redirect(new URL('/dashboard/settings?dexcom_error=' + encodeURIComponent(error), requestUrl.origin));
  }

  if (!code || !state) {
    console.error('Missing code or state parameter');
    await systemLogger.error('dexcom', 'OAuth callback missing required parameters');
    return NextResponse.redirect(new URL('/dashboard/settings?dexcom_error=missing_parameters', requestUrl.origin));
  }

  try {
    const supabase = await createClient();
    
    // Use the state parameter as the user ID (it was set to user.id in the frontend)
    const userId = state;
    
    // Basic validation that userId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Invalid UUID format in state parameter:', userId);
      return NextResponse.redirect(new URL('/dashboard/settings?dexcom_error=invalid_state', requestUrl.origin));
    }

    // Exchange authorization code for access token
    const apiBaseUrl = process.env.DEXCOM_API_BASE_URL || 'https://api.dexcom.com/v2';
    const redirectUri = process.env.DEXCOM_REDIRECT_URI || `${requestUrl.origin}/api/auth/dexcom/callback`;
    
    console.log('Token exchange - Redirect URI:', redirectUri);
    console.log('Token exchange - Request origin:', requestUrl.origin);
    console.log('Token exchange - Env redirect URI:', process.env.DEXCOM_REDIRECT_URI);
    
    const tokenResponse = await fetch(`${apiBaseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DEXCOM_CLIENT_ID!,
        client_secret: process.env.DEXCOM_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/dashboard/settings?dexcom_error=token_exchange_failed', requestUrl.origin));
    }

    const tokenData = await tokenResponse.json();

    // Store tokens in database (encrypted)
    const { error: insertError } = await (supabase as any)
      .from('dexcom_tokens')
      .upsert({
        user_id: userId,
        access_token_encrypted: tokenData.access_token, // Note: Should be encrypted in production
        refresh_token_encrypted: tokenData.refresh_token, // Note: Should be encrypted in production
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        token_type: tokenData.token_type || 'Bearer',
        scope: 'offline_access',
        is_active: true,
      });

    if (insertError) {
      console.error('Error storing tokens:', insertError);
      return NextResponse.redirect(new URL('/dashboard/settings?dexcom_error=token_storage_failed', requestUrl.origin));
    }

    // Create default sync settings
    const { error: settingsError } = await (supabase as any)
      .from('dexcom_sync_settings')
      .upsert({
        user_id: userId,
        sync_frequency_minutes: 60, // Default to hourly sync
        auto_sync_enabled: true,
        sync_sensor_data: true,
        sync_glucose_data: false, // Start with false for privacy
        sync_device_status: true,
      });

    if (settingsError) {
      console.error('Error creating sync settings:', settingsError);
      // Don't fail the whole process for this
    }

    // Log successful connection
    await (supabase as any)
      .from('dexcom_sync_log')
      .insert({
        user_id: userId,
        sync_type: 'oauth_connection',
        operation: 'connect_account',
        status: 'success',
        records_processed: 0,
        api_calls_made: 1,
      });

    // Log to system logs
    await systemLogger.info('dexcom', 'Dexcom account connected successfully', userId);

    return NextResponse.redirect(new URL('/dashboard/settings?dexcom_success=connected&tab=integrations', requestUrl.origin));

  } catch (error) {
    console.error('Dexcom OAuth callback error:', error);
    await systemLogger.error('dexcom', `OAuth callback unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.redirect(new URL('/dashboard/settings?dexcom_error=unexpected_error', requestUrl.origin));
  }
}