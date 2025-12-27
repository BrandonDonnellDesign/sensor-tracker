import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { StreakTracker, StreakUtils } from '@/lib/streak-tracker';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timezone = StreakUtils.getUserTimezone();
    const tracker = new StreakTracker(user.id, timezone);

    // Get current date info
    const now = new Date();
    const userDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const today = userDate.toISOString().split('T')[0];
    const yesterday = new Date(userDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get recent activities
    const { data: recentActivities } = await (supabase as any)
      .from('daily_activities')
      .select('*')
      .eq('user_id', user.id)
      .eq('activity_type', 'login')
      .gte('activity_date', yesterdayStr)
      .order('activity_date', { ascending: false });

    // Get all activities for streak calculation
    const { data: allActivities } = await (supabase as any)
      .from('daily_activities')
      .select('activity_date')
      .eq('user_id', user.id)
      .eq('activity_type', 'login')
      .order('activity_date', { ascending: false })
      .limit(100);

    // Get current streak status
    const streakStatus = await tracker.getStreakStatus('login');
    
    // Get user stats
    const { data: userStats } = await (supabase as any)
      .from('user_gamification_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      debug: {
        timezone,
        serverTime: now.toISOString(),
        userTime: userDate.toISOString(),
        today,
        yesterday: yesterdayStr,
        hasActivityToday: recentActivities?.some(a => a.activity_date === today),
        hasActivityYesterday: recentActivities?.some(a => a.activity_date === yesterdayStr),
      },
      recentActivities: recentActivities || [],
      allActivities: (allActivities || []).map(a => a.activity_date),
      streakStatus,
      userStats,
      calculations: {
        shouldHaveStreak: allActivities?.length || 0,
        consecutiveDays: streakStatus.streakData.currentStreak
      }
    });
  } catch (error) {
    console.error('Debug streak API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const timezone = StreakUtils.getUserTimezone();
    const tracker = new StreakTracker(user.id, timezone);

    switch (action) {
      case 'record_today': {
        // Force record today's activity
        const streakData = await tracker.recordActivity('login', 5);
        await tracker.updateUserStats(streakData);
        
        return NextResponse.json({
          success: true,
          message: 'Today\'s activity recorded',
          streakData
        });
      }

      case 'recalculate': {
        // Force recalculate streaks
        const streakData = await tracker.calculateStreaks('login');
        await tracker.updateUserStats(streakData);
        
        return NextResponse.json({
          success: true,
          message: 'Streaks recalculated',
          streakData
        });
      }

      case 'fix_streak': {
        // Add today's activity if missing, then recalculate
        const today = new Date().toISOString().split('T')[0];
        
        // Check if today's activity exists
        const { data: todayActivity } = await (supabase as any)
          .from('daily_activities')
          .select('id')
          .eq('user_id', user.id)
          .eq('activity_type', 'login')
          .eq('activity_date', today)
          .single();

        if (!todayActivity) {
          // Record today's activity
          await tracker.recordActivity('login', 5);
        }

        // Recalculate streaks
        const streakData = await tracker.calculateStreaks('login');
        await tracker.updateUserStats(streakData);
        
        return NextResponse.json({
          success: true,
          message: 'Streak fixed and recalculated',
          addedTodayActivity: !todayActivity,
          streakData
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Debug streak POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}