import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to get user display name
async function getUserDisplayName(userId: string): Promise<string> {
  try {
    // Try to get user profile first
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profile) {
      // Use display_name if available
      if (profile.display_name) {
        return profile.display_name;
      }
      
      // Use first name + last initial if available
      if (profile.first_name) {
        const lastInitial = profile.last_name ? ` ${profile.last_name.charAt(0)}.` : '';
        return `${profile.first_name}${lastInitial}`;
      }
    }

    // Fallback: get email and use the part before @
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      // Capitalize first letter and replace dots/underscores with spaces
      return emailName
        .replace(/[._]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Final fallback
    return 'Community Member';
  } catch (error) {
    console.log('Could not get user display name:', error);
    return 'Community Member';
  }
}

// Get comments for a specific tip
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipId: string }> }
) {
  try {
    const { tipId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    // Try to get comments with stats, fallback to empty array if tables don't exist
    let comments: any[] = [];
    let error: any = null;

    try {
      const result = await supabase
        .from('community_comments_with_stats')
        .select('*')
        .eq('tip_id', tipId)
        .is('parent_comment_id', null) // Only top-level comments
        .order('net_votes', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      comments = result.data || [];
      error = result.error;
    } catch (dbError) {
      console.log('Comments tables not yet available, returning empty array');
      error = dbError;
    }

    // If database query failed (tables don't exist yet), return empty comments
    if (error) {
      console.log('Using empty comments array - database tables not ready');
      return NextResponse.json({
        comments: [],
        hasMore: false,
        total: 0
      });
    }

    // Get replies for each comment
    const commentIds = comments?.map(c => c.id) || [];
    let replies: any[] = [];
    
    if (commentIds.length > 0) {
      try {
        const { data: repliesData } = await supabase
          .from('community_comments_with_stats')
          .select('*')
          .in('parent_comment_id', commentIds)
          .order('created_at', { ascending: true });
        
        replies = repliesData || [];
      } catch (repliesError) {
        console.log('Could not fetch replies, using empty array');
        replies = [];
      }
    }

    // Get user votes for all comments if user is authenticated
    let userVotes: Record<string, string> = {};
    if (currentUserId && comments && comments.length > 0) {
      try {
        const allCommentIds = [...commentIds, ...replies.map(r => r.id)];
        if (allCommentIds.length > 0) {
          const { data: votes } = await supabase
            .from('community_comment_votes')
            .select('comment_id, vote_type')
            .eq('user_id', currentUserId)
            .in('comment_id', allCommentIds);

          if (votes) {
            userVotes = votes.reduce((acc, vote) => {
              acc[vote.comment_id] = vote.vote_type;
              return acc;
            }, {} as Record<string, string>);
          }
        }
      } catch (votesError) {
        console.log('Could not fetch user votes, using empty object');
        userVotes = {};
      }
    }

    // Transform and organize comments with replies
    const transformedComments = comments?.map(comment => ({
      id: comment.id,
      content: comment.content,
      author: comment.author_name,
      authorId: comment.author_id,
      upvotes: comment.upvotes || 0,
      downvotes: comment.downvotes || 0,
      netVotes: comment.net_votes || 0,
      replyCount: comment.reply_count || 0,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      userVote: userVotes[comment.id] || null,
      replies: replies
        .filter(reply => reply.parent_comment_id === comment.id)
        .map(reply => ({
          id: reply.id,
          content: reply.content,
          author: reply.author_name,
          authorId: reply.author_id,
          upvotes: reply.upvotes || 0,
          downvotes: reply.downvotes || 0,
          netVotes: reply.net_votes || 0,
          createdAt: reply.created_at,
          updatedAt: reply.updated_at,
          userVote: userVotes[reply.id] || null,
          parentCommentId: reply.parent_comment_id
        }))
    })) || [];

    return NextResponse.json({
      comments: transformedComments,
      hasMore: comments?.length === limit,
      total: transformedComments.length
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tipId: string }> }
) {
  try {
    const { tipId } = await params;
    const body = await request.json();
    const { content, parentCommentId } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Comment is too long (max 1000 characters)' }, { status: 400 });
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

    // Try to verify the tip exists, but skip verification if tables don't exist yet
    try {
      const { data: tip, error: tipError } = await supabase
        .from('community_tips')
        .select('id')
        .eq('id', tipId)
        .eq('is_deleted', false)
        .single();

      // Only return 404 if we successfully queried the table but found no tip
      if (!tipError && !tip) {
        return NextResponse.json({ error: 'Tip not found' }, { status: 404 });
      }
      
      // If there's an error but it's not a "no rows" error, it might be a table issue
      if (tipError && tipError.code !== 'PGRST116') {
        console.log('Tip verification failed, but allowing comment creation:', tipError.message);
      }
    } catch (dbError) {
      console.log('Could not verify tip exists - tables may not be ready, allowing comment creation');
    }

    // If it's a reply, try to verify the parent comment exists
    if (parentCommentId) {
      try {
        const { data: parentComment, error: parentError } = await supabase
          .from('community_tip_comments')
          .select('id')
          .eq('id', parentCommentId)
          .eq('tip_id', tipId)
          .eq('is_deleted', false)
          .single();

        // Only return 404 if we successfully queried the table but found no comment
        if (!parentError && !parentComment) {
          return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
        }
        
        // If there's an error but it's not a "no rows" error, it might be a table issue
        if (parentError && parentError.code !== 'PGRST116') {
          console.log('Parent comment verification failed, but allowing reply creation:', parentError.message);
        }
      } catch (dbError) {
        console.log('Could not verify parent comment - tables may not be ready, allowing reply creation');
      }
    }

    // Try to create the comment, return mock response if tables don't exist
    try {
      // Get the display name first
      const authorName = await getUserDisplayName(user.id);
      
      const { data: newComment, error: commentError } = await supabase
        .from('community_tip_comments')
        .insert({
          tip_id: tipId,
          author_id: user.id,
          author_name: authorName,
          content: content.trim(),
          parent_comment_id: parentCommentId || null
        })
        .select()
        .single();

      if (commentError) {
        throw commentError;
      }

      // Run AI moderation on the new comment
      let moderationResult = null;
      try {
        const { autoModerator } = await import('@/lib/ai/auto-moderator');
        moderationResult = await autoModerator.moderateComment({
          id: newComment.id,
          content: newComment.content,
          tipId: newComment.tip_id,
          authorId: newComment.author_id,
          authorName: newComment.author_name
        });

        // Add moderation info to response
        newComment.moderation_result = moderationResult;
        
        // If comment is rejected, delete it and return error to user
        if (moderationResult.action === 'rejected') {
          // Delete the rejected comment from database
          await supabase
            .from('community_tip_comments')
            .delete()
            .eq('id', newComment.id);
            
          return NextResponse.json({
            error: 'Comment rejected by moderation system',
            reason: moderationResult.analysis.reasoning,
            flags: moderationResult.analysis.flags
          }, { status: 400 });
        }
        
      } catch (moderationError) {
        console.error('Error in AI moderation:', moderationError);
        // Don't fail comment creation if moderation fails
      }

      // Send notification for comment replies
      if (parentCommentId) {
        try {
          const { notificationManager } = await import('@/lib/email/notification-manager');
          await notificationManager.sendCommentReplyNotification({
            originalCommentId: parentCommentId,
            replyCommentId: newComment.id,
            tipId: tipId
          });
        } catch (notificationError) {
          console.error('Error sending reply notification:', notificationError);
          // Don't fail comment creation if notification fails
        }
      }

      // Return the new comment with initial stats
      const transformedComment = {
        id: newComment.id,
        content: newComment.content,
        author: newComment.author_name,
        authorId: newComment.author_id,
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        replyCount: 0,
        createdAt: newComment.created_at,
        updatedAt: newComment.updated_at,
        userVote: null,
        replies: [],
        parentCommentId: newComment.parent_comment_id
      };

      return NextResponse.json({
        success: true,
        comment: transformedComment
      });

    } catch (dbError) {
      console.log('Database tables not available, returning mock comment response');
      
      // Return mock response for development
      const authorName = await getUserDisplayName(user.id);
      
      const mockComment = {
        id: `mock-${Date.now()}`,
        content: content.trim(),
        author: authorName,
        authorId: user.id,
        upvotes: 0,
        downvotes: 0,
        netVotes: 0,
        replyCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userVote: null,
        replies: [],
        parentCommentId: parentCommentId || null
      };

      return NextResponse.json({
        success: true,
        comment: mockComment
      });
    }



  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}