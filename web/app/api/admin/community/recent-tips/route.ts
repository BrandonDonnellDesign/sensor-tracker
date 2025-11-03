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

    // Get recent tips with stats, excluding flagged/rejected content
    const { data: tips, error } = await supabase
      .from('community_tips_with_stats')
      .select('*')
      .eq('is_deleted', false)
      .not('moderation_status', 'in', '("flagged","rejected")')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching recent tips:', error);
      return NextResponse.json({ error: 'Failed to fetch tips' }, { status: 500 });
    }

    // Transform data for frontend
    const transformedTips = tips?.map(tip => ({
      id: tip.id,
      title: tip.title,
      author: tip.author_name,
      category: tip.category,
      upvotes: tip.upvotes || 0,
      downvotes: tip.downvotes || 0,
      comments: tip.comment_count || 0,
      createdAt: tip.created_at,
      isVerified: tip.is_verified
    })) || [];

    return NextResponse.json({ tips: transformedTips });

  } catch (error) {
    console.error('Error in recent tips API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}