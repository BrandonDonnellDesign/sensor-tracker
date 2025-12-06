import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { gmailErrorLogger } from '@/lib/gmail/error-logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent errors
    const errors = await gmailErrorLogger.getRecentErrors(user.id, 50);
    
    // Get error statistics
    const stats = await gmailErrorLogger.getErrorStats(user.id, 7);

    return NextResponse.json({
      success: true,
      errors: errors || [],
      stats: stats || { total: 0, byCategory: {}, bySeverity: {} },
    });
  } catch (error) {
    console.error('Failed to fetch sync errors:', error);
    // Return empty data instead of error if table doesn't exist yet
    return NextResponse.json({
      success: true,
      errors: [],
      stats: { total: 0, byCategory: {}, bySeverity: {} },
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear old errors (keep last 30 days)
    const deletedCount = await gmailErrorLogger.clearOldErrors(user.id, 30);

    return NextResponse.json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    console.error('Failed to clear sync errors:', error);
    return NextResponse.json(
      { error: 'Failed to clear sync errors' },
      { status: 500 }
    );
  }
}
