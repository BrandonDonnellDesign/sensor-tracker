import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    
    const period = searchParams.get('period') || 'month';
    const category = searchParams.get('category') || 'overall';
    const limit = parseInt(searchParams.get('limit') || '10');

    // Calculate date filter based on period
    let dateFilter = null;
    if (period !== 'all') {
      const date = new Date();
      if (period === 'week') {
        date.setDate(date.getDate() - 7);
      } else if (period === 'month') {
        date.setMonth(date.getMonth() - 1);
      }
      dateFilter = date.toISOString();
    }

    // Build the leaderboard query based on category
    let leaderboardData: any[] = [];

    if (category === 'overall') {
      // Overall leaderboard based on total score
      try {
        const { data } = await supabase.rpc('get_community_leaderboard', {
          ...(dateFilter && { period_filter: dateFilter }),
          result_limit: limit
        });
        leaderboardData = data || [];
      } catch (error) {
        console.log('RPC function not available, using fallback leaderboard');
        // Fallback: simple leaderboard based on tips and likes
        let query = supabase
          .from('community_tips_with_stats')
          .select(`
            author_id,
            author_name,
            created_at,
            upvotes,
            comment_count
          `);

        if (dateFilter) {
          query = query.gte('created_at', dateFilter);
        }

        const { data: tipsData } = await query;

        if (tipsData) {
          const userStats = tipsData.reduce((acc: Record<string, any>, tip) => {
            const userId = tip.author_id;
            if (!userId) return acc; // Skip tips without author_id
            if (!acc[userId]) {
              acc[userId] = {
                id: userId,
                username: tip.author_name,
                tips_created: 0,
                total_likes: 0,
                comments_posted: 0,
                score: 0
              };
            }
            acc[userId].tips_created += 1;
            acc[userId].total_likes += tip.upvotes || 0;
            acc[userId].score += (tip.upvotes || 0) * 2 + 5; // 2 points per like, 5 per tip
            return acc;
          }, {});

          leaderboardData = Object.values(userStats)
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, limit);
        }
      }
    } else if (category === 'tips') {
      // Tips leaderboard
      let query = supabase
        .from('community_tips_with_stats')
        .select(`
          author_id,
          author_name,
          created_at,
          upvotes,
          comment_count
        `);

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: tipsData } = await query;

      if (tipsData) {
        const userStats = tipsData.reduce((acc: Record<string, any>, tip) => {
          const userId = tip.author_id;
          if (!userId) return acc; // Skip tips without author_id
          if (!acc[userId]) {
            acc[userId] = {
              id: userId,
              username: tip.author_name,
              tipsCreated: 0,
              totalLikes: 0,
              totalComments: 0,
              score: 0
            };
          }
          acc[userId].tipsCreated += 1;
          acc[userId].totalLikes += tip.upvotes || 0;
          acc[userId].totalComments += tip.comment_count || 0;
          acc[userId].score += (tip.upvotes || 0) * 2 + (tip.comment_count || 0);
          return acc;
        }, {});

        leaderboardData = Object.values(userStats)
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, limit);
      }
    } else if (category === 'helpful') {
      // Most helpful users (based on upvotes received)
      try {
        const { data } = await supabase.rpc('get_helpful_users_leaderboard', {
          ...(dateFilter && { period_filter: dateFilter }),
          result_limit: limit
        });
        leaderboardData = data || [];
      } catch (error) {
        console.log('RPC function not available, using fallback helpful leaderboard');
        // Fallback: users with most likes on their tips
        let query = supabase
          .from('community_tips_with_stats')
          .select(`
            author_id,
            author_name,
            upvotes
          `)
          .gt('upvotes', 0);

        if (dateFilter) {
          query = query.gte('created_at', dateFilter);
        }

        const { data: tipsData } = await query;

        if (tipsData) {
          const userStats = tipsData.reduce((acc: Record<string, any>, tip) => {
            const userId = tip.author_id;
            if (!userId) return acc; // Skip tips without author_id
            if (!acc[userId]) {
              acc[userId] = {
                user_id: userId,
                username: tip.author_name,
                helpful_votes: 0,
                tips_created: 0,
                total_likes: 0,
                score: 0
              };
            }
            acc[userId].helpful_votes += tip.upvotes || 0;
            acc[userId].total_likes += tip.upvotes || 0;
            acc[userId].tips_created += 1;
            acc[userId].score = acc[userId].helpful_votes;
            return acc;
          }, {});

          leaderboardData = Object.values(userStats)
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, limit);
        }
      }
    } else if (category === 'active') {
      // Most active users (based on comments and interactions)
      try {
        const { data } = await supabase.rpc('get_active_users_leaderboard', {
          ...(dateFilter && { period_filter: dateFilter }),
          result_limit: limit
        });
        leaderboardData = data || [];
      } catch (error) {
        console.log('RPC function not available, using fallback active leaderboard');
        // Fallback: users with most comments
        let commentQuery = supabase
          .from('community_tip_comments')
          .select(`
            author_id,
            author_name,
            created_at
          `)
          .eq('is_deleted', false);

        if (dateFilter) {
          commentQuery = commentQuery.gte('created_at', dateFilter);
        }

        const { data: commentsData } = await commentQuery;

        if (commentsData) {
          const userStats = commentsData.reduce((acc: Record<string, any>, comment) => {
            const userId = comment.author_id;
            if (!userId) return acc; // Skip comments without author_id
            if (!acc[userId]) {
              acc[userId] = {
                user_id: userId,
                username: comment.author_name,
                comments_posted: 0,
                tips_created: 0,
                total_interactions: 0,
                score: 0
              };
            }
            acc[userId].comments_posted += 1;
            acc[userId].total_interactions += 1;
            acc[userId].score = acc[userId].total_interactions;
            return acc;
          }, {});

          leaderboardData = Object.values(userStats)
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, limit);
        }
      }
    }

    // Enhance leaderboard data with additional info
    const enhancedLeaderboard = await Promise.all(
      leaderboardData.map(async (userEntry, index) => {
        // Get user profile info
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, created_at')
          .eq('id', userEntry.id || userEntry.user_id || userEntry.author_id)
          .single();

        // Calculate level based on score
        const level = Math.floor((userEntry.score || 0) / 100) + 1;

        // Generate some sample badges based on stats
        const badges = [];
        if ((userEntry.totalLikes || userEntry.total_likes || 0) >= 50) badges.push('helpful');
        if ((userEntry.tipsCreated || userEntry.tips_created || 0) >= 10) badges.push('prolific');
        if ((userEntry.commentsPosted || userEntry.comments_posted || 0) >= 25) badges.push('social');
        if (level >= 5) badges.push('expert');

        return {
          id: userEntry.id || userEntry.user_id || userEntry.author_id,
          username: profile?.username || userEntry.username || userEntry.author_username,
          rank: index + 1,
          score: userEntry.score || 0,
          stats: {
            tipsCreated: userEntry.tipsCreated || userEntry.tips_created || 0,
            totalLikes: userEntry.totalLikes || userEntry.total_likes || 0,
            commentsPosted: userEntry.commentsPosted || userEntry.comments_posted || 0,
            helpfulVotes: userEntry.helpfulVotes || userEntry.helpful_votes || 0,
            streakDays: Math.min(7, (userEntry.tipsCreated || 0) + (userEntry.commentsPosted || 0))
          },
          badges,
          level,
          isCurrentUser: user ? (userEntry.id || userEntry.user_id || userEntry.author_id) === user.id : false
        };
      })
    );

    return NextResponse.json({ users: enhancedLeaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}