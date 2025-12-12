import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Helper function to calculate streaks based on daily activities
async function calculateStreaks(supabase: any, userId: string) {
  // Get all login activities for the user, ordered by date
  const { data: activities } = await supabase
    .from('daily_activities')
    .select('activity_date')
    .eq('user_id', userId)
    .eq('activity_type', 'login')
    .order('activity_date', { ascending: false });

  if (!activities || activities.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dates = activities.map(a => new Date(a.activity_date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Check if user has activity today or yesterday (current streak)
  const mostRecentDate = dates[0];
  mostRecentDate.setHours(0, 0, 0, 0);
  
  const daysDiff = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // If most recent activity is today or yesterday, start counting current streak
  if (daysDiff <= 1) {
    let checkDate = new Date(mostRecentDate);
    
    for (const activityDate of dates) {
      const actDate = new Date(activityDate);
      actDate.setHours(0, 0, 0, 0);
      
      if (actDate.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak by checking all consecutive sequences
  for (let i = 0; i < dates.length; i++) {
    tempStreak = 1;
    let currentDate = new Date(dates[i]);
    currentDate.setHours(0, 0, 0, 0);
    
    // Look for consecutive days
    for (let j = i + 1; j < dates.length; j++) {
      const nextDate = new Date(dates[j]);
      nextDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
      
      if (nextDate.getTime() === expectedDate.getTime()) {
        tempStreak++;
        currentDate = nextDate;
      } else {
        break;
      }
    }
    
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return { currentStreak, longestStreak };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try RPC function first, fallback to manual approach
    const { error: rpcError } = await (supabase as any).rpc('backfill_user_activities', {
      p_user_id: user.id
    });

    if (rpcError) {
      console.log('RPC backfill failed, using manual approach:', rpcError);
      
      // Manual backfill approach
      try {
        // Count existing data
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
        
        // Calculate days from Oct 4th to today for login points (your actual streak)
        const backfillStartDate = new Date('2025-10-04');
        const backfillEndDate = new Date();
        const daysDiff = Math.ceil((backfillEndDate.getTime() - backfillStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const loginDays = daysDiff; // Don't cap it since this is your actual streak

        const totalPoints = (sensorCount * 20) + (glucoseCount * 1) + (loginDays * 5);

        // Get existing stats to check current state
        const { data: existingStats } = await (supabase as any)
          .from('user_gamification_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (existingStats) {
          // Update existing record with core columns only (streaks will be calculated later)
          const updateData = {
            total_points: totalPoints,
            level: Math.max(1, Math.floor(totalPoints / 100) + 1),
            sensors_tracked: sensorCount,
            successful_sensors: sensorCount, // Assume all are successful for backfill
            achievements_earned: existingStats.achievements_earned || 0,
            last_activity_date: new Date().toISOString().split('T')[0]
          };

          await (supabase as any)
            .from('user_gamification_stats')
            .update(updateData)
            .eq('user_id', user.id);
        } else {
          // Create new record with core columns (streaks will be calculated later)
          const newStats = {
            user_id: user.id,
            total_points: totalPoints,
            current_streak: 0, // Will be calculated after activities are added
            longest_streak: 0, // Will be calculated after activities are added
            level: Math.max(1, Math.floor(totalPoints / 100) + 1),
            sensors_tracked: sensorCount,
            successful_sensors: sensorCount,
            achievements_earned: 0,
            last_activity_date: new Date().toISOString().split('T')[0]
          };

          await (supabase as any)
            .from('user_gamification_stats')
            .insert(newStats);
        }

        // Fill in missing daily activities from Dec 3rd to today
        const activitiesToAdd = [];

        // Get existing daily activities to avoid duplicates (from Oct 4th onwards)
        const { data: existingActivities } = await (supabase as any)
          .from('daily_activities')
          .select('activity_date, activity_type')
          .eq('user_id', user.id)
          .gte('activity_date', '2025-10-04');

        const existingDates = new Set(
          existingActivities?.map((a: any) => `${a.activity_date}-${a.activity_type}`) || []
        );

        // Fill in missing days
        for (let date = new Date(backfillStartDate); date <= backfillEndDate; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0];
          const loginKey = `${dateStr}-login`;
          
          // Add login activity if missing
          if (!existingDates.has(loginKey)) {
            activitiesToAdd.push({
              user_id: user.id,
              activity_type: 'login',
              activity_date: dateStr,
              points_earned: 5,
              activity_count: 1,
              activities: '[]'
            });
          }
        }

        // Insert missing activities in batches
        if (activitiesToAdd.length > 0) {
          console.log(`Adding ${activitiesToAdd.length} missing daily activities from ${backfillStartDate.toISOString().split('T')[0]} to ${backfillEndDate.toISOString().split('T')[0]}`);
          
          // Insert in larger batches since we have many days to process
          const batchSize = 50;
          for (let i = 0; i < activitiesToAdd.length; i += batchSize) {
            const batch = activitiesToAdd.slice(i, i + batchSize);
            const { error: insertError } = await (supabase as any)
              .from('daily_activities')
              .upsert(batch, { onConflict: 'user_id,activity_type,activity_date' });
            
            if (insertError) {
              console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError);
            } else {
              console.log(`Successfully inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(activitiesToAdd.length / batchSize)}`);
            }
          }
        }

        // Calculate proper streaks after adding all activities
        const { currentStreak, longestStreak } = await calculateStreaks(supabase, user.id);
        
        // Update stats with correct streak calculations
        const finalUpdateData = {
          current_streak: currentStreak,
          longest_streak: Math.max(existingStats?.longest_streak || 0, longestStreak)
        };

        await (supabase as any)
          .from('user_gamification_stats')
          .update(finalUpdateData)
          .eq('user_id', user.id);

        console.log(`Backfill summary: ${sensorCount} sensors, ${glucoseCount} glucose readings, ${loginDays} login days, ${totalPoints} total points, current streak: ${currentStreak}, longest streak: ${longestStreak}`);

      } catch (manualError) {
        console.error('Manual backfill also failed:', manualError);
        return NextResponse.json({ 
          error: 'Failed to backfill activities',
          details: 'Both RPC and manual approaches failed'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Activities backfilled successfully! Your streak from October 4th has been restored.'
    });

  } catch (error) {
    console.error('Backfill API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}