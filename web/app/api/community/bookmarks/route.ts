import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get user ID from Authorization header
    let currentUserId: string | null = null;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const userSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        const { data: { user } } = await userSupabase.auth.getUser(token);
        currentUserId = user?.id || null;
      } catch (error) {
        console.log('Could not get user from token:', error);
      }
    }

    if (!currentUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user's bookmarked tips with full tip data
    const { data: bookmarks, error } = await supabase
      .from('community_tip_bookmarks')
      .select(`
        created_at,
        community_tips!inner (
          id,
          title,
          content,
          category,
          author_name,
          is_verified,
          tags,
          created_at
        )
      `)
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookmarks:', error);
      return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
    }

    // Get vote counts for bookmarked tips
    const tipIds = bookmarks?.map((b: any) => b.community_tips.id) || [];
    let tipStats: Record<string, any> = {};
    
    if (tipIds.length > 0) {
      const { data: stats } = await supabase
        .from('community_tips_with_stats')
        .select('id, upvotes, downvotes, net_votes, comment_count')
        .in('id', tipIds);

      if (stats) {
        tipStats = stats.reduce((acc, stat) => {
          acc[stat.id] = stat;
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Get user votes for bookmarked tips
    let userVotes: Record<string, string> = {};
    if (tipIds.length > 0) {
      const { data: votes } = await supabase
        .from('community_tip_votes')
        .select('tip_id, vote_type')
        .eq('user_id', currentUserId)
        .in('tip_id', tipIds);

      if (votes) {
        userVotes = votes.reduce((acc, vote) => {
          acc[vote.tip_id] = vote.vote_type;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Transform data
    const transformedBookmarks = bookmarks?.map((bookmark: any) => {
      const tip = bookmark.community_tips;
      const stats = tipStats[tip.id] || {};
      
      return {
        id: tip.id,
        title: tip.title,
        content: tip.content,
        category: tip.category,
        author: tip.author_name,
        likes: stats.upvotes || 0,
        dislikes: stats.downvotes || 0,
        netVotes: stats.net_votes || 0,
        comments: stats.comment_count || 0,
        createdAt: tip.created_at,
        bookmarkedAt: bookmark.created_at,
        isVerified: tip.is_verified,
        tags: tip.tags || [],
        userVote: userVotes[tip.id] || null,
        isBookmarked: true
      };
    }) || [];

    return NextResponse.json({
      bookmarks: transformedBookmarks,
      total: transformedBookmarks.length
    });

  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}