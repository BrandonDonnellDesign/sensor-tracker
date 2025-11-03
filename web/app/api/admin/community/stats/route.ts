import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get user from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get community statistics
    const [
      tipsResult,
      commentsResult,
      votesResult,
      activeUsersResult
    ] = await Promise.all([
      // Total tips
      supabase
        .from('community_tips')
        .select('id', { count: 'exact' })
        .eq('is_deleted', false),
      
      // Total comments
      supabase
        .from('community_tip_comments')
        .select('id', { count: 'exact' })
        .eq('is_deleted', false),
      
      // Total votes (tips + comments)
      supabase
        .from('community_tip_votes')
        .select('id', { count: 'exact' }),
      
      // Active users (users who have posted tips or comments in last 30 days)
      supabase
        .from('community_tips')
        .select('author_id')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .eq('is_deleted', false)
    ]);

    // Try to get reports count (may fail if table doesn't exist)
    let reportsCount = 0;
    try {
      const reportsResult = await supabase
        .from('community_tip_reports')
        .select('id', { count: 'exact' });
      reportsCount = reportsResult.count || 0;
    } catch (error) {
      // Table doesn't exist yet, use 0
      reportsCount = 0;
    }

    // Get recent activity (last 7 days)
    const recentActivityResult = await supabase
      .from('community_tips')
      .select('id', { count: 'exact' })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .eq('is_deleted', false);

    // Count unique active users
    const uniqueActiveUsers = new Set(activeUsersResult.data?.map(u => u.author_id) || []);

    const stats = {
      totalTips: tipsResult.count || 0,
      totalComments: commentsResult.count || 0,
      totalVotes: votesResult.count || 0,
      totalReports: reportsCount,
      activeUsers: uniqueActiveUsers.size,
      recentActivity: recentActivityResult.count || 0
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching community stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}