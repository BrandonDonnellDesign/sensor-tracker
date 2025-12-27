import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { StreakTracker } from '@/lib/streak-tracker';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting modern backfill process for user:', user.id);

    try {
      // Initialize the new streak tracker
      const streakTracker = new StreakTracker(user.id, 'UTC');

      // Count existing data for points calculation
      const { data: sensors } = await (supabase as any)
        .from('sensors')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      const { data: glucoseReadings } = await (supabase as any)
        .from('glucose_readings')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const sensorCount = sensors?.length || 0;
      const glucoseCount = Math.min(1000, glucoseReadings?.length || 0);
      
      // Backfill activities from Oct 14th to today using new system
      const startDate = '2025-10-14';
      const endDate = new Date().toISOString().split('T')[0];
      
      console.log(`Backfilling activities from ${startDate} to ${endDate}`);
      
      const backfillResult = await streakTracker.backfillActivities(startDate, endDate, 'login', 5);
      
      // Calculate streaks with new system
      const streakData = await streakTracker.calculateStreaks('login');
      
      // Calculate total points
      const loginDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const totalPoints = (sensorCount * 20) + (glucoseCount * 1) + (loginDays * 5);

      // Update user stats with new streak data and points
      const { data: existingStats } = await (supabase as any)
        .from('user_gamification_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const updateData = {
        total_points: totalPoints,
        level: Math.max(1, Math.floor(totalPoints / 100) + 1),
        current_streak: streakData.currentStreak,
        longest_streak: Math.max(existingStats?.longest_streak || 0, streakData.longestStreak),
        sensors_tracked: sensorCount,
        successful_sensors: sensorCount, // Assume all are successful for backfill
        achievements_earned: existingStats?.achievements_earned || 0,
        last_activity_date: streakData.lastActivityDate || endDate
      };

      if (existingStats) {
        await (supabase as any)
          .from('user_gamification_stats')
          .update(updateData)
          .eq('user_id', user.id);
      } else {
        await (supabase as any)
          .from('user_gamification_stats')
          .insert({
            user_id: user.id,
            ...updateData
          });
      }

      console.log(`Modern backfill completed: ${backfillResult.added} activities added, ${backfillResult.skipped} skipped`);
      console.log(`Final stats: ${sensorCount} sensors, ${glucoseCount} glucose readings, ${loginDays} login days`);
      console.log(`Streak data: current=${streakData.currentStreak}, longest=${streakData.longestStreak}`);
      console.log(`Total points: ${totalPoints}`);

      return NextResponse.json({ 
        success: true,
        message: `Modern streak tracking activated! Added ${backfillResult.added} activities. Your ${streakData.currentStreak}-day streak has been restored (Oct 14 - today).`,
        stats: {
          activitiesAdded: backfillResult.added,
          activitiesSkipped: backfillResult.skipped,
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          totalPoints: totalPoints,
          sensors: sensorCount,
          glucoseReadings: glucoseCount
        }
      });

    } catch (modernError) {
      console.error('Modern backfill failed:', modernError);
      return NextResponse.json({ 
        error: 'Failed to backfill with modern streak system',
        details: modernError instanceof Error ? modernError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Backfill API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}