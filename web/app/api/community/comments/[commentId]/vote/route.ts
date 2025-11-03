import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const body = await request.json();
    const { voteType } = body;

    if (!voteType || !['up', 'down'].includes(voteType)) {
      return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 });
    }

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

    // Verify the comment exists
    const { data: comment, error: commentError } = await supabase
      .from('community_tip_comments')
      .select('id')
      .eq('id', commentId)
      .eq('is_deleted', false)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Call the toggle_comment_vote function
    const { data: result, error: voteError } = await supabase
      .rpc('toggle_comment_vote', {
        comment_uuid: commentId,
        user_uuid: user.id,
        new_vote_type: voteType
      });

    if (voteError) {
      console.error('Error toggling comment vote:', voteError);
      return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
    }

    // Get updated vote counts
    const { data: updatedComment } = await supabase
      .from('community_comments_with_stats')
      .select('upvotes, downvotes, net_votes')
      .eq('id', commentId)
      .single();

    return NextResponse.json({
      success: true,
      voteResult: result,
      updatedCounts: {
        upvotes: updatedComment?.upvotes || 0,
        downvotes: updatedComment?.downvotes || 0,
        netVotes: updatedComment?.net_votes || 0
      }
    });

  } catch (error) {
    console.error('Error handling comment vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}