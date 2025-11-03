import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth (uses cookies from middleware)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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

    // Get recent comments with tip information and moderation status, excluding flagged/rejected
    const { data: comments, error } = await supabase
      .from('community_tip_comments')
      .select(`
        id,
        content,
        author_name,
        created_at,
        is_approved,
        is_rejected,
        moderated_at,
        moderation_status,
        community_tips!inner (
          title
        )
      `)
      .eq('is_deleted', false)
      .eq('is_rejected', false)
      .not('moderation_status', 'in', '("flagged","rejected")')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching recent comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    // Get vote counts for comments
    const commentIds = comments?.map(c => c.id) || [];
    let commentVotes: Record<string, { upvotes: number; downvotes: number }> = {};

    if (commentIds.length > 0) {
      const { data: votes } = await supabase
        .from('community_comment_votes')
        .select('comment_id, vote_type')
        .in('comment_id', commentIds);

      if (votes) {
        commentVotes = votes.reduce((acc, vote) => {
          if (vote.comment_id && !acc[vote.comment_id]) {
            acc[vote.comment_id] = { upvotes: 0, downvotes: 0 };
          }
          if (vote.comment_id && vote.vote_type === 'up') {
            acc[vote.comment_id].upvotes++;
          } else if (vote.comment_id) {
            acc[vote.comment_id].downvotes++;
          }
          return acc;
        }, {} as Record<string, { upvotes: number; downvotes: number }>);
      }
    }

    // Transform data for frontend
    const transformedComments = comments?.map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      author: comment.author_name,
      tipTitle: comment.community_tips.title,
      upvotes: commentVotes[comment.id]?.upvotes || 0,
      downvotes: commentVotes[comment.id]?.downvotes || 0,
      createdAt: comment.created_at,
      isApproved: comment.is_approved,
      isRejected: comment.is_rejected,
      moderatedAt: comment.moderated_at
    })) || [];

    return NextResponse.json({ comments: transformedComments });

  } catch (error) {
    console.error('Error in recent comments API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}