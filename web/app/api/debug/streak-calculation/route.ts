import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { StreakTracker } from '@/lib/streak-tracker';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database values
    const { data: userStats } = await (supabase as any)
      .from('user_gamification_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get all activities
    const { data: activities } = await (supabase as any)
      .from('daily_activities')
      .select('activity_date')
      .eq('user_id', user.id)
      .eq('activity_type', 'login')
      .order('activity_date', { ascending: false });

    // Test new streak tracker calculation
    const streakTracker = new StreakTracker(user.id, 'UTC');
    const calculatedStreaks = await streakTracker.calculateStreaks('login');
    const streakStatus = await streakTracker.getStreakStatus('login');

    // Manual calculation - check for gaps
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let manualStreak = 0;
    if (activities && activities.length > 0) {
      const sortedDates = activities.map(a => a.activity_date).sort().reverse();
      
      // Check if we have activity today or yesterday
      const mostRecent = sortedDates[0];
      if (mostRecent === today || mostRecent === yesterdayStr) {
        // Count consecutive days from most recent
        let expectedDate = mostRecent;
        for (const activityDate of sortedDates) {
          if (activityDate === expectedDate) {
            manualStreak++;
            // Move to previous day
            const currentDate = new Date(expectedDate);
            currentDate.setDate(currentDate.getDate() - 1);
            expectedDate = currentDate.toISOString().split('T')[0];
          } else {
            break; // Gap found
          }
        }
      }
    }

    return NextResponse.json({
      userId: user.id,
      databaseStats: {
        current_streak: userStats?.current_streak,
        longest_streak: userStats?.longest_streak,
        last_activity_date: userStats?.last_activity_date
      },
      activities: {
        total: activities?.length || 0,
        first: activities?.[activities.length - 1]?.activity_date,
        last: activities?.[0]?.activity_date,
        recent10: activities?.slice(0, 10).map(a => a.activity_date)
      },
      newStreakSystem: {
        calculated: calculatedStreaks,
        status: streakStatus
      },
      manualCalculation: {
        streak: manualStreak,
        today,
        yesterday: yesterdayStr,
        mostRecentActivity: activities?.[0]?.activity_date
      },
      debug: {
        timezone: 'UTC',
        currentDate: new Date().toISOString(),
        userTimezone: new Date().toLocaleString()
      }
    });

  } catch (error) {
    console.error('Debug streak calculation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}