// @ts-nocheck
/***
 * Supabase Edge Function for Dexcom Token Refresh
 * Refreshes expired Dexcom access tokens using the refresh token
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

    // Get user ID from request body
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the user's Dexcom token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('dexcom_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'No Dexcom token found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
      return new Response(
        JSON.stringify({ error: 'Dexcom credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
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
      return new Response(
        JSON.stringify({ 
          error: 'Failed to refresh token', 
          details: errorText,
          status: tokenResponse.status
        }),
        {
          status: tokenResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
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
      return new Response(
        JSON.stringify({ error: 'Failed to update token in database' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token refreshed successfully',
        expires_at: expiresAt.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error refreshing token:', error);
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
