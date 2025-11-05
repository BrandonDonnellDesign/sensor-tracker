import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('🔑 Starting scheduled Dexcom token refresh');
  
  try {
    const supabase = await createClient();

    // Get tokens that expire within the next 4 hours
    const now = new Date();
    const refreshThreshold = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now
    
    const { data: expiringTokens, error } = await supabase
      .from('dexcom_tokens')
      .select('user_id, token_expires_at, is_active')
      .eq('is_active', true)
      .lte('token_expires_at', refreshThreshold.toISOString())
      .gte('token_expires_at', now.toISOString()); // Not already expired

    if (error) {
      console.error('Error fetching expiring tokens:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`🔑 Found ${expiringTokens.length} tokens expiring within 4 hours`);

    if (expiringTokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No tokens need refreshing',
        tokens_refreshed: 0,
        total_tokens_checked: 0
      });
    }

    const results = [];
    
    // Refresh each expiring token
    for (const tokenInfo of expiringTokens.slice(0, 20)) { // Limit to 20 refreshes per run
      try {
        console.log(`🔑 Refreshing token for user: ${tokenInfo.user_id} (expires: ${tokenInfo.token_expires_at})`);
        
        const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/dexcom/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ userId: tokenInfo.user_id })
        });

        const refreshResult = await refreshResponse.json();
        
        results.push({
          userId: tokenInfo.user_id,
          success: refreshResponse.ok,
          oldExpiry: tokenInfo.token_expires_at,
          newExpiry: refreshResult.new_expiry || null,
          error: refreshResult.error || null
        });

        if (refreshResponse.ok) {
          console.log(`✅ Token refreshed for user: ${tokenInfo.user_id}`);
        } else {
          console.error(`❌ Token refresh failed for user: ${tokenInfo.user_id}`, refreshResult.error);
        }

      } catch (refreshError) {
        console.error(`Error refreshing token for user ${tokenInfo.user_id}:`, refreshError);
        results.push({
          userId: tokenInfo.user_id,
          success: false,
          oldExpiry: tokenInfo.token_expires_at,
          error: refreshError instanceof Error ? refreshError.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    console.log(`✅ Token refresh completed: ${successCount}/${results.length} tokens refreshed`);

    return NextResponse.json({
      success: true,
      message: 'Scheduled token refresh completed',
      tokens_refreshed: successCount,
      total_tokens_checked: results.length,
      results
    });

  } catch (error) {
    console.error('Token refresh cron error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}