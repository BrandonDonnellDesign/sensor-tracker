// @ts-nocheck
/***
 * Supabase Edge Function for Automatic Dexcom Token Refresh
 * Runs on a schedule to refresh tokens before they expire
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find tokens that expire within the next 90 minutes (1.5 hours)
    const ninetyMinutesFromNow = new Date();
    ninetyMinutesFromNow.setMinutes(ninetyMinutesFromNow.getMinutes() + 90);

    const { data: expiringTokens, error: fetchError } = await supabaseClient
      .from('dexcom_tokens')
      .select('*')
      .eq('is_active', true)
      .lt('token_expires_at', ninetyMinutesFromNow.toISOString())
      .gt('token_expires_at', new Date().toISOString()); // Not already expired

    if (fetchError) {
      console.error('Error fetching expiring tokens:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expiring tokens' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const refreshResults = [];

    // Refresh each expiring token
    for (const token of expiringTokens || []) {
      try {
        const refreshResult = await refreshDexcomToken(token, supabaseClient);
        refreshResults.push({
          userId: token.user_id,
          success: refreshResult.success,
          message: refreshResult.message,
          expiresAt: refreshResult.expiresAt
        });
      } catch (error) {
        console.error(`Error refreshing token for user ${token.user_id}:`, error);
        refreshResults.push({
          userId: token.user_id,
          success: false,
          message: error.message
        });
      }
    }

    // Log the refresh activity
    if (refreshResults.length > 0) {
      await supabaseClient
        .from('dexcom_sync_log')
        .insert(
          refreshResults.map(result => ({
            user_id: result.userId,
            sync_type: 'auto_token_refresh',
            status: result.success ? 'success' : 'error',
            message: result.message,
            created_at: new Date().toISOString()
          }))
        );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${expiringTokens?.length || 0} expiring tokens`,
        results: refreshResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in auto-refresh function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function refreshDexcomToken(tokenData: any, supabaseClient: any) {
  // Decode the refresh token (base64)
  let refreshToken: string;
  try {
    const decoded = atob(tokenData.refresh_token_encrypted);
    // Check if it looks like a valid token
    if (decoded.startsWith('US_') || decoded.includes('.')) {
      refreshToken = decoded;
    } else {
      // Not base64 encoded, use as-is
      refreshToken = tokenData.refresh_token_encrypted;
    }
  } catch {
    // If decoding fails, use as-is
    refreshToken = tokenData.refresh_token_encrypted;
  }

  // Get Dexcom credentials
  const dexcomClientId = Deno.env.get('DEXCOM_CLIENT_ID');
  const dexcomClientSecret = Deno.env.get('DEXCOM_CLIENT_SECRET');

  if (!dexcomClientId || !dexcomClientSecret) {
    throw new Error('Dexcom credentials not configured');
  }

  // Call Dexcom token refresh endpoint
  const formData = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: dexcomClientId,
    client_secret: dexcomClientSecret
  });

  const tokenResponse = await fetch('https://api.dexcom.com/v2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Dexcom token refresh failed:', errorText);
    
    // If refresh token is invalid, mark the token as inactive
    if (tokenResponse.status === 400 || tokenResponse.status === 401) {
      await supabaseClient
        .from('dexcom_tokens')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', tokenData.id);
      
      throw new Error('Refresh token invalid - user needs to reconnect');
    }
    
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  const tokens = await tokenResponse.json();

  // Encode the new tokens (base64)
  const newAccessToken = btoa(tokens.access_token);
  const newRefreshToken = btoa(tokens.refresh_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Update the token in the database
  const { error: updateError } = await supabaseClient
    .from('dexcom_tokens')
    .update({
      access_token_encrypted: newAccessToken,
      refresh_token_encrypted: newRefreshToken,
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', tokenData.id);

  if (updateError) {
    console.error('Error updating token:', updateError);
    throw new Error('Failed to update token in database');
  }

  return {
    success: true,
    message: 'Token refreshed successfully',
    expiresAt: expiresAt.toISOString()
  };
}