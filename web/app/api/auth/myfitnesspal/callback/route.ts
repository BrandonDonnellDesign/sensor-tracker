import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { systemLogger } from '@/lib/system-logger';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');

  if (error) {
    console.error('MyFitnessPal OAuth error:', error);
    await systemLogger.error('myfitnesspal', `OAuth callback error: ${error}`);
    return NextResponse.redirect(new URL('/dashboard/settings?mfp_error=' + encodeURIComponent(error), requestUrl.origin));
  }

  if (!code || !state) {
    console.error('Missing code or state parameter');
    await systemLogger.error('myfitnesspal', 'OAuth callback missing required parameters');
    return NextResponse.redirect(new URL('/dashboard/settings?mfp_error=missing_parameters', requestUrl.origin));
  }

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    const userId = state;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Invalid UUID format in state parameter:', userId);
      return NextResponse.redirect(new URL('/dashboard/settings?mfp_error=invalid_state', requestUrl.origin));
    }

    const redirectUri = process.env.MYFITNESSPAL_REDIRECT_URI || `${requestUrl.origin}/api/auth/myfitnesspal/callback`;
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.myfitnesspal.com/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MYFITNESSPAL_CLIENT_ID!,
        client_secret: process.env.MYFITNESSPAL_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/dashboard/settings?mfp_error=token_exchange_failed', requestUrl.origin));
    }

    const tokenData = await tokenResponse.json();

    // Store tokens in database
    const { error: insertError } = await (supabase as any)
      .from('myfitnesspal_tokens')
      .upsert({
        user_id: userId,
        access_token_encrypted: tokenData.access_token,
        refresh_token_encrypted: tokenData.refresh_token,
        token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        token_type: tokenData.token_type || 'Bearer',
        scope: tokenData.scope || 'diary',
        is_active: true,
      });

    if (insertError) {
      console.error('Error storing tokens:', insertError);
      return NextResponse.redirect(new URL('/dashboard/settings?mfp_error=token_storage_failed', requestUrl.origin));
    }

    // Create default sync settings
    const { error: settingsError } = await (supabase as any)
      .from('myfitnesspal_sync_settings')
      .upsert({
        user_id: userId,
        sync_frequency_minutes: 60,
        auto_sync_enabled: true,
        sync_food_logs: true,
        sync_water_intake: true,
        sync_exercise: false,
      });

    if (settingsError) {
      console.error('Error creating sync settings:', settingsError);
    }

    // Log successful connection
    await (supabase as any)
      .from('myfitnesspal_sync_log')
      .insert({
        user_id: userId,
        sync_type: 'oauth_connection',
        operation: 'connect_account',
        status: 'success',
        records_processed: 0,
        api_calls_made: 1,
      });

    await systemLogger.info('myfitnesspal', 'MyFitnessPal account connected successfully', userId);

    return NextResponse.redirect(new URL('/dashboard/settings?mfp_success=connected&tab=integrations', requestUrl.origin));

  } catch (error) {
    console.error('MyFitnessPal OAuth callback error:', error);
    await systemLogger.error('myfitnesspal', `OAuth callback unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.redirect(new URL('/dashboard/settings?mfp_error=unexpected_error', requestUrl.origin));
  }
}
