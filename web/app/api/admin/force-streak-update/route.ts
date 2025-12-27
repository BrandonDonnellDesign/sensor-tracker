import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Force updating streak for user:', user.id);

    // Get current stats before update
    const { data: beforeStats } = await (supabase as any)
      .from('user_gamification_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Clear existing login activities
    await (supabase as any)
      .from('daily_activities')
      .delete()
      .eq('user_id', user.id)
      .eq('activity_type', 'login');

    // Generate all dates from Oct 14, 2025 to Dec 27, 2025
    const activityData = [];
    const startDate = new Date('2025-10-14');
    const endDate = new Date('2025-12-27');
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      activityData.push({
        user_id: user.id,
        activity_type: 'login',
        activity_date: date.toISOString().split('T')[0],
        points_earned: 5,
        activity_count: 1,
        activities: [],
        created_at: new Date(date.getTime() + 12 * 60 * 60 * 1000).toISOString() // Noon of each day
      });
    }

    // Insert all activities in batches
    const batchSize = 50;
    for (let i = 0; i < activityData.length; i += batchSize) {
      const batch = activityData.slice(i, i + batchSize);
      const { error: insertError } = await (supabase as any)
        .from('daily_activities')
        .insert(batch);
      
      if (insertError) {
        console.error('Error inserting activity batch:', insertError);
        return NextResponse.json({ 
          error: 'Failed to insert activities',
          details: insertError.message
        }, { status: 500 });
      }
    }

    // Force update the streak to 75 days directly in the database
    const { data: updatedStats, error: updateError } = await (supabase as any)
      .from('user_gamification_stats')
      .update({
        current_streak: 75,
        longest_streak: Math.max(beforeStats?.longest_streak || 0, 75),
        last_activity_date: '2025-12-27',
        total_points: (beforeStats?.total_points || 0) + (75 * 5), // Add 375 points
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating streak:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update streak',
        details: updateError.message
      }, { status: 500 });
    }

    // Count activities to verify
    const { data: verifyActivities } = await (supabase as any)
      .from('daily_activities')
      .select('activity_date')
      .eq('user_id', user.id)
      .eq('activity_type', 'login')
      .order('activity_date', { ascending: false });

    console.log('Streak force updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Streak force updated to 75 days with all daily activities',
      before: {
        current_streak: beforeStats?.current_streak,
        longest_streak: beforeStats?.longest_streak,
        last_activity_date: beforeStats?.last_activity_date,
        total_points: beforeStats?.total_points
      },
      after: {
        current_streak: updatedStats.current_streak,
        longest_streak: updatedStats.longest_streak,
        last_activity_date: updatedStats.last_activity_date,
        total_points: updatedStats.total_points
      },
      activities: {
        total: verifyActivities?.length || 0,
        first: '2025-10-14',
        last: '2025-12-27',
        pointsAdded: 375
      }
    });

  } catch (error) {
    console.error('Force streak update API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}