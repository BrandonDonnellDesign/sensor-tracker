import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    
    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('Admin check:', { 
      userId: user.id, 
      profile, 
      profileError,
      role: profile?.role
    });

    // Check if role is 'admin'
    const isAdmin = profile?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden - Admin access required',
        debug: {
          userId: user.id,
          profileFound: !!profile,
          role: profile?.role,
          isAdmin: isAdmin,
          profileError: profileError?.message
        }
      }, { status: 403 });
    }

    const { userId, newStreak } = await request.json();

    if (!userId || typeof newStreak !== 'number' || newStreak < 0) {
      return NextResponse.json({ 
        error: 'Invalid parameters. userId and newStreak (>= 0) are required' 
      }, { status: 400 });
    }

    // Get current stats
    const { data: currentStats, error: statsError } = await (supabase as any)
      .from('user_gamification_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (statsError) {
      return NextResponse.json({ 
        error: 'User gamification stats not found',
        details: statsError.message 
      }, { status: 404 });
    }

    const oldStreak = currentStats.current_streak;
    const streakDifference = newStreak - oldStreak;
    
    // Calculate points to add/remove (10 points per streak day)
    const pointsPerDay = 10;
    const pointsAdjustment = streakDifference * pointsPerDay;
    const newTotalPoints = Math.max(0, currentStats.total_points + pointsAdjustment);
    
    // Calculate new level
    const calculateLevel = (points: number): number => {
      if (points < 100) return 1;
      return Math.floor(Math.log2(points / 100)) + 2;
    };
    
    const newLevel = calculateLevel(newTotalPoints);
    const newLongestStreak = Math.max(currentStats.longest_streak, newStreak);

    // Update user stats
    const { data: updatedStats, error: updateError } = await (supabase as any)
      .from('user_gamification_stats')
      .update({
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        total_points: newTotalPoints,
        level: newLevel,
        last_activity_date: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update stats',
        details: updateError.message 
      }, { status: 500 });
    }

    // Check for new achievements based on updated stats
    const { data: newAchievements, error: achievementError } = await (supabase as any)
      .rpc('check_and_award_achievements', {
        p_user_id: userId
      });

    if (achievementError) {
      console.error('Error checking achievements:', achievementError);
    }

    // Get all user achievements for the response
    const { data: allUserAchievements } = await (supabase as any)
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    return NextResponse.json({
      success: true,
      changes: {
        oldStreak,
        newStreak,
        streakDifference,
        oldPoints: currentStats.total_points,
        newPoints: newTotalPoints,
        pointsAdjustment,
        oldLevel: currentStats.level,
        newLevel,
        oldLongestStreak: currentStats.longest_streak,
        newLongestStreak
      },
      updatedStats,
      newAchievements: newAchievements || [],
      totalAchievements: allUserAchievements?.length || 0,
      achievements: allUserAchievements || []
    });

  } catch (error) {
    console.error('Error adjusting streak:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
