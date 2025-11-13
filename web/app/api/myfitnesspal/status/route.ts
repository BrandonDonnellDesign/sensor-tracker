import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get token status
    const { data: tokenData } = await (supabase as any)
      .from('myfitnesspal_tokens')
      .select('is_active, token_expires_at, created_at')
      .eq('user_id', user.id)
      .single();

    // Get sync settings
    const { data: settings } = await (supabase as any)
      .from('myfitnesspal_sync_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get recent sync logs
    const { data: recentSyncs } = await (supabase as any)
      .from('myfitnesspal_sync_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const isConnected = tokenData?.is_active || false;
    const isExpired = tokenData?.token_expires_at ? 
      new Date(tokenData.token_expires_at) < new Date() : false;

    return NextResponse.json({
      connected: isConnected && !isExpired,
      connectedAt: tokenData?.created_at,
      expiresAt: tokenData?.token_expires_at,
      settings: settings || null,
      recentSyncs: recentSyncs || []
    });

  } catch (error) {
    console.error('MyFitnessPal status error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to get status' 
    }, { status: 500 });
  }
}
