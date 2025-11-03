import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tipId: string }> }
) {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    const { tipId } = await params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tipId)) {
      return NextResponse.json(
        { error: 'invalid_id', message: 'Invalid tip ID format' },
        { status: 400 }
      );
    }
    
    // Fetch tip with stats
    const { data: tip, error } = await supabase
      .from('community_tips_with_stats')
      .select('*')
      .eq('id', tipId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'not_found', message: 'Tip not found' },
          { status: 404 }
        );
      }
      
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to fetch tip' },
        { status: 500 }
      );
    }
    
    // View count tracking would need to be implemented separately
    
    // Transform data to match API schema
    const transformedTip = {
      id: tip.id,
      title: tip.title,
      content: tip.content,
      category: tip.category,
      author: tip.author_name || 'Anonymous',
      tags: tip.tags || [],
      stats: {
        upvotes: tip.upvotes || 0,
        downvotes: tip.downvotes || 0,
        netVotes: tip.net_votes || 0,
        comments: tip.comment_count || 0,
        views: 0 // View count not implemented yet
      },
      createdAt: tip.created_at,
      updatedAt: tip.updated_at
    };
    
    const responseTime = `${Date.now() - startTime}ms`;
    
    return NextResponse.json({
      data: transformedTip,
      meta: {
        responseTime,
        apiVersion: '1.0.0',
        rateLimit: {
          limit: '1000',
          remaining: '999',
          reset: Math.floor(Date.now() / 1000) + 3600
        }
      }
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}