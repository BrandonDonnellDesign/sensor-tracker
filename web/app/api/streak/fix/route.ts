import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { StreakTracker } from '@/lib/streak-tracker';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fixing streak for user:', user.id);

    // Initialize the new streak tracker
    const streakTracker = new StreakTracker(user.id, 'UTC');

    // Clear existing activities and start fresh
    await (supabase as any)
      .from('daily_activities')
      .delete()
      .eq('user_id', user.id)
      .eq('activity_type', 'login');

    // Backfill activities from Oct 14th to today (correct date range)
    const startDate = '2025-10-14';
    const endDate = new Date().toISOString().split('T')[0];
    
    console.log(`Backfilling streak from ${startDate} to ${endDate}`);
    
    const backfillResult = await streakTracker.backfillActivities(startDate, endDate, 'login', 5);
    
    // Calculate streaks with new system
    const streakData = await streakTracker.calculateStreaks('login');
    
    // Update user stats with correct streak data
    await streakTracker.updateUserStats(streakData);

    // Calculate expected days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const expectedDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    console.log(`Streak fix completed: Expected ${expectedDays} days, got ${streakData.currentStreak} days`);
    console.log(`Activities: ${backfillResult.added} added, ${backfillResult.skipped} skipped`);

    return NextResponse.json({ 
      success: true,
      message: `Streak fixed! Your ${streakData.currentStreak}-day streak has been restored (Oct 14 - today).`,
      stats: {
        expectedDays,
        actualStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        activitiesAdded: backfillResult.added,
        activitiesSkipped: backfillResult.skipped,
        startDate,
        endDate,
        isActiveToday: streakData.isActiveToday
      }
    });

  } catch (error) {
    console.error('Streak fix API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}