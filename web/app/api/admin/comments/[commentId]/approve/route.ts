import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
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

    // Get comment details for logging
    const { data: comment } = await (supabase as any)
      .from('community_tip_comments')
      .select('id, content, author_name, tip_id')
      .eq('id', commentId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Update comment status to approved (you may need to add this column)
    const { error: updateError } = await (supabase as any)
      .from('community_tip_comments')
      .update({ 
        is_approved: true,
        is_rejected: false,
        moderated_at: new Date().toISOString(),
        moderated_by: user.id
      })
      .eq('id', commentId);

    if (updateError) {
      console.error('Error approving comment:', updateError);
      return NextResponse.json({ error: 'Failed to approve comment' }, { status: 500 });
    }

    // Log the admin action
    try {
      await (supabase as any)
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: 'approve_comment',
          resource_type: 'community_tip_comment',
          resource_id: commentId,
          details: {
            comment_content: comment.content.substring(0, 100) + '...',
            comment_author: comment.author_name,
            tip_id: comment.tip_id
          }
        });
    } catch (logError) {
      // Don't fail the approval if logging fails
      console.error('Failed to log admin action:', logError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Comment approved successfully'
    });

  } catch (error) {
    console.error('Error in admin comment approval:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}