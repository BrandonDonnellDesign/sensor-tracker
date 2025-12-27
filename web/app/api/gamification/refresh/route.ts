import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user stats
    const { data: userStats } = await (supabase as any)
      .from('user_gamification_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get recent activities to verify streak
    const { data: recentActivities } = await (supabase as any)
      .from('daily_activities')
      .select('activity_date')
      .eq('user_id', user.id)
      .eq('activity_type', 'login')
      .order('activity_date', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      userStats,
      recentActivities: recentActivities?.map(a => a.activity_date) || [],
      message: 'Gamification data refreshed'
    });

  } catch (error) {
    console.error('Refresh gamification API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}