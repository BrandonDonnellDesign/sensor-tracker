import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';


export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error in Dexcom refresh token API:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Please log in to refresh Dexcom token'
      }, { status: 401 });
    }

    const body = await request.json();
    const { force = false } = body;

    // Get user's active Dexcom token
    const { data: token, error: tokenError } = await supabase
      .from('dexcom_tokens')
      .select('*')
      .eq('user_id', user.id)
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

    // Check if refresh is needed (unless forced)
    if (!force) {
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

    // Call the Supabase Edge Function to refresh the token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase configuration missing'
      }, { status: 500 });
    }

    const refreshResponse = await fetch(`${supabaseUrl}/functions/v1/dexcom-refresh-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: user.id })
    });

    const refreshResult = await refreshResponse.json();

    if (!refreshResponse.ok || !refreshResult.success) {
      // Log the refresh attempt
      await supabase
        .from('dexcom_sync_log')
        .insert({
          user_id: user.id,
          sync_type: 'manual_token_refresh',
          status: 'error',
          message: refreshResult.error || 'Token refresh failed',
          created_at: new Date().toISOString()
        });

      return NextResponse.json({
        success: false,
        error: refreshResult.error || 'Failed to refresh token',
        details: refreshResult.details
      }, { status: refreshResponse.status });
    }

    // Log successful refresh
    await supabase
      .from('dexcom_sync_log')
      .insert({
        user_id: user.id,
        sync_type: 'manual_token_refresh',
        status: 'success',
        message: 'Token refreshed successfully',
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      expires_at: refreshResult.expires_at
    });

  } catch (error) {
    console.error('Error refreshing Dexcom token:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}