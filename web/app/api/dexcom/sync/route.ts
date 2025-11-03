import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  console.log('🔄 Dexcom sync API called:', request.url);
  console.log('🍪 Request cookies:', request.cookies.getAll().map(c => c.name));
  
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('🔐 Sync auth check:', { 
      hasUser: !!user, 
      userId: user?.id?.substring(0, 8) + '...', 
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.error('Auth error in Dexcom sync API:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Please log in to sync Dexcom data',
        authError: authError?.message
      }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    // Verify the user is syncing their own data or is an admin
    if (userId !== user.id) {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get user's active Dexcom token
    let { data: token, error: tokenError } = await supabase
      .from('dexcom_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If no active token found, check if there's any token at all (might be inactive due to refresh)
    if (tokenError || !token) {
      console.log('🔍 No active token found, checking for any tokens for user:', userId);
      
      const { data: anyTokens } = await supabase
        .from('dexcom_tokens')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5);

      console.log('🔍 All tokens for user:', anyTokens?.map(t => ({
        id: t.id,
        is_active: t.is_active,
        created_at: t.created_at,
        updated_at: t.updated_at,
        expires_at: t.token_expires_at
      })));

      // Try to get the most recently updated token (might have just been refreshed)
      if (anyTokens && anyTokens.length > 0) {
        const mostRecentToken = anyTokens[0];
        
        // If the most recent token was updated within the last 5 minutes, use it
        const updatedAt = new Date(mostRecentToken.updated_at);
        const now = new Date();
        const minutesSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60);
        
        if (minutesSinceUpdate <= 5) {
          console.log('🔄 Using recently updated token (updated', minutesSinceUpdate.toFixed(1), 'minutes ago)');
          
          // Reactivate this token if it's not active
          if (!mostRecentToken.is_active) {
            await supabase
              .from('dexcom_tokens')
              .update({ is_active: true })
              .eq('id', mostRecentToken.id);
          }
          
          token = mostRecentToken;
          tokenError = null;
        }
      }
    }

    if (tokenError || !token) {
      // Log the sync attempt failure
      await supabase.rpc('log_dexcom_operation', {
        p_user_id: userId,
        p_operation: 'sync',
        p_sync_type: 'manual_sync',
        p_status: 'error',
        p_message: 'No active Dexcom token found'
      });

      return NextResponse.json({
        success: false,
        error: 'No Dexcom token found. Please connect your Dexcom account first.'
      }, { status: 404 });
    }

    // Check if token is expired or expiring soon
    const expiresAt = new Date(token.token_expires_at);
    const now = new Date();
    const hoursUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    let tokenAutoRefreshed = false;

    // If token expires within 2 hours, try to refresh it first
    if (hoursUntilExpiration <= 2 && hoursUntilExpiration > 0) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseServiceKey) {
          const refreshResponse = await fetch(`${supabaseUrl}/functions/v1/dexcom-refresh-token`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
          });

          if (refreshResponse.ok) {
            tokenAutoRefreshed = true;
            await supabase.rpc('log_dexcom_operation', {
              p_user_id: userId,
              p_operation: 'auto_refresh',
              p_sync_type: 'pre_sync_refresh',
              p_status: 'success',
              p_message: 'Token auto-refreshed before sync'
            });
          }
        }
      } catch (refreshError) {
        console.warn('Token auto-refresh failed, continuing with existing token:', refreshError);
      }
    }

    // If token is expired, return error
    if (hoursUntilExpiration <= 0) {
      await supabase.rpc('log_dexcom_operation', {
        p_user_id: userId,
        p_operation: 'sync',
        p_sync_type: 'manual_sync',
        p_status: 'error',
        p_message: 'Token has expired'
      });

      return NextResponse.json({
        success: false,
        error: 'Dexcom token has expired. Please reconnect your Dexcom account.',
        expired: true
      }, { status: 401 });
    }

    // Call the Supabase Edge Function to sync glucose data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Supabase configuration missing'
      }, { status: 500 });
    }

    console.log('🔄 Calling Edge Function:', `${supabaseUrl}/functions/v1/dexcom-sync`);
    
    const syncResponse = await fetch(`${supabaseUrl}/functions/v1/dexcom-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });

    console.log('🔄 Edge Function response status:', syncResponse.status);
    console.log('🔄 Edge Function response headers:', Object.fromEntries(syncResponse.headers.entries()));

    let syncResult;
    try {
      const responseText = await syncResponse.text();
      console.log('🔄 Edge Function raw response:', responseText.substring(0, 500));
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Edge Function returned empty response');
      }
      
      syncResult = JSON.parse(responseText);
      
      // Ensure syncResult is not empty
      if (!syncResult || Object.keys(syncResult).length === 0) {
        throw new Error('Edge Function returned empty JSON object');
      }
      
    } catch (parseError) {
      console.error('🔄 Failed to parse Edge Function response:', parseError);
      
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      
      return NextResponse.json({
        success: false,
        error: 'Edge Function returned invalid or empty response',
        details: errorMessage,
        httpStatus: syncResponse.status
      }, { status: 500 });
    }

    console.log('🔄 Edge Function parsed result:', syncResult);

    if (!syncResponse.ok || !syncResult.success) {
      // Handle empty or malformed responses
      const errorMessage = syncResult?.error || 
                          (syncResponse.status === 500 ? 'Internal server error in Edge Function' : 
                           syncResponse.status === 404 ? 'Edge Function not found' :
                           syncResponse.status === 401 ? 'Unauthorized access to Edge Function' :
                           `Edge Function failed with status ${syncResponse.status}`);
      
      // Log the sync failure
      await supabase.rpc('log_dexcom_operation', {
        p_user_id: userId,
        p_operation: 'sync',
        p_sync_type: 'manual_sync',
        p_status: 'error',
        p_message: errorMessage,
        p_error_details: syncResult ? JSON.stringify(syncResult) : `HTTP ${syncResponse.status}`
      });

      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: syncResult?.details || `HTTP status: ${syncResponse.status}`,
        httpStatus: syncResponse.status
      }, { status: syncResponse.status });
    }

    // Log successful sync
    await supabase.rpc('log_dexcom_operation', {
      p_user_id: userId,
      p_operation: 'sync',
      p_sync_type: 'manual_sync',
      p_status: 'success',
      p_message: `Synced ${syncResult.glucose_readings || 0} glucose readings`
    });

    return NextResponse.json({
      success: true,
      message: 'Glucose data synced successfully',
      glucose_readings: syncResult.glucose_readings || 0,
      token_auto_refreshed: tokenAutoRefreshed,
      last_sync: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error syncing Dexcom data:', error);
    
    // Try to log the error if we have user context
    try {
      const user = await getCurrentUser();
      if (user) {
        const supabase = await createClient();
        await supabase.rpc('log_dexcom_operation', {
          p_user_id: user.id,
          p_operation: 'sync',
          p_sync_type: 'manual_sync',
          p_status: 'error',
          p_message: 'Internal server error during sync',
          p_error_details: error instanceof Error ? JSON.stringify({ message: error.message, stack: error.stack }) : null
        });
      }
    } catch (logError) {
      console.error('Failed to log sync error:', logError);
    }

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