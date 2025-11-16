import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const tipId = searchParams.get('tip_id');
    const search = searchParams.get('search');
    
    // Build query
    let query = supabase
      .from('community_tip_comments')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (tipId) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tipId)) {
        return NextResponse.json(
          { error: 'invalid_id', message: 'Invalid tip ID format' },
          { status: 400 }
        );
      }
      query = query.eq('tip_id', tipId);
    }
    
    if (search) {
      query = query.ilike('content', `%${search}%`);
    }
    
    // Apply sorting (newest first)
    query = query.order('created_at', { ascending: false });
    
    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data: comments, error, count } = await query;
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to fetch comments' },
        { status: 500 }
      );
    }
    
    // Transform data to match API schema
    const transformedComments = comments?.map(comment => ({
      id: comment.id,
      content: comment.content,
      author: comment.author_name || 'Anonymous',
      tipId: comment.tip_id,
      tipTitle: 'Unknown', // tip_title not available in view
      parentId: comment.parent_comment_id,
      stats: {
        upvotes: 0,
        downvotes: 0,
        netVotes: 0
      },
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    })) || [];
    
    // Calculate pagination info
    const total = count || 0;
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;
    
    const responseTime = `${Date.now() - startTime}ms`;
    
    return NextResponse.json({
      data: transformedComments,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext,
        hasPrev
      },
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
