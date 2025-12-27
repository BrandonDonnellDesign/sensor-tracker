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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const activityType = searchParams.get('type') || 'login';

    const timezone = StreakUtils.getUserTimezone();
    const tracker = new StreakTracker(user.id, timezone);

    switch (action) {
      case 'status': {
        const status = await tracker.getStreakStatus(activityType);
        return NextResponse.json(status);
      }

      case 'analytics': {
        const analytics = await tracker.getStreakAnalytics(activityType);
        return NextResponse.json(analytics);
      }

      case 'calculate': {
        const streakData = await tracker.calculateStreaks(activityType);
        await tracker.updateUserStats(streakData);
        return NextResponse.json(streakData);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Streak API error:', error);
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
    const { action, activityType = 'login', points = 5, startDate, endDate } = body;

    const timezone = StreakUtils.getUserTimezone();
    const tracker = new StreakTracker(user.id, timezone);

    switch (action) {
      case 'record': {
        const streakData = await tracker.recordActivity(activityType, points);
        await tracker.updateUserStats(streakData);
        
        const status = await tracker.getStreakStatus(activityType);
        return NextResponse.json({
          success: true,
          streakData,
          status: status.status,
          message: status.message
        });
      }

      case 'backfill': {
        if (!startDate || !endDate) {
          return NextResponse.json({ 
            error: 'Start date and end date are required for backfill' 
          }, { status: 400 });
        }

        const result = await tracker.backfillActivities(startDate, endDate, activityType, points);
        
        // Recalculate streaks after backfill
        const streakData = await tracker.calculateStreaks(activityType);
        await tracker.updateUserStats(streakData);

        return NextResponse.json({
          success: true,
          message: `Backfill completed: ${result.added} activities added, ${result.skipped} already existed`,
          added: result.added,
          skipped: result.skipped,
          streakData
        });
      }

      case 'recalculate': {
        // Force recalculation of all streaks
        const streakData = await tracker.calculateStreaks(activityType);
        await tracker.updateUserStats(streakData);
        
        return NextResponse.json({
          success: true,
          message: 'Streaks recalculated successfully',
          streakData
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Streak API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}