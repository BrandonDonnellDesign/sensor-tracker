/**
 * Supabase Edge Function for Dexcom OAuth Authorization
 * Handles the OAuth flow securely on the server side
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DexcomTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, code, refreshToken } = await req.json()

    switch (action) {
      case 'getAuthUrl':
        return handleGetAuthUrl()
      case 'exchangeCode':
        return await handleExchangeCode(code, user.id, supabaseClient)
      case 'refreshToken':
        return await handleRefreshToken(refreshToken, user.id, supabaseClient)
      case 'revokeTokens':
        return await handleRevokeTokens(user.id, supabaseClient)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Dexcom OAuth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function handleGetAuthUrl() {
  const state = crypto.randomUUID()
  const params = new URLSearchParams({
    client_id: Deno.env.get('DEXCOM_CLIENT_ID')!,
    redirect_uri: Deno.env.get('DEXCOM_REDIRECT_URI')!,
    response_type: 'code',
    scope: 'offline_access',
    state,
  })

  const authUrl = `${Deno.env.get('DEXCOM_AUTH_URL')}?${params.toString()}`

  return new Response(
    JSON.stringify({ authUrl, state }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleExchangeCode(code: string, userId: string, supabaseClient: any) {
  // Exchange authorization code for tokens
  const tokenResponse = await fetch(`${Deno.env.get('DEXCOM_BASE_URL')}/v2/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('DEXCOM_CLIENT_ID')!,
      client_secret: Deno.env.get('DEXCOM_CLIENT_SECRET')!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: Deno.env.get('DEXCOM_REDIRECT_URI')!,
    }),
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  const tokens: DexcomTokens = await tokenResponse.json()

  // Encrypt tokens (simple base64 for demo - use proper encryption in production)
  const encryptedAccessToken = btoa(tokens.access_token)
  const encryptedRefreshToken = btoa(tokens.refresh_token)

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  // Deactivate existing tokens
  await supabaseClient
    .from('dexcom_tokens')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)

  // Store new tokens
  const { error } = await supabaseClient
    .from('dexcom_tokens')
    .insert({
      user_id: userId,
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expires_at: expiresAt.toISOString(),
      scope: tokens.scope,
      token_type: tokens.token_type,
    })

  if (error) {
    console.error('Error storing tokens:', error)
    throw new Error('Failed to store tokens')
  }

  // Create default sync settings
  await supabaseClient
    .from('dexcom_sync_settings')
    .upsert({
      user_id: userId,
      auto_sync_enabled: true,
      sync_frequency_minutes: 60,
    })

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleRefreshToken(refreshToken: string, userId: string, supabaseClient: any) {
  const tokenResponse = await fetch(`${Deno.env.get('DEXCOM_BASE_URL')}/v2/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('DEXCOM_CLIENT_ID')!,
      client_secret: Deno.env.get('DEXCOM_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error('Failed to refresh token')
  }

  const tokens: DexcomTokens = await tokenResponse.json()

  // Update tokens in database
  const encryptedAccessToken = btoa(tokens.access_token)
  const encryptedRefreshToken = btoa(tokens.refresh_token)
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  const { error } = await supabaseClient
    .from('dexcom_tokens')
    .update({
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    throw new Error('Failed to update tokens')
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleRevokeTokens(userId: string, supabaseClient: any) {
  const { error } = await supabaseClient
    .from('dexcom_tokens')
    .update({ is_active: false })
    .eq('user_id', userId)

  if (error) {
    throw new Error('Failed to revoke tokens')
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
