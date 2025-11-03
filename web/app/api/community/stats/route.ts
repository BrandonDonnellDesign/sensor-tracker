import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-utils';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Try to get current user, but don't fail if not authenticated
    let user = null;
    try {
      user = await getCurrentUser();
    } catch (error) {
      console.log('No authenticated user for community stats');
      // Continue without user - community stats should work for anonymous users
    }

    // Get basic community stats
    const [
      { count: totalTips },
      { count: totalComments },
      { count: totalUsers },
      { count: totalVotes }
    ] = await Promise.all([
      supabase.from('community_tips').select('*', { count: 'exact', head: true }),
      supabase.from('community_tip_comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('moderation_status', 'approved'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('community_tip_votes').select('*', { count: 'exact', head: true })
    ]);

    // Get weekly growth stats
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      { count: weeklyTips },
      { count: weeklyComments },
      { count: weeklyUsers }
    ] = await Promise.all([
      supabase
        .from('community_tips')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString()),
      supabase
        .from('community_tip_comments')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .eq('moderation_status', 'approved')
        .gte('created_at', oneWeekAgo.toISOString()),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString())
    ]);

    // Calculate growth percentages
    const calculateGrowth = (current: number, weekly: number) => {
      const previous = current - weekly;
      if (previous === 0) return weekly > 0 ? 100 : 0;
      return Math.round(((weekly / previous) * 100));
    };

    // Get top categories
    const { data: categoryData } = await supabase
      .from('community_tips')
      .select('category')
      .not('category', 'is', null);

    const categoryCounts = categoryData?.reduce((acc: Record<string, number>, tip) => {
      acc[tip.category] = (acc[tip.category] || 0) + 1;
      return acc;
    }, {}) || {};

    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count: count as number,
        percentage: Math.round(((count as number) / (totalTips || 1)) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    let userStats = null;
    if (user) {
      try {
        // Get user-specific stats
        const { data: userTips } = await supabase
          .from('community_tips')
          .select('id')
          .eq('author_id', user.id);

        const { data: userComments } = await supabase
          .from('community_tip_comments')
          .select('id')
          .eq('author_id', user.id)
          .eq('is_deleted', false)
          .eq('moderation_status', 'approved');

        // User votes are tracked in the RPC function

        // Try to get user rank using the function, fallback to simple calculation
        let userRank = 0;
        try {
          const { data: allUserStats } = await supabase
            .rpc('get_user_community_stats')
            .order('total_score', { ascending: false });

          userRank = (allUserStats?.findIndex(stat => stat.user_id === user.id) ?? -1) + 1 || 0;
        } catch (error) {
          console.log('RPC function not available, using fallback ranking');
          // Fallback: simple ranking based on tips count
          const { count: betterUsers } = await supabase
            .from('community_tips')
            .select('author_id', { count: 'exact', head: true })
            .neq('author_id', user.id);
          
          userRank = (betterUsers || 0) + 1;
        }

        const totalContributions = (userTips?.length || 0) + (userComments?.length || 0);
        
        // Calculate level based on contributions
        const level = Math.floor(totalContributions / 5) + 1;
        const nextLevelProgress = ((totalContributions % 5) / 5) * 100;

        // Calculate streak (simplified - would need more complex logic for real streaks)
        const weeklyStreak = Math.min(7, totalContributions);

        userStats = {
          rank: userRank,
          totalContributions,
          weeklyStreak,
          level,
          nextLevelProgress: Math.round(nextLevelProgress)
        };
      } catch (error) {
        console.error('Error calculating user stats:', error);
        // Provide default user stats
        userStats = {
          rank: 0,
          totalContributions: 0,
          weeklyStreak: 0,
          level: 1,
          nextLevelProgress: 0
        };
      }
    }

    const stats = {
      totalTips: totalTips || 0,
      totalComments: totalComments || 0,
      totalUsers: totalUsers || 0,
      totalVotes: totalVotes || 0,
      weeklyGrowth: {
        tips: calculateGrowth(totalTips || 0, weeklyTips || 0),
        comments: calculateGrowth(totalComments || 0, weeklyComments || 0),
        users: calculateGrowth(totalUsers || 0, weeklyUsers || 0)
      },
      topCategories,
      userStats
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching community stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community stats' },
      { status: 500 }
    );
  }
}