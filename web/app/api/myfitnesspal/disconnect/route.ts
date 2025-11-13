import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { systemLogger } from '@/lib/system-logger';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Deactivate tokens
    const { error: updateError } = await (supabase as any)
      .from('myfitnesspal_tokens')
      .update({ is_active: false })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error deactivating tokens:', updateError);
      return NextResponse.json({ 
        error: 'Failed to disconnect' 
      }, { status: 500 });
    }

    // Log disconnection
    await (supabase as any)
      .from('myfitnesspal_sync_log')
      .insert({
        user_id: user.id,
        sync_type: 'manual',
        operation: 'disconnect_account',
        status: 'success',
        records_processed: 0,
        api_calls_made: 0,
      });

    await systemLogger.info('myfitnesspal', 'MyFitnessPal account disconnected', user.id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('MyFitnessPal disconnect error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Disconnect failed' 
    }, { status: 500 });
  }
}
