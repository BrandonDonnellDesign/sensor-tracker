import { NextRequest, NextResponse } from 'next/server';
import { DexcomAPIClient } from '@/lib/dexcom-api';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, code, state, userId } = body;

    console.log('Dexcom OAuth API called with action:', action);

    if (action === 'exchangeCode') {
      if (!code) {
        return NextResponse.json({
          error: 'Missing authorization code'
        }, { status: 400 });
      }

      console.log('Exchanging authorization code for tokens...');

      // Initialize Dexcom API client (sandbox mode) with client secret
      const dexcomClient = new DexcomAPIClient(false, process.env.DEXCOM_CLIENT_SECRET);

      try {
        // Exchange the authorization code for access tokens
        const tokens = await dexcomClient.exchangeCodeForTokens(code);
        
        console.log('Successfully received tokens from Dexcom');

        // If we have a userId, store the tokens in the database
        if (userId) {
          console.log('Storing tokens for user:', userId);

          // Calculate expiry time
          const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

          // Deactivate existing tokens
          await supabase
            .from('dexcom_tokens')
            .update({ is_active: false })
            .eq('user_id', userId)
            .eq('is_active', true);

          // Store new tokens (simple base64 encoding for now - use proper encryption in production)
          const { error: insertError } = await supabase
            .from('dexcom_tokens')
            .insert({
              user_id: userId,
              access_token_encrypted: btoa(tokens.access_token), // Base64 encode
              refresh_token_encrypted: btoa(tokens.refresh_token), // Base64 encode
              token_expires_at: expiresAt.toISOString(),
              scope: tokens.scope,
              token_type: tokens.token_type,
              is_active: true
            });

          if (insertError) {
            console.error('Failed to store tokens:', insertError);
            // Still return success for OAuth flow, but note the storage issue
            return NextResponse.json({
              success: true,
              message: 'OAuth completed but token storage failed',
              tokens: {
                access_token: tokens.access_token.substring(0, 10) + '...', // Truncated for security
                expires_in: tokens.expires_in,
                scope: tokens.scope
              },
              storageError: insertError.message
            });
          }

          console.log('Tokens stored successfully');

          // Initialize sync settings for the user
          await supabase
            .from('dexcom_sync_settings')
            .upsert({
              user_id: userId,
              auto_sync_enabled: true,
              sync_frequency_minutes: 60,
              sync_sensor_data: true,
              sync_glucose_data: false,
              sync_device_status: true
            });

          return NextResponse.json({
            success: true,
            message: 'OAuth flow completed and tokens stored successfully',
            tokens: {
              access_token: tokens.access_token.substring(0, 10) + '...', // Truncated for security
              expires_in: tokens.expires_in,
              scope: tokens.scope,
              expires_at: expiresAt.toISOString()
            }
          });
        } else {
          // No userId provided, just return success without storing
          console.log('No userId provided, tokens not stored');
          
          return NextResponse.json({
            success: true,
            message: 'OAuth flow completed (tokens not stored - no user ID)',
            tokens: {
              access_token: tokens.access_token.substring(0, 10) + '...', // Truncated for security
              expires_in: tokens.expires_in,
              scope: tokens.scope
            }
          });
        }

      } catch (tokenError) {
        console.error('Failed to exchange code for tokens:', tokenError);
        return NextResponse.json({
          error: 'Failed to exchange authorization code for tokens',
          details: tokenError instanceof Error ? tokenError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    if (action === 'getAuthUrl') {
      return NextResponse.json({
        error: 'Use /api/dexcom/auth-url instead'
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Unknown action'
    }, { status: 400 });

  } catch (error) {
    console.error('Dexcom OAuth API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}