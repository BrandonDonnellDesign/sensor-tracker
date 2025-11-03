import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Please log in to check token status'
      }, { status: 401 });
    }

    // Get all user's Dexcom tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('dexcom_tokens')
      .select('id, is_active, created_at, updated_at, token_expires_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (tokenError) {
      return NextResponse.json({
        error: 'Failed to fetch tokens',
        details: tokenError.message
      }, { status: 500 });
    }

    const now = new Date();
    const tokenStatus = tokens?.map(token => {
      const expiresAt = new Date(token.token_expires_at);
      const hoursUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      const updatedAt = new Date(token.updated_at);
      const minutesSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60);

      return {
        id: token.id,
        is_active: token.is_active,
        created_at: token.created_at,
        updated_at: token.updated_at,
        expires_at: token.token_expires_at,
        hours_until_expiration: Math.round(hoursUntilExpiration * 100) / 100,
        minutes_since_update: Math.round(minutesSinceUpdate * 100) / 100,
        is_expired: hoursUntilExpiration <= 0,
        needs_refresh: hoursUntilExpiration <= 2 && hoursUntilExpiration > 0
      };
    }) || [];

    return NextResponse.json({
      user_id: user.id,
      token_count: tokens?.length || 0,
      active_tokens: tokenStatus.filter(t => t.is_active).length,
      tokens: tokenStatus
    });

  } catch (error) {
    console.error('Error checking token status:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}