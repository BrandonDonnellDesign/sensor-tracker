import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

async function checkAdminAccess() {
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth (uses cookies from middleware)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return false;
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return false;
    }

    return profile?.role === 'admin';
  } catch (error) {
    console.error('Error in checkAdminAccess:', error);
    return false;
  }
}

export async function GET() {
  console.log('🚀 Flagged content API called');
  try {
    // Check if user is admin
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      console.log('❌ Admin access denied');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('✅ Admin access granted');
    const supabase = await createClient();

    // Get flagged tips
    // First, test if we can get any tips at all
    const { data: allTips, error: allTipsError } = await (supabase as any)
      .from('community_tips')
      .select('id, title, moderation_status')
      .limit(5);
    console.log('🔍 All tips test query:', { data: allTips, error: allTipsError });

    // Also check what's in the AI moderation log
    const { data: aiLogEntries, error: aiLogError } = await (supabase as any)
      .from('ai_moderation_log')
      .select('content_id, content_type, action')
      .eq('action', 'flagged')
      .limit(10);
    console.log('🔍 AI moderation log flagged entries:', { data: aiLogEntries, error: aiLogError });

    // Check all moderation statuses to see what we have
    const { data: allModerationStatuses } = await (supabase as any)
      .from('community_tips')
      .select('moderation_status')
      .not('moderation_status', 'is', null);
    console.log('🔍 All moderation statuses in tips:', allModerationStatuses?.map((t: any) => t.moderation_status));

    // Get flagged content from AI moderation log (only unreviewed items)
    console.log('🔍 Querying AI moderation log for flagged content...');
    const { data: flaggedLogEntries, error: logError } = await (supabase as any)
      .from('ai_moderation_log')
      .select('content_id, content_type, action, flags, reasoning, created_at')
      .eq('action', 'flagged')
      .order('created_at', { ascending: false });
    
    console.log('🔍 AI moderation log flagged entries:', { data: flaggedLogEntries, error: logError });

    let flaggedTips: any[] = [];
    let flaggedComments: any[] = [];

    if (flaggedLogEntries && flaggedLogEntries.length > 0) {
      // Get tip IDs and comment IDs from the log
      const tipIds = flaggedLogEntries.filter((entry: any) => entry.content_type === 'tip').map((entry: any) => entry.content_id);
      const commentIds = flaggedLogEntries.filter((entry: any) => entry.content_type === 'comment').map((entry: any) => entry.content_id);

      console.log('🔍 Tip IDs from AI log:', tipIds);
      console.log('🔍 Comment IDs from AI log:', commentIds);

      // Fetch actual tip content (only pending/flagged ones, not already reviewed)
      if (tipIds.length > 0) {
        const { data: tips, error: tipsError } = await (supabase as any)
          .from('community_tips')
          .select(`
            id,
            title,
            content,
            category,
            moderation_status,
            moderation_reason,
            moderated_at,
            created_at,
            author_id,
            author_name,
            is_deleted
          `)
          .in('id', tipIds)
          .in('moderation_status', ['pending', 'flagged', null]); // Only show unreviewed tips
        
        console.log('🔍 Flagged tips from log:', { 
          requestedIds: tipIds, 
          foundTips: tips?.length || 0, 
          tips: tips?.map((t: any) => ({ id: t.id, title: t.title, is_deleted: t.is_deleted })),
          error: tipsError 
        });
        flaggedTips = tips || [];
      }

      // Fetch actual comment content (including deleted ones for admin review)
      if (commentIds.length > 0) {
        const { data: comments, error: commentsError } = await (supabase as any)
          .from('community_tip_comments')
          .select(`
            id,
            content,
            moderation_status,
            moderation_reason,
            moderated_at,
            created_at,
            author_id,
            author_name,
            tip_id,
            is_deleted
          `)
          .in('id', commentIds);
        
        console.log('🔍 Flagged comments from log:', { 
          requestedIds: commentIds, 
          foundComments: comments?.length || 0, 
          comments: comments?.map((c: any) => ({ id: c.id, content: c.content?.substring(0, 50), is_deleted: c.is_deleted })),
          error: commentsError 
        });
        flaggedComments = comments || [];
      }
    }

    console.log('🔍 Final flagged tips count:', flaggedTips?.length || 0);
    console.log('🔍 Final flagged comments count:', flaggedComments?.length || 0);

    // Format the data - if content is deleted, show AI log entry anyway for admin review
    const formattedTips = [];
    const formattedComments = [];

    // Process all flagged entries from AI log
    for (const logEntry of flaggedLogEntries || []) {
      if (logEntry.content_type === 'tip') {
        const tip = flaggedTips.find(t => t.id === logEntry.content_id);
        formattedTips.push({
          id: logEntry.content_id,
          type: 'tip' as const,
          title: tip?.title || '[Content Deleted]',
          content: tip?.content || 'This content has been removed but is still flagged for admin review.',
          category: tip?.category || 'unknown',
          author: tip?.author_name || 'Unknown User',
          moderationReason: logEntry.reasoning || 'AI flagged for review',
          moderatedAt: logEntry.created_at,
          createdAt: tip?.created_at || logEntry.created_at,
          flags: logEntry.flags || [],
          isDeleted: !tip // Mark as deleted if we couldn't find the content
        });
      } else if (logEntry.content_type === 'comment') {
        const comment = flaggedComments.find(c => c.id === logEntry.content_id);
        formattedComments.push({
          id: logEntry.content_id,
          type: 'comment' as const,
          content: comment?.content || '[Content Deleted] This comment has been removed but is still flagged for admin review.',
          tipTitle: 'Related Tip',
          author: comment?.author_name || 'Unknown User',
          moderationReason: logEntry.reasoning || 'AI flagged for review',
          moderatedAt: logEntry.created_at,
          createdAt: comment?.created_at || logEntry.created_at,
          flags: logEntry.flags || [],
          isDeleted: !comment // Mark as deleted if we couldn't find the content
        });
      }
    }

    // Combine and sort by creation date (fallback to moderation date if available)
    const allFlaggedContent = [...formattedTips, ...formattedComments]
      .sort((a, b) => {
        const dateA = new Date(a.moderatedAt || a.createdAt).getTime();
        const dateB = new Date(b.moderatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });

    return NextResponse.json({
      success: true,
      flaggedContent: allFlaggedContent,
      stats: {
        totalFlagged: allFlaggedContent.length,
        flaggedTips: formattedTips.length,
        flaggedComments: formattedComments.length
      }
    });

  } catch (error) {
    console.error('Error fetching flagged content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flagged content' },
      { status: 500 }
    );
  }
}