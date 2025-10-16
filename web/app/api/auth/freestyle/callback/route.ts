import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');

  if (error) {
    console.error('Freestyle OAuth error:', error);
    return NextResponse.redirect(new URL('/dashboard/settings?freestyle_error=' + encodeURIComponent(error), requestUrl.origin));
  }

  if (!code || !state) {
    console.error('Missing code or state parameter');
    return NextResponse.redirect(new URL('/dashboard/settings?freestyle_error=missing_parameters', requestUrl.origin));
  }

  try {
    const supabase = await createClient();
    
    // Use the state parameter as the user ID (it was set to user.id in the frontend)
    const userId = state;
    
    // Basic validation that userId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Invalid UUID format in state parameter:', userId);
      return NextResponse.redirect(new URL('/dashboard/settings?freestyle_error=invalid_state', requestUrl.origin));
    }

    // Exchange authorization code for access token
    const apiBaseUrl = process.env.FREESTYLE_API_BASE_URL || 'https://api-eu.libreview.io';
    const redirectUri = process.env.FREESTYLE_REDIRECT_URI || `${requestUrl.origin}/api/auth/freestyle/callback`;
    
    console.log('Freestyle token exchange - Redirect URI:', redirectUri);
    console.log('Freestyle token exchange - Request origin:', requestUrl.origin);
    
    const tokenResponse = await fetch(`${apiBaseUrl}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.FREESTYLE_CLIENT_ID!,
        client_secret: process.env.FREESTYLE_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Freestyle token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/dashboard/settings?freestyle_error=token_exchange_failed', requestUrl.origin));
    }

    const tokenData = await tokenResponse.json();

    // Store tokens in database (encrypted)
    const { error: insertError } = await (supabase as any)
      .from('freestyle_tokens')
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
      console.error('Error storing Freestyle tokens:', insertError);
      return NextResponse.redirect(new URL('/dashboard/settings?freestyle_error=token_storage_failed', requestUrl.origin));
    }

    // Create default sync settings
    const { error: settingsError } = await (supabase as any)
      .from('freestyle_sync_settings')
      .upsert({
        user_id: userId,
        sync_frequency_minutes: 60, // Default to hourly sync
        auto_sync_enabled: true,
        sync_sensor_data: true,
        sync_glucose_data: false, // Start with false for privacy
        sync_device_status: true,
      });

    if (settingsError) {
      console.error('Error creating Freestyle sync settings:', settingsError);
      // Don't fail the whole process for this
    }

    // Log successful connection
    await (supabase as any)
      .from('freestyle_sync_log')
      .insert({
        user_id: userId,
        sync_type: 'oauth_connection',
        operation: 'connect_account',
        status: 'success',
        records_processed: 0,
        api_calls_made: 1,
      });

    return NextResponse.redirect(new URL('/dashboard/settings?freestyle_success=connected&tab=integrations', requestUrl.origin));

  } catch (error) {
    console.error('Freestyle OAuth callback error:', error);
    return NextResponse.redirect(new URL('/dashboard/settings?freestyle_error=unexpected_error', requestUrl.origin));
  }
}