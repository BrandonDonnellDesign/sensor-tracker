import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import { ApiErrors } from '@/lib/api-error';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return ApiErrors.unauthorized();
    }

    // Get all user's Dexcom tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('dexcom_tokens')
      .select('id, is_active, created_at, updated_at, token_expires_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (tokenError) {
      logger.error('Failed to fetch tokens:', tokenError);
      return ApiErrors.databaseError('Failed to fetch tokens');
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
    logger.error('Error checking token status:', error);
    return ApiErrors.internalError(
      error instanceof Error ? error.message : 'Failed to check token status'
    );
  }
}