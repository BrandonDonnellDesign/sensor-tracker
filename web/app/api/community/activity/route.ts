import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');

    let activities: any[] = [];

    // Get recent tips
    if (filter === 'all' || filter === 'tips') {
      const { data: recentTips } = await supabase
        .from('community_tips_with_stats')
        .select(`
          id,
          title,
          category,
          created_at,
          author_name,
          upvotes,
          comment_count
        `)
        .order('created_at', { ascending: false })
        .limit(filter === 'tips' ? limit : Math.ceil(limit / 3));

      if (recentTips) {
        activities.push(...recentTips.map(tip => ({
          id: `tip-${tip.id}`,
          type: 'tip_created',
          title: `New tip: ${tip.title}`,
          description: `${tip.author_name} shared a ${tip.category} tip`,
          actor: tip.author_name,
          targetId: tip.id,
          targetType: 'tip',
          createdAt: tip.created_at,
          metadata: {
            tipTitle: tip.title,
            category: tip.category,
            count: (tip.upvotes || 0) + (tip.comment_count || 0)
          }
        })));
      }
    }

    // Get recent comments
    if (filter === 'all' || filter === 'comments') {
      const { data: recentComments } = await supabase
        .from('community_tip_comments')
        .select(`
          id,
          content,
          created_at,
          author_name,
          tip_id,
          community_tips!inner(title, author_name)
        `)
        .eq('is_deleted', false)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(filter === 'comments' ? limit : Math.ceil(limit / 3));

      if (recentComments) {
        activities.push(...recentComments.map(comment => ({
          id: `comment-${comment.id}`,
          type: 'comment_added',
          title: `New comment on "${comment.community_tips.title}"`,
          description: `${comment.author_name} commented: "${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}"`,
          actor: comment.author_name,
          targetId: comment.tip_id,
          targetType: 'tip',
          createdAt: comment.created_at,
          metadata: {
            commentContent: comment.content,
            tipTitle: comment.community_tips.title
          }
        })));
      }
    }

    // Get recent votes (likes)
    if (filter === 'all' || filter === 'votes') {
      const { data: recentVotes } = await supabase
        .from('community_tip_votes')
        .select(`
          id,
          created_at,
          user_id,
          tip_id,
          vote_type,
          community_tips!inner(title, author_name)
        `)
        .eq('vote_type', 'up')
        .order('created_at', { ascending: false })
        .limit(filter === 'votes' ? limit : Math.ceil(limit / 3));

      if (recentVotes) {
        activities.push(...recentVotes.map(vote => ({
          id: `vote-${vote.id}`,
          type: 'tip_liked',
          title: `Tip liked: "${vote.community_tips.title}"`,
          description: `Someone liked ${vote.community_tips.author_name}'s tip`,
          actor: 'Anonymous',
          targetId: vote.tip_id,
          targetType: 'tip',
          createdAt: vote.created_at,
          metadata: {
            tipTitle: vote.community_tips.title
          }
        })));
      }
    }

    // Sort all activities by creation date and limit
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    activities = activities.slice(0, limit);

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching community activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community activity' },
      { status: 500 }
    );
  }
}