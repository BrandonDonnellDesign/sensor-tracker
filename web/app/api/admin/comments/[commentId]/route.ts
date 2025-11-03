import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;

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

    // Get comment details before deletion for logging
    const { data: comment } = await supabase
      .from('community_tip_comments')
      .select('id, content, author_name, tip_id')
      .eq('id', commentId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Delete the comment (this will cascade delete any replies due to foreign key constraint)
    const { error: deleteError } = await supabase
      .from('community_tip_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    // Log the admin action
    try {
      await supabase
        .from('admin_audit_log')
        .insert({
          admin_id: user.id,
          action: 'delete_comment',
          resource_type: 'community_tip_comment',
          resource_id: commentId,
          details: {
            comment_content: comment.content.substring(0, 100) + '...',
            comment_author: comment.author_name,
            tip_id: comment.tip_id
          }
        });
    } catch (logError) {
      // Don't fail the deletion if logging fails
      console.error('Failed to log admin action:', logError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    console.error('Error in admin comment deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}