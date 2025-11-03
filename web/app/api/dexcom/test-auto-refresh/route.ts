import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-utils';

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current token status
    const { data: token } = await supabase
      .from('dexcom_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!token) {
      return NextResponse.json({
        hasToken: false,
        message: 'No active Dexcom token found'
      });
    }

    const now = new Date();
    const expiresAt = new Date(token.token_expires_at);
    const hoursUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Check if token would be refreshed by auto-refresh
    const wouldAutoRefresh = hoursUntilExpiration <= 1.5 && hoursUntilExpiration > 0;
    const needsImmediateRefresh = hoursUntilExpiration <= 1.5 && hoursUntilExpiration > 0;

    return NextResponse.json({
      hasToken: true,
      tokenInfo: {
        id: token.id,
        expiresAt: token.token_expires_at,
        hoursUntilExpiration: Math.round(hoursUntilExpiration * 100) / 100,
        lastSyncAt: token.last_sync_at,
        createdAt: token.created_at,
        updatedAt: token.updated_at
      },
      autoRefreshStatus: {
        wouldAutoRefresh,
        needsImmediateRefresh,
        nextServerCheck: 'Every 30 minutes',
        nextClientCheck: 'Every 10 minutes or on page focus'
      },
      testingInfo: {
        message: wouldAutoRefresh 
          ? 'Token will be auto-refreshed by server within 90 minutes'
          : 'Token is not in auto-refresh window yet',
        serverRefreshTrigger: hoursUntilExpiration <= 1.5 ? 'Active' : 'Inactive',
        clientRefreshTrigger: hoursUntilExpiration <= 1.5 ? 'Active' : 'Inactive'
      }
    });

  } catch (error) {
    console.error('Error in test auto-refresh:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'simulate-expiring') {
      // Simulate a token that expires in 1 hour for testing
      const oneHourFromNow = new Date();
      oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

      const { error } = await supabase
        .from('dexcom_tokens')
        .update({
          token_expires_at: oneHourFromNow.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        return NextResponse.json({ error: 'Failed to simulate expiring token' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Token expiration set to 1 hour from now for testing',
        newExpiresAt: oneHourFromNow.toISOString(),
        testInstructions: [
          'The client-side auto-refresh should trigger within 10 minutes',
          'Check the browser console for auto-refresh logs',
          'Use the token status component to see real-time updates'
        ]
      });
    }

    if (action === 'trigger-server-refresh') {
      // Manually trigger the server-side auto-refresh function
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
      }

      const refreshResponse = await fetch(`${supabaseUrl}/functions/v1/dexcom-auto-refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      });

      const refreshResult = await refreshResponse.json();

      return NextResponse.json({
        success: refreshResponse.ok,
        serverResponse: refreshResult,
        message: refreshResponse.ok 
          ? 'Server auto-refresh triggered successfully'
          : 'Server auto-refresh failed'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in test auto-refresh POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}