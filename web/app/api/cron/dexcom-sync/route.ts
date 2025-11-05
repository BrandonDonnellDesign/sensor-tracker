import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🕐 Starting scheduled Dexcom sync for all users');
  
  try {
    const supabase = await createClient();

    // Get all users with Dexcom tokens (active or expiring soon)
    const { data: allTokens, error } = await supabase
      .from('dexcom_tokens')
      .select('user_id, token_expires_at, is_active, updated_at')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching tokens:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`🔄 Found ${allTokens.length} users with tokens`);

    // Separate tokens into categories
    const now = new Date();
    const refreshThreshold = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    
    const tokensToRefresh = allTokens.filter(token => {
      const expiresAt = new Date(token.token_expires_at);
      return expiresAt <= refreshThreshold; // Expires within 2 hours
    });
    
    const activeTokens = allTokens.filter(token => {
      const expiresAt = new Date(token.token_expires_at);
      return expiresAt > now; // Not expired yet
    });

    console.log(`🔑 ${tokensToRefresh.length} tokens need refresh, ${activeTokens.length} tokens ready for sync`);

    const results = [];
    let refreshResults = [];
    
    // First, refresh tokens that are expiring soon
    if (tokensToRefresh.length > 0) {
      console.log(`🔑 Refreshing ${tokensToRefresh.length} expiring tokens...`);
      
      for (const tokenInfo of tokensToRefresh.slice(0, 5)) { // Limit to 5 refreshes per run
        try {
          console.log(`🔑 Refreshing token for user: ${tokenInfo.user_id}`);
          
          const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/dexcom/refresh-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ userId: tokenInfo.user_id })
          });

          const refreshResult = await refreshResponse.json();
          
          refreshResults.push({
            userId: tokenInfo.user_id,
            success: refreshResponse.ok,
            error: refreshResult.error || null,
            wasExpiring: true
          });

          if (refreshResponse.ok) {
            console.log(`✅ Token refreshed for user: ${tokenInfo.user_id}`);
          } else {
            console.error(`❌ Token refresh failed for user: ${tokenInfo.user_id}`, refreshResult.error);
          }

        } catch (refreshError) {
          console.error(`Error refreshing token for user ${tokenInfo.user_id}:`, refreshError);
          refreshResults.push({
            userId: tokenInfo.user_id,
            success: false,
            error: refreshError instanceof Error ? refreshError.message : 'Unknown error',
            wasExpiring: true
          });
        }
      }
    }
    
    // Then sync users with valid tokens (limit to prevent timeouts)
    for (const tokenInfo of activeTokens.slice(0, 10)) { // Limit to 10 users per run
      try {
        console.log(`🔄 Syncing user: ${tokenInfo.user_id}`);
        
        // Call our existing sync API
        const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/dexcom/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ userId: tokenInfo.user_id })
        });

        const syncResult = await syncResponse.json();
        
        results.push({
          userId: tokenInfo.user_id,
          success: syncResponse.ok,
          glucose_readings: syncResult.glucose_readings || 0,
          error: syncResult.error || null
        });

      } catch (userError) {
        console.error(`Error syncing user ${tokenInfo.user_id}:`, userError);
        results.push({
          userId: tokenInfo.user_id,
          success: false,
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalReadings = results.reduce((sum, r) => sum + (r.glucose_readings || 0), 0);
    const refreshSuccessCount = refreshResults.filter(r => r.success).length;

    console.log(`✅ Cron completed: ${refreshSuccessCount}/${refreshResults.length} tokens refreshed, ${successCount}/${results.length} users synced, ${totalReadings} total readings`);

    return NextResponse.json({
      success: true,
      message: 'Scheduled sync and refresh completed',
      tokens_refreshed: refreshSuccessCount,
      total_tokens_needing_refresh: refreshResults.length,
      users_synced: successCount,
      total_users: results.length,
      total_readings: totalReadings,
      refresh_results: refreshResults,
      sync_results: results
    });

  } catch (error) {
    console.error('Cron sync error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}