import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

async function checkAdminAccess() {
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth (uses cookies from middleware)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { isAdmin: false };
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return { isAdmin: false };
    }

    return { 
      isAdmin: profile?.role === 'admin',
      user: user
    };
  } catch (error) {
    console.error('Error in checkAdminAccess:', error);
    return { isAdmin: false };
  }
}

export async function POST(request: NextRequest) {
  console.log('🚀 AI Moderation Review API called');
  try {
    // Check if user is admin
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.isAdmin) {
      console.log('❌ Admin access denied in review API');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    console.log('✅ Admin access granted in review API');

    const supabase = await createClient();
    const { contentId, contentType, action, adminNotes } = await request.json();

    if (!contentId || !contentType || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: contentId, contentType, action' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // First, check if the content still exists
    let contentExists = false;
    
    if (contentType === 'tip') {
      const { data: existingTip } = await (supabase as any)
        .from('community_tips')
        .select('id')
        .eq('id', contentId)
        .single();
      
      contentExists = !!existingTip;
      
      if (contentExists) {
        // Update tip status if it exists
        const { error: tipError } = await (supabase as any)
          .from('community_tips')
          .update({
            moderation_status: action === 'approve' ? 'approved' : 'rejected',
            is_flagged: action === 'reject',
            moderated_at: now,
            moderated_by: adminCheck.user?.id
          })
          .eq('id', contentId);

        if (tipError) {
          console.error('Error updating tip:', tipError);
          return NextResponse.json({ error: 'Failed to update tip' }, { status: 500 });
        }
      }

    } else if (contentType === 'comment') {
      const { data: existingComment } = await (supabase as any)
        .from('community_tip_comments')
        .select('id')
        .eq('id', contentId)
        .single();
      
      contentExists = !!existingComment;
      
      if (contentExists) {
        // Update comment status if it exists
        const { error: commentError } = await (supabase as any)
          .from('community_tip_comments')
          .update({
            moderation_status: action === 'approve' ? 'approved' : 'rejected',
            is_approved: action === 'approve',
            is_rejected: action === 'reject',
            moderated_at: now,
            moderated_by: adminCheck.user?.id
          })
          .eq('id', contentId);

        if (commentError) {
          console.error('Error updating comment:', commentError);
          return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
        }
      }
    }

    // Update the AI moderation log to mark this as reviewed
    console.log('🔄 Updating AI moderation log for:', { contentId, contentType, action });
    
    // First check what entries exist for this content
    const { data: existingEntries } = await (supabase as any)
      .from('ai_moderation_log')
      .select('id, action, created_at, content_id, content_type')
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .order('created_at', { ascending: false });

    console.log('🔍 Existing AI moderation log entries for', contentId, ':', existingEntries);

    // Also check if there are ANY entries with action = 'flagged' for this content
    const { data: flaggedEntries } = await (supabase as any)
      .from('ai_moderation_log')
      .select('id, action, content_id, content_type')
      .eq('content_id', contentId)
      .eq('action', 'flagged');

    console.log('🔍 Flagged entries for', contentId, ':', flaggedEntries);

    // Get the specific entry ID to update
    const entryToUpdate = flaggedEntries?.[0];
    
    if (!entryToUpdate) {
      console.error('❌ No flagged entry found to update');
      return NextResponse.json({ error: 'No flagged entry found' }, { status: 404 });
    }

    console.log('🎯 Updating specific entry:', entryToUpdate.id);

    const { data: updateResult, error: logError } = await (supabase as any)
      .from('ai_moderation_log')
      .update({
        action: action === 'approve' ? 'admin_approved' : 'admin_rejected',
        // Add admin review info
        reasoning: contentExists 
          ? `Admin ${action}d: ${adminNotes || 'No notes provided'}`
          : `Admin ${action}d deleted content: ${adminNotes || 'Content was already removed'}`
      })
      .eq('id', entryToUpdate.id)
      .select();

    console.log('🔄 AI moderation log update result:', { updateResult, logError });

    if (logError) {
      console.error('Error updating AI moderation log:', logError);
      return NextResponse.json({ error: 'Failed to update moderation log' }, { status: 500 });
    }

    if (!updateResult || updateResult.length === 0) {
      console.warn('⚠️ No AI moderation log entries were updated. Entry may not exist or already processed.');
    }

    // Log the admin action
    try {
      await (supabase as any)
        .from('admin_audit_log')
        .insert({
          admin_id: adminCheck.user?.id,
          admin_email: adminCheck.user?.email,
          action: `ai_moderation_${action}`,
          resource_type: contentType,
          resource_id: contentId,
          details: {
            action,
            admin_notes: adminNotes,
            reviewed_at: now
          }
        });
    } catch (auditError) {
      console.error('Failed to log admin action:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    return NextResponse.json({
      success: true,
      message: `${contentType} ${action}d successfully`,
      action,
      contentId,
      contentType
    });

  } catch (error) {
    console.error('Error reviewing content:', error);
    return NextResponse.json(
      { error: 'Failed to review content' },
      { status: 500 }
    );
  }
}